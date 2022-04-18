import { ObjectType } from './types';
import { getPointType, transNumber } from './utils';
import { get, toTime } from '@parallel-line/utils';

export const formatSubmitTime = (time?: moment.Moment) => {
  if (!time) return time;
  return toTime(time, { isISO: true });
};

/**
 * 格式化起始地，目的地
 * @param data
 * @returns
 */
export const formatSubmitOtherAddrs = (data: ObjectType) => {
  const { startAddr, endAddr } = data;
  return {
    senderName: get(startAddr, 'contacts'), // 起始地姓名
    senderPhone: get(startAddr, 'contactsPhone'), // 起始地联系人方式
    senderAddress: get(startAddr, 'pointAddress'), // 起始地地址
    senderAddressCode: get(startAddr, 'pointCode'), // 起始地编码
    senderAddressLongitude: get(startAddr, 'pointLongitude'), // 起始地经度
    senderAddressLatitude: get(startAddr, 'pointLatitude'), // 起始地纬度

    receiverName: get(endAddr, 'contacts'), // 目地地姓名
    receiverPhone: get(endAddr, 'contactsPhone'), // 目地地联系人方式
    receiverAddress: get(endAddr, 'pointAddress'), // 目地地地址
    receiverAddressCode: get(endAddr, 'pointCode'), // 目地地编码
    receiverAddressLongitude: get(endAddr, 'pointLongitude'), // 目地地经度
    receiverAddressLatitude: get(endAddr, 'pointLatitude'), // 目地地纬度
  };
};

/**
 * 格式化回单信息
 * @param {ObjectType} receipt
 * @return {*}
 */
export const formatReceiptInfo = (receipt: ObjectType) => {
  const { receiptType = [], addrCom: receiptAddrCom = {}, ...receiptParams } =
    receipt || {};
  return {
    ...receiptParams,
    receiptCode: receiptAddrCom.pointCode,
    receiptAddress: receiptAddrCom.pointAddress,
    receipter: receiptAddrCom.contacts,
    receipterPhone: receiptAddrCom.contactsPhone,
    mailBack: Number(receiptType.includes('0')),
    uploadPhoto: Number(receiptType.includes('1')),
  };
};

const GOODS_KEYS = [
  'goodsCode',
  'descriptionOfGoods',
  'cargoTypeClassificationCode',
  'goodsItemGrossWeight',
  'goodsItemCube',
  'totalNumberOfPackages',
  'unitPrice',
  'accountReceivable',
];

// 判断是否是空的货物需求
export const isEmptyGoods = (val: ObjectType) => {
  return GOODS_KEYS.findIndex((item) => !!val[item]) === -1;
};

/**
 * 格式化货物
 * @param list
 * @param operateType
 * @returns
 */
const formatGoodsInfo = (list: ObjectType[], operateType: string) => {
  return (list || []).reduce((prev: ObjectType, item: ObjectType) => {
    if (!isEmptyGoods(item)) {
      const goodsParams = {
        ...item,
        goodsItemCube: transNumber(
          item.goodsItemCube,
          'cubicMeterToCentimeter',
        ),
        goodsItemGrossWeight: transNumber(
          item.goodsItemGrossWeight,
          'kilogramToGram',
        ),
        unitPrice: transNumber(item.unitPrice, 'yuanToCent'),
        accountReceivable: transNumber(item.accountReceivable, 'yuanToCent'),
      };
      if (operateType === 'copy') Reflect.deleteProperty(goodsParams, 'id');
      prev.push(goodsParams);
    }
    return prev;
  }, []);
};

// 格式化附加信息和指派信息以及其他统一信息
const formatAssignAndAttachInfo = (data: ObjectType, operateType?: string) => {
  const {
    attachCodeList,
    remark,
    projectInfo,
    businessType,
    assignType,
    vehicleData,
    receipt,
    tradeType = 0,
    valuationShare,
  } = data;
  const params: ObjectType = {};

  const attachList: ObjectType[] = []; // 附加要求
  if (_.isArray(attachCodeList)) {
    // 添加附加要求
    attachCodeList.forEach((item: string) => {
      attachList.push({
        attachCatalog: '10',
        attachGroup: '10',
        attachItem: item,
      });
    });
  }
  if (remark) {
    // 备注
    attachList.push({
      attachCatalog: '10',
      attachGroup: '40',
      attachValue: remark,
    });
  }
  if (projectInfo) {
    // 项目名称
    attachList.push({
      attachCatalog: '20',
      attachGroup: '20',
      attachKey: projectInfo.id,
      attachValue: projectInfo.projectName,
    });
  }
  if (businessType) {
    // 业务类型
    attachList.push({
      attachCatalog: '20',
      attachGroup: '30',
      attachKey: businessType,
    });
  }
  if (attachList.length > 0) params.attachList = attachList;

  // 回单信息
  if (operateType !== 'match') {
    params.receipt = formatReceiptInfo(receipt);
  }

  // 指派信息
  const assignParams: ObjectType = {
    tradeType,
  };

  if (tradeType === 0) {
    // 派单
    assignParams.assignType = assignType;

    let isInvite = 0;
    let ruleId;

    // 指派车辆
    if (assignType === 1 || assignType === 7) {
      const driverInfo = data.driverInfo || {};
      if (driverInfo?.id === '-99') isInvite = 1;
      else {
        assignParams.platformUndertakeDuty = _.isNil(
          data.platformUndertakeDutyDriver,
        )
          ? 0
          : Number(data.platformUndertakeDutyDriver); // 平台是否承担责任
        ruleId = driverInfo?.ruleId;
        assignParams.driverPhone = driverInfo?.driverPhone;
        assignParams.driverName = driverInfo?.driverName;
        assignParams.driverId = driverInfo?.driverId;
        assignParams.carrierDriverId = driverInfo?.id;

        const vehicleInfo = data.vehicleInfo ?? {};
        assignParams.vehicleId = vehicleInfo?.vehicleId;
        assignParams.carrierVehicleId = vehicleInfo?.id;
        assignParams.vehicleNumber = vehicleInfo?.vehicleNumber;
        assignParams.vehiclePlateColorCode = vehicleInfo?.vehiclePlateColorCode;

        assignParams.vehicleType = vehicleInfo?.vehicleType;
        assignParams.vehicleAxisNumber = vehicleInfo?.vehicleAxisNumber;
        assignParams.vehicleTonnage = vehicleInfo?.vehicleTonnage;
        assignParams.vehicleLength = vehicleInfo?.vehicleLength;
        if (vehicleInfo?.vehicleType === '1008')
          assignParams.trailerVehicleNumber = data.trailerVehicleNumber; // 牵引车

        params.recruitAgreementNo = driverInfo?.agreementNo;
        if (driverInfo.driverType === 1) assignParams.tradeType = 50; // 优选车，tradeType为50
      }
    }
    // 指派承运商
    if (assignType === 3) {
      const companyInfo = data.companyInfo ?? {};
      if (companyInfo?.carrierId === '-99') isInvite = 1;
      // 邀请
      else {
        ruleId = companyInfo?.ruleId;
        assignParams.companyId = companyInfo?.carrierId;
        assignParams.companyName = companyInfo?.companyName;
        assignParams.companyPhone = companyInfo?.contactPhone;
        assignParams.carrierCompanyId = companyInfo?.id;
      }
    }
    params.isInvite = isInvite;
    params.roleId = ruleId;
  } else if (tradeType === 10) {
    // 抢单
    assignParams.bidderScope = data.bidderScope; // 发布对象类型
    assignParams.scopeTag = data.bidderScope === 20 ? data.scopeTag : undefined; // 指定司机
    assignParams.needDeposit = data.needDeposit; // 是否需要保证金
    assignParams.depositCode =
      data.needDeposit === 1 ? data.depositCode : undefined; // 保证金类型
    const [startTime, endTime] = data.tradeTime || []; // 交易时间
    assignParams.tradeStartTime = formatSubmitTime(startTime); // 交易开始时间
    assignParams.tradeEndTime = formatSubmitTime(endTime); // 交易结束时间
    assignParams.platformUndertakeDuty = data.platformUndertakeDuty ? 1 : 0;
  } else if (tradeType === 20) {
    // 竞价
    assignParams.bidderScope = data.bidderScope; // 发布对象类型
    assignParams.scopeTag = data.bidderScope === 20 ? data.scopeTag : undefined; // 指定司机
    assignParams.picketageTime = formatSubmitTime(data.quoteEndTime); // 定标截止时间
    assignParams.quoteCount = data.quoteCount; // 报价次数
    assignParams.quoteMin = transNumber(data.quoteMin, 'yuanToCent'); // 报价中最小金额  单位:分
    assignParams.quoteMax = transNumber(data.quoteMax, 'yuanToCent'); // 报价最大金额值 单位:分
    const [startTime, endTime] = data.tradeTime || []; // 交易时间
    assignParams.tradeStartTime = formatSubmitTime(startTime); // 交易开始时间
    assignParams.tradeEndTime = formatSubmitTime(endTime); // 交易结束时间
    assignParams.platformUndertakeDuty = data.platformUndertakeDuty ? 1 : 0;
  }

  // 车长车型
  if (
    (tradeType === 0 && (assignType === 3 || assignType === 2)) ||
    tradeType === 40
  ) {
    // assignParams.vehicleType = get(vehicleData, '[1]');
    assignParams.vehicleTypeList = get(vehicleData, '[1]')
      ? [get(vehicleData, '[1]')]
      : undefined;
    assignParams.vehicleLength = get(vehicleData, '[0]');
  } else if (tradeType === 10 || tradeType === 20) {
    // 抢单、竞价
    assignParams.vehicleTypeList = data.vehicleTypeList;
    assignParams.vehicleLength = data.vehicleLength;
  }
  assignParams.contractId = data.contractInfo?.id; // 合同id
  params.assignList = [assignParams];

  if (valuationShare?.taxRate) params.deductTaxRate = valuationShare.taxRate; // 展示税点
  return params;
};

// 格式化零担下单格式
export function formateBreakBulkSubmitData(
  values: ObjectType,
  operateType: string,
) {
  const { cargoRequestList, pointList, costCent, tradeType } = values;

  const pointOperationList: ObjectType<string | number>[] = []; // 站点操作

  let priceType = values.priceType;
  if (tradeType === 40) priceType = 0; // 平台承运

  const isMatchPrice =
    tradeType === 0 &&
    ((values.assignType === 3 && values.isCompanyMatchPrice === 1) ||
      (values.assignType === 1 && values.isDriverMatchPrice === 1));

  let originPrice;
  // 当当前价格为承运商或者司机匹配价格时，不往后端传originPrice
  if (tradeType !== 20 && !isMatchPrice) {
    // 选择司机到手价，往后端传总金额，先简单处理下
    originPrice = transNumber(values.originPrice, 'yuanToCent');
  }
  const params: ObjectType = {
    isMatchPrice: Number(isMatchPrice), // 是否为匹配价格
    orderly: values.orderly,
    arrive: 2, // 先默认到发
    paymentType: values.paymentType, // 付款方式
    priceType, // 运费类型
    // 第一个站点到达时间
    estimateArriveTime: formatSubmitTime(pointList[0]?.arriveTime),
    // 预计卸货完成时间
    estimateCompleteTime: formatSubmitTime(
      pointList[pointList.length - 1]?.arriveTime,
    ),
    estimateDurationMinute: values.estimateDurationMinute,
    estimateMeter: values.estimateMeter,
    // 格式化需求数据
    cargoRequestList: cargoRequestList.map(
      ({
        cargoPointList: PList,
        cargoGoodsList,
        receipt: cargoReceipt = {},
        startAddr,
        endAddr,
        ...cargoParams
      }: ObjectType) => {
        const formatePList = PList.map(
          ({ address = {}, ...point }, index: number) => ({
            ...point,
            pointType: getPointType(index, PList.length),
            pointAddress: get(address, 'pointAddress'),
            pointLongitude: get(address, 'pointLongitude'),
            pointLatitude: get(address, 'pointLatitude'),
            pointCode: get(address, 'pointCode'),
            pointSort: index,
            contacts: get(address, 'contacts'),
            contactsPhone: get(address, 'contactsPhone'),
            addressName: get(address, 'addressName'),
            arriveTime: formatSubmitTime(get(address, 'arriveTime')),
            sendTime: formatSubmitTime(get(address, 'sendTime')),
            operationType: index === 0 ? 1 : 2,
          }),
        );

        const cargoReqParams: ObjectType = {
          ...cargoParams,
          cargoPriceValue: transNumber(
            cargoParams.cargoPriceValue,
            'yuanToCent',
          ),
          cargoTotalCost: transNumber(cargoParams.cargoTotalCost, 'yuanToCent'),
          cargoPointList: formatePList,
          cargoGoodsList: formatGoodsInfo(cargoGoodsList, operateType),
          cargoRequestReceipt: formatReceiptInfo(cargoReceipt),
          ...formatSubmitOtherAddrs({ startAddr, endAddr }),
        };
        Reflect.deleteProperty(cargoReqParams, 'id');
        // 再来一单不要加cargoRequestId
        if (operateType === 'copy') {
          Reflect.deleteProperty(cargoReqParams, 'cargoRequestId');
          Reflect.deleteProperty(cargoReqParams, 'schedule');
        }
        return cargoReqParams;
      },
    ),
    cash: values.cash, // 现付信息
    priceMode: tradeType === 20 ? undefined : values.priceMode,
    originPrice,
    // 站点信息
    pointList: pointList.map(
      (
        { sendGoods, dischargeGoods, tempId, ...point }: ObjectType,
        index: number,
      ) => {
        let operationType;
        if (sendGoods.length > 0) {
          sendGoods.forEach((item: string) => {
            pointOperationList.push({
              cargoRequestNo: item,
              pointSort: index,
              operationType: 1,
            });
          });
          operationType = 1;
        }
        if (dischargeGoods.length > 0) {
          dischargeGoods.forEach((item: string) => {
            pointOperationList.push({
              cargoRequestNo: item,
              pointSort: index,
              operationType: 2,
            });
          });
          operationType = operationType === 1 ? 3 : 2;
        }
        return {
          ...point,
          arriveTime: formatSubmitTime(point.arriveTime),
          sendTime: formatSubmitTime(point.sendTime),
          pointSort: index,
          operationType,
          pointType: getPointType(index, pointList.length),
        };
      },
    ),
    pointOperationList, // 站点操作信息
    costCent:
      values.tradeType !== 20 ? transNumber(costCent, 'yuanToCent') : undefined, // 运输费
    ...formatAssignAndAttachInfo(values, operateType),
  };

  return params;
}

// 格式化货物需求下单提交数据
export function formatCargoSubmitData(
  payload: ObjectType,
  operateType: string,
) {
  const { cargoRequestList } = payload;
  return (cargoRequestList || []).map((req: Record<string, any>) => {
    const {
      cargoGoodsList,
      cargoPointList: PList,
      receipt,
      startAddr,
      endAddr,
      ...others
    } = req;

    // 格式化地址
    let estimateArriveTime;
    let estimateCompleteTime;
    const formatePList = PList.map(
      ({ address = {}, ...point }, index: number) => {
        const time = formatSubmitTime(get(address, 'arriveTime'));
        const params = {
          ...point,
          pointType: getPointType(index, PList.length),
          pointAddress: get(address, 'pointAddress'),
          pointLongitude: get(address, 'pointLongitude'),
          pointLatitude: get(address, 'pointLatitude'),
          pointCode: get(address, 'pointCode'),
          pointSort: index,
          contacts: get(address, 'contacts'),
          contactsPhone: get(address, 'contactsPhone'),
          addressName: get(address, 'addressName'),
          arriveTime: time,
          operationType: index === 0 ? 1 : 2,
        };
        if (index === 0) estimateArriveTime = time;
        else if (index === PList.length - 1) estimateCompleteTime = time;
        // 再来一单需要删除id
        if (operateType === 'copy') Reflect.deleteProperty(params, 'id');
        return params;
      },
    );

    const receiptDto = formatReceiptInfo(receipt);
    // 再来一单需要删除id
    if (operateType === 'copy') Reflect.deleteProperty(receiptDto, 'id');

    const returnParams = {
      ...others,
      cargoPriceValue: transNumber(others.cargoPriceValue, 'yuanToCent'),
      cargoTotalCost: transNumber(others.cargoTotalCost, 'yuanToCent'),
      cargoGoodsDtoList: formatGoodsInfo(cargoGoodsList, operateType),
      cargoPointDtoList: formatePList,
      receiptDto,
      estimateArriveTime, // 第一个站点到达时间
      estimateCompleteTime, // 预计卸货完成时间
      ...formatSubmitOtherAddrs({ startAddr, endAddr }),
    };
    if (operateType === 'copy') {
      Reflect.deleteProperty(returnParams, 'id');
      Reflect.deleteProperty(returnParams, 'carrierRequest');
      Reflect.deleteProperty(returnParams, 'schedule');
    }
    return returnParams;
  });
}

export function formatEntireSubmitData(
  values: ObjectType,
  operateType: string,
) {
  const {
    cargoGoodsList,
    pointList,
    costCent,
    requestCost,
    tradeType,
  } = values;
  const pointOperationList: ObjectType<string | number>[] = []; // 站点操作
  const cargoPointList: any[] = [];
  const formatGoods = cargoGoodsList.reduce(
    (prev: ObjectType, item: ObjectType) => {
      if (
        item.goodsItemGrossWeight ||
        item.descriptionOfGoods ||
        item.cargoTypeClassificationCode ||
        item.goodsItemCube ||
        item.totalNumberOfPackages
      ) {
        const goodsParams = {
          ...item,
          goodsItemCube: transNumber(
            item.goodsItemCube,
            'cubicMeterToCentimeter',
          ),
          goodsItemGrossWeight: transNumber(
            item.goodsItemGrossWeight,
            'kilogramToGram',
          ),
        };
        if (operateType === 'copy') Reflect.deleteProperty(goodsParams, 'id');
        prev.push(goodsParams);
      }
      return prev;
    },
    [],
  );

  let priceType = values.priceType;
  if (tradeType === 40) priceType = 0;

  const isMatchPrice =
    tradeType === 0 &&
    ((values.assignType === 3 && values.isCompanyMatchPrice === 1) ||
      (values.assignType === 1 && values.isDriverMatchPrice === 1));
  const params: ObjectType = {
    isMatchPrice: Number(isMatchPrice),
    paymentType: values.paymentType, // 付款方式
    priceType, // 运费类型
    // 第一个站点到达时间
    estimateArriveTime: formatSubmitTime(pointList[0]?.arriveTime),
    // 预计卸货完成时间
    estimateCompleteTime: formatSubmitTime(
      pointList[pointList.length - 1]?.arriveTime,
    ),
    cash: values.cash, // 现付信息
    cargoOwner: values.cargoOwner,
    // 站点信息
    pointList: pointList.map(
      ({ addrCom, ...point }: ObjectType, index: number) => {
        const pointParams = {
          ...addrCom,
          arriveTime: formatSubmitTime(point.arriveTime),
          sendTime: formatSubmitTime(point.sendTime),
          pointSort: index,
          pointType: getPointType(index, pointList.length),
        };
        if (index === 0) {
          pointOperationList.push({
            pointSort: index,
            operationType: 1,
          });
          cargoPointList.push({ ...pointParams, operationType: 1 });
        } else if (index === pointList.length - 1) {
          pointOperationList.push({
            pointSort: index,
            operationType: 2,
          });
          cargoPointList.push({ ...pointParams, operationType: 2 });
        }
        return pointParams;
      },
    ),
    cargoRequestList: [{ cargoGoodsList: formatGoods, cargoPointList }],
    pointOperationList, // 站点操作信息
    estimateDurationMinute: values.estimateDurationMinute,
    estimateMeter: values.estimateMeter,
    costCent:
      tradeType !== 20 ? transNumber(costCent, 'yuanToCent') : undefined, // 运输费
    priceMode: tradeType === 20 ? undefined : '4',
    originPrice:
      tradeType === 20 ? undefined : transNumber(costCent, 'yuanToCent'),
    ...formatAssignAndAttachInfo(values, operateType),
  };
  if (requestCost?.costCent || requestCost?.ownerPaymentType) {
    params.requestCost = {
      ownerPaymentType: requestCost?.ownerPaymentType,
      costCent: requestCost?.costCent
        ? transNumber(requestCost?.costCent, 'yuanToCent')
        : undefined,
    };
  }
  return params;
}
