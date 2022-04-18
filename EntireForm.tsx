/**
 * 整车下单表单
 * 用于新建整车订单和物流整车订单
 */

import React, { useEffect, useRef } from 'react';
import styles from './index.less';
import { Spin, Form, Button, Modal, ButtonProps } from 'antd';
import {
  checkGoodsFuncs,
  compareTime,
  FormContext,
  initalFormValues,
  initalSingleGoods,
} from './utils';
import AssignModule from './AssignModule';
import TransportModule from './TransportModule';
import PriceModule from './PriceModule';
import OtherModule from './OtherModule';
import EntireCarGoodsModule from './EntireCarGoodsModule';
import EntireCarRouteModule from './EntireCarRouteModule';
import { ObjectType } from './types';
import { sleep } from '@/utils';
import { useRequest } from 'ahooks';
import {
  addEntireCarRequest,
  completeShipmentByReqId,
  fetchReqPublishDetail,
} from '@/services/order';
import { history } from 'umi';
import { get, global, toTime } from '@parallel-line/utils';
import { formatEntireSubmitData } from './formatData';
import inviteCompanyOrDriver from '../components/inviteCompanyOrDriver';
import useCommonForm from './useCommonForm';
import checkKCPrice from '../components/checkKCPrice';
import submitModal from './components/submitModal';

const { eventEmitter } = global;

// 整车需要货物需要校验字段
const CHECK_GOODS_KEYS = [
  'descriptionOfGoods',
  'cargoTypeClassificationCode',
  'goodsItemGrossWeight',
  'goodsItemCube',
  'totalNumberOfPackages',
];

interface EntireFormProps {
  operateId?: string;
  operateType: string;
  operateTitle: string;
  location: Location;
  assignDisabled?: boolean;
}

const EntireForm: React.FC<EntireFormProps> = ({
  operateId,
  operateType,
  operateTitle,
  location,
  assignDisabled,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  const {
    form,
    initPriceRuleParams,
    processAssignTypeChangeCb,
    updateIsInvite,
    resetPriceList,
    updateFormItemCB,
    state,
    setState,
    tempRef,
    updateRoutesPositionCB,
    initTempRef,
    updatePriceByPriceRule,
    onGoback,
    onRefreshList,
    calcRealPrice,
    calcValuationShare,
    initalFun,
    getRoutePlan,
    setShouldCheckCurTime,
    getSubmitDisabled,
    queryUseFleetQuota,
  } = useCommonForm('FTL', location);

  const initalValues = {
    cargoGoodsList: [initalSingleGoods()],
    pointList: [{}, {}],
    ...initalFormValues,
  };

  if (operateType === 'add') {
    const queryType = get(location, 'query.type');
    if (queryType === 'copy') operateType = 'copy';
  }

  // 重置非匹配价格
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

  eventEmitter.useSubscription(({ uniqueKey }: ObjectType) => {
    // 获取承运商价格
    if (uniqueKey === tempRef.emitterKeys.callFetchPriceRulesList) {
      resetPriceList();
    }
    if (uniqueKey === tempRef.emitterKeys.calcPaymentAccount) {
      resetNormalPrice();
    }

    // 承运商修改,变更价格
    if (uniqueKey === tempRef.emitterKeys.resetPriceByCarryInfoChange) {
      updatePriceByPriceRule();
    }
  });

  // 需求详情
  const fetchDetailReq = useRequest(
    () => fetchReqPublishDetail(operateId as string, operateType, 'entireCar'),
    {
      manual: true,
      onSuccess: (data) => {
        tempRef.pointListRef = data.pointList;

        // 承运商初始化价格匹配信息
        const ruleParams: ObjectType = initPriceRuleParams(data);

        form.setFieldsValue(
          _.merge(initalValues, data, ruleParams, {
            tempEntireCostCent: data.costCent,
          }),
        );
        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.checkDriverContractSigned,
        });
        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.initDriverAndVehicle,
          cb: () => {
            tempRef.isInitial = true;
            setState({
              isInvite: data.isInvite === 1,
              canFetchVehicles: true,
              isFromShipper:
                (operateType === 'edit' || operateType === 'appoint') &&
                data.carrierRequest === 1,
            });

            processAssignTypeChangeCb();
            calcRealPrice();
            resetPriceList(true);
            queryUseFleetQuota();
            tempRef.isInitial = false;
          },
        });

        if (operateType === 'edit' || operateType === 'appoint') {
          tempRef.inviteInfo = {
            assignType: data.assignType,
            isInvite: data.isInvite === 1,
          };
        }

        if (!data.estimateDurationMinute || !data.estimateMeter) {
          getRoutePlan();
        }
      },
    },
  );

  useEffect(() => {
    initalFun(() => {
      if (operateId) fetchDetailReq.run();
      else {
        setState({ canFetchVehicles: true });
        // form.resetFields();
        form.setFieldsValue(initalValues);
        initTempRef();
        updateRoutesPositionCB();
      }
    });
  }, [operateId, operateType]);

  // 地址导入成功
  const handleRouteSelectSuc = (points: ObjectType[]) => {
    form?.setFieldsValue({ pointList: points });
    updateRoutesPositionCB(points); // 导入路线，重新请求承运商价格列表接口
    tempRef.pointListRef = points || [];
  };

  const handleValuesChange = async (changeVal: ObjectType) => {
    // 指派类型变化或者勾选平台承责任
    if (
      _.has(changeVal, 'assignType') ||
      _.has(changeVal, 'platformUndertakeDutyCompany')
    ) {
      processAssignTypeChangeCb();
      if (_.has(changeVal, 'assignType')) calcValuationShare();
      // if (_.has(changeVal, 'platformUndertakeDutyDriver')) {
      //   // 复选框发生变化，先检测是否选择司机信息
      //   form
      //     .validateFields(['driverInfo', 'vehicleInfo'])
      //     .catch(() => {
      //       form.setFieldsValue({ platformUndertakeDutyDriver: false });
      //       setState({ isTms: true });
      //       setShouldSupplementOrder(true);
      //     })
      //     .finally(calcRealPrice);
      // }
    }

    if (_.has(changeVal, 'costCent')) {
      calcRealPrice();
      form.setFieldsValue({ tempEntireCostCent: changeVal.costCent });
      calcValuationShare();
    }

    updateFormItemCB(changeVal);

    if (_.has(changeVal, 'assignType')) {
      // 指派类型，运力发生变化，更改是否为运力邀请
      updateIsInvite();
      resetPriceList();
      if (
        (changeVal.assignType === 3 &&
          form.getFieldValue('isCompanyMatchPrice') === 1) ||
        (changeVal.assignType === 1 &&
          form.getFieldValue('isDriverMatchPrice') === 1)
      ) {
        // 防止货物数据发生变化，总价发生变化，置空重选
        // form.setFieldsValue({ companyInfo: undefined });
        await sleep(200);
        // 防止货物数据发生变化，总价发生变化，等价格列表变更完成再执行
        updatePriceByPriceRule(); //
      } else {
        resetNormalPrice();
      }
    }

    if (_.has(changeVal, 'pointList')) {
      updateRoutesPositionCB();
      tempRef.pointListRef = form.getFieldValue('pointList');
    }
  };

  // 校验货物
  const checkGoodsForm = async () => {
    const list = form.getFieldValue('cargoGoodsList') || [];
    let isReqValidPass = true;
    const rules = list.reduce((prev: Promise<any>[], item: ObjectType) => {
      const temps = CHECK_GOODS_KEYS.map((key: string) => {
        return checkGoodsFuncs[key](get(item, key), !state.isTms);
      });
      prev.push(...temps);
      return prev;
    }, []);
    await Promise.all(rules).catch((err) => {
      console.log(err);
      isReqValidPass = false;
    }); // 通知货物列表进行校验
    return isReqValidPass;
  };

  // 提交表单信息
  const submitReq = useRequest((params) => addEntireCarRequest(params), {
    manual: true,
    onSuccess: ({ data }, params) => {
      // 邀请运力,且初始不为邀请
      const assignType = get(params, '[0].assignList[0].assignType');
      if (
        (!tempRef.inviteInfo.isInvite && state.isInvite) ||
        (tempRef.inviteInfo.isInvite &&
          state.isInvite &&
          tempRef.inviteInfo.assignType !== assignType)
      ) {
        inviteCompanyOrDriver({
          requestId: data.requestId,
          onGoback: onGoback,
          type: assignType,
          onCodeFetched: onRefreshList,
        });
        return;
      }

      onRefreshList();

      const tradeType = get(params, '[0].assignList[0].tradeType');
      const arriveTime = get(params, '[0].pointList[0].arriveTime'); // 第一个点的到达时间，即订单开始时间

      let desc;
      const btns: ButtonProps[] = [
        {
          children: '返回订单列表',
          onClick: onGoback,
        },
      ];
      const addBtnParams = {
        children: '继续新建订单',
        onClick: () => {
          if (operateId) history.push('/order/entire/add'); // 再来一单新建
          form.resetFields(); // 重置表单新
          wrapRef.current && wrapRef.current.scrollTo(0, 0); // 滚回顶部
        },
      };

      // 后补单
      if (
        params[0].operateType === 1 &&
        ((tradeType === 0 && assignType === 1) || tradeType === 50) &&
        compareTime(undefined, toTime(arriveTime, { isMoment: true }))
      ) {
        desc = '订单开始时间早于当前时间，是否确认订单已执行完成?';
        btns.push(addBtnParams);
        btns.push({
          children: '确认执行完成',
          type: 'primary',
          onClick: () =>
            completeShipmentByReqId(data.requestId).then(() => {
              onRefreshList();
              onGoback();
            }),
        });
      } else {
        btns.push({ type: 'primary', ...addBtnParams });
      }

      submitModal({
        title: `订单${params[0].operateType === 0 ? '保存' : '发布'}成功`,
        desc,
        btns,
      });
    },
  });

  const getSubmitData = () => {
    const params = formatEntireSubmitData(
      form.getFieldsValue(true),
      operateType,
    );
    if (operateId && (operateType === 'edit' || operateType === 'appoint')) {
      params.requestId = operateId;
    }
    return params;
  };

  const handleSubmit = (type: string) => {
    setState({ operateBtnType: type });
    if (type === 'save') {
      // 保存
      const params = getSubmitData();
      params.operateType = 0;
      submitReq.run(params);
      return;
    }
    eventEmitter.emit({
      uniqueKey: tempRef.emitterKeys.validateBreakBulk,
      type: 'force',
    }); // 通知在于form表单外的其他内容进行校验
    form
      .validateFields()
      .then(async () => {
        const isReqValidPass = await checkGoodsForm();
        if (isReqValidPass) {
          const params = getSubmitData();
          params.operateType = 1;

          let tipTilt;
          if (operateType === 'edit' || operateType === 'appoint') {
            // 初始为邀请，指派要求也为邀请，但指派类型发生变化
            if (
              tempRef.inviteInfo.isInvite &&
              state.isInvite &&
              tempRef.inviteInfo.assignType !== form.getFieldValue('assignType')
            )
              tipTilt =
                '您现在正在邀请运力接单，继续指派邀请链接将失效，确认重新指派运力？';
            // 初始为邀请,变为指派运力
            if (tempRef.inviteInfo.isInvite && !state.isInvite)
              tipTilt =
                '您现在正在邀请运力接单，继续指派邀请链接将失效，确认重新指派运力？';
            // 初始为指派运力，变为邀请
            else if (!tempRef.inviteInfo.isInvite && state.isInvite)
              tipTilt =
                '该订单已经指派关联的司机/承运商接单，确认重新选择邀请运力来接单？';
          }
          const func = () => {
            const tradeType = get(params, 'assignList[0].tradeType');
            const arriveTime = get(params, 'pointList[0].arriveTime'); // 第一个点的到达时间，即订单开始时间
            const assignType = get(params, 'assignList[0].assignType');
            const contractInfo = form?.getFieldValue('contractInfo');
            if (
              params.operateType === 1 &&
              ((tradeType === 0 && assignType === 1) || tradeType === 50) &&
              compareTime(undefined, toTime(arriveTime, { isMoment: true })) &&
              tempRef.isSupplyOrderPrice === false &&
              contractInfo.backupOrderRate !== contractInfo.infoServeRate
            ) {
              // 之前为非后补单，停留时间过长导致
              Modal.info({
                title: '当前页面停留时间过长，请重新确认订单信息',
                okText: '重新确认',
                onOk() {
                  calcRealPrice();
                },
              });
              return;
            }
            checkKCPrice({
              onSuccess: () => submitReq.run(params),
              actualPrice: form.getFieldValue('includeAmount'),
              payPrice: get(form.getFieldValue('requestCost'), 'costCent', 0),
            });
          };
          if (tipTilt) {
            Modal.confirm({
              title: tipTilt,
              onOk: func,
            });
          } else {
            func();
          }
        }
      })
      .catch((err) => {
        console.log(err);
        checkGoodsForm();
      });
  };

  return (
    <div className={styles.BreakBulkAdd} style={{ overflow: 'inherit' }}>
      <Spin
        spinning={fetchDetailReq.loading || state.initalLoading}
        size="large"
      >
        <Form
          colon={false}
          name="order-vl-add-form"
          form={form}
          // initialValues={initalValues}
          onValuesChange={handleValuesChange}
        >
          <FormContext.Provider
            value={{
              form,
              isTms: state.isTms,
              emitterKeys: tempRef.emitterKeys,
              canFetchVehicles: state.canFetchVehicles,
              isFTL: true,
              shouldSupplementOrder: state.shouldSupplementOrder,
              transContractList: state.transContractList,
              shouldCheckCurTime: state.shouldCheckCurTime,
            }}
          >
            <div className={styles.moduleItem}>
              <EntireCarRouteModule onRouteSelectSuc={handleRouteSelectSuc} />
            </div>
            <div className={styles.moduleItem}>
              <EntireCarGoodsModule isFromShipper={state.isFromShipper} />
            </div>
            <div className={styles.moduleItem}>
              <AssignModule
                assignDisabled={assignDisabled}
                onSetTms={(val) => {
                  setState({ isTms: val });
                  setShouldCheckCurTime(!val);
                }}
                isCompanyMatchPrice={state.isCompanyMatchPrice}
                onSetIsCompanyMatchPrice={(val) =>
                  setState({ isCompanyMatchPrice: val })
                }
                isDriverMatchPrice={state.isDriverMatchPrice}
                onSetIsDriverMatchPrice={(val) =>
                  setState({ isDriverMatchPrice: val })
                }
              />
            </div>
            <div className={styles.moduleItem}>
              <TransportModule
                goodsFormType="addBreakbulk"
                position="entrieCar"
              />
            </div>
            <div className={styles.moduleItem}>
              <PriceModule
                formType="FTL"
                assignDisabled={assignDisabled}
                taxRate={state.taxRate}
                valuationEnabled={state.valuationEnabled}
                isFromShipper={state.isFromShipper}
                useFleetQuota={state.useFleetQuota}
              />
            </div>
            <div className={styles.moduleItem}>
              <OtherModule
                assignDisabled={assignDisabled}
                isFromShipper={state.isFromShipper}
              />
            </div>
            <div className={styles.operateBts}>
              <Form.Item noStyle shouldUpdate={() => true}>
                {({ getFieldValue }) => (
                  <Button
                    type="primary"
                    onClick={() => handleSubmit('publish')}
                    loading={
                      submitReq.loading && state.operateBtnType === 'publish'
                    }
                    disabled={
                      (submitReq.loading && state.operateBtnType === 'save') ||
                      getSubmitDisabled()
                    }
                  >
                    {state.isInvite && operateTitle === '发布'
                      ? '保存'
                      : operateTitle}
                  </Button>
                )}
              </Form.Item>
              {!state.isInvite && !assignDisabled && (
                <Button
                  style={{ marginLeft: 12 }}
                  onClick={() => handleSubmit('save')}
                  loading={submitReq.loading && state.operateBtnType === 'save'}
                  disabled={
                    submitReq.loading && state.operateBtnType === 'publish'
                  }
                >
                  保存
                </Button>
              )}
            </div>
          </FormContext.Provider>
        </Form>
      </Spin>
    </div>
  );
};

export default EntireForm;
