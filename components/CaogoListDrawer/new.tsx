import React, { useState } from 'react';
import { ObjectType } from '../../types';
import { Popup2, PxxDrawer2 } from '@/baseComponents';
import styles from './index.less';
import classname from 'classnames';
import { addCargoModal } from '../../CargoForm';
import { PlusCircleOutlined } from '@ant-design/icons';
import DemandGoodsTable from '@/businessComponent/DemandGoodsTable';
import { Button } from 'antd';
import { unitTransform } from '@parallel-line/utils';
import { getCargoStatistics } from '@/pages/order/util';
import { cargoRequestDraft } from '@/services/order';

const {
  kilogramToGram,
  cubicCentimeterToMeter,
  cubicMeterToCentimeter,
  gramToKilogram,
} = unitTransform;

interface CaogoListDrawerProps {
  onClose?: () => void;
  onSuccess: (keys: ObjectType[]) => void;
  matchedRows?: ObjectType[];
}

const RenderStatistics = ({ matchRows = {} }: any) => {
  const list: any[] = _.keys(matchRows).reduce((prev: any[], item: string) => {
    prev.push(matchRows[item]);
    return prev;
  }, []);
  const count: number = list.length;
  const single: number = list.reduce((prev: any, item: any) => {
    prev += item.totalMap?.[60] || 0;
    return prev;
  }, 0);
  const weight: number | string = list.reduce((prev: any, item: any) => {
    if (_.isNumber(prev)) {
      if (item.totalMap?.[20] >= 0) {
        prev += item.totalMap?.[20];
      }
      return prev;
    } else {
      if (item.totalMap?.[20] > 0) {
        return item.totalMap?.[20];
      } else {
        return '--';
      }
    }
  }, '--');
  const volume: number | string = list.reduce((prev: any, item: any) => {
    if (_.isNumber(prev)) {
      if (item.totalMap?.[30] >= 0) {
        prev += item.totalMap?.[30];
      }
      return prev;
    } else {
      if (item.totalMap?.[30] > 0) {
        return item.totalMap?.[30];
      } else {
        return '--';
      }
    }
  }, '--');
  const pieces: number | string = list.reduce((prev: any, item: any) => {
    if (_.isNumber(prev)) {
      if (_.isNumber(item.totalMap?.[40])) {
        prev += item.totalMap?.[40];
      }
      return prev;
    } else {
      if (_.isNumber(item.totalMap?.[40])) {
        return item.totalMap?.[40];
      } else {
        return '--';
      }
    }
  }, '--');
  return (
    <span
      className={styles.statisticsTotal}
    >{`已选择${count}个货物需求，总计：${single}单 / ${
      _.isNumber(weight) ? gramToKilogram?.(weight) : '--'
    }kg / ${
      _.isNumber(volume) ? cubicCentimeterToMeter?.(volume) : '--'
    }m³ / ${pieces}件`}</span>
  );
};

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

const CargoListDrawer = (props: CaogoListDrawerProps) => {
  const { matchedRows = [] } = props;
  const formatRows: any[] = formatMatchRows(matchedRows);
  const [loading, setLoading] = useState<boolean>(false);

  const _tmp: Record<string, any> = formatRows?.reduce(
    (prev: any, row: any) => {
      row.isDefaultSelected = true;
      prev[row.id] = row;
      return prev;
    },
    {},
  );
  const [matchRows, setMatchRows] = useState<any>(_tmp ?? {});

  const handleSubmit = async () => {
    const defaultKeys = matchedRows.map((item: any) => item.id);
    const realKeys: any[] = _.keys(matchRows).filter(
      (key: string) => !defaultKeys.includes(key),
    );

    try {
      if (realKeys.length) {
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

  return (
    <>
      <div className={styles.drawerWrap}>
        <DemandGoodsTable
          matchRows={matchRows}
          selection={true}
          changeMatched={(selects: Record<string, any>) => {
            setMatchRows(() => {
              return { ...selects };
            });
          }}
        />
      </div>
      <div className={styles.statisticsWrap}>
        <div className={styles.statistics}>
          <RenderStatistics matchRows={matchRows} />
        </div>
        <div>
          <Button
            style={{ backgroundColor: 'rgba(26,43,78,0.06)', color: '#0256ff' }}
            onClick={() => props.onClose?.()}
          >
            取消
          </Button>
          <Button
            loading={loading}
            type={'primary'}
            onClick={handleSubmit}
            style={{ marginLeft: 16 }}
          >
            确认添加
          </Button>
        </div>
      </div>
    </>
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
    width: 760,
    closable: false,
    bodyStyle: { padding: '0 16px' },
    className: styles.cargoListDrawer,
    content: <CargoListDrawer {...params} />,
  }).open();
};

export default selectCaogoReq;
