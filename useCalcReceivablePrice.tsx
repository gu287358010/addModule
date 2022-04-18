/**
 * 计算应收费用
 */
import { EmitterKeys, ObjectType } from './types';
import { get, global } from '@parallel-line/utils';
// import { executeRule } from '@/services/order';
import { FormInstance } from 'antd/es/form';
import { CARGO_PRICE_TYPES, UNIT_MAPPING } from './constants';
import { getCounts } from '../util';

const { isShipper } = global.PXX_SOLUTION;

function useCalcReceivablePrice(form: FormInstance, emitterKeys: EmitterKeys) {
  // const excuteRules = useRef({});

  // const getExcuteRule = async (params: ObjectType) => {
  //   const key = _.reduce(
  //     params,
  //     (prev, val) => {
  //       prev += val;
  //       return prev;
  //     },
  //     '',
  //   );
  //   let rule = get(excuteRules.current, key);
  //   if (_.has(excuteRules.current, key)) return rule;
  //   const { data: rules } = await executeRule(params);
  //   rule = get(rules, '[0]');
  //   _.set(excuteRules.current, key, rule);
  //   return rule;
  // };

  // 计算应收费用
  const calcTotalPrice = async (
    carReq: ObjectType,
    rowIndex: number,
    cargoReqIndex: number,
    isInital?: boolean,
  ) => {
    const reqs = form?.getFieldValue('cargoRequestList');
    const cargoReq = reqs[cargoReqIndex];
    const record = get(cargoReq, `cargoGoodsList[${rowIndex}]`);
    const payload = { ...record };
    const unitKey = UNIT_MAPPING[record.priceMode]?.key;
    const cargoPriceType = cargoReq.cargoPriceType;
    const cargoPriceValue = cargoReq.cargoPriceValue;
    let price;

    // let unitPrice = record.unitPrice;
    try {
      // 价格匹配不要了，真是棒棒的
      // let rule;
      // if (
      //   carReq.cargoOwner &&
      //   get(carReq, 'cargoPointList[0].address.pointAddress') &&
      //   get(carReq, 'cargoPointList[1].address.pointAddress')
      // ) {
      //   const params = {
      //     applyFor: carReq.cargoOwner,
      //     addressStart: get(carReq, 'cargoPointList[0].address.pointAddress'),
      //     addressEnd: get(carReq, 'cargoPointList[1].address.pointAddress'),
      //     valuationUnit: UNIT_MAPPING[record.priceMode]?.priceKey,
      //   };
      //   rule = await getExcuteRule(params);
      // }
      // if (rule) {
      //   price = matchPrice(rule.ladders || [], record[unitKey]);
      //   payload.isExecuteRule = true;
      //   payload.rule = rule;
      // } else {
      //   payload.isExecuteRule = false;
      //   payload.rule = undefined;
      if (cargoPriceType === '0') {
        if (record.unitPrice && record[unitKey]) {
          price = _.round(record.unitPrice * record[unitKey], 2);
        }
      } else {
        // 计价方式除明细外的其他情况
        price = undefined;
        payload.unitPrice = undefined;
        payload.accountReceivable = undefined;
        const cargoKey = CARGO_PRICE_TYPES[cargoPriceType].key;
        if (
          cargoPriceType !== '1' &&
          record[cargoKey] &&
          cargoPriceValue >= 0
        ) {
          price = _.round(record[cargoKey] * cargoPriceValue, 2);
        }
      }

      // }
    } catch (error) {
      console.log(error);
    }

    if (!isInital) payload.accountReceivable = price;

    const res = [...carReq.cargoGoodsList];
    res.splice(rowIndex, 1, payload);

    reqs[cargoReqIndex].cargoGoodsList = res;
    form.setFieldsValue({ cargoRequestList: reqs });
  };

  // 计算每个货物需求的应收费用总额
  const calcTotalReceivablePrice = (cargoReqIndex: number) => {
    const cargoRequestList = form?.getFieldValue('cargoRequestList');
    const cargoReq = cargoRequestList[cargoReqIndex];
    const cargoPriceType = cargoReq.cargoPriceType;
    const cargoPriceValue = cargoReq.cargoPriceValue;
    let cargoTotalCost;
    if (cargoPriceType === '1') {
      // 按趟
      cargoTotalCost = cargoPriceValue;
    } else {
      cargoTotalCost = getCounts(
        cargoReq?.cargoGoodsList || [],
        'accountReceivable',
        false,
        false,
      );
    }
    cargoReq.cargoTotalCost = cargoTotalCost;
    form.setFieldsValue({ cargoRequestList });
  };

  /**
   * 计算
   * @param cargoReqIndex 需求idex
   * @param goodsIndex 货物index
   * @param isInital 是否是初始化
   */
  const calcReceivablePrice = (
    cargoReqIndex: number,
    goodsIndex?: number,
    isInital = false,
  ) => {
    if (isShipper) {
      const cargoRequestList = form?.getFieldValue('cargoRequestList');
      form.setFieldsValue({ cargoRequestList: [...cargoRequestList] });
      return;
    }
    const cargoReq = form?.getFieldValue(['cargoRequestList', cargoReqIndex]);
    const cargoGoods = cargoReq?.cargoGoodsList || [];
    const ids = goodsIndex ? [goodsIndex] : _.range(cargoGoods.length);
    ids.forEach((item) =>
      calcTotalPrice(cargoReq, item, cargoReqIndex, isInital),
    );
    calcTotalReceivablePrice(cargoReqIndex);
    global.eventEmitter.emit({ uniqueKey: emitterKeys.updateCostCentWithKC });
  };

  // 接收推送通知计算应收费用
  global.eventEmitter.useSubscription(
    ({ uniqueKey, cargoReqIndex, goodsIndex }) => {
      if (uniqueKey === emitterKeys.updateReqGoods) {
        calcReceivablePrice(cargoReqIndex, goodsIndex);
      }
    },
  );

  return calcReceivablePrice;
}

export default useCalcReceivablePrice;
