/* eslint-disable @typescript-eslint/no-loop-func */
import { Button, ButtonProps, Form, message, Modal, Spin } from 'antd';
import React, { useRef, useEffect } from 'react';
import { get, global, toTime } from '@parallel-line/utils';
import LZString from 'lz-string';
import styles from './index.less';
import RequirementModule from './RequirementModule';
import RoutesModule from './RoutesModule';
import {
  FormContext,
  initalRequirement,
  checkGoodsFuncs,
  initalSite,
  checkRequireFuncs,
  initalFormValues,
  compareTime,
} from './utils';
import AssignModule from './AssignModule';
import TransportModule from './TransportModule';
import PriceModule from './PriceModule';
import OtherModule from './OtherModule';
import { sleep } from '@/utils';
import {
  assignRequest,
  cargoRequestDraft,
  completeShipmentByReqId,
  fetchReqPublishDetail,
  fetchRequestNo,
  publishOrder,
} from '@/services/order';
import { useRequest } from 'ahooks';
import { history } from 'umi';
import { ObjectType } from './types';
import useCalcReceivablePrice from './useCalcReceivablePrice';
import inviteCompanyOrDriver from '../components/inviteCompanyOrDriver';
import { formateBreakBulkSubmitData } from './formatData';
import useCommonForm from './useCommonForm';
import { GOODS_KEY_IN_PRICE_MODE } from './constants';
import checkKCPrice from '../components/checkKCPrice';
import submitModal from './components/submitModal';

const AGAIN_VALATOR_KEYS = [['businessType']];

interface BreakBulkAddProps {
  location: Location;
  match: ObjectType;
}

const { KCEnabled } = global.PXX_SOLUTION;

const Reg = /^\/order\/(.*)$/;
const { eventEmitter } = global;

const BreakBulkAdd: React.FC<BreakBulkAddProps> = ({ location, match }) => {
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
    calcCostPrice,
    calcRealPrice,
    initalFun,
    getRoutePlan,
    updateCostCentWithKC,
    setShouldCheckCurTime,
    getSubmitDisabled,
    queryUseFleetQuota,
  } = useCommonForm('LTL', location);

  const initalValues = {
    pointList: [],
    priceMode: '4',
    orderly: 2, // 默认无序
    tempPriceMode: '4',
    ...initalFormValues,
  };

  // 计算应收费用
  useCalcReceivablePrice(form, tempRef.emitterKeys);

  let operateType = match.path.match(Reg)?.[1] || 'add';
  if (operateType === 'add') {
    const queryType = get(location, 'query.type');
    if (queryType === 'copy') operateType = 'copy';
    else if (queryType === 'match') operateType = 'match';
  }

  const operateId = get(location, 'query.id');
  const appointType = get(location, 'query.assignType'); // 指派类型 demand:需求  cargo:货物

  // 重新计算承运商列表价格
  const updateListPrice = () => {
    eventEmitter.emit({
      uniqueKey: tempRef.emitterKeys.updatePriceList,
    });
  };

  // 根据需求匹配站点收发货需求列表
  const updateSiteGoodsList = (routes: ObjectType[]) => {
    const reqs = [...(form.getFieldValue('cargoRequestList') || [])];
    routes.forEach((route) => {
      const routeAddress = get(route, 'pointAddress');
      // 站点存在地址
      if (routeAddress) {
        route.sendGoods.length = 0;
        route.dischargeGoods.length = 0;
        reqs.forEach((req) => {
          const reqPointList = req.cargoPointList || [];
          reqPointList.forEach((point: ObjectType, index: number) => {
            const reqAddress = get(point, 'address.pointAddress');
            if (reqAddress === routeAddress) {
              const key = index === 1 ? 'dischargeGoods' : 'sendGoods'; // 修改的货物是装货还是卸货
              route[key].push(req.cargoRequestNo);
            }
          });
        });
      }
    });
  };

  // 更改站点名称
  const updateSiteAddrName = (
    routes: ObjectType[],
    routeIndex: number,
    addrCom: ObjectType,
  ) => {
    if (!addrCom.addressName) return;
    const addrName = routes[routeIndex].addressName;
    if (addrName) {
      const list = addrName.split(',');
      if (!list.includes(addrCom.addressName)) {
        routes[routeIndex].addressName += ',' + addrCom.addressName;
      }
    } else {
      routes[routeIndex].addressName = addrCom.addressName;
    }
  };

  // 货物需求站点发生发生变化 更改站点名称
  const updateSiteAddrNameByCargoChange = () => {
    const pointList = form.getFieldValue('pointList');
    const reqs = [...(form.getFieldValue('cargoRequestList') || [])];
    const routes = [...pointList];
    routes.forEach((route, index) => {
      const routeAddress = get(route, 'pointAddress');
      route.addressName = ''; // 初始化
      // 站点存在地址
      if (routeAddress) {
        reqs.forEach((req) => {
          const reqPointList = req.cargoPointList || [];
          reqPointList.forEach((point: ObjectType) => {
            const reqAddress = get(point, 'address.pointAddress');
            if (reqAddress === routeAddress) {
              updateSiteAddrName(routes, index, get(point, 'address'));
            }
          });
        });
      }
    });
    form.setFieldsValue({ pointList: routes });
  };

  // 需求地址上的更改生成新的站点
  const updateSiteByAddrChange = (addrCom: ObjectType) => {
    const pointList = form.getFieldValue('pointList');
    const routes = [...pointList];

    // 查找所处路线下标
    const routeIndex = routes.findIndex(
      (item: ObjectType) =>
        get(item, 'pointAddress') === get(addrCom, 'pointAddress'),
    );

    // 不存在该站点，往线路信息里面添加改地址作为站点
    if (routeIndex === -1) {
      routes.push({
        ...initalSite(),
        pointAddress: addrCom.pointAddress,
        pointCode: addrCom.pointCode,
        pointLatitude: addrCom.pointLatitude,
        pointLongitude: addrCom.pointLongitude, // 站点地址
      });
    } else {
      updateSiteAddrName(routes, routeIndex, addrCom);
    }

    updateSiteGoodsList(routes); // 更改站点内的货物信息

    form.setFieldsValue({ pointList: routes });
    updateRoutesPositionCB(routes); // 价格匹配
    tempRef.pointListRef = routes;
  };

  // 根据货物需求批量生成站点,货物配载调用
  const batchCreateSites = (reqs = []) =>
    reqs.reduce((routes: ObjectType[], req: ObjectType) => {
      // 查找所处路线下标
      const points = req.cargoPointList || [];
      points.forEach((point: ObjectType, index: number) => {
        const addrCom: ObjectType = point.address || {};
        const routeIndex = routes.findIndex(
          (item: ObjectType) =>
            get(item, 'pointAddress') === get(addrCom, 'pointAddress'),
        );

        // 不存在该站点，往线路信息里面添加改地址作为站点
        if (routeIndex === -1) {
          const params: ObjectType = {
            ...initalSite(),
            pointAddress: addrCom.pointAddress,
            pointCode: addrCom.pointCode,
            pointLatitude: addrCom.pointLatitude,
            pointLongitude: addrCom.pointLongitude, // 站点地址
            contacts: addrCom.contacts,
            contactsPhone: addrCom.contactsPhone,
          };
          if (index === 0) params.sendGoods.push(req.cargoRequestNo);
          else params.dischargeGoods.push(req.cargoRequestNo);
          routes.push(params);
        } else if (index === 0) {
          routes[routeIndex].sendGoods.push(req.cargoRequestNo);
        } else {
          routes[routeIndex].dischargeGoods.push(req.cargoRequestNo);
        }
      });
      return routes;
    }, form.getFieldValue('pointList') || []);

  // 需求详情
  const fetchDetailReq = useRequest(
    () => fetchReqPublishDetail(operateId, operateType),
    {
      manual: true,
      onSuccess: (data) => {
        // 初始化价格匹配信息
        const ruleParams = initPriceRuleParams(data);
        form.setFieldsValue(_.merge(initalValues, data, ruleParams));
        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.checkDriverContractSigned,
        });
        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.initDriverAndVehicle,
          cb: async () => {
            tempRef.isInitial = true;
            setState({
              cargoDisabled:
                data.carrierRequest === 1 && operateType === 'edit',
              isInvite: data.isInvite === 1,
              canFetchVehicles: true,
            });
            const hasCalcRealPrice = await processAssignTypeChangeCb();
            resetPriceList(true);

            if (KCEnabled) updateCostCentWithKC();
            else {
              updateCostCentWithKC();
              if (!hasCalcRealPrice) calcRealPrice();
            }
            queryUseFleetQuota();
            tempRef.isInitial = false;
          },
        });

        tempRef.cargoLenRef = data.cargoRequestList.length;
        tempRef.pointListRef = data.pointList;

        /* 下单邀请相关初始化 */
        if (operateType === 'edit') {
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

  // 获取需求no
  const fetchNoReq = useRequest(fetchRequestNo, {
    manual: true,
    onSuccess: ({ data }) => {
      tempRef.cargoLenRef = 1;
      form.setFieldsValue({
        ...initalValues,
        cargoRequestList: [initalRequirement(data[0])],
      });
    },
  });

  // 获取货物需求
  const fetchCargoListReq = useRequest(
    (ids) => cargoRequestDraft(ids, operateType),
    {
      manual: true,
      onSuccess: (data = []) => {
        const cargoList = get(data, 'cargoRequestList', []);
        tempRef.cargoLenRef = cargoList.length;
        const pointList = batchCreateSites(cargoList);
        tempRef.pointListRef = pointList;

        form.setFieldsValue({
          ...initalValues,
          ...data,
          pointList,
        });

        updateSiteAddrNameByCargoChange(); // 更新站点名称
        resetPriceList(); // 获取价格匹配列表
        // get(data, 'cargoRequestList', []).forEach(
        //   (_item: any, index: number) => {
        //     calcReceivablePrice(index);
        //   },
        // );
        updateCostCentWithKC(); // KC配置
        getRoutePlan();
      },
    },
  );

  // 重置表单
  const resetForm = () => {
    form.resetFields();
    fetchNoReq.run();
  };

  useEffect(() => {
    initalFun(() => {
      if (
        (operateType === 'match' ||
          (operateType === 'assign' && appointType === 'cargo')) &&
        operateId
      ) {
        setState({ canFetchVehicles: true });
        try {
          const ids = LZString.decompressFromEncodedURIComponent(operateId); // 多个货物配载时，转化压缩文件
          fetchCargoListReq.run(ids?.split(','));
        } catch (error) {}
      }
      // 普通货物操作
      else if (operateId) fetchDetailReq.run();
      else if (operateType === 'add') {
        setState({ canFetchVehicles: true });
        resetForm();
        initTempRef();
        updateRoutesPositionCB();
      }
    });
  }, [operateId, operateType, appointType]);

  // 重置检测
  const resetCheckGoods = async () => {
    await sleep(100);
    eventEmitter.emit({
      uniqueKey: tempRef.emitterKeys.validateBreakBulk,
      type: 'normal',
    });
  };

  // 指派类型发生变化，重置校验
  useEffect(() => {
    resetCheckGoods();
    if (state.isTms) form.validateFields(AGAIN_VALATOR_KEYS);
  }, [state.isTms]);

  eventEmitter.useSubscription(
    ({ uniqueKey, editKey, addCargoReqs }: ObjectType) => {
      // 接收推送通知计算应收费用，数量，体积，重量发生变化
      if (uniqueKey === tempRef.emitterKeys.updateReqGoods) {
        if (editKey && _.values(GOODS_KEY_IN_PRICE_MODE).includes(editKey)) {
          calcCostPrice();
          // 数量，体积，重量发生变化，重新计算承运商或司机列表价格
          updateListPrice();
        }
      }

      // 接收滚动通知
      if (uniqueKey === tempRef.emitterKeys.scrollTop)
        wrapRef.current && wrapRef.current.scrollTo(0, 0);

      // 承运商或者司机修改,变更价格
      // if (uniqueKey === tempRef.emitterKeys.resetPriceByCarryInfoChange) {
      //   updatePriceByPriceRule();
      // }

      // 获取承运商价格
      if (uniqueKey === tempRef.emitterKeys.callFetchPriceRulesList) {
        resetPriceList();
      }

      // 站点信息由于拖拽,导入或者信息发生变化
      if (uniqueKey === tempRef.emitterKeys.updatePointsSuc) {
        updateRoutesPositionCB();
        tempRef.pointListRef = [...form.getFieldValue('pointList')];
      }

      // 重置司机价格列表
      // if (uniqueKey === 'REFETCH_DRIVER_PRICE_LIST') {
      //   resetDriverList();
      // }

      // 配载导入货物需求,更新线路信息
      if (uniqueKey === tempRef.emitterKeys.importCargoSuc) {
        calcCostPrice(); // 货物信息发生修改，重新计算价格
        const pointList = batchCreateSites(addCargoReqs);
        updateSiteAddrNameByCargoChange(); // 更改站点名称
        form.setFieldsValue({ pointList });

        updateRoutesPositionCB(pointList); // 站点发生变化，重新获取承运商价格列表
        tempRef.pointListRef = pointList;
        tempRef.cargoLenRef = addCargoReqs.length;
        updateCostCentWithKC(); // KC项目计算
      }
    },
  );

  // 监听form表单的变化
  const handleValuesChange = async (changeVal: ObjectType) => {
    // 计价方式发生变化
    if (_.has(changeVal, 'originPrice') || _.has(changeVal, 'priceMode')) {
      calcCostPrice();
      if (_.has(changeVal, 'priceMode')) {
        resetCheckGoods();
        form.setFieldsValue({ tempPriceMode: changeVal.priceMode });
      }
    }
    // 需求发生了变化
    if (_.has(changeVal, 'cargoRequestList')) {
      const changeReqs = get(changeVal, 'cargoRequestList', []) as any[];
      const reqLen = form.getFieldValue('cargoRequestList').length;
      // 货物需求修改
      if (tempRef.cargoLenRef === reqLen) {
        const isAllReqChange =
          changeReqs.length > 1 && _.every(changeReqs, (req) => !_.isNil(req));
        if (isAllReqChange) return;
      }

      if ((tempRef.cargoLenRef as number) > reqLen) {
        tempRef.cargoLenRef = reqLen;
        // 删除货物需求
        const routes = form.getFieldValue('pointList');
        updateSiteGoodsList(routes);
        form.setFieldsValue({ pointList: routes });
        updateSiteAddrNameByCargoChange();
        calcCostPrice();

        // 数量，体积，重量发生变化，重新计算承运商或司机列表价格
        updateListPrice();
        return;
      }
      // 新增空需求
      if ((tempRef.cargoLenRef as number) < reqLen) {
        tempRef.cargoLenRef = reqLen;
        return;
      }

      // 更改的需求index
      const changeReqIndex = changeReqs.findIndex(
        (item: ObjectType | null) => !_.isNil(item),
      );

      const changeReqObj = changeReqs[changeReqIndex];
      // 需求pointList发生变化
      if (_.has(changeReqObj, 'cargoPointList')) {
        const changePoints = get(changeReqObj, 'cargoPointList', []);
        const changePointIndex = changePoints.findIndex(
          (item: ObjectType) => !_.isNil(item),
        );
        const changePointObj = changePoints[changePointIndex];
        // 地址发生变化
        if (_.has(changePointObj, 'address.pointAddress')) {
          updateSiteByAddrChange(changePointObj.address);
        }
        if (_.has(changePointObj, 'address.addressName')) {
          updateSiteAddrNameByCargoChange();
        }
      }
      // 货主发生变化,校验货物表格和货物收款方式
      if (_.has(changeReqObj, 'cargoOwner')) {
        // 填写了货主信息
        if (!get(changeReqObj, 'cargoOwner')) {
          const validatorName = [
            'cargoRequestList',
            changeReqIndex,
            'paymentType',
          ];

          if (!form.getFieldValue(validatorName))
            form.validateFields([validatorName]);

          await sleep(100);
          eventEmitter.emit({
            uniqueKey: tempRef.emitterKeys.validateBreakBulk,
            type: 'force',
          });
        }
      }
    }

    // 勾选平台承责任
    // if (
    //   _.has(changeVal, 'platformUndertakeDutyDriver') ||
    //   _.has(changeVal, 'platformUndertakeDutyCompany')
    // ) {
    //   if (_.has(changeVal, 'platformUndertakeDutyDriver')) {
    //     // 复选框发生变化，先检测是否选择司机信息
    //     form
    //       .validateFields(['driverInfo', 'vehicleInfo'])
    //       .then(processAssignTypeChangeCb)
    //       .catch(() => {
    //         form.setFieldsValue({ platformUndertakeDutyDriver: false });
    //         setState({ isTms: true, shouldSupplementOrder: true });
    //         setShouldSupplementOrder(true);
    //       })
    //       .finally(calcRealPrice);
    //   }
    // }

    updateFormItemCB(changeVal);

    // 指派类型发生变化
    if (_.has(changeVal, 'assignType')) {
      // 设置TMS
      processAssignTypeChangeCb();
      // 指派类型，运力发生变化，更改是否为运力邀请
      updateIsInvite();

      // 重置承运商列表
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
        // 先更新原有计价方式，之后重新计算价格
        form.setFieldsValue({ priceMode: form.getFieldValue('tempPriceMode') });
        calcCostPrice();
      }
    }
  };

  // 校验需求是否完全通过
  const checkReqsForm = async () => {
    const reqs = form.getFieldValue('cargoRequestList');

    const priceMode = form.getFieldValue('priceMode');
    // 所选计价方式，计价方式等于货物存在单位时，该项必填
    const requireKey = GOODS_KEY_IN_PRICE_MODE[priceMode];

    let isReqValidPass = true;
    let index = 0;
    let hasTip = false;
    // eslint-disable-next-line no-restricted-syntax
    for (const req of reqs) {
      try {
        let vals = Object.keys(checkRequireFuncs);
        // 先简单处理下
        // if (operateType === 'match') {
        vals = ['cargoPointList[0].address', 'cargoPointList[1].address'];
        // }
        const requireRules = vals.map((key: string) => {
          if (key === 'cargoPointList[0].address') {
            return checkRequireFuncs[key](
              get(req, key),
              get(req, 'cargoPointList[1].address'),
            );
          }
          if (key === 'cargoPointList[1].address') {
            return checkRequireFuncs[key](
              get(req, key),
              get(req, 'cargoPointList[0].address'),
            );
          }
          return checkRequireFuncs[key](get(req, key));
        });

        /** 收集需求中货物列表的校验规则 */
        const list = req.cargoGoodsList || [];

        const priceModeRules: Promise<any>[] = []; // 选了计价方式，错误需要拉出来最后提示

        const rules = list.reduce((prev: Promise<any>[], item: ObjectType) => {
          const vals2 = Object.keys(checkGoodsFuncs).filter(
            (v) => v !== requireKey,
          );
          // 单独校验项
          if (requireKey)
            priceModeRules.push(
              checkGoodsFuncs[requireKey](get(item, requireKey), true),
            );

          const temps = vals2.map((key: string) => {
            if (key === 'unitPrice') {
              return checkGoodsFuncs[key](get(item, key), false);
            }
            return checkGoodsFuncs[key](
              get(item, key),
              !state.isTms || requireKey === key,
            );
          });
          prev.push(...temps);
          return prev;
        }, requireRules);

        // eslint-disable-next-line no-await-in-loop
        await Promise.all(rules);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(priceModeRules);

        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.passReqValidate,
          value: index,
        });
      } catch (error) {
        console.log(error);
        let tipTitle;
        // 先这样了
        if (priceMode === '1' && error === '请输入货物件数') {
          tipTitle = '你选择了【按件】计价，需补充录入货物信息的【数量(件)】';
        } else if (priceMode === '2' && error === '请输入货物重量') {
          tipTitle = '你选择了【按kg】计价，需补充录入货物信息的【重量(kg)】';
        } else if (priceMode === '3' && error === '请输入货物体积') {
          tipTitle = '你选择了【按m³】计价，需补充录入货物信息的【体积(m³)】';
        } else if (priceMode === '5' && error === '请输入货物体积') {
          tipTitle = '你选择了【按吨】计价，需补充录入货物信息的【重量(kg)】';
        }
        if (!hasTip && tipTitle) {
          hasTip = true;
          Modal.warning({
            title: tipTitle,
            okText: '确定',
            onOk: () => {
              wrapRef.current && wrapRef.current.scrollTo(0, 0);
            },
          });
        }
        // 无法通过校验，通知需求模块更改样式
        isReqValidPass = false;
        eventEmitter.emit({
          uniqueKey: tempRef.emitterKeys.failReqValidate,
          value: index,
        });
      }
      index += 1;
    }
    return isReqValidPass;
  };

  const submitReq = useRequest(
    (params) =>
      operateType === 'assign' && appointType === 'cargo'
        ? assignRequest(params, 'cargo')
        : publishOrder(params),
    {
      manual: true,
      onSuccess: ({ data }, params) => {
        // 配载，重置列表selectKeys
        if (operateType === 'match') {
          eventEmitter.emit({ uniqueKey: 'RESET_MATCH_SELECTED_KEYS' });
          eventEmitter.emit({ uniqueKey: 'CAROG_DEMAND_LIST' }); // 更新货物需求列表
        } else if (operateType === 'assign' && appointType === 'cargo') {
          // 货物需求指派
          eventEmitter.emit({
            uniqueKey: 'RESET_MATCH_SELECTED_KEYS',
            clearKeys: [operateId],
          });
          eventEmitter.emit({ uniqueKey: 'CAROG_DEMAND_LIST' }); // 更新货物需求列表
        }

        const assignType = get(params, '[0].assignList[0].assignType');

        // 后端编辑为删除新建，每次邀请都要重新打开弹窗邀请
        if (state.isInvite) {
          inviteCompanyOrDriver({
            requestId: data?.requestId,
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
            if (operateId) history.push('/order/add'); // 再来一单新建
            resetForm(); // 重置表单新
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
              completeShipmentByReqId(data?.requestId).then(() => {
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
    },
  );

  const getSubmitData = () => {
    const params = formateBreakBulkSubmitData(
      form.getFieldsValue(true),
      operateType,
    );
    if (
      operateId &&
      (operateType === 'edit' ||
        (operateType === 'assign' &&
          (appointType === 'demand' || _.isNil(appointType)))) // 用车需求指派需要带上requestId
    )
      params.requestId = operateId;
    return params;
  };

  // 提交
  const handleSubmit = async (type: 'publish' | 'save') => {
    await sleep(150);
    setState({ operateBtnType: type });
    if (type === 'save') {
      // 保存
      form
        .validateFields(['costCent'])
        .then(() => {
          const params = getSubmitData();
          if (params.pointOperationList.length < 2) {
            message.error('请填写收发货信息');
            return;
          }
          params.operateType = 0;
          submitReq.run(params);
        })
        .catch((err) => {
          console.log(err);
          // 校验运输费用
          message.error(get(err, 'errorFields[0].errors[0]'));
        });
      return;
    }
    eventEmitter.emit({
      uniqueKey: tempRef.emitterKeys.validateRoutesTime,
      type: 'force',
    });
    eventEmitter.emit({
      uniqueKey: tempRef.emitterKeys.validateBreakBulk,
      type: 'force',
    }); // 通知在于form表单外的其他内容进行校验
    // 校验其他项
    form
      .validateFields()
      .then(async (values) => {
        const isReqValidPass = await checkReqsForm();
        if (isReqValidPass) {
          const params = getSubmitData();
          if (operateType === 'match' && params.cargoRequestList.length === 0) {
            message.error('货物需求不能为空，请至少配载一个货物需求');
            return;
          }
          if (params.cargoRequestList.length === 0) {
            message.error('货物需求不能为空，请至少填写一个货物需求');
            return;
          }
          params.operateType = 1;

          let tipTilt;
          if (operateType === 'edit') {
            // 初始为邀请，指派要求也为邀请，但指派类型发生变化
            if (
              tempRef.inviteInfo.isInvite &&
              state.isInvite &&
              tempRef.inviteInfo.assignType !== form.getFieldValue('assignType')
            ) {
              tipTilt =
                '您现在正在邀请运力接单，继续指派邀请链接将失效，确认重新指派运力？';
            } else if (tempRef.inviteInfo.isInvite && !state.isInvite) {
              tipTilt =
                '您现在正在邀请运力接单，继续指派邀请链接将失效，确认重新指派运力？';
            } else if (!tempRef.inviteInfo.isInvite && state.isInvite) {
              tipTilt =
                '该订单已经指派关联的司机/承运商接单，确认重新选择邀请运力来接单？';
            }
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
              payPrice: form.getFieldValue('paymentCostcent'),
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
        // 跳转到错误列
        checkReqsForm();
      });
  };

  return (
    <div className={styles.BreakBulkAdd} ref={wrapRef}>
      <Spin
        spinning={
          fetchDetailReq.loading ||
          fetchNoReq.loading ||
          fetchCargoListReq.loading ||
          state.initalLoading
        }
        size="large"
      >
        <Form
          colon={false}
          name="breakbulk-add"
          form={form}
          onValuesChange={handleValuesChange}
        >
          <FormContext.Provider
            value={{
              form,
              isTms: state.isTms,
              cargoDisabled: state.cargoDisabled,
              operateId,
              operateType,
              emitterKeys: tempRef.emitterKeys,
              canFetchVehicles: state.canFetchVehicles,
              shouldSupplementOrder: state.shouldSupplementOrder,
              transContractList: state.transContractList,
              shouldCheckCurTime: state.shouldCheckCurTime,
              isAssign:
                operateType === 'assign' &&
                (appointType === 'cargo' || appointType === 'demand'),
            }}
          >
            <div className={styles.con}>
              <div className={styles.leftWrap}>
                <div className={styles.leftModule}>
                  {/* <AdmittanceTip /> */}
                  <div className={styles.moduleItem}>
                    <RequirementModule goodsFormType="matchCargo" />
                  </div>
                  <div className={styles.moduleItem}>
                    <AssignModule
                      onSetTms={(val) => {
                        setState({ isTms: val });
                        setShouldCheckCurTime(!val);
                      }}
                      onSetIsCompanyMatchPrice={(val) =>
                        setState({ isCompanyMatchPrice: val })
                      }
                      isCompanyMatchPrice={state.isCompanyMatchPrice}
                      isDriverMatchPrice={state.isDriverMatchPrice}
                      onSetIsDriverMatchPrice={(val) =>
                        setState({ isDriverMatchPrice: val })
                      }
                    />
                  </div>
                  <div className={styles.moduleItem}>
                    <TransportModule goodsFormType="matchCargo" />
                  </div>
                  <div className={styles.moduleItem}>
                    <PriceModule
                      formType="LTL"
                      taxRate={state.taxRate}
                      valuationEnabled={state.valuationEnabled}
                      useFleetQuota={state.useFleetQuota}
                    />
                  </div>
                  <div className={styles.moduleItem}>
                    <OtherModule />
                  </div>
                  <div className={styles.operateBts}>
                    <Form.Item noStyle shouldUpdate={() => true}>
                      {({ getFieldValue }) => (
                        <Button
                          type="primary"
                          onClick={() => handleSubmit('publish')}
                          loading={
                            submitReq.loading &&
                            state.operateBtnType === 'publish'
                          }
                          disabled={
                            (submitReq.loading &&
                              state.operateBtnType === 'save') ||
                            getSubmitDisabled()
                          }
                        >
                          {state.isInvite ? '保存' : '发布'}
                        </Button>
                      )}
                    </Form.Item>

                    {!state.isInvite && (
                      <Button
                        style={{ marginLeft: 12 }}
                        onClick={() => handleSubmit('save')}
                        loading={
                          submitReq.loading && state.operateBtnType === 'save'
                        }
                        disabled={
                          submitReq.loading &&
                          state.operateBtnType === 'publish'
                        }
                      >
                        保存
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.rightWrap}>
                <div className={styles.rigthModule}>
                  <RoutesModule />
                </div>
              </div>
            </div>
          </FormContext.Provider>
        </Form>
      </Spin>
    </div>
  );
};

export default BreakBulkAdd;
