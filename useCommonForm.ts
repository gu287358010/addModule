import {
  fetchValuationConfig,
  valuationShareRequest,
  fetchRoutePlan,
  queryTransContractList,
  queryFleetQuota,
  queryDriverSign,
} from '@/services/order';
import { calculate } from '@/services/web/company';
import { calc, sleep } from '@/utils';
import { get, global, unitTransform, toTime } from '@parallel-line/utils';
import { useSetState } from 'ahooks';
import { Form } from 'antd';
import { useRef } from 'react';
import { getCargoStatistics } from '../util';
import {
  GOODS_KEY_IN_PRICE_MODE,
  MAX_PRICE,
  RULES_PRICE_CONTRAST_PRICE_MODE,
} from './constants';
import { EmitterKeys, FormType, ObjectType } from './types';
import {
  checkSupplementOrderTimeIsError,
  compareTime,
  getPointCoordinate,
  resetEmitterKeys,
} from './utils';

const { eventEmitter, PXX_SOLUTION } = global;

const { centToYuan } = unitTransform;

const { KCEnabled } = PXX_SOLUTION;

// 计算货物单位总量
const calcGoodsTotal = (reqs: ObjectType[], key: string) => {
  return reqs.reduce((prev: number, item: ObjectType) => {
    const goodsList = get(item, 'cargoGoodsList', []);
    goodsList.forEach((goods: ObjectType) => {
      if (_.isNumber(goods[key]))
        prev = calc(`${prev} + ${goods[key]}`) as number;
    });
    return prev;
  }, 0);
};

interface TempRefData {
  pointListRef: ObjectType[];
  emitterKeys: EmitterKeys;
  inviteInfo: {
    isInvite: boolean;
    assignType: number;
  };
  canPriceFetch: {
    driver: boolean;
    company: boolean;
  };
  cargoLenRef?: number; // 零担必须
  isSupplyOrderPrice?: boolean; //
  isInitial?: boolean;
  shouldSupplementOrder?: boolean;
}

interface State {
  isTms: boolean;
  operateBtnType: string;
  isInvite: boolean;
  isCompanyMatchPrice: undefined | boolean;
  isDriverMatchPrice: undefined | boolean;
  cargoDisabled?: boolean;
  isFromShipper?: boolean;
  taxRate?: number;
  valuationEnabled?: boolean;
  initalLoading?: boolean;
  canFetchVehicles: boolean;
  shouldSupplementOrder: boolean;
  transContractList: ObjectType[];
  shouldCheckCurTime: boolean;
  fleetQuota: number; // 指派车队长公司额度
  useFleetQuota: number; // 每月使用额度
}

/**
 * 获取初始化tempRef
 * @param formType FormType
 * @returns
 */
const getTempRef = (formType: FormType = 'LTL') => {
  const ref: TempRefData = {
    pointListRef: [],
    emitterKeys: resetEmitterKeys(),
    inviteInfo: {
      isInvite: false,
      assignType: 1,
    },
    canPriceFetch: {
      driver: true,
      company: true,
    },
  };
  if (formType === 'LTL') ref.cargoLenRef = 0;
  return ref;
};

const initState = (formType: FormType = 'LTL') => {
  const state: State = {
    isTms: true,
    operateBtnType: '',
    isInvite: false,
    isCompanyMatchPrice: undefined,
    isDriverMatchPrice: undefined,
    taxRate: undefined,
    valuationEnabled: false,
    canFetchVehicles: false,
    shouldSupplementOrder: false,
    transContractList: [],
    shouldCheckCurTime: false,
    fleetQuota: 0,
    useFleetQuota: 0,
  };
  if (formType === 'LTL') state.cargoDisabled = false;
  else state.isFromShipper = false;
  return state;
};

function useCommonForm(formType: FormType = 'LTL', location: Location) {
  const [form] = Form.useForm();
  const [state, setState] = useSetState<State>(initState(formType));
  const tempRef = useRef<TempRefData>(getTempRef(formType));

  const initalFun = async (cb: () => void) => {
    try {
      setState({ initalLoading: true });
      await Promise.allSettled([
        fetchValuationConfig(),
        queryTransContractList(),
      ]).then(([res1, res2]: any[]) => {
        const valuationConfig = res1?.value?.data;
        const transContractList = res2?.value?.data || [];
        setState({
          taxRate: valuationConfig?.taxRate,
          valuationEnabled: !!valuationConfig?.valuationEnabled,
          transContractList,
        });
      });
    } finally {
      cb?.();
      setState({ initalLoading: false });
    }
  };

  const initTempRef = () => {
    tempRef.current = getTempRef(formType);
  };

  // 初始化价格匹配数据  KCEnabled状态不调用价格匹配，将之前数据包含的价格匹配信息清空掉
  const initPriceRuleParams = (data: ObjectType) => {
    const isMatchPrice = !!data.roleId;
    const assignType = data.assignType;

    // 承运商初始化价格匹配信息
    const ruleParams: ObjectType = {
      tempPriceMode: data.priceMode,
    };
    if (assignType === 3) {
      if (!KCEnabled) {
        setState({ isCompanyMatchPrice: isMatchPrice ? true : undefined });
        ruleParams.canCompanyMatchPrice = Boolean(isMatchPrice);
        ruleParams.isCompanyMatchPrice = data.isMatchPrice;
        ruleParams.companyInfo = undefined;
      }
    } else if (assignType === 1) {
      if (!KCEnabled) {
        setState({ isDriverMatchPrice: isMatchPrice ? true : undefined });
        ruleParams.canDriverMatchPrice = Boolean(isMatchPrice);
        ruleParams.isDriverMatchPrice = data.isMatchPrice;
        ruleParams.driverInfo = undefined;
        ruleParams.vehicleInfo = undefined;
      }
    }
    const contractInfo = _.find(state.transContractList, {
      id: Number(data.contractId),
    });
    ruleParams.contractInfo = contractInfo;
    if (!contractInfo) {
      if (data.platformUndertakeDuty || data.platformUndertakeDutyDriver) {
        ruleParams.platformUndertakeDuty = false;
        ruleParams.platformUndertakeDutyDriver = false;
        ruleParams.priceType = 0;
      }
    }
    setShouldSupplementOrder(
      contractInfo?.isBackupOrder === 1 && contractInfo?.backupOrderDay > 0,
    );
    return ruleParams;
  };

  const setShouldCheckCurTime = (val: boolean) => {
    setState({ shouldCheckCurTime: val });
    setTimeout(() => {
      eventEmitter.emit({
        uniqueKey: tempRef.current.emitterKeys.validateRoutesTime,
        type: 'tmsStatusChange',
      });
    }, 100);
  };

  // 设置是否为后补单
  const setShouldSupplementOrder = (val: boolean) => {
    setState({ shouldSupplementOrder: val });
    tempRef.current.shouldSupplementOrder = val;
    setTimeout(() => {
      eventEmitter.emit({
        uniqueKey: tempRef.current.emitterKeys.validateRoutesTime,
        type: 'tmsStatusChange',
      });
    }, 100);
  };

  // tradeType assignType change
  const processAssignTypeChangeCb = async (neednotCalcRealPrice?: boolean) => {
    await sleep(100);
    const tradeType = form.getFieldValue('tradeType');
    const assignType = form.getFieldValue('assignType');
    // 平台承责
    let hasCalcRealPrice = false;
    let isPlatformUndertakeDuty = false;
    if (tradeType === 0 && [1, 7].includes(assignType)) {
      isPlatformUndertakeDuty = form.getFieldValue(
        'platformUndertakeDutyDriver',
      );
    } else if (tradeType === 0 && assignType === 3) {
      isPlatformUndertakeDuty = false;
    } else {
      isPlatformUndertakeDuty = form.getFieldValue('platformUndertakeDuty');
    }

    const netGoods = tradeType === 40 || isPlatformUndertakeDuty;
    setState({ isTms: !netGoods });
    setShouldCheckCurTime(isPlatformUndertakeDuty);
    if (!neednotCalcRealPrice) {
      const contractInfo = form?.getFieldValue('contractInfo');
      if (!isPlatformUndertakeDuty) {
        if (contractInfo) {
          form.setFieldsValue({ contractInfo: undefined });
          updateContractInfo();
        } else {
          calcRealPrice();
          hasCalcRealPrice = true;
        }
      } else if (!contractInfo) {
        form.setFieldsValue({ contractInfo: state.transContractList[0] });
        updateContractInfo();
      } else {
        calcRealPrice();
        hasCalcRealPrice = true;
      }
    }
    return hasCalcRealPrice;
  };

  // 设置是否邀请
  const updateIsInvite = () => {
    const assignType = form.getFieldValue('assignType');
    let isInvite = false;
    if (assignType === 1) {
      const driverInfo = form.getFieldValue('driverInfo');
      const vehicleInfo = form.getFieldValue('vehicleInfo');
      isInvite = driverInfo?.id === '-99' || vehicleInfo?.id === '-99';
    } else if (assignType === 3) {
      const companyInfo = form.getFieldValue('companyInfo');
      isInvite = companyInfo?.carrierId === '-99';
    }
    setState({ isInvite });
  };

  // 调用价格匹配接口
  const resetPriceList = async (isInital = false) => {
    if (KCEnabled) return; // 启用KC配置，禁止进行价格匹配相关调用
    const pointList = form.getFieldValue('pointList') || [];
    const assignType = form.getFieldValue('assignType');
    const tradeType = form.getFieldValue('tradeType');

    let canContinue = false;
    if (tempRef.current.canPriceFetch.driver) {
      tempRef.current.canPriceFetch.driver = false;
      canContinue = true;
    }

    if (
      tradeType === 0 &&
      assignType === 3 &&
      tempRef.current.canPriceFetch.company
    ) {
      tempRef.current.canPriceFetch.company = false;
      canContinue = true;
    }

    if (canContinue) {
      await sleep(200);
      const startAddrCom = pointList[0];
      const endAddrCom =
        pointList.length >= 2 ? pointList[pointList.length - 1] : undefined;
      eventEmitter.emit({
        uniqueKey: tempRef.current.emitterKeys.fetchPriceRulesList,
        priceReqParams: {
          startAddrCom:
            formType === 'LTL' ? startAddrCom : get(startAddrCom, 'addrCom'),
          endAddrCom:
            formType === 'LTL' ? endAddrCom : get(endAddrCom, 'addrCom'),
          isInital,
          assignType,
          businessType: formType === 'LTL' ? 2 : 1,
          arriveTime: get(startAddrCom, 'arriveTime'),
        },
      });
    }
  };

  // 计算价格分摊信息
  const calcValuationShare = async () => {
    if (!state.valuationEnabled) return;
    const excludeAmount = form?.getFieldValue('excludeAmount');
    if (excludeAmount > MAX_PRICE) return;
    const tradeType = form?.getFieldValue('tradeType');
    const assignType = form?.getFieldValue('assignType');
    const pointList = form?.getFieldValue('pointList') || [];
    // const costCent = form?.getFieldValue('costCent');
    const valuationShare = form?.getFieldValue('valuationShare') || {};
    const vehicleData = form?.getFieldValue('vehicleData') || [];
    const vehicleTypeList = form?.getFieldValue('vehicleTypeList') || [];
    const vehicleLength = form?.getFieldValue('vehicleLength');
    const vehicleInfo = form?.getFieldValue('vehicleInfo') || {};
    const needVehicleData =
      (tradeType === 0 && assignType === 3) ||
      tradeType === 40 ||
      tradeType === 10;
    const hasVehicleData =
      (((tradeType === 0 && assignType === 3) || tradeType === 40) &&
        vehicleData.length > 0) ||
      (tradeType === 10 && !!vehicleLength && vehicleTypeList.length > 0);
    const needVehicleInfo =
      tradeType === 0 && (assignType === 1 || assignType === 7);
    const points = _.filter(
      pointList,
      (point) => !!getPointCoordinate(point, formType),
    );

    if (
      (tradeType === 0 && ![1, 3, 7].includes(assignType)) ||
      tradeType === 20 ||
      points.length < 2 ||
      !excludeAmount ||
      (needVehicleData && !hasVehicleData) ||
      (needVehicleInfo &&
        (!vehicleInfo.vehicleLength ||
          !vehicleInfo.vehicleType ||
          vehicleInfo.id === '-99'))
    ) {
      form?.setFieldsValue({ valuationShare: undefined });
      return;
    }
    const params: ObjectType = {
      shipmentPriceAmount: unitTransform.yuanToCent?.(excludeAmount),
    };
    if (valuationShare.defaultTaxRate)
      params.defaultTaxRate = valuationShare.defaultTaxRate;
    points.forEach((point: ObjectType, index: number) => {
      const pointcoordinate = getPointCoordinate(point, formType);
      if (index === 0) params.origin = pointcoordinate;
      else if (index === points.length - 1)
        params.destination = pointcoordinate;
      else if (params.waypoints) params.waypoints.push(pointcoordinate);
      else params.waypoints = [pointcoordinate];
    });

    // 指派承运商，抢单，平台承运， 传入车长车型
    if (needVehicleData) {
      if (tradeType === 10) {
        params.vehicleLength = vehicleLength;
        params.vehicleType = vehicleTypeList.join(',');
      } else {
        params.vehicleType = vehicleData[1];
        params.vehicleLength = vehicleData[0];
      }
      // 平台承运，指派承运商加入税点参数
      if (tradeType === 0 || tradeType === 40) params.taxRate = state.taxRate;
    } else if (needVehicleInfo) {
      params.vehicleType = vehicleInfo?.vehicleType;
      params.vehicleLength = vehicleInfo?.vehicleLength;
      params.vehicleTonnage = vehicleInfo?.vehicleTonnage || undefined;
      params.vehicleAxisNumber = vehicleInfo?.vehicleAxisNumber || undefined;
    }
    const res = await valuationShareRequest(params);
    form?.setFieldsValue({ valuationShare: res.data, defaultTaxRate: false });
  };

  // 获取当前是否为后补单
  const getIsSupplyOrder = () => {
    const pointList = form.getFieldValue('pointList') || [];
    const arriveTime = get(pointList, '[0].arriveTime', undefined);
    const contractInfo = form?.getFieldValue('contractInfo');
    return (
      !!contractInfo &&
      compareTime(undefined, toTime(arriveTime, { isMoment: true })) &&
      !checkSupplementOrderTimeIsError(
        arriveTime,
        contractInfo?.backupOrderDay || 0,
      )
    );
  };

  // 计算实际费用
  const calcRealPrice = async (shouleSupplyOrder?: boolean) => {
    const cost = form?.getFieldValue('costCent');
    const priceType = form?.getFieldValue('priceType');

    const platformUndertakeDutyDriver = form?.getFieldValue(
      'platformUndertakeDutyDriver',
    );
    const platformUndertakeDuty = form?.getFieldValue('platformUndertakeDuty');
    const assignType = form?.getFieldValue('assignType');
    const tradeType = form?.getFieldValue('tradeType'); // 交易类型
    let taxRateInfo;
    const needFetchRealPrice =
      (tradeType === 0 &&
        platformUndertakeDutyDriver &&
        [1, 7].includes(assignType)) ||
      (tradeType !== 0 && platformUndertakeDuty);
    // 司机到手价，计算费用
    let price = cost;
    let includeAmount = price; // 含税价
    let excludeAmount = price; // 司机到手价，去除税率
    let infoServiceAmount; // 信息服务费
    if (needFetchRealPrice && cost && cost <= MAX_PRICE) {
      const contractInfo = form?.getFieldValue('contractInfo');
      const params: ObjectType = {
        driverAmount: cost * 100,
        calculateType: priceType === 1 ? 10 : 20, // 10: 司机到手价算含税价  20：含税价算司机到手价
        contractId: contractInfo?.id,
      };

      if (
        assignType !== 7 &&
        (shouleSupplyOrder !== undefined
          ? shouleSupplyOrder
          : tempRef.current.shouldSupplementOrder)
      ) {
        // 当前为后补单
        tempRef.current.isSupplyOrderPrice = tempRef.current.isInitial
          ? undefined
          : false;
        if (getIsSupplyOrder()) {
          params.businessClassify = 20;
          tempRef.current.isSupplyOrderPrice = true;
        }
      }
      if (
        tradeType === 0 &&
        assignType === 7 &&
        contractInfo.driverLeaderInfo?.driverLeader === 1
      ) {
        // 指派车队长
        params.businessClassify = 10;
      }
      if (contractInfo?.isInfoServeRate === 1)
        params.infoServiceRate = contractInfo.infoServeRate;
      const { data } = await calculate(params);
      price = centToYuan?.(data.includeAmount);
      includeAmount = centToYuan?.(data.includeAmount);
      excludeAmount = centToYuan?.(data.excludeAmount);
      infoServiceAmount = centToYuan?.(data.infoServiceAmount);
      taxRateInfo = data;
    }
    form?.setFieldsValue({
      realPrice: price || '--',
      taxRateInfo,
      includeAmount,
      excludeAmount,
      infoServiceAmount,
    });
    // 价格变化，校验价格输入框
    if (form.getFieldValue('originPrice')) form.validateFields(['originPrice']);
    if (form.getFieldValue('costCent')) form.validateFields(['costCent']);
    calcValuationShare(); // 价格变化，计算分摊价格
  };

  const updateCostCentWithKC = () => {
    const reqs = form?.getFieldValue('cargoRequestList');
    const { goodsTotalPrice } = getCargoStatistics(reqs, false, false);
    form.setFieldsValue({ paymentCostcent: goodsTotalPrice || undefined });
    if (KCEnabled) {
      // 如果是KC配置，将运输费置为输入总价
      form.setFieldsValue({
        costCent: goodsTotalPrice || undefined,
        priceMode: '4',
        originPrice: goodsTotalPrice || undefined,
        priceType: 0,
      });
      calcRealPrice();
    }
  };

  // 整车重置非匹配价格
  const resetNormalPrice = () => {
    const tempEntireCostCent = form?.getFieldValue('tempEntireCostCent');
    form?.setFieldsValue({
      realPrice: tempEntireCostCent,
      costCent: tempEntireCostCent,
    });
    // 司机到手价需要再次计算一次
    if (
      form.getFieldValue('platformUndertakeDutyDriver') &&
      form.getFieldValue('priceType') === 1
    ) {
      calcRealPrice();
    }
  };

  // 零担计算运输费用
  const calcCostPrice = (hasCalcRealPrice?: boolean) => {
    const assignType = form?.getFieldValue('assignType');
    const tradeType = form?.getFieldValue('tradeType');
    // 如果当前为价格匹配，则不进行普通的价格计算
    if (
      tradeType === 0 &&
      ((form?.getFieldValue('isCompanyMatchPrice') && assignType === 3) ||
        (form?.getFieldValue('isDriverMatchPrice') && assignType === 1))
    )
      return;

    const originPrice = form.getFieldValue('originPrice');
    const priceMode = form.getFieldValue('priceMode');
    let price;
    // 趟数计算
    if (priceMode === '4') price = originPrice;
    else if (!_.isNil(originPrice)) {
      const totals = calcGoodsTotal(
        form?.getFieldValue('cargoRequestList') || [],
        GOODS_KEY_IN_PRICE_MODE[priceMode],
      );
      if (totals) {
        price = originPrice * totals;
        if (priceMode === '5') price /= 1000; // 按照吨计算，除1000
      }
    }
    form.setFieldsValue({ costCent: _.round(price, 2) });
    calcRealPrice();
  };

  // 价格匹配，更改承运商或者司机信息，更改价格
  const updatePriceByPriceRule = (type?: number) => {
    const assignType = type || form.getFieldValue('assignType');
    const tradeType = form.getFieldValue('tradeType');
    // 承运商或者司机置空，需要重新计算价格
    let isNeedCalcPrice = false;
    // let needCalcValuationShare = false;
    let formParams: ObjectType = {};
    if (tradeType === 0 && assignType === 3) {
      // 承运商
      const companyInfo = form.getFieldValue('companyInfo');
      if (companyInfo) {
        // needCalcValuationShare = true;
        const isMatchPrice = companyInfo.isMatchPrice;
        formParams = {
          isCompanyMatchPrice: isMatchPrice ? 1 : 0,
          canCompanyMatchPrice: isMatchPrice,
          costCent: isMatchPrice
            ? companyInfo.price
            : form.getFieldValue('costCent'),
          realPrice: isMatchPrice
            ? companyInfo.price
            : form.getFieldValue('realPrice'),
        };
        if (formType === 'LTL')
          formParams.priceMode =
            RULES_PRICE_CONTRAST_PRICE_MODE[companyInfo.valuationUnit] ||
            form.getFieldValue('priceMode');
      } else {
        isNeedCalcPrice = true;
        formParams = {
          isCompanyMatchPrice: 0,
          canCompanyMatchPrice: false,
          priceMode: form.getFieldValue('tempPriceMode'),
        };
      }
    } else if (tradeType === 0 && assignType === 1) {
      // 司机更改
      const driverInfo = form.getFieldValue('driverInfo');
      if (driverInfo) {
        // needCalcValuationShare = true;
        const isMatchPrice = driverInfo.isMatchPrice;
        formParams = {
          isDriverMatchPrice: isMatchPrice ? 1 : 0,
          canDriverMatchPrice: isMatchPrice,
          costCent: isMatchPrice
            ? driverInfo.price
            : form.getFieldValue('costCent'),
          realPrice: isMatchPrice
            ? driverInfo.price
            : form.getFieldValue('realPrice'),
        };
        if (formType === 'LTL')
          formParams.priceMode =
            RULES_PRICE_CONTRAST_PRICE_MODE[driverInfo.valuationUnit] ||
            form.getFieldValue('priceMode');
      } else {
        isNeedCalcPrice = true;
        formParams = {
          isDriverMatchPrice: 0,
          canDriverMatchPrice: false,
          priceMode: form.getFieldValue('tempPriceMode'),
        };
      }
    }
    form.setFieldsValue(formParams);
    // if (needCalcValuationShare) calcValuationShare();
    if (isNeedCalcPrice) calcNormalPrice();
    else calcRealPrice();
  };

  // 校验抢单交易时间
  const validateTradeTime = () => {
    const validates = [];
    if (form?.getFieldValue('tradeTime')) validates.push('tradeTime');
    if (form?.getFieldValue('quoteEndTime')) validates.push('quoteEndTime');
    if (validates.length > 0) form?.validateFields(validates);
  };

  // 获取行车轨迹行程及时长
  const getRoutePlan = async () => {
    const pointList = form?.getFieldValue('pointList') || [];
    const points = _.filter(
      pointList,
      (point) => !!getPointCoordinate(point, formType),
    );
    if (points.length < 2) {
      form.setFieldsValue({
        estimateMeter: undefined,
        estimateDurationMinute: undefined,
      });
      return;
    }
    const { data } = await fetchRoutePlan({
      pointList: points.map((point) => {
        const addrCom = formType === 'LTL' ? point : point.addrCom || {};
        return {
          lat: addrCom.pointLatitude,
          lon: addrCom.pointLongitude,
        };
      }),
    });
    form.setFieldsValue({
      estimateMeter: data.distance,
      estimateDurationMinute: Math.ceil(data.time / 60),
    });
  };

  // 货物需求地址变化，站点拖拽，站点删除，站点线路导入，货物需求导入产生的站点变化都需要调用此方法
  const updateRoutesPositionCB = (routes?: ObjectType[]) => {
    const pointList = routes || form.getFieldValue('pointList') || [];
    const prevPointList = tempRef.current.pointListRef;
    const attr = formType === 'LTL' ? 'pointAddress' : 'addrCom.pointAddress';
    // 比较站点起点和终点的站点地址，如果两个地址发生变化，需要重新调取价格匹配接口
    if (
      get(pointList[0], attr) !== get(prevPointList[0], attr) ||
      get(pointList[pointList.length - 1], attr) !==
        get(prevPointList[prevPointList.length - 1], attr)
    ) {
      tempRef.current.canPriceFetch = {
        driver: true,
        company: true,
      };
    }

    // 第一个站点到达时间变更，需要重新校验抢单和竞价的生效时间
    if (pointList[0]?.arriveTime !== prevPointList[0]?.arriveTime) {
      // validateTradeTime();
      // const assignType = form.getFieldValue('assignType');
      // const tradeType = form.getFieldValue('tradeType');
      // if (assignType === 1 && tradeType === 0) {
      tempRef.current.canPriceFetch.driver = true;
      // }
    }

    resetPriceList();

    const points = _.filter(
      pointList,
      (point) => !!getPointCoordinate(point, formType),
    );
    const prevPoints = _.filter(
      prevPointList,
      (point) => !!getPointCoordinate(point, formType),
    );

    // 比较站点所有地址是否发生变化，
    let index = Math.max(prevPoints.length, pointList.length) - 1;
    while (index >= 0) {
      if (
        getPointCoordinate(points[index], formType) !==
        getPointCoordinate(prevPoints[index], formType)
      ) {
        calcValuationShare(); // 变化调用价格分摊方法
        getRoutePlan(); // 调用计算行车轨迹和预计时长接口
        return;
      }
      index--;
    }
  };

  // 计算非价格匹配应付费用
  const calcNormalPrice = () => {
    if (formType === 'LTL') calcCostPrice();
    else resetNormalPrice();
  };

  //
  const queryUseFleetQuota = () => {
    const contractInfo = form.getFieldValue('contractInfo');
    const assignType = form.getFieldValue('assignType');
    const tradeType = form.getFieldValue('tradeType');
    if (assignType === 7 && tradeType === 0 && !!contractInfo) {
      queryFleetQuota(contractInfo.id).then((res) => {
        setState({ useFleetQuota: centToYuan(res.data) });
      });
    }
  };

  // 选择合同更改
  const updateContractInfo = () => {
    const contractInfo = form.getFieldValue('contractInfo');
    const priceType = form.getFieldValue('priceType');
    const billingType = contractInfo?.billingType;
    // 合同没有选中的价格类型，手动更改价格类型，之后需重新计算价格
    const shouleSupplyOrder =
      contractInfo?.isBackupOrder === 1 && contractInfo?.backupOrderDay > 0;
    if (billingType !== priceType) {
      form.setFieldsValue({
        priceType: billingType === 2 ? 1 : billingType || 1,
      });
      calcRealPrice(shouleSupplyOrder);
    }
    queryUseFleetQuota();
    setShouldSupplementOrder(shouleSupplyOrder);
  };

  // 指派车队长查看司机是否签署合同
  const checkDriverSigned = async () => {
    if (form.getFieldValue('assignType') !== 7) return;
    const driverInfo = form.getFieldValue('driverInfo');
    if (
      !driverInfo ||
      !driverInfo.driverPhone ||
      _.has(driverInfo, 'isContractSigned')
    )
      return;
    const { data } = await queryDriverSign(driverInfo.driverPhone);
    form.setFieldsValue({
      driverInfo: { ...driverInfo, isContractSigned: data === 10 },
    });
    eventEmitter.emit({
      uniqueKey: tempRef.current.emitterKeys.updatePlatformUndertakeDuty,
    });
  };

  eventEmitter.useSubscription(
    ({ uniqueKey, editKey, updateDataRef, newState }: ObjectType) => {
      const emitterKeys = tempRef.current.emitterKeys;
      switch (uniqueKey) {
        case emitterKeys.resetPriceByCarryInfoChange: {
          // 承运商或者司机修改,变更价格
          updatePriceByPriceRule();
          break;
        }
        case emitterKeys.callFetchPriceRulesList: {
          // 获取承运商价格
          resetPriceList();
          break;
        }
        case emitterKeys.validateTradeTime: {
          // 站点变化校验抢单交易时间
          validateTradeTime();
          break;
        }
        case emitterKeys.calcAccountReceivable: {
          // 价格匹配，由系统匹配切换成手动输入时，重新计算之前手动输入价格
          calcNormalPrice();
          break;
        }
        case emitterKeys.calcValuationShare: {
          // 计算价格分摊，在costCent，站点，车长车型，车辆信息发生变化，进行计算
          calcValuationShare();
          break;
        }
        case emitterKeys.updateDataRef: {
          // 操作ref内信息
          updateDataRef(tempRef.current);
          break;
        }
        case emitterKeys.updateState: {
          // 更新state信息
          setState({ ...state, ...newState });
          break;
        }
        case emitterKeys.calcRealPrice: {
          calcRealPrice();
          break;
        }
        case emitterKeys.updateCostCentWithKC: {
          updateCostCentWithKC();
          break;
        }
        // 承责合同复选框自动更改重置选中合同
        case emitterKeys.resetContractInfo: {
          updateContractInfo();
          break;
        }
        case emitterKeys.checkDriverContractSigned: {
          checkDriverSigned();
          break;
        }
        case emitterKeys.calcSupplyPrice: {
          // 计算后补单价格
          //
          if (
            (tempRef.current.isSupplyOrderPrice && !getIsSupplyOrder()) ||
            (!tempRef.current.isSupplyOrderPrice && getIsSupplyOrder())
          ) {
            calcRealPrice();
          }
          break;
        }
      }
    },
  );

  const validatePriceInput = () => {
    const priceRequired = !(
      !form?.getFieldValue('contractInfo') &&
      form?.getFieldValue('assignType') === 1 &&
      form.getFieldValue('tradeType') === 0
    );
    const costCent = form?.getFieldValue('costCent');
    const originPrice = form?.getFieldValue('originPrice');
    if (priceRequired) {
      // 需要价格必填
      if (costCent === 0) form.validateFields([['costCent']]);
      if (originPrice === 0) form.validateFields([['originPrice']]);
    } else {
      // 不需要价格必填
      if (form.getFieldError(['originPrice']).length > 0)
        form.validateFields([['originPrice']]);
      if (form.getFieldError(['costCent']).length > 0)
        form.validateFields([['costCent']]);
    }
  };

  /**
   * 表单更改需要执行操作
   * 包括tradeType,companyInfo,driverInfo,vehicleInfo 发生的变化
   * @param changeVal
   */
  const updateFormItemCB = (changeVal: ObjectType) => {
    // 交易类型变更
    if (_.has(changeVal, 'tradeType')) {
      processAssignTypeChangeCb();
      if (changeVal.tradeType === 0) {
        form.setFieldsValue({ platformUndertakeDutyDriver: false });
        // 切换为派单，如果没有选择止指派类型，强制设置为指派车辆
        if (!form.getFieldValue('assignType'))
          form.setFieldsValue({ assignType: 1 });
        updatePriceByPriceRule();
      } else {
        calcNormalPrice();
      }
      // calcValuationShare();
      updateRoutesPositionCB();
      setTimeout(validatePriceInput, 300);
    }

    // 勾选合同承责
    if (_.has(changeVal, 'platformUndertakeDutyDriver')) {
      form
        .validateFields(['driverInfo', 'vehicleInfo'])
        .then(() => {
          form?.setFieldsValue({
            contractInfo: changeVal.platformUndertakeDutyDriver
              ? state.transContractList[0]
              : undefined,
          });
          updateContractInfo();
          processAssignTypeChangeCb(true);
        })
        .catch((error) => {
          form.setFieldsValue({ platformUndertakeDutyDriver: false });
          setState({ isTms: true });
          calcRealPrice();
        })
        .finally(() => {
          validatePriceInput();
        });
    }

    // 勾选合同承责
    if (_.has(changeVal, 'platformUndertakeDuty')) {
      form?.setFieldsValue({
        contractInfo: changeVal.platformUndertakeDuty
          ? state.transContractList[0]
          : undefined,
      });
      // updateContractInfo();
      processAssignTypeChangeCb();
    }

    if (_.has(changeVal, 'companyInfo')) {
      setState({ isInvite: changeVal.companyInfo?.carrierId === '-99' });
      updatePriceByPriceRule(); // 承运商修改
    }

    if (_.has(changeVal, 'driverInfo')) {
      setState({ isInvite: changeVal.driverInfo?.id === '-99' });
      updatePriceByPriceRule();
      checkDriverSigned();
    }

    if (_.has(changeVal, 'assignType')) {
      validatePriceInput();
      checkDriverSigned();
      queryUseFleetQuota();
      eventEmitter.emit({
        uniqueKey: tempRef.current.emitterKeys.updatePlatformUndertakeDuty,
      });
    }

    // 车辆信息变化，调用价格策略
    if (_.has(changeVal, 'vehicleInfo')) {
      setState({ isInvite: changeVal.vehicleInfo?.id === '-99' });
      calcValuationShare();
    }

    // 车长车型发生变化，调用价格策略
    if (
      _.has(changeVal, 'vehicleData') ||
      _.has(changeVal, 'vehicleTypeList') ||
      _.has(changeVal, 'vehicleLength')
    ) {
      calcValuationShare();
    }

    if (_.has(changeVal, 'contractInfo')) updateContractInfo(); // 选择合同更改

    if (_.has(changeVal, 'priceType')) calcRealPrice(); // 价格类型变更
  };

  // 返回列表
  const onGoback = () => {
    global.eventEmitter.emit({
      uniqueKey: 'PAGE_TABS',
      action: 'onClose',
      value: {
        pathname: location.pathname,
        nextPathname: '/capacityOrder/list',
      },
    });
  };

  // 刷新列表
  const refreshList = () => {
    eventEmitter.emit({
      uniqueKey: 'ORDER_LIST',
      action: 'reload',
    });
  };

  // 不允许提交条件
  const getSubmitDisabled = () => {
    const {
      assignType,
      platformUndertakeDutyDriver,
      tradeType,
      contractInfo,
      // includeAmount,
      excludeAmount,
    } = form.getFieldsValue([
      'assignType',
      'platformUndertakeDutyDriver',
      'tradeType',
      'contractInfo',
      'excludeAmount',
      // 'includeAmount'
    ]);
    if (
      assignType === 7 &&
      tradeType === 0 &&
      platformUndertakeDutyDriver &&
      !!contractInfo
    ) {
      const monthLimitAmount = centToYuan(
        contractInfo.driverLeaderInfo?.monthLimitAmount,
      );
      const singleLimitAmount = centToYuan(
        contractInfo.driverLeaderInfo?.singleLimitAmount,
      );
      if (contractInfo.driverLeaderInfo?.driverLeader !== 1) return true; // 是否存在车队长
      if (
        !_.isNil(monthLimitAmount) &&
        excludeAmount > monthLimitAmount - state.useFleetQuota
      )
        return true; // 额度不足
      if (!_.isNil(singleLimitAmount) && excludeAmount > singleLimitAmount)
        return true; // 单次额度不足
      return false;
    }
    return false;
  };

  return {
    form,
    initPriceRuleParams,
    processAssignTypeChangeCb,
    updateIsInvite,
    resetPriceList,
    updateFormItemCB,
    state,
    setState,
    tempRef: tempRef.current,
    updateRoutesPositionCB,
    initTempRef,
    updatePriceByPriceRule,
    onGoback,
    onRefreshList: refreshList,
    calcCostPrice,
    calcRealPrice,
    calcValuationShare,
    initalFun,
    getRoutePlan,
    updateCostCentWithKC,
    setShouldSupplementOrder,
    setShouldCheckCurTime,
    checkDriverSigned,
    getSubmitDisabled,
    queryUseFleetQuota,
  } as const;
}

export default useCommonForm;
