import React, { useEffect, useMemo, useState } from 'react';
import {
  Popup2,
  PxxCascadeAddress,
  PxxDrawer2,
  PxxInput,
  PxxSelect,
} from '@/baseComponents';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Pagination,
  Space,
  Spin,
} from 'antd';
import classname from 'classnames';
import styles from './index.less';
import { get, unitTransform, toTime, toThousandth } from '@parallel-line/utils';
import { useRequest } from 'ahooks';
import { ObjectType } from '../../types';
import { cargoRequestDraft, fetchCargoReqs } from '@/services/order';
import { PlusCircleOutlined } from '@ant-design/icons';
import { addCargoModal } from '../../CargoForm';
import { calc, getDictionaryValueByKey } from '@/utils';
import { getCargoStatistics } from '@/pages/order/util';

const {
  cubicCentimeterToMeter,
  gramToKilogram,
  kilogramToGram,
  cubicMeterToCentimeter,
} = unitTransform;
const { RangePicker } = DatePicker;

interface CaogoListDrawerProps {
  onClose?: () => void;
  onSuccess: (keys: ObjectType[]) => void;
  matchedRows?: ObjectType[];
}

// 计算统计值
// 汇总集合(10:货物需求个数20:总重量(单位:kg)30:总体积40:货物信息总件数50:货物名称，多个用""分割 60:货物需求单数 )
function calcStatistics(list: ObjectType[]) {
  const res = list.reduce(
    (prev: ObjectType, item: ObjectType) => {
      const obj = item.totalMap || {};
      Object.keys(prev).forEach((key) => {
        prev[key] = calc(`${prev[key]}+${obj[key]}`);
      });
      return prev;
    },
    { 60: 0, 20: 0, 30: 0, 40: 0 },
  );
  return {
    60: toThousandth(res[60]),
    20: toThousandth(gramToKilogram?.(res[20])),
    30: toThousandth(cubicCentimeterToMeter?.(res[30])),
    40: toThousandth(res[40]),
  };
}

// 格式化matchRows数据
function formatMatchRows(list: ObjectType[]) {
  return list.map((item: ObjectType) => {
    const statistics = getCargoStatistics([
      { cargoGoodsList: item.cargoGoodsList || [] },
    ]);
    return {
      id: item.cargoRequestId,
      totalMap: {
        60: statistics.goodsCounts,
        20: kilogramToGram?.(statistics.goodsWeights, { errorResult: 0 }),
        30: cubicMeterToCentimeter?.(statistics.goodsVolume, {
          errorResult: 0,
        }),
        40: statistics.goodsTotals,
      },
    };
  });
}

const CaogoListDrawer = (props: CaogoListDrawerProps) => {
  const [list, setList] = useState<any>([]);
  const [page, setPage] = useState<number>(1);
  const [requestQuery, setRequestQuery] = useState<ObjectType>({
    requestStatus: 0,
  });
  const [sendAddress, setSendAddress] = useState<any>({});
  const [receiveAddress, setReceiveAddress] = useState<any>({});
  const [total, setTotal] = useState<number>(1);

  const matchedRows = formatMatchRows(props.matchedRows || []);
  const matchedKeys = matchedRows.map((row) => row.id);
  const [selectedRows, setSelectedRows] = useState<ObjectType[]>(matchedRows);
  const [loading, setLoading] = useState(false);

  const selectedKeys = useMemo(() => {
    return selectedRows.map((item) => item?.id);
  }, [selectedRows.length]);

  const searchAction = useRequest(fetchCargoReqs, {
    manual: true,
    debounceInterval: 500,
    formatResult: (res: any) => {
      return res?.data;
    },
    onSuccess: (rs: any) => {
      setTotal(rs.rowTotal || 1);
      setList(() => {
        return [...rs?.rows];
      });
    },
  });

  eventEmitter.useSubscription(({ uniqueKey }: ObjectType) => {
    if (uniqueKey === 'ADD_CARGO_REQ__SUCCESS') {
      searchAction.run({
        page: 1,
        pageSize: 10,
        query: requestQuery,
      });
    }
  });

  useEffect(() => {
    searchAction.run({
      page,
      pageSize: 10,
      query: requestQuery,
    });
  }, [page]);

  const changeQuery = (k: string, v: any) => {
    requestQuery[k] = v;
    if (
      Reflect.has(requestQuery, 'cargoPointList') &&
      requestQuery.cargoPointList instanceof Array
    ) {
      const arr = _.compact(requestQuery.cargoPointList);
      if (arr.length > 0) Reflect.set(requestQuery, 'cargoPointList', arr);
      else Reflect.deleteProperty(requestQuery, 'cargoPointList');
    }
    setRequestQuery({ ...requestQuery });
    searchAction.run({
      page,
      pageSize: 10,
      query: { ...requestQuery },
    });
  };

  // 选中货物需求
  const handleCheckChange = (record: ObjectType, e: any) => {
    const isChecked = e.target.checked;
    let rows = [...selectedRows];

    // const arr = [...list];
    if (isChecked) {
      // 保证导入顺序
      // keys = arr.reduce((prev, item) => {
      //   if (keys.includes(item.id) || item.id === id) prev.push(item.id);
      //   return prev;
      // }, []);
      rows.push(record);
    } else {
      rows = rows.filter((item) => item.id !== record.id);
    }
    setSelectedRows(rows);
  };

  // 全选
  const handleAllCheckChange = (e: any) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const rows = [...selectedRows];
      list.forEach((item: ObjectType) => {
        if (!selectedKeys.includes(item.id)) rows.push(item);
      });
      setSelectedRows(rows);
    } else {
      // 取消当前页
      const rows = selectedRows.filter(
        (row: ObjectType) =>
          list.findIndex((v: ObjectType) => v.id === row.id) === -1 ||
          matchedKeys?.includes(row.id),
      );
      setSelectedRows(rows);
    }
  };

  // 导入货物需求
  const handleSubmit = async () => {
    try {
      const realKeys = selectedKeys.filter((key) => !matchedKeys.includes(key));
      if (realKeys.length > 0) {
        setLoading(true);
        const { cargoRequestList } = await cargoRequestDraft(realKeys, 'match');
        props.onSuccess(cargoRequestList);
        setLoading(false);
      }
      props.onClose?.();
    } finally {
      setLoading(false);
      props.onClose?.();
    }
  };

  // 是否为全部选中
  const isAllChecked =
    list.length > 0 &&
    list.every((item: ObjectType) => selectedKeys.includes(item.id));

  const statistics = calcStatistics(selectedRows);

  return (
    <div className={styles.cargoWrap}>
      <div className={styles.content}>
        <div className={styles.filterWrap}>
          <Space style={{ marginBottom: 12 }} className="customSpace">
            <PxxCascadeAddress
              value={sendAddress?.pointCode}
              placeholder="发货地"
              changeOnSelect={false}
              style={{ width: '100%' }}
              onChange={(value: string) => {
                let addr = null;
                if (value) {
                  addr = {
                    pointCode: value,
                    pointType: 10,
                  };
                }
                setSendAddress(addr);
                const cargoPointList = _.castArray(requestQuery.cargoPointList);
                cargoPointList[0] = addr;
                changeQuery('cargoPointList', cargoPointList);
              }}
            />
            <PxxCascadeAddress
              value={receiveAddress?.pointCode}
              placeholder="收货地"
              style={{ width: '100%' }}
              changeOnSelect={false}
              onChange={(value: string) => {
                let addr = null;
                if (value) {
                  addr = {
                    pointCode: value,
                    pointType: 20,
                  };
                }
                setReceiveAddress(addr);
                const cargoPointList = _.castArray(requestQuery.cargoPointList);
                cargoPointList[1] = addr;
                changeQuery('cargoPointList', cargoPointList);
              }}
            />
          </Space>
          <Space style={{ marginBottom: 12 }} className="customSpace">
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['发货开始时间', '发货结束时间']}
              onChange={(v: any) => {
                if (v) {
                  const arr = toTime(v, { isISO: true });
                  changeQuery('sendTimeList', arr);
                } else {
                  changeQuery('sendTimeList', undefined);
                }
              }}
            />
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['收货开始时间', '收货结束时间']}
              onChange={(v: any) => {
                if (v) {
                  const arr = toTime(v, { isISO: true });
                  changeQuery('receivedTimeList', arr);
                } else {
                  changeQuery('receivedTimeList', undefined);
                }
              }}
            />
          </Space>
          <Space className="customSpace">
            <PxxInput
              placeholder="货物名称"
              style={{ width: '100%' }}
              onChange={(v: string) => changeQuery('descriptionOfGoods', v)}
            />
            <PxxSelect
              dicKey="common.common.goods_type"
              style={{ width: '100%' }}
              placeholder="货物类型"
              onChange={(v: any) =>
                changeQuery('cargoTypeClassificationCode', v)
              }
            />
          </Space>
        </div>
        <div style={{ marginTop: 12 }}>
          <Spin spinning={searchAction.loading}>
            {list.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                {list?.map((item: ObjectType) => {
                  return (
                    <div className={styles.item} key={item.id}>
                      <Checkbox
                        onChange={(e) => handleCheckChange(item, e)}
                        checked={selectedKeys.includes(item.id)}
                        disabled={(matchedKeys || []).includes(item.id)}
                      />
                      <div className={styles.itemRight}>
                        <div className={styles.title}>
                          <span
                            className={styles.goodsName}
                            title={get(item, 'totalMap.50', '--')}
                          >
                            {get(item, 'totalMap.50', '--') || '--'}
                          </span>
                          {(matchedKeys || []).includes(item.id) && (
                            <span className={styles.itemTag}>已添加</span>
                          )}
                        </div>
                        <div className={styles.title}>
                          <span className={styles.goodsName}>
                            {get(item, 'totalMap.60', '--')}单&nbsp;/&nbsp;
                            {gramToKilogram?.(get(item, 'totalMap.20', '--'))}
                            kg&nbsp;/&nbsp;
                            {cubicCentimeterToMeter?.(get(item, 'totalMap.30'))}
                            m³&nbsp;/&nbsp;
                            {get(item, 'totalMap.40', '--')}件
                          </span>
                          <span>
                            {getDictionaryValueByKey(
                              'shipment.shipment.cargo_business_type',
                              item.cargoBusinessType,
                            )}
                          </span>
                        </div>
                        <div className={styles.addrs}>
                          <div className={styles.addrsLeft}>
                            <div className={styles.addrsLeftDot} />
                            <div className={styles.addrsLeftLine} />
                            <div className={styles.addrsLeftDot} />
                          </div>
                          <div className={styles.addrsRight}>
                            <div className={styles.addrsItem}>
                              <div className={styles.addr}>
                                {item.startAddress}
                              </div>
                              <div className={styles.addrTime}>
                                {toTime(item.loadTime, { hideTime: true })}
                              </div>
                            </div>
                            <div className={styles.addrsItem}>
                              <div className={styles.addr}>
                                {item.endAddress}
                              </div>
                              <div className={styles.addrTime}>
                                {toTime(item.unloadTime, { hideTime: true })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </Spin>
        </div>
      </div>
      <div className={styles.operateBox}>
        <div className={styles.pagination}>
          <span>
            {list.length > 0 && (
              <Checkbox onChange={handleAllCheckChange} checked={isAllChecked}>
                全选
              </Checkbox>
            )}
          </span>
          <Pagination
            size="small"
            pageSize={10}
            total={total}
            current={page}
            showSizeChanger={false}
            onChange={(current: number) => {
              setPage(current);
            }}
          />
        </div>
        <div className={classname('drawerFooter', styles.footer)}>
          <div>
            {selectedRows.length > 0 && (
              <div className={styles.statistics}>
                已勾选{selectedRows.length}条记录
                <br />
                总计：
                {statistics[60]}单&nbsp;/&nbsp;
                {statistics[20]}kg&nbsp;/&nbsp;
                {statistics[30]}m³&nbsp;/&nbsp;
                {statistics[40]}件
              </div>
            )}
          </div>
          <Space>
            <Button onClick={props.onClose}>取消</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={selectedRows.length === 0}
              loading={loading}
            >
              确认添加
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

const openAddCargoModal = () => {
  addCargoModal({
    onSuccess: () => {
      eventEmitter.emit({ uniqueKey: 'ADD_CARGO_REQ__SUCCESS' });
    },
  });
};

const selectCaogoReq = (params: CaogoListDrawerProps) => {
  new Popup2(PxxDrawer2, {
    title: (
      <div className={styles.drawerTitle}>
        待处理货物需求
        <span
          className={classname('link', styles.addBtn)}
          onClick={openAddCargoModal}
        >
          <PlusCircleOutlined style={{ marginRight: 8 }} />
          新增货物需求
        </span>
      </div>
    ),
    width: 720,
    closable: false,
    bodyStyle: { padding: '0 16px' },
    content: <CaogoListDrawer {...params} />,
  }).open();
};

export default selectCaogoReq;
