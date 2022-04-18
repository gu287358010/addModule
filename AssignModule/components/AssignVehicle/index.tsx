// 车辆指派
import { Space, Form, Tooltip, Modal, Input } from 'antd';
import React, {
  forwardRef,
  useContext,
  useImperativeHandle,
  useState,
  useRef,
} from 'react';
import { global, get, obtainDic, isEmpty } from '@parallel-line/utils';
import { history } from 'umi';
import DriverSelect from '../DriverSelect';
import VehicleSelect from '../VehicleSelect';
import { ObjectType, VehicleList } from '../../../types';
import { useEffectDeep } from '@/hooks';
import {
  FormContext,
  getAncestorEle,
  getUniqueDriver,
  getUniqueVehicle,
  isNeedShouldUpdate,
} from '../../../utils';
// import InvationQrcode from '../InvationQrcode';
import { DriverContext } from '../DriverSelect/useDriverSel';
import {
  compareVehicleWithSys,
  fetchDriverStatus,
  fetchVehicleStatus,
} from '@/services/order';
import { sleep } from '@/utils';
import styles from './index.less';
import { trailerNo } from '@/utils/verification';
import DutyFormItem from '../DutyFormItem';
import { openShareDrawer } from '@/pages/work/order/components/openDrawers';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface AssignVehicleProps {
  transConList: Record<string, any>[];
  assignDisabled?: boolean;
  isDriverMatchPrice?: boolean;
  onSetIsDriverMatchPrice?: (val: boolean | undefined) => void;
  onSetTms: (val: boolean) => void;
  onVehicleFetched?: (val?: VehicleList, flag?: boolean) => void;
  vehiclePriceList?: VehicleList;
  vehicleList?: VehicleList;
  vehicleRequired: boolean;
}

const DISABLED_ERRORS = {
  1: '该司机、车辆未在APP端进行认证，无法勾选，请提醒司机去APP端进行认证',
  2: '该司机与车辆未在APP端进行关联，请提醒司机去APP端添加该车辆。',
  3: '',
  4: (
    <span>
      企业未认证，无法选择“平台承担运输责任”，
      <span
        className="link"
        onClick={() => history.push('/company/enterpriseInfo')}
      >
        去认证
      </span>
    </span>
  ),
  5: '',
  6: '企业端未建立司机和车辆的关联关系，请在运力管理-车辆管理中关联司机',

  9: '所选司机未进行认证或审核未通过，无法勾选【承责合同】。',
  10: '所选车辆未进行认证或审核未通过，无法勾选【承责合同】。',
  11: '所选司机和车辆未进行认证或审核未通过，无法勾选【承责合同】。',
  99: '', // 请求司机车辆中
};

// 需校验证件过期字段
const AUTH_STATUS = [
  { key: 'idCardAuthStatus', label: '身份证' },
  { key: 'drivingAuthStatus', label: '驾驶证' },
  { key: 'qcAuthStatus', label: '从业资格证' },

  { key: 'xszAuthStatus', label: '行驶证' },
  { key: 'yszAuthStatus', label: '道路运输证' },
  { key: 'xkAuthStatus', label: '道路运输经营许可证' },
];

const getDutyDriverStatus = async (driveItem: any, vehicleItem: any) => {
  try {
    const [driveData, vehicleData] = await Promise.all([
      fetchDriverStatus(driveItem.id),
      fetchVehicleStatus(vehicleItem.id),
    ]);
    if (driveItem.driverType === 1 && vehicleItem.driverType === 1) {
      if (driveData.auditStatus !== 1 && vehicleData.auditStatus !== 1)
        return 11;
      if (driveData.auditStatus !== 1) return 9;
      if (vehicleData.auditStatus !== 1) return 10;
      return 0;
    }
    const driverDisabled = driveData?.auditStatus !== 1 || !driveData?.driverId;
    const vehicleDisabled =
      vehicleData?.auditStatus !== 1 || !vehicleData?.vehicleId;
    if (driverDisabled && vehicleDisabled) return 11;
    if (driverDisabled) return 9;
    if (vehicleDisabled) return 10;
    return 0;
  } catch (err) {
    return 99;
  }
};

const renderExpireOverlay = (list: ObjectType[]) => {
  return (
    <>
      {list.map((item) => (
        <div className={styles.overlayItem}>
          <span>{item.label}</span>
          <span>
            {
              obtainDic({
                dicKey: 'resource.license.auth_status',
                dicItemKey: item.status,
                errorResult: '--',
              }).value
            }
          </span>
        </div>
      ))}
    </>
  );
};

const isAutentication = global.PXX_USER_STATE.isAutentication; // 是否已认证
const { eventEmitter } = global;

const AssignVehicle = forwardRef((props: AssignVehicleProps, ref) => {
  const { emitterKeys, form } = useContext(FormContext);

  const { reqFetched, normalList, priceList, normalReqFetched } = useContext(
    DriverContext,
  );

  const isChangeVehicleOrDriver = useRef(false);

  // 0: no disabled 1: 车辆或司机未审核 2: 司机和车辆未关联 3: 选择下单邀请，不能选  4:企业未认证 5:司机未注册 6: 企业端未关联
  const [driverDisabled, setDriverDisabled] = useState(isAutentication ? 0 : 4);

  const [refresh, setRefresh] = useState(false);
  const [authStatus, setAuditStatus] = useState<ObjectType[]>([]); // 证件过期信息

  const changeDriverDisabled = (val: number) => {
    if (driverDisabled !== 4) setDriverDisabled(val);
  };

  useImperativeHandle(ref, () => ({
    onSetRefresh: () => setRefresh(!refresh),
  }));

  eventEmitter.useSubscription(({ uniqueKey }) => {
    if (uniqueKey === emitterKeys.resetDriverAndVehicleCb) setRefresh(!refresh);
  });

  // 检测证件信息
  const checkAuthStatus = () => {
    const {
      platformUndertakeDutyDriver,
      driverInfo,
      vehicleInfo,
    } = form?.getFieldsValue([
      'platformUndertakeDutyDriver',
      'driverInfo',
      'vehicleInfo',
    ]);
    if (platformUndertakeDutyDriver && driverInfo && vehicleInfo) {
      const list = AUTH_STATUS.reduce((prev: ObjectType[], item) => {
        const status = driverInfo?.[item.key] || vehicleInfo?.[item.key];
        if (status > 10) {
          prev.push({ label: item.label, status });
        }
        return prev;
      }, []);
      setAuditStatus(list);
    } else setAuditStatus([]);
  };

  const checkDriverAndVehicle = async () => {
    const {
      vehicleInfo,
      driverInfo,
      platformUndertakeDutyDriver,
    } = form?.getFieldsValue([
      'vehicleInfo',
      'driverInfo',
      'platformUndertakeDutyDriver',
    ]);

    if (!platformUndertakeDutyDriver) return;
    if (isEmpty(vehicleInfo) || isEmpty(driverInfo)) return;
    const rs = await compareVehicleWithSys({
      driverPhone: driverInfo?.driverPhone,
      vehicleNumber: vehicleInfo?.vehicleNumber,
      vehiclePlateColorCode: vehicleInfo?.vehiclePlateColorCode,
    });
    if (!rs.sameDriverName || !rs.sameVehicleType) {
      let content: React.ReactNode;
      const vl = obtainDic({
        dicKey: 'resource.vehicle.vehicle_length',
        dicItemKey: `${rs?.vehicleLength}`,
        errorResult: {
          value: '--',
        },
      }).value;
      const vt = obtainDic({
        dicKey: 'resource.vehicle.vehicle_type_code',
        dicItemKey: `${rs?.vehicleType}`,
        errorResult: {
          value: '--',
        },
      }).value;
      if (!rs.sameDriverName && rs.sameVehicleType) {
        driverInfo.driverName = rs.driverName;
        form?.setFieldsValue({ driverInfo });
        content = (
          <span style={{ marginTop: 10 }}>
            {`经平台审核，【${rs?.driverPhone}】真实名称为：`}
            <span style={{ color: '#1e78ff' }}>{rs.driverName || '--'}</span>
            ，自动为您同步
          </span>
        );
      } else if (rs.sameDriverName && !rs.sameVehicleType) {
        vehicleInfo.vehicleLength = rs?.vehicleLength;
        vehicleInfo.vehicleType = rs?.vehicleType;
        form?.setFieldsValue({ vehicleInfo });
        content = (
          <span style={{ marginTop: 10 }}>
            {`经平台审核，【${vehicleInfo?.vehicleNumber}】为：`}
            <span style={{ color: '#1e78ff' }}>{`${vl}/${vt}`}</span>
            ，自动为您同步
          </span>
        );
      } else {
        driverInfo.driverName = rs.driverName;
        vehicleInfo.vehicleLength = rs?.vehicleLength;
        vehicleInfo.vehicleType = rs?.vehicleType;
        form?.setFieldsValue({ driverInfo, vehicleInfo });
        content = (
          <>
            <span style={{ marginTop: 10 }}>
              {`经平台审核，该司机真实名称为：`}
              <span style={{ color: '#1e78ff' }}>{rs.driverName || '--'}</span>
            </span>
            <span>
              {`，该车辆为：`}
              <span style={{ color: '#1e78ff' }}>{`${vl}/${vt}`}</span>
              ，自动为您同步
            </span>
          </>
        );
      }

      await sleep(1000);
      global.eventEmitter.emit({ uniqueKey: 'E_EDIT_DRIVER' });
      Modal.success({
        content,
        icon: false,
        okText: '确定',
        okButtonProps: { type: 'primary' },
      });
    }
  };

  // 指派司机承责
  const updatePlatformUndertakeDutyDriver = async () => {
    const driverInfo = form?.getFieldValue('driverInfo');
    const vehicleInfo = form?.getFieldValue('vehicleInfo');
    if (getUniqueVehicle(vehicleInfo) || getUniqueDriver(driverInfo)) {
      if (
        (props.isDriverMatchPrice && !reqFetched) ||
        (!props.isDriverMatchPrice && !normalReqFetched)
      )
        return;
      if (driverInfo?.id === '-99' && vehicleInfo?.id === '-99') {
        form?.setFieldsValue({ platformUndertakeDutyDriver: false });
        setDriverDisabled(3);
        props.onSetTms(true);
        return;
      }

      if (!_.has(driverInfo, 'auditStatus')) return; // 再来一单车辆司机信息没有从司机车辆列表中替换完成，退出

      // 司机未在app认证
      if (driverInfo && !vehicleInfo) {
        // const disabled = isRegister ? 5 : 0;
        // changeDriverDisabled(driverInfo.auditStatus ? disabled : 1);
        changeDriverDisabled(0);
        form?.setFieldsValue({
          vehicleInfo: undefined,
          platformUndertakeDutyDriver: false,
        });
        props.onSetTms(true);
      }

      // 车辆未在app认证
      if (vehicleInfo && !driverInfo) {
        // changeDriverDisabled(vehicleInfo.auditStatus ? 0 : 1);
        changeDriverDisabled(0);
        form?.setFieldsValue({
          driverInfo: undefined,
          platformUndertakeDutyDriver: false,
        });
        props.onSetTms(true);
      }

      // 网货场景，需要检测是否可勾选复选框
      // 只有在司机或者车辆更改的时候需要重置是否勾选平台承担运输责任
      if (driverInfo && vehicleInfo && props.transConList.length) {
        if (driverDisabled === 99) return; // 接口请求中，return
        setDriverDisabled(99);
        const status = await getDutyDriverStatus(driverInfo, vehicleInfo);
        let platformUndertakeDutyDriver = form?.getFieldValue(
          'platformUndertakeDutyDriver',
        );
        // changeDriverDisabled(0);
        // platformUndertakeDutyDriver = true;
        if (status !== 0) {
          changeDriverDisabled(status);
          platformUndertakeDutyDriver = false;
        } else if (driverDisabled !== 4) {
          platformUndertakeDutyDriver = true;
          changeDriverDisabled(0);
          checkDriverAndVehicle();
        }

        // 手动更改司机车辆才允许自动勾选承责
        if (isChangeVehicleOrDriver.current) {
          let temp = form?.getFieldValue('platformUndertakeDutyDriver');
          form?.setFieldsValue({ platformUndertakeDutyDriver });
          checkAuthStatus();
          // 司机到手价 计算价格
          if (platformUndertakeDutyDriver !== temp) {
            form?.setFieldsValue({
              contractInfo: platformUndertakeDutyDriver
                ? props.transConList[0]
                : undefined,
            });
            eventEmitter.emit({ uniqueKey: emitterKeys.resetContractInfo });
            eventEmitter.emit({ uniqueKey: emitterKeys.calcRealPrice });
          }
          props.onSetTms(!platformUndertakeDutyDriver);
        } else {
          // 初始化对比完成后不更改默认值
          // 如果再来一单或者编辑车辆司机不再符合平台承责条件，则取消平台承责勾选
          if (
            !platformUndertakeDutyDriver &&
            form?.getFieldValue('platformUndertakeDutyDriver')
          ) {
            form?.setFieldsValue({ platformUndertakeDutyDriver });
            eventEmitter.emit({ uniqueKey: emitterKeys.calcRealPrice });
            props.onSetTms(!platformUndertakeDutyDriver);
          }
          checkAuthStatus();
        }
      }
    } else {
      changeDriverDisabled(0);
      form?.setFieldsValue({ platformUndertakeDutyDriver: false });
      props.onSetTms(true);
      checkAuthStatus();
    }
    isChangeVehicleOrDriver.current = false;
  };

  // 指派车队长承责
  // const updatePlatformUndertakeDutyCaption = () => {
  //   const driverInfo = form?.getFieldValue('driverInfo');
  //   if (getUniqueDriver(driverInfo)) {
  //     if (
  //       (props.isDriverMatchPrice && !reqFetched) ||
  //       (!props.isDriverMatchPrice && !normalReqFetched)
  //     ) {
  //       return;
  //     }
  //     if (driverInfo?.id === '-99') {
  //       form?.setFieldsValue({ platformUndertakeDutyDriver: false });
  //       return;
  //     }
  //     let platformUndertakeDutyDriver = form?.getFieldValue(
  //       'platformUndertakeDutyDriver',
  //     );
  //     if (!isChangeVehicleOrDriver.current) {
  //       // 自动更改
  //       if (
  //         platformUndertakeDutyDriver &&
  //         _.has(driverInfo, 'isContractSigned') &&
  //         !driverInfo.isContractSigned
  //       ) {
  //         // 不允许勾选平台承责
  //         form?.setFieldsValue({
  //           platformUndertakeDutyDriver: false,
  //           contractInfo: undefined,
  //         });
  //         eventEmitter.emit({ uniqueKey: emitterKeys.resetContractInfo });
  //       }
  //     } else {
  //       // 手动更改
  //       if (_.has(driverInfo, 'isContractSigned')) {
  //         // 已获取是否签署合同
  //         if (platformUndertakeDutyDriver && !driverInfo.isContractSigned) {
  //           // 合同未签署，清空
  //           form?.setFieldsValue({
  //             platformUndertakeDutyDriver: false,
  //             contractInfo: undefined,
  //           });
  //           eventEmitter.emit({ uniqueKey: emitterKeys.resetContractInfo });
  //         } else if (
  //           !platformUndertakeDutyDriver &&
  //           driverInfo.isContractSigned
  //         ) {
  //           // 已签署合同
  //           form?.setFieldsValue({
  //             platformUndertakeDutyDriver: true,
  //             contractInfo: props.transConList[0],
  //           });
  //           eventEmitter.emit({ uniqueKey: emitterKeys.resetContractInfo });
  //         }
  //         isChangeVehicleOrDriver.current = false;
  //       }
  //     }
  //   }
  // };

  const updatePlatformUndertakeDuty = () => {
    if (form?.getFieldValue('assignType') === 1)
      updatePlatformUndertakeDutyDriver();
    //   updatePlatformUndertakeDutyCaption();
  };

  useEffectDeep(() => {
    updatePlatformUndertakeDuty();
  }, [refresh, reqFetched, normalReqFetched]);

  eventEmitter.useSubscription(({ uniqueKey }) => {
    if (uniqueKey === emitterKeys.updatePlatformUndertakeDuty)
      updatePlatformUndertakeDuty();
  });

  // 获取司机列表
  const getDriverList = (val?: ObjectType) => {
    const vehicleInfo = val || form?.getFieldValue('vehicleInfo');
    if (vehicleInfo && !props.isDriverMatchPrice) {
      return (normalList?.drivers || []).reduce(
        (prev: ObjectType[], item: ObjectType) => {
          const drivers = item.driverRefVehicles || [];
          if (
            drivers.findIndex(
              (v: ObjectType<string>) =>
                getUniqueVehicle(v) === getUniqueVehicle(vehicleInfo),
            ) > -1
          )
            prev[0].options.push(item);
          else prev[1].options.push(item);
          return prev;
        },
        [
          { label: '关联司机', options: [] },
          { label: '未关联司机', options: [] },
        ],
      );
    }
    return (props.isDriverMatchPrice ? priceList : normalList)?.drivers || [];
  };

  // 获取车辆列表
  const getVehicleList = (val?: ObjectType) => {
    let driverInfo = val || form?.getFieldValue('driverInfo');
    const list =
      (props.isDriverMatchPrice ? priceList : normalList)?.vehicles || [];
    if (driverInfo) {
      return list.reduce(
        (prev: ObjectType[], item: ObjectType) => {
          if (driverInfo.driverType === 1) {
            // 优选车
            if (
              getUniqueVehicle(item) ===
              getUniqueVehicle(driverInfo.vehicleInfo)
            ) {
              prev[0].options.push(item);
              return prev;
            }
          }
          const drivers = item.vehicleRefDrivers || [];
          if (
            drivers.findIndex(
              (v: ObjectType) =>
                getUniqueDriver(v) === getUniqueDriver(driverInfo),
            ) > -1
          ) {
            prev[0].options.push(item);
          } else prev[1].options.push(item);
          return prev;
        },
        [
          { label: '关联车辆', options: [] },
          { label: '未关联车辆', options: [] },
        ],
      );
    }
    return list;
  };

  // 更改司机重置车辆
  const handleDriverChange = (val?: ObjectType) => {
    const vehicleInfo = form?.getFieldValue('vehicleInfo');

    if (val?.id === '-99') {
      form?.setFieldsValue({ vehicleInfo: { id: '-99' } });
      eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
    } else if (val?.driverType === 1) {
      form?.setFieldsValue({
        vehicleInfo: val.vehicleInfo,
        trailerVehicleNumber: val.vehicleInfo?.trailerVehicleNumber,
      }); // 设置优选车辆
      eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
    } else if (!vehicleInfo || vehicleInfo.id === '-99') {
      // 未选择车辆，选中关联的第一辆车
      const vehicles = getVehicleList(val);
      const vehicle = get(vehicles, '0.options.0');
      form?.setFieldsValue({
        vehicleInfo: vehicle,
        trailerVehicleNumber: vehicle?.trailerVehicleNumber,
      });
      eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
    }
    setRefresh(!refresh);
    isChangeVehicleOrDriver.current = true;
  };

  // 更改车辆
  const handleVehicleChange = async (val?: ObjectType) => {
    const driverInfo = form?.getFieldValue('driverInfo');

    if (val?.id === '-99') {
      form?.setFieldsValue({ driverInfo: { id: '-99' } });
      eventEmitter.emit({
        uniqueKey: emitterKeys.resetPriceByCarryInfoChange,
      });
    } else if (val?.preferredStatus === 1) {
      // 选中优选车辆
      form?.setFieldsValue({ driverInfo: val.preferredDriver }); // 设置优选车辆
      eventEmitter.emit({ uniqueKey: emitterKeys.resetPriceByCarryInfoChange });
      eventEmitter.emit({ uniqueKey: emitterKeys.checkDriverContractSigned });
    } else if (!driverInfo || driverInfo.id === '-99') {
      // 未选择司机，选中关联的第一个司机
      const drivers = getDriverList(val);
      const driver = get(drivers, '0.options.0');
      form?.setFieldsValue({ driverInfo: driver });
      eventEmitter.emit({ uniqueKey: emitterKeys.checkDriverContractSigned });
    }
    form?.setFieldsValue({ trailerVehicleNumber: val?.trailerVehicleNumber });
    setRefresh(!refresh);
    isChangeVehicleOrDriver.current = true;
  };

  const getDriverValueProps = (val: ObjectType | undefined) => {
    let driverId;
    if (val) {
      if (val?.id === '-99') driverId = val?.id;
      else if (!props.isDriverMatchPrice) driverId = getUniqueDriver(val);
      else driverId = getUniqueDriver(val, val?.ruleId);
    }
    return {
      value: driverId,
    };
  };

  const checkAssignInfo = (value: ObjectType, key: string, errText: string) => {
    if (key === 'vehicleNumber' && !props.vehicleRequired)
      return Promise.resolve(); // 指派车队长车辆非必填
    if (value?.id) return Promise.resolve();
    if (!value?.[key]) return Promise.reject(errText);
    return Promise.resolve();
  };

  // 挂车车身校验
  const checkTrailerNumber = (val?: string) => {
    if (val && !trailerNo.test(val))
      return Promise.reject('请输入正确车身车牌号');
    return Promise.resolve();
  };

  const getDutyDisabled = () => {
    if (driverDisabled === 99) return true;
    const assignType = form?.getFieldValue('assignType');
    if (assignType === 1 && driverDisabled > 0) return true;
    // const driverInfo = form?.getFieldValue('driverInfo');
    // if (assignType === 7 && driverInfo && !driverInfo?.isContractSigned)
    //   return true;
    return false;
  };

  const getDutyTooltipText = () => {
    const assignType = form?.getFieldValue('assignType');
    if (assignType === 1 && driverDisabled > 0)
      return DISABLED_ERRORS[driverDisabled];
    return undefined;
  };

  return (
    <>
      <Space size={12} className="customSpace">
        <div>
          <Form.Item
            name="driverInfo"
            label={props.vehicleRequired ? '司机' : '车队长'}
            required
            rules={[
              {
                validator: (rule, value) =>
                  checkAssignInfo(value, 'driverPhone', '请选择司机'),
              },
            ]}
            getValueProps={getDriverValueProps}
          >
            <DriverSelect
              disabled={props.assignDisabled}
              style={{ width: '100%' }}
              placeholder="司机名称/手机号"
              onChange={handleDriverChange}
              list={getDriverList()}
              optionType={
                form?.getFieldValue('vehicleInfo') && !props.isDriverMatchPrice
                  ? 'optGroup'
                  : 'simple'
              }
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              isNeedShouldUpdate(prev, current, [
                'driverInfo',
                'assignType',
                'tradeType',
              ])
            }
          >
            {({ getFieldValue }) => {
              const driverInfo = getFieldValue('driverInfo');
              if (
                getFieldValue('assignType') === 7 &&
                driverInfo &&
                !driverInfo.isContractSigned &&
                driverInfo.id !== '-99'
              ) {
                return (
                  <div className={styles.auditStatusTip}>
                    该用户暂未完成认证，后续将无法进行费用结算，请提前联系用户完成认证。
                    <span className="link" onClick={openShareDrawer}>
                      邀请用户认证
                    </span>
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>
        </div>

        <Space size={6} className="customSpace">
          <Form.Item
            name="vehicleInfo"
            label="车辆"
            required={props.vehicleRequired}
            rules={[
              {
                validator: (rule, value) =>
                  checkAssignInfo(value, 'vehicleNumber', '请选择车辆'),
              },
            ]}
            getValueProps={(val) => ({ value: getUniqueVehicle(val) })}
          >
            <VehicleSelect
              disabled={props.assignDisabled}
              style={{ width: '100%' }}
              placeholder="请选择车辆"
              onChange={handleVehicleChange}
              list={getVehicleList()}
              optionType={
                form?.getFieldValue('driverInfo') ? 'optGroup' : 'simple'
              }
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              !_.isEqual(prev.vehicleInfo, current.vehicleInfo)
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('vehicleInfo')?.vehicleType === '1008' && (
                <Form.Item
                  name="trailerVehicleNumber"
                  label="车身"
                  rules={[
                    { validator: (_rule, value) => checkTrailerNumber(value) },
                  ]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              )
            }
          </Form.Item>
        </Space>
      </Space>
      {props.transConList.length > 0 && !props.assignDisabled && (
        <div>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              isNeedShouldUpdate(prev, current, [
                'driverInfo',
                'assignType',
                'vehicleInfo',
              ])
            }
          >
            {() => (
              <>
                {getDutyTooltipText() && (
                  <Form.Item>
                    <div className={styles.checkTip}>
                      <ExclamationCircleOutlined style={{ marginRight: 12 }} />
                      {getDutyTooltipText()}
                    </div>
                  </Form.Item>
                )}
                <DutyFormItem
                  disabled={getDutyDisabled()}
                  // checkTooltip={
                  //   getDutyTooltipText()
                  //     ? {
                  //         getTooltipContainer: (ele) =>
                  //           getAncestorEle(
                  //             ele,
                  //             'form-assgin-module',
                  //           ) as HTMLElement,
                  //         title: getDutyTooltipText(),
                  //         color: '#000',
                  //       }
                  //     : undefined
                  // }
                />
              </>
            )}
          </Form.Item>
          {authStatus.length > 0 && (
            <Form.Item className={styles.expireTip}>
              该司机/车辆部分证件即将过期或已过期，为避免影响支付/结算，请提醒司机尽快更新，
              <Tooltip
                overlay={renderExpireOverlay(authStatus)}
                color="rgba(40,46.67,60,0.95)"
                overlayInnerStyle={{ padding: '16px 32px 16px 16px' }}
                getPopupContainer={(node: any) =>
                  getAncestorEle(node, 'form-assgin-module') as HTMLElement
                }
              >
                <span className="link">查看详情</span>
              </Tooltip>
            </Form.Item>
          )}
        </div>
      )}
    </>
  );
});

export default AssignVehicle;
