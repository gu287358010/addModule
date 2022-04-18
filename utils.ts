import { emojiRule, specialChatRule } from '@/utils/verification';
import React from 'react';
import { guid, isDateTime } from '@/utils';
import {
  unitTransform,
  get,
  getPrevCitys,
  CityLevelEnum,
  getCityLevel,
  obtainPrevDistrict,
  obtainDic,
  global,
} from '@parallel-line/utils';
import moment from 'moment';
import { Context, FormType, ObjectType } from './types';
import { EMITTER_KEYS, INITAL_CONTEXT } from './constants';

const { isQuoteDuty, isGrabDuty } = global.PXX_SOLUTION;

// 重置推送key值，生成唯一key
export const resetEmitterKeys = () =>
  _.mapValues(EMITTER_KEYS, (val: string) => Symbol(val));

export const FormContext = React.createContext<Context>(INITAL_CONTEXT);

export const initalFormValues = {
  assignType: 1,
  priceType: 1, // 运费类型
  tradeType: 0,
  scopeTag: get(obtainDic({ dicKey: 'request.request.scope_tag' }), '[0]', {})
    .key,
  depositCode: get(
    obtainDic({ dicKey: 'trade.trade.deposit_config_code' }),
    '[0]',
    {},
  ).key,
  bidderScope: 10,
  needDeposit: 0,
  quoteCount: 3,
  platformUndertakeDutyQuote: isQuoteDuty,
  platformUndertakeDutyGrab: isGrabDuty,
  paymentType: '30',
};

export const initalSite = () => ({
  sendGoods: [], // 发货货物
  dischargeGoods: [], // 卸货货物
  contacts: undefined, // 站点联系人
  contactsPhone: undefined, // 站点联系人电话
  tempId: guid(),
  sendTime: undefined, // 发车时间
  arriveTime: undefined, // 到达时间
});

// 单个货物
export const initalSingleGoods = () => ({
  tempId: guid(),
  priceMode: '0', // 计价方式
  goodsItemGrossWeight: undefined, // 货物重量
  descriptionOfGoods: undefined, // 货物名称
  cargoTypeClassificationCode: undefined, // 货物类型
  goodsItemCube: undefined, // 货物体积
  totalNumberOfPackages: undefined, // 货物数量
  unitPrice: undefined, // 单价
  isExecuteRule: false, // 是否是阶梯计价
});

// 初始化需求
export const initalRequirement = (cargoRequestNo: string) => ({
  cargoOwner: undefined,
  paymentType: undefined,
  cargoGoodsList: [initalSingleGoods()],
  cargoPointList: [{}, {}], // 装货点和卸货点
  cargoRequestNo, // 需求编号
  cargoPriceType: '0',
});

// 校验整车及货物需求地址
export const checkAddr = (val?: ObjectType) => {
  if (!val) return Promise.reject('请选择地址信息');
  if (!get(val, 'pointAddress')) return Promise.reject('请选择地址');
  // if (!get(val, 'contacts')) return Promise.reject('请输入地址联系人');
  // if (!get(val, 'contactsPhone')) return Promise.reject('请输入地址联系人电话');
  return Promise.resolve();
};

/**
 * 校验价格信息
 * @param value 输入价格
 * @param required 是否必填
 * @param otherValidate 除常规价格匹配外，其他的匹配规则
 * @returns
 */
export const checkPrice = (
  value: string | number | undefined,
  required = true,
  otherValidate?: () => void,
) => {
  if (_.isNil(value)) {
    if (required) return Promise.reject('请输入价格');
    return Promise.resolve();
  }
  if (Number.isNaN(Number(value)) && value !== '-') {
    return Promise.reject('请输入数值');
  }
  if (value <= 0) {
    return Promise.reject('输入价格需要大于0元');
  }
  if (value > 20000000) {
    return Promise.reject('输入价格不能高于2千万元');
  }
  if (otherValidate) return otherValidate();
  return Promise.resolve();
};

/**
 * 校验必填
 * @param val 输入价格
 * @param required 是否必填
 * @param message 错误提示
 * @returns
 */
const checkRequired = (
  val: string | number | undefined,
  required: boolean = true,
  message: string,
) => {
  if (!val && required) {
    return Promise.reject(message);
  }
  return Promise.resolve();
};

// 校验联系方式
export const checkConcatPhone = (
  value: string,
  required: boolean = true,
  message: string = '请输入联系方式',
) => {
  if (!value) {
    if (required) return Promise.reject(message);
    return Promise.resolve();
  }
  const reg1 = /0\d{2,3}-\d{7,8}/; // 座机
  const reg2 = /1\d{10}/; // 手机
  if (reg1.test(value) || reg2.test(value)) return Promise.resolve();
  return Promise.reject('请输入正确联系方式');
};

// 校验收发货地址
export const checkAdress = (
  value: ObjectType | undefined,
  type?: 'send' | 'arrive' | 'receipt',
  anotherAddr?: string, // 收货或者发货地址
) => {
  if (value?.pointCode && value?.pointAddress) {
    if (value?.pointAddress === anotherAddr) {
      if (type === 'send') return Promise.reject('发货地址不能等于收货地址');
      return Promise.reject('收货地址不能等于发货地址');
    }
    return Promise.resolve();
  }
  let message = '请选择地址';
  if (type === 'send') message = '请选择发货地址';
  if (type === 'arrive') message = '请选择收货地址';
  return Promise.reject(message);
};

// 货物重量校验
const checkGoodsWeight = (
  val: string | number | undefined,
  required: boolean,
) => {
  if (!val) {
    if (required) return Promise.reject('请输入货物重量');
    return Promise.resolve();
  }
  if (Number.isNaN(Number(val)) && val !== '-') {
    return Promise.reject('货物重量需要为数值');
  }
  if (val <= 0) {
    return Promise.reject('货物重量不能小于0kg');
  }
  if (val > 2000000) {
    return Promise.reject('货物重量不能高于2百万kg');
  }
  return Promise.resolve();
};

// 货物体积校验
const checkGoodsVolume = (
  val: string | number | undefined,
  required: boolean,
) => {
  if (!val) {
    if (required) return Promise.reject('请输入货物体积');
    return Promise.resolve();
  }
  if (Number.isNaN(Number(val)) && val !== '-') {
    return Promise.reject('货物体积需要为数值');
  }
  if (val <= 0) {
    return Promise.reject('货物体积不能小于0立方米');
  }
  if (val > 2000) {
    return Promise.reject('货物体积不能高于2000立方米');
  }
  return Promise.resolve();
};

// 货物重量校验
const checkGoodsCount = (
  val: string | number | undefined,
  required: boolean,
) => {
  if (!val) {
    if (required) return Promise.reject('请输入货物件数');
    return Promise.resolve();
  }
  if (Number.isNaN(Number(val)) && val !== '-') {
    return Promise.reject('货物件数需要为数值');
  }
  if (val <= 0) {
    return Promise.reject('货物件数不能小于0件');
  }
  if (val > 20000000) {
    return Promise.reject('货物件数不能高于2千万件');
  }
  return Promise.resolve();
};

// 检测货物单价
const checkIsUnitPrice = (
  val: string | number | undefined,
  required: boolean,
) => {
  if (!val) {
    if (required) return Promise.reject('请输入货物单价');
    return Promise.resolve();
  }
  if (Number.isNaN(Number(val)) && val !== '-') {
    return Promise.reject('价格需要为数值');
  }
  return Promise.resolve();
};

type Rule = [
  'required' | 'maxLength' | 'emoji' | 'specialChat',
  undefined | string | boolean | number,
];

/**
 * 按数组顺序校验，失败退出
 * @param rules 规则list [[required, false | emptyString], [maxLength: number], [emoji, boolean], [specialChat, boolean]]
 * @param val
 * @returns
 */
export const checkRules = (rules: Rule[], val?: string) => {
  while (rules.length > 0) {
    const [ruleKey, ruleValue] = rules.shift() as Rule;
    if (ruleKey === 'required' && ruleValue) {
      if (!val) return Promise.reject(ruleValue);
    } else if (val) {
      if (ruleKey === 'maxLength' && val.length > (ruleValue as number))
        return Promise.reject(`输入不能超过${ruleValue}个字`);
      if (ruleKey === 'emoji' && ruleValue) {
        if (emojiRule.test(val)) return Promise.reject('请勿输入表情');
      }
      if (ruleKey === 'specialChat' && ruleValue && !specialChatRule.test(val))
        return Promise.reject('请勿输入特殊字符');
    }
  }
  return Promise.resolve();
};

const checkDescription = (val: string, required: boolean) => {
  const rules: Rule[] = [
    ['maxLength', 200],
    ['emoji', true],
  ];
  if (required) rules.unshift(['required', '请输入货物名称']);
  return checkRules(rules, val);
};

// 货物校验方法
export const checkGoodsFuncs = {
  descriptionOfGoods: (val: string, required: boolean) =>
    checkDescription(val, required),
  cargoTypeClassificationCode: (val: string, required: boolean) =>
    checkRequired(val, required, '请选择货物类型'),
  goodsItemGrossWeight: (val: string, required: boolean) =>
    checkGoodsWeight(val, required), // 货物重量
  goodsItemCube: (val: string, required: boolean) =>
    checkGoodsVolume(val, required), // 货物体积
  totalNumberOfPackages: (val: string, required: boolean) =>
    checkGoodsCount(val, required), // 货物数量
  unitPrice: (val: string, required: boolean) =>
    checkIsUnitPrice(val, required), // 货物单价
};

// 需求校验方法
export const checkRequireFuncs = {
  'cargoPointList[0].address': (
    val: ObjectType | undefined,
    arriveAddr: string,
  ) => checkAdress(val, 'send', arriveAddr), // 发货地址
  'cargoPointList[0].address.contacts': checkRequired, // 校验联系人
  'cargoPointList[0].address.contactsPhone': checkConcatPhone, // 校验联系人电话
  'cargoPointList[1].address': (
    val: ObjectType | undefined,
    sendAddr: string,
  ) => checkAdress(val, 'arrive', sendAddr), // 收货地址
  'cargoPointList[1].address.contacts': checkRequired, // 校验联系人
  'cargoPointList[1].address.contactsPhone': checkConcatPhone, // 校验联系人电话
};

/**
 * 获取站点类型 10:装货 20:卸货  30:经停点
 * @param index
 * @param len
 */
export const getPointType = (index: number, len: number) => {
  if (index === 0) return 10;
  if (index === len - 1) return 20;
  return 30;
};

/**
 * 获取站点操作类型（1装货，2卸货，3有装有卸）
 * @param param
 */
export const getPointOperateType = (
  sendGoods: ObjectType[],
  dischargeGoods: ObjectType[],
) => {
  if (
    get(sendGoods, 'list', []).length > 0 &&
    get(dischargeGoods, 'list', []).length > 0
  )
    return 3;
  if (get(sendGoods, 'list', []).length > 0) return 1;
  return 2;
};

/**
 * 单位转换
 * @param value
 * @param unitTransform 方法名
 * @returns
 */
export const transNumber = (value: string | number, funcName: string) => {
  return !_.isNil(value) ? unitTransform[funcName]?.(+value) : undefined;
};

/**
 * 返回精确到分钟的时间戳
 * @param val
 */
export const getDateValue = (
  val: moment.Moment = moment(),
  format?: string,
) => {
  if (!val) return 0;
  let _format = format;
  if (!format) _format = isDateTime(val) ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm';
  return moment(val.format(_format)).valueOf();
};

/**
 * 将moment时间末尾展示为秒转化成00
 * @param time
 * @returns
 */
export const formatMinuteTime = (time?: moment.Moment) => {
  if (!time) return time;
  return moment(time.format('YYYY-MM-DD HH:mm') + ':00');
};

/**
 * 累加阶梯计算价格
 * @param list 阶梯价格规则
 * @param val 输入值
 * @returns
 */
export const matchPrice = (list: ObjectType, val: number | undefined) => {
  if (!val) return val;
  let result = 0;
  for (let i = 0; i < list.length; i += 1) {
    const startV = list[i].startValue;
    const endV = list[i].endValue;
    const amount = +list[i].amount;
    if (i === 0) result += amount;
    else if (i === list.length - 1 && val >= startV)
      result += (val - startV) * amount;
    else if (val > startV) {
      if (val <= endV) result += (val - startV) * amount;
      else result += (endV - startV) * amount;
    }
  }
  return _.round(result, 2);
};

/**
 * 范围阶梯计算价格
 * @param list
 * @param val
 * @returns
 */
export const matchPriceByRange = (
  list: ObjectType,
  val: number | undefined,
) => {
  if (!val) return val;
  let result = 0;
  for (let i = 0; i < list.length; i += 1) {
    const startV = list[i].startValue;
    const endV = list[i].endValue;
    const amount = +list[i].amount;
    if (i === 0 && val <= endV) {
      result = amount;
      break;
    }
    if (i === list.length - 1 && val >= startV) {
      result = val * amount;
      break;
    }
    if (val > startV && val <= endV) {
      result = val * amount;
      break;
    }
  }
  return _.round(result, 2);
};

/** 获取城市code */
export const getCityCode = (adcode: string) => {
  const level = getCityLevel(adcode);
  const adcodes = getPrevCitys(adcode);
  let code;
  if (level === CityLevelEnum.DISTRICT) {
    code = adcodes[1];
  } else if (level === CityLevelEnum.MUNICIPALITY) {
    code = adcodes[0];
  } else if (level === CityLevelEnum.CITY) {
    code = adcodes[1];
  }
  return code;
};

// 数字输入框格式化
export const formatInpNumber = (v?: string | number) => {
  const reg = /\B(?=(\d{3})+(?!\d))/g;
  return String(v).replace(reg, ',');
};

// 数字输入框转回
export const parserInpNumber = (v: any) => v.replace(/\$\s?|(,*)/g, '');

/**
 * FormItem是否需要重新渲染,只能用于基础数据类型判断
 * @param prev
 * @param current
 * @param keys 需要比较的字段
 */
export const isNeedShouldUpdate = (
  prev: ObjectType,
  current: ObjectType,
  keys: string | string[],
) => {
  const arr = _.castArray(keys);
  return arr.some((key) => !_.isEqual(get(current, key), get(prev, key)));
};

/**
 * 获取特定的组级元素
 * @param node 当前元素
 * @param ancestorClassName 要寻找的组级元素的classname
 * @returns
 */
export const getAncestorEle = (
  node: HTMLElement,
  ancestorClassName: string,
) => {
  if (!node) return null;
  let x = node;
  while (x.tagName !== 'BODY') {
    if (x.className.includes(ancestorClassName)) return x;
    x = x.parentNode as HTMLElement;
  }
  return node;
};

/**
 * 获取站点坐标
 * @param point
 * @return  lon, lat
 */
export const getPointCoordinate = (point: ObjectType, formType: FormType) => {
  const pointInfo = formType === 'FTL' ? get(point, 'addrCom') : point;
  const lon = get(pointInfo, 'pointLongitude');
  const lat = get(pointInfo, 'pointLatitude');
  if (!lon || !lat) return undefined;
  return `${lon},${lat}`;
};

export const getAdcodeLabel = (adcode?: string) => {
  if (!adcode) return '--';
  const { province, city, district, level } = obtainPrevDistrict({ adcode });
  const names = [city?.name, district?.name];
  if (level !== 'municipality') names.unshift(province?.name); // 省级直辖市
  return _.compact(names).join('');
};

// 获取车辆唯一信息
export const getUniqueVehicle = (vehicleInfo: ObjectType) => {
  if (!vehicleInfo) return undefined;
  if (vehicleInfo?.id === '-99') return vehicleInfo?.id;
  return vehicleInfo?.vehicleNumber + '_' + vehicleInfo?.vehiclePlateColorCode;
};

// 获取司机唯一信息
export const getUniqueDriver = (driverInfo: ObjectType, ruleId?: string) => {
  if (!driverInfo) return undefined;
  if (driverInfo?.id === '-99') return driverInfo?.id;
  // let res = driverInfo?.driverName + '_' + driverInfo?.driverPhone;
  let res = driverInfo?.driverPhone;
  if (ruleId) return res + '_' + ruleId;
  return res;
};

// 两个时间比较, 前一个时间大于后一个时间
export const compareTime = (
  prevTime?: moment.Moment,
  lastTime?: moment.Moment,
) => {
  if (!prevTime || !lastTime) {
    const format = isDateTime(prevTime || lastTime)
      ? 'YYYY-MM-DD'
      : 'YYYY-MM-DD HH:mm';
    return getDateValue(prevTime, format) > getDateValue(lastTime, format);
  }
  const isPrevTimeIsDateTime = isDateTime(prevTime);
  const isLastTimeIsDateTime = isDateTime(lastTime);
  // 都是以天为单位
  if (isPrevTimeIsDateTime && isLastTimeIsDateTime)
    return (
      getDateValue(prevTime, 'YYYY-MM-DD') >
      getDateValue(lastTime, 'YYYY-MM-DD')
    );
  if (!isPrevTimeIsDateTime && !isLastTimeIsDateTime) {
    // 都是以分为单位
    return getDateValue(prevTime) > getDateValue(lastTime);
  }
  // 其中一个是以天为单位，另一个以分钟为单位
  return (
    getDateValue(prevTime, 'YYYY-MM-DD') > getDateValue(lastTime, 'YYYY-MM-DD')
  );
};

// 后补单时间校验
export const checkSupplementOrderTimeIsError = (
  value: moment.Moment,
  supplementOrdeDate: number,
) => {
  const compareTime = moment().subtract(supplementOrdeDate, 'days');
  const format = isDateTime(value) ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm';
  return getDateValue(compareTime, format) > getDateValue(value, format);
};

export const getTimeErr = (key: number, supplementOrdeDate?: number) => {
  const SITE_TIME_ERR_TYPES = {
    1: '到达时间需要大于前面站点的时间',
    2: '发车时间需要大于前面站点的时间',
    3: '请选择到达时间',
    4: '到达时间需要大于当前时间',
    5: `到达时间不能早于当前时间${supplementOrdeDate}天以上`,
    6: '发车时间需要大于当前时间',
    7: `发车时间不能早于当前时间${supplementOrdeDate}天以上`,
  };
  return SITE_TIME_ERR_TYPES[key];
};
