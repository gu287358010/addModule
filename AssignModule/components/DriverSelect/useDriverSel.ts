import { useContext, useState, useRef, createContext, useEffect } from 'react';
import { ObjectType, VehicleList } from '../../../types';
import { get, toTime } from '@parallel-line/utils';
import {
  FormContext,
  getUniqueDriver,
  getUniqueVehicle,
  matchPrice,
  matchPriceByRange,
} from '../../../utils';
import { executeRule } from '@/services/order';
import { useRequest } from 'ahooks';
import { global } from '@parallel-line/utils';
import { useFetchAllDriversAndVehicles } from '@/hooks';

const getCalcUnitKey = (key: number) => {
  if (key === 51 || key === 52) return 'goodsItemGrossWeight';
  if (key === 61) return 'goodsItemCube';
  if (key === 71) return 'totalNumberOfPackages';
  return undefined;
};

const getVehicleInfo = (item: ObjectType) => ({
  driverType: 1,
  id: item.carrierVehicleId,
  vehicleId: item.vehicleId,
  auditStatus: item.vehicleAuditStatus,
  vehicleLength: item.vehicleLength,
  vehicleNumber: item.vehicleNumber,
  vehiclePlateColorCode: item.vehiclePlateColorCode,
  vehicleType: item.vehicleType,
});

const { eventEmitter } = global;

interface DriverContextRule {
  showSwitch?: boolean;
  reqFetched: boolean;
  priceList: undefined | VehicleList;
  normalList: undefined | VehicleList;
  onSwitchChange?: (val: boolean) => void;
  switchVal?: boolean;
  normalReqFetched: boolean;
}

export const DriverContext = createContext<DriverContextRule>({
  showSwitch: undefined,
  reqFetched: false,
  priceList: undefined,
  normalList: undefined,
  onSwitchChange: undefined,
  switchVal: false,
  normalReqFetched: false,
});

interface UseDriverSel {
  isDriverMatchPrice?: boolean;
  onSetIsDriverMatchPrice?: (val?: boolean) => void;
}

const useDriverSel = (props: UseDriverSel) => {
  const { emitterKeys, form } = useContext(FormContext);
  const tempRef = useRef(false); // 司机信息变更，可重新调用车辆司机列表接口

  const [showSwitch, setShowSwitch] = useState(false);
  const [switchVal, setSwitchVal] = useState<undefined | boolean>(
    props.isDriverMatchPrice,
  );

  const [reqFetched, setReqFetched] = useState(false);
  const [normalList, normalReqFetched] = useFetchAllDriversAndVehicles();

  const initDriverAndVehicle = (callback?: () => void) => {
    if (normalReqFetched) {
      // 接收成功
      if (!props.isDriverMatchPrice) {
        // 后端没返回id,根据司机名称和司机手机号匹配司机，根据车辆车牌匹配车辆
        const driverInfo = form?.getFieldValue('driverInfo');
        if (driverInfo) {
          const driverData = (normalList.drivers || []).find(
            (item: ObjectType) =>
              getUniqueDriver(item) === getUniqueDriver(driverInfo),
          );
          if (driverData) form?.setFieldsValue({ driverInfo: driverData });
          else form?.setFieldsValue({ driverInfo: undefined });
        }
        const vehicleInfo = form?.getFieldValue('vehicleInfo');
        if (vehicleInfo) {
          const vehicleData = (normalList.vehicles || []).find(
            (item: ObjectType) =>
              getUniqueVehicle(item) === getUniqueVehicle(vehicleInfo),
          );
          if (vehicleData) form?.setFieldsValue({ vehicleInfo: vehicleData });
          else form?.setFieldsValue({ vehicleInfo: undefined });
          // 初始化车辆信息，调用价格策略
          eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
        }
      }
      eventEmitter.emit({ uniqueKey: emitterKeys.resetDriverAndVehicleCb });
    }
    callback?.();
  };

  useEffect(() => {
    initDriverAndVehicle();
  }, [normalReqFetched, normalList]);

  useEffect(() => {
    setSwitchVal(props.isDriverMatchPrice);
  }, [props.isDriverMatchPrice]);

  const calcGoodsTotal = (key: string) => {
    const reqs = form?.getFieldValue('cargoRequestList') || [];
    return reqs.reduce((prev: number, item: ObjectType) => {
      const goodsList = get(item, 'cargoGoodsList', []);
      goodsList.forEach((goods: ObjectType) => {
        if (_.isNumber(goods[key])) prev += goods[key];
      });
      return prev;
    }, 0);
  };

  // 重置价格和承运商
  const resetDriverInfo = () => {
    const driverInfo = form?.getFieldValue('driverInfo');
    const params: ObjectType = {
      driverInfo: undefined,
      priceMode: form?.getFieldValue('tempPriceMode'),
    };
    if (driverInfo?.driverType === 1) params.vehicleInfo = undefined; // 优选车派单，重置司机时，同事重置车辆
    form?.setFieldsValue(params);
    eventEmitter.emit({ uniqueKey: emitterKeys.resetPriceByCarryInfoChange });
  };

  // 往列表里面添加价格并排序
  const formatPriceList = (arr: ObjectType[]) => {
    const result = arr.map((item) => {
      if (item.driverType === 1) {
        // 优选车
        const agreementView = item.agreementView || {};
        return {
          ...item,
          price: agreementView.fee
            ? Number(agreementView.fee / 100)
            : undefined,
          isMatchPrice: Number(agreementView.fee) > 0,
        };
      }
      // 元/趟单位，不需要计算货物总量
      if (item.valuationUnit === 11) {
        return {
          ...item,
          price: Number(item.onceAmount),
          isMatchPrice: Number(item.onceAmount) > 0,
        };
      }
      const key = getCalcUnitKey(item.valuationUnit);
      let count = calcGoodsTotal(key as string);
      if (item.valuationUnit === 52) count /= 1000;
      const rules = item.ladders;
      const price =
        item.ladderType === 2
          ? matchPriceByRange(rules, count)
          : matchPrice(rules, count);
      return { ...item, price, isMatchPrice: Number(price) > 0 };
    });
    const res = _.orderBy(result, 'price', 'asc');
    return res;
  };

  const [priceList, setPriceList] = useState<VehicleList>({
    vehicles: [],
    drivers: [],
  });

  const updateSwitchVal = (val?: boolean) => {
    setSwitchVal(val);
    props.onSetIsDriverMatchPrice?.(val);
  };

  // 司机价格列表
  const priceReq = useRequest((params) => executeRule(params), {
    manual: true,
    formatResult: (res) => {
      const _temps: ObjectType[] = [];
      const _drivers = get(res, 'data.drivers', []).map(
        (driver: ObjectType, _index: number, list: ObjectType[]) => {
          if (driver.driverType === 1) {
            const agreementView = driver.agreementView || {};
            const vehicleInfo = getVehicleInfo(driver.agreementView);
            const info = {
              ...driver,
              ...agreementView,
              driverId: agreementView.driverId,
              id: agreementView.carrierDriverId,
              valuationUnitDesc: '元/趟',
              auditStatus: agreementView.driverAuditStatus,
              price: agreementView.fee
                ? Number(agreementView.fee / 100)
                : undefined,
              isMatchPrice: Number(agreementView.fee) > 0,
              vehicleInfo,
            };
            _temps.push(info);
            const sameDriver = list.find(
              (item: ObjectType) =>
                getUniqueDriver(driver) === getUniqueDriver(item),
            );
            const vehiclesInDriver = sameDriver?.driverRefVehicles || [];
            const vehicle = _.find(
              vehiclesInDriver,
              (v: ObjectType) =>
                getUniqueVehicle(agreementView) === getUniqueVehicle(v),
            );
            if (!vehicle) vehiclesInDriver.push(driver.vehicleInfo);
            info.driverRefVehicles = vehiclesInDriver;
            return info;
          }
          return driver;
        },
      );

      const vehicles = _temps.reduce((prev, item) => {
        const vehicle = _.find(
          prev,
          (v: ObjectType) => getUniqueVehicle(item) === getUniqueVehicle(v),
        );
        if (!vehicle) {
          prev.push({
            preferredStatus: 1,
            preferredDriver: item,
            ...item.vehicleInfo,
          });
        } else {
          vehicle.preferredStatus = 2;
          vehicle.preferredDriver = item;
        }
        return prev;
      }, get(res, 'data.vehicles', []));

      const drivers = formatPriceList(_drivers);

      return {
        drivers,
        vehicles,
      };
    },
    onSuccess: (res, params) => {
      const drivers = res.drivers || [];
      setShowSwitch(drivers.length > 0);
      const driverInfo = form?.getFieldValue('driverInfo');
      // 非初始化时，价格列表发生变化，重置承运信息
      if (!get(params, '[0].isInital')) {
        // 价格发生变化，且当前为价格匹配，重置承运商信息
        if (!_.isEqual(drivers, priceList.drivers) && switchVal === true)
          resetDriverInfo();
        // 未选择司机时，存在规则，自动切换至匹配价格列表
        if (switchVal === undefined && !driverInfo && drivers.length > 0)
          updateSwitchVal(true);
        // 当前为价格匹配但返回计价规则为空，切回普通匹配，且重置司机信息
        else if (switchVal === true && drivers.length === 0) {
          updateSwitchVal(undefined);
          if (driverInfo) resetDriverInfo();
        } else if (switchVal === false && !driverInfo && drivers.length === 0)
          updateSwitchVal(undefined);
      } else if (switchVal) {
        // 编辑或者再来一单，当前规则不存在，重置司机信息
        if (driverInfo) {
          const driverData = drivers.find(
            (item: ObjectType) =>
              getUniqueDriver(driverInfo, driverInfo.ruleId) ===
              getUniqueDriver(item, item.ruleId),
          );
          if (driverData) {
            form?.setFieldsValue({ driverInfo: driverData });
            if (!driverData.isMatchPrice)
              form?.setFieldsValue({ canDriverMatchPrice: false });
          } else {
            form?.setFieldsValue({ canDriverMatchPrice: false });
            resetDriverInfo();
          }
        }
        const vehicleInfo = form?.getFieldValue('vehicleInfo');
        if (vehicleInfo) {
          const vehicleData = (res.vehicles || []).find(
            (item: ObjectType) =>
              getUniqueVehicle(item) === getUniqueVehicle(vehicleInfo),
          );
          if (vehicleData) form?.setFieldsValue({ vehicleInfo: vehicleData });
          // 初始化车辆信息，调用价格策略
          eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
        }
        updateSwitchVal(drivers.length > 0);
      }
      setPriceList(res);
      setReqFetched(true);
      tempRef.current = false;
    },
  });

  eventEmitter.useSubscription(
    ({ uniqueKey, priceReqParams, cb }: ObjectType) => {
      // 司机或车辆更新，重新获取司机车辆接口
      if (uniqueKey === 'E_EDIT_DRIVER' || uniqueKey === 'E_EDIT_VEHICLE') {
        tempRef.current = true;
        eventEmitter.emit({ uniqueKey: emitterKeys.callFetchPriceRulesList }); // 价格匹配列表更新
      }

      if (uniqueKey === emitterKeys.initDriverAndVehicle)
        initDriverAndVehicle(cb);

      if (uniqueKey === emitterKeys.fetchPriceRulesList) {
        const {
          startAddrCom,
          endAddrCom,
          businessType = 2,
          isInital = false,
          arriveTime,
        } = priceReqParams || {};

        if (!_.isEmpty(startAddrCom) && !_.isEmpty(endAddrCom)) {
          const params = {
            addressStart: get(startAddrCom, 'pointAddress'),
            addressEnd: get(endAddrCom, 'pointAddress'),
            directionStart: get(startAddrCom, 'pointCode'),
            directionEnd: get(endAddrCom, 'pointCode'),
            businessType, // 2: 零担  1: 整车
            valuationType: 1, // 应付
            assignType: 1,
            isInital,
            agreementTime: toTime(arriveTime, {
              isISO: true,
            }),
          };
          // if (reFetchPrice || (!reFetchPrice && !priceVehicleList)) priceReq.run(params);
          priceReq.run(params);
        } else {
          setPriceList({ drivers: [], vehicles: priceList.vehicles });
          if (priceList.drivers.length !== 0 && switchVal) resetDriverInfo();
          setShowSwitch(false);
          updateSwitchVal(switchVal === undefined ? undefined : false);
        }
      }

      // 修改公司列表价格
      if (uniqueKey === emitterKeys.updatePriceList) {
        if (!switchVal) return;
        const newList = formatPriceList(priceList.drivers);

        if (!_.isEqual(newList, priceList.drivers)) {
          setPriceList({ drivers: newList, vehicles: priceList.vehicles });
          resetDriverInfo();
        }
      }
    },
  );

  // 更改switch
  const handleSwitchChange = (val: boolean) => {
    updateSwitchVal(val);
    // 切换为匹配，重新计算价格列表
    if (val) {
      const newList = formatPriceList(priceList.drivers);
      if (!_.isEqual(newList, priceList.drivers)) {
        setPriceList({ drivers: newList, vehicles: priceList.vehicles });
      }
    }
    resetDriverInfo();
  };

  return {
    showSwitch,
    reqFetched,
    priceList,
    normalList,
    onSwitchChange: handleSwitchChange,
    switchVal,
    normalReqFetched,
  };
};

export default useDriverSel;
