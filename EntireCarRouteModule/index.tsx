import React, { useContext } from 'react';
import { Form, Space } from 'antd';
import ModuleTitle from '../components/ModuleTitle';
import AddrSelect, { AddrType } from '../components/AddrSelect';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import styles from './index.less';
import { Icon } from '@/baseComponents';
import classNames from 'classnames';
import {
  checkSupplementOrderTimeIsError,
  compareTime,
  formatMinuteTime,
  FormContext,
} from '../utils';
import selectRoute from '@/businessComponent/SelectRouteDrawer';
import { ObjectType } from '../types';
import { DatePicker } from '@parallel-line/components';
import { get, global } from '@parallel-line/utils';
import { sleep } from '@/utils';

type TimeType = 'arriveTime' | 'sendTime';

const { List, Item } = Form;

function getSiteInfo(index: number, len: number) {
  if (index === 0)
    return {
      name: '装货地',
      key: 30,
    };
  if (index === len - 1)
    return {
      name: '卸货地',
      key: 40,
    };
  return {
    name: '经停点',
    key: 50,
  };
}

interface EntireCarRouteModuleProps {
  onRouteSelectSuc: (points: ObjectType[]) => void;
}

const EntireCarRouteModule: React.FC<EntireCarRouteModuleProps> = ({
  onRouteSelectSuc,
}) => {
  const {
    form,
    shouldSupplementOrder,
    emitterKeys,
    shouldCheckCurTime,
  } = useContext(FormContext);

  // 线路选择成功
  const selectRouteSuccess = (params: ObjectType) => {
    const points = (params.pointList || []).map(
      ({ pointAddressCom, contacts, contactsPhone, ...point }: ObjectType) => ({
        ...point,
        arriveTime: formatMinuteTime(point.arriveTime),
        sendTime: formatMinuteTime(point.sendTime),
        addrCom: {
          ...pointAddressCom,
          contacts,
          contactsPhone,
        },
      }),
    );
    onRouteSelectSuc(points);
  };

  const handleSelectRoute = () => {
    selectRoute({
      position: 'addRequirement',
      onSuccess: selectRouteSuccess,
    });
  };

  // 站点与之前站点比较
  const getPointTimeErrBetweenPoint = (
    index: number,
    time: moment.Moment,
    timeType: TimeType,
  ) => {
    const pointList = form?.getFieldValue('pointList');
    if (timeType === 'sendTime') {
      const arriveTime = pointList[index].arriveTime;
      if (arriveTime) {
        if (time && compareTime(arriveTime, time)) {
          if (index === 0) return '发车时间需要大于装货时间';
          return '发车时间需要大于到达时间';
        }
        return '';
      }
    }
    if (index > 0 && time) {
      let tempIndex = index - 1;
      while (tempIndex >= 0) {
        // 获取前面站点
        const prevSite = pointList[tempIndex];
        const prevTime = prevSite.sendTime || prevSite.arriveTime;
        if (prevTime) {
          if (timeType === 'arriveTime' && compareTime(prevTime, time)) {
            return '到达时间需要大于前面站点的时间';
          }
          if (timeType === 'sendTime' && compareTime(prevTime, time)) {
            return '发车时间需要大于前面站点的时间';
          }
          break;
        }
        tempIndex -= 1;
      }
    }
    return '';
  };

  // 时间变化，校验其他时间
  const checkAllTimes = (index?: number) => {
    const pointList = form?.getFieldValue('pointList') || [];
    const validatorFields: (string | number)[][] = [];
    pointList.forEach((item: ObjectType, i: number) => {
      if (item.arriveTime) validatorFields.push(['pointList', i, 'arriveTime']);
      if (item.sendTime) validatorFields.push(['pointList', i, 'sendTime']);
    });
    form?.validateFields([...validatorFields]);
    if (index !== undefined && index === 0) {
      // 计算后补单
      global.eventEmitter.emit({ uniqueKey: emitterKeys.calcSupplyPrice });
    }
  };

  global.eventEmitter.useSubscription(({ uniqueKey }: ObjectType) => {
    if (uniqueKey === emitterKeys.validateRoutesTime) {
      checkAllTimes();
    }
  });

  // const checkTime = (index: number, type: TimeType) => {
  //   const timeError = getPointTimeErr(index, type);
  //   if (timeError) return Promise.reject(timeError);
  //   return Promise.resolve();
  // };

  const checkArriveTime = (index: number, value: moment.Moment) => {
    const supplementOrdeDate =
      form?.getFieldValue('contractInfo')?.backupOrderDay || 0;
    if (index === 0) {
      if (!value) return Promise.reject('请选择装货时间');
      if (shouldSupplementOrder) {
        const isError = checkSupplementOrderTimeIsError(
          value,
          supplementOrdeDate,
        );
        if (isError)
          return Promise.reject(
            `装货时间不能早于当前时间${supplementOrdeDate}天以上`,
          );
      } else if (shouldCheckCurTime && value && compareTime(undefined, value)) {
        return Promise.reject('装货时间需要大于当前时间');
      }
    }
    const err = getPointTimeErrBetweenPoint(index, value, 'arriveTime');
    if (err) return Promise.reject(err);
    return Promise.resolve();
  };

  const checkSendTime = (index: number, value: moment.Moment) => {
    const err = getPointTimeErrBetweenPoint(index, value, 'sendTime');
    if (err) return Promise.reject(err);
    return Promise.resolve();
  };

  const checkAddr = (index: number) => {
    const pointList = form?.getFieldValue('pointList');
    const point = pointList[index] || {};
    if (!point.addrCom) return Promise.reject('请选择地址信息');
    const addr = get(point, 'addrCom.pointAddress');
    if (!addr) return Promise.reject('请选择地址');
    const hasSame = pointList.find((point: ObjectType, i: number) => {
      return i !== index && get(point, 'addrCom.pointAddress') === addr;
    });
    if (hasSame) return Promise.reject('线路地址不能相同');
    return Promise.resolve();
  };

  // 地址变化，校验其他地址
  const checkAllAddr = async () => {
    const pointList = form?.getFieldValue('pointList');
    const validatorFields: (string | number)[][] = [];
    pointList.forEach((item: ObjectType, i: number) => {
      const addr = get(item, 'addrCom.pointAddress');
      if (addr) validatorFields.push(['pointList', i, 'addrCom']);
    });
    await sleep(100);
    form?.validateFields([...validatorFields]);
  };

  return (
    <div>
      <div className={styles.header}>
        <ModuleTitle title="线路信息" icon="iconxianlu1" />
        <span className="link" onClick={handleSelectRoute}>
          导入线路
        </span>
      </div>
      <div className={classNames('moduleCon', styles.routeCon)}>
        <List name="pointList">
          {(fields, { remove, add }) =>
            fields.map((field, i) => (
              <div key={field.key} style={{ position: 'relative' }}>
                <div className={styles.timeLine}>
                  <Icon type="icontubiao" style={{ fontSize: 16 }} />
                  {i < fields.length - 1 && <div className={styles.line}></div>}
                </div>
                <Space className="customSpace" size={12}>
                  <Item
                    name={[field.name, 'addrCom']}
                    label={getSiteInfo(i, fields.length).name}
                    rules={[
                      {
                        validator: (rule, val) => checkAddr(i),
                      },
                    ]}
                    required
                  >
                    <AddrSelect
                      addrType={getSiteInfo(i, fields.length).key as AddrType}
                      contactsRequired={false}
                      onChange={checkAllAddr}
                    />
                  </Item>
                  {i === fields.length - 1 ? (
                    <Item
                      style={{ flex: 1 }}
                      name={[field.name, 'arriveTime']}
                      label="到达时间"
                      rules={[
                        {
                          validator: (_rule, value) =>
                            checkArriveTime(i, value),
                        },
                      ]}
                    >
                      <DatePicker
                        placeholder="请选择"
                        style={{ width: '100%' }}
                        getPopupContainer={(node: any) => node.parentNode}
                        onChange={checkAllTimes}
                      />
                    </Item>
                  ) : (
                    <Space
                      size={12}
                      className="customSpace"
                      style={{ flex: 1 }}
                    >
                      <Item
                        name={[field.name, 'arriveTime']}
                        label={i === 0 ? '装货时间' : '到达时间'}
                        rules={[
                          {
                            validator: (_rule, value) =>
                              checkArriveTime(i, value),
                          },
                        ]}
                        required={i === 0}
                      >
                        <DatePicker
                          format="YYYY-MM-DD HH:mm"
                          placeholder="请选择"
                          style={{ width: '100%' }}
                          getPopupContainer={(node: any) => node.parentNode}
                          onChange={() =>
                            checkAllTimes(i === 0 ? i : undefined)
                          }
                        />
                      </Item>
                      <Item
                        name={[field.name, 'sendTime']}
                        label="发车时间"
                        rules={[
                          {
                            validator: (_rule, value) =>
                              checkSendTime(i, value),
                          },
                        ]}
                      >
                        <DatePicker
                          placeholder="请选择"
                          style={{ width: '100%' }}
                          getPopupContainer={(node: any) => node.parentNode}
                          onChange={checkAllTimes}
                        />
                      </Item>
                    </Space>
                  )}
                </Space>
                <div className={styles.operate}>
                  <div className={styles.operateInner}>
                    {i === fields.length - 1 && (
                      <PlusCircleOutlined
                        className={styles.operateIcon}
                        onClick={() => {
                          add({}, fields.length - 1);
                          checkAllAddr();
                        }}
                      />
                    )}
                    {i > 0 && i !== fields.length - 1 && (
                      <MinusCircleOutlined
                        onClick={() => {
                          remove(field.name);
                          checkAllAddr();
                        }}
                        className={styles.operateIcon}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </List>
      </div>
    </div>
  );
};

export default EntireCarRouteModule;
