import { get, obtainDic } from '@parallel-line/utils';

// 货物需求计价方式对应货物单位
export const CARGO_PRICE_TYPES = {
  '1': {
    label: '元/趟',
  },
  '2': {
    label: '元/kg',
    key: 'goodsItemGrossWeight',
  },
  '3': {
    label: '元/m³',
    key: 'goodsItemCube',
  },
  '4': {
    label: '元/件',
    key: 'totalNumberOfPackages',
  },
};

// 货物需求内计价单位对应后端价格匹配的计价单位
export const UNIT_MAPPING = {
  '0': {
    key: 'totalNumberOfPackages',
    priceKey: 71,
  },
  '10': {
    key: 'goodsItemGrossWeight',
    priceKey: 51,
  },
  '20': {
    key: 'goodsItemCube',
    priceKey: 61,
  },
};

// 价格规则计价方式对应下单应付计价方式的值
export const RULES_PRICE_CONTRAST_PRICE_MODE = {
  71: '1',
  51: '2',
  61: '3',
  11: '4',
  52: '5',
};

// 计价单位对应货物需求的key值
export const GOODS_KEY_IN_PRICE_MODE = {
  '1': 'totalNumberOfPackages',
  '2': 'goodsItemGrossWeight',
  '3': 'goodsItemCube',
  '5': 'goodsItemGrossWeight',
};

// 推送key值
export const EMITTER_KEYS = {
  scrollTop: 'SCROLL_TOP', // 页面滚动
  fetchPriceRulesList: 'FETCH_PRICE_RULES_LIST', // 获取价格匹配列表
  callFetchPriceRulesList: 'CALL_FETCH_PRICE_RULES_LIST', // 执行获取价格匹配方法
  resetPriceByCarryInfoChange: 'RESET_PRICE_BY_COMPANY_OR_DRIVER_CHANGE', // 承运商或司机发生变化，设置运输价格
  importCargoSuc: 'IMPORT_CARGO_SUCCESS', // 导入货物需求成功
  updatePriceList: 'UPDATE_PRICE_LIST', // 重置价格匹配列表价格
  calcRealPrice: 'CALC_REAL_PRICE', // 计算真实运输价格
  updateReqGoods: 'CALC_ACCOUNT_RECEIVABLE_By_INP', // 货物需求数量，体积，重量发生变化
  validateBreakBulk: 'VALIDATE_BREAK_BLUK', // 提交前表单校验
  passReqValidate: 'BREAK_BLUK_ADD_REQUIRE_SUCCESS', // 货物需求通过校验
  failReqValidate: 'BREAK_BLUK_ADD_REQUIRE_ERROR', // 货物需求无法通过校验
  calcPaymentAccount: 'CALC_PAYMENT_ACCOUNT', // 计算非价格匹配价格
  validateTradeTime: 'VALIDATE_TRADE_TIME', // 站点变化校验抢单交易时间
  updatePointsSuc: 'UPDATE_POINTS_SUC', // 站点拖拽或者导入站点产生变化
  calcValuationShare: 'CALC_VALUATION_SHARE', // 计算价格分摊
  updateDataRef: 'UPDATE_REF_DATA', // 更改refdata数据
  updateState: 'UPDATE_STATE', // 更state数据
  calcAccountReceivable: 'CALC_ACCOUNT_RECEIVABLE', // 计算应收价格
  updateCostCentWithKC: 'UPDATE_COST_CENT_WITH_KC', // KC配置应收价格设置成应付价格
  validateRoutesTime: 'VALIDATE_ROUTES_TIME', // 校验流向时间
  initDriverAndVehicle: 'INIT_DRICER_AND_VEHICLE', // 初始化车辆司机信息
  resetDriverAndVehicleCb: 'RESET_DRICER_AND_VEHICLE_CB', // 编辑或再来一单获取详情接口后重置司机车辆信息回调
  resetContractInfo: 'RESET_CONTRACT_INFO', // 重置选中合同
  checkDriverContractSigned: 'CHECK_DRIVER_CONTRACT_SIGNED', // 指派车队长查看司机是否签署合同
  updatePlatformUndertakeDuty: 'UPDATE_PLATFORM_UNDERTAKE_DUTY', //  切换交易类型和发布对象处理PlatformUndertakeDuty
  calcSupplyPrice: 'CALC_SUPPLY_PRICE', // 计算后补单价格
};

export const INITAL_FORM_VALUES = {
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
  valuationShare: {}, // 价格分摊信息
  paymentType: '30',
};

export const INITAL_CONTEXT = {
  isTms: true,
  form: null,
  cargoDisabled: false,
  emitterKeys: EMITTER_KEYS,
  canFetchVehicles: false, // 为保证司机车辆显示正确，需要在获取详情后再调用司机车辆相关接口
  transContractList: [],
  shouldCheckCurTime: false,
};

export const MAX_PRICE = 20000000; // 传入后端最大价格为2千万
