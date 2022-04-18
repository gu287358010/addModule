import React, { useContext, useMemo } from 'react';
import { Form, Space, Input, Select, Tooltip } from 'antd';
import ModuleTitle from '../components/ModuleTitle';
import { PxxSelect } from '@/baseComponents';
import styles from './index.less';
import { FormContext, getPointCoordinate, isNeedShouldUpdate } from '../utils';
import { FormType, ObjectType } from '../types';
// import { calc } from '@/utils';
import classNames from 'classnames';
import CashForm from './components/CashForm';
import { FormInstance } from 'antd/es/form/Form';
import { formatNumber } from '../../util';
import { global, obtainDic, unitTransform } from '@parallel-line/utils';
import { addTax } from './components/addTax';
import { RiseOutlined } from '@parallel-line/icons';
import { MAX_PRICE } from '../constants';
import classnames from 'classnames';
import { InputOnlyNumber } from '@/businessComponent';

const { Option } = Select;
const { eventEmitter } = global;
const { centToYuan } = unitTransform;

interface PriceModuleProps {
  formType: FormType;
  assignDisabled?: boolean;
  taxRate?: number;
  valuationEnabled?: boolean;
  isFromShipper?: boolean;
  useFleetQuota: number;
}

const { KCModifyEnabled } = global.PXX_SOLUTION;

const PriceModule: React.FC<PriceModuleProps> = ({
  formType,
  assignDisabled,
  taxRate,
  valuationEnabled,
  isFromShipper,
  useFleetQuota,
}) => {
  const { form, emitterKeys } = useContext(FormContext);

  const KCDisabled =
    KCModifyEnabled &&
    (formType === 'LTL' || (!isFromShipper && formType === 'FTL'));

  const priceModes = useMemo(
    () =>
      obtainDic({
        dicKey: 'request.request.price_model',
      }) as ObjectType[],
    [],
  );

  // const getPriceModels = (priceType: number) => {
  //   const list = obtainDic({
  //     dicKey: 'request.request.price_model',
  //   }) as ObjectType[];
  //   const platformUndertakeDutyDriver = form?.getFieldValue(
  //     'platformUndertakeDutyDriver',
  //   );
  //   const assignType = form?.getFieldValue('assignType');
  //   const tradeType = form?.getFieldValue('tradeType');
  //   return priceType === 1 &&
  //     ((platformUndertakeDutyDriver && assignType === 1 && tradeType === 0) ||
  //       tradeType === 10)
  //     ? list.filter((item: ObjectType) => item.key === '4')
  //     : list;
  // };

  // 添加税点
  const handleAddTax = () => {
    // const valuationShare = form?.getFieldValue('valuationShare') || {};
    addTax({
      taxRate: !_.isNil(taxRate) ? taxRate / 100 : undefined,
      onSuccess: (params: ObjectType) => {
        const valuationShare = form?.getFieldValue('valuationShare') || {};
        form?.setFieldsValue({
          valuationShare: { ...valuationShare, ...params },
        });
        eventEmitter.emit({
          uniqueKey: emitterKeys.updateState,
          newState: { taxRate: params.taxRate * 100 },
        });
        eventEmitter.emit({ uniqueKey: emitterKeys.calcValuationShare });
      },
    });
  };

  // 税率
  // const rendeTaxRateInfo = () => {
  //   const taxRateInfo = form?.getFieldValue('taxRateInfo');
  //   if (taxRateInfo)
  //     return (
  //       <span>
  //         （税点：{calc(`${taxRateInfo.serviceRate}/100`)}%，合计不含税金额：
  //         {centToYuan(taxRateInfo.excludeAmount) || '--'}元）
  //       </span>
  //     );
  //   return null;
  // };

  // 系统与手动切换
  const handleInpTypeChange = () => {
    const assignType = form?.getFieldValue('assignType');
    if (assignType === 3) {
      const isMatchPrice = form?.getFieldValue('isCompanyMatchPrice');
      if (isMatchPrice === 1) {
        // 切换为手动输入
        form?.setFieldsValue({
          isCompanyMatchPrice: 0,
          priceMode: form?.getFieldValue('tempPriceMode'),
          realPrice: undefined,
          costCent: undefined,
        });
        eventEmitter.emit({ uniqueKey: emitterKeys.calcAccountReceivable });
      } else {
        // 系统匹配
        form?.setFieldsValue({ isCompanyMatchPrice: 1 });
        eventEmitter.emit({
          uniqueKey: emitterKeys.resetPriceByCarryInfoChange,
        });
      }
    } else if (assignType === 1) {
      const isMatchPrice = form?.getFieldValue('isDriverMatchPrice');
      if (isMatchPrice === 1) {
        // 手动输入
        form?.setFieldsValue({
          isDriverMatchPrice: 0,
          realPrice: undefined,
          costCent: undefined,
          priceMode: form?.getFieldValue('tempPriceMode'),
        });
        eventEmitter.emit({ uniqueKey: emitterKeys.calcAccountReceivable });
      } else {
        // 系统匹配
        form?.setFieldsValue({ isDriverMatchPrice: 1 });
        eventEmitter.emit({
          uniqueKey: emitterKeys.resetPriceByCarryInfoChange,
        });
      }
    }
  };

  // 获取是否是价格匹配
  const getIsMatchPrice = () => {
    const { getFieldValue } = form as FormInstance;
    const isCompanyMatchPrice =
      getFieldValue('isCompanyMatchPrice') === 1 &&
      getFieldValue('assignType') === 3;
    const isDriverMatchPrice =
      getFieldValue('isDriverMatchPrice') === 1 &&
      getFieldValue('assignType') === 1;
    return (
      getFieldValue('tradeType') === 0 &&
      (isCompanyMatchPrice || isDriverMatchPrice)
    );
  };

  // 零担场景价格输入框
  const renderLtlPriceNode = (getFieldValue: any) => {
    const isMatchPrice = getIsMatchPrice();
    // 价格匹配，不可选计价类型
    if (isMatchPrice)
      return (
        <Form.Item noStyle name="priceMode">
          <PxxSelect
            style={{ width: '100%' }}
            options={priceModes}
            allowClear={false}
            disabled
            fieldNames={{
              label: 'value',
              value: 'key',
            }}
            getPopupContainer={(ele) => ele.parentNode}
          />
        </Form.Item>
      );
    return (
      <>
        <Form.Item
          noStyle
          name="originPrice"
          rules={[
            {
              validator: (_rule, val) => handleCheckPrice(val),
            },
          ]}
        >
          <InputOnlyNumber
            placeholder="价格"
            disabled={KCDisabled}
            wait={300}
            canInputZero={!priceRequired}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) => prev.priceType !== current.priceType}
        >
          {() => (
            <Form.Item noStyle name="priceMode">
              <PxxSelect
                style={{ width: 86 }}
                options={priceModes}
                allowClear={false}
                fieldNames={{
                  label: 'value',
                  value: 'key',
                }}
                disabled={KCDisabled}
                getPopupContainer={(ele) => ele.parentNode}
              />
            </Form.Item>
          )}
        </Form.Item>
      </>
    );
  };

  // 价格策略，价格列表
  const renderPriceList = () => (
    <Form.Item
      noStyle
      shouldUpdate={(prev, current) =>
        isNeedShouldUpdate(prev, current, [
          'costCent',
          'vehicleInfo',
          'assignType',
          'tradeType',
          'vehicleData',
          'valuationShare',
          'pointList',
          'vehicleTypeList',
          'vehicleLength',
        ])
      }
    >
      {({ getFieldValue }) => {
        const costCent = getFieldValue('costCent');
        if (costCent > 0) {
          const assignType = getFieldValue('assignType');
          const tradeType = getFieldValue('tradeType');
          const errs = []; // 提示文案list
          const pointList = getFieldValue('pointList') || [];
          const points = _.filter(
            pointList,
            (point) => !!getPointCoordinate(point, formType),
          );
          if (points.length < 2) errs.push('地址');
          let hasAddTax = false;
          if (tradeType === 0 && (assignType === 1 || assignType === 7)) {
            const vehicleInfo = getFieldValue('vehicleInfo') || {};
            if (!vehicleInfo.vehicleLength && !vehicleInfo.vehicleType) {
              errs.push('车辆');
            }
          } else if (
            (tradeType === 0 && assignType === 3) ||
            tradeType === 40 ||
            tradeType === 10
          ) {
            if (tradeType === 10) {
              const vehicleType = getFieldValue('vehicleTypeList') || [];
              const vehicleLength = getFieldValue('vehicleLength');
              if (vehicleType.length === 0 || !vehicleLength)
                errs.push('车长车型');
            } else {
              const vehicleData = getFieldValue('vehicleData') || [];
              if (vehicleData.length === 0) errs.push('车长车型');
            }
            hasAddTax = tradeType !== 10;
          }
          const valuationShare = form?.getFieldValue('valuationShare') || {};
          const needTip =
            valuationShare.actualLaborCostPercent >
            valuationShare.laborCostPercent;

          return (
            <>
              <div className={styles.priceListWrap}>
                <Space size={40} className={styles.priceList}>
                  <div>
                    <div>
                      预计油费：
                      {centToYuan?.(valuationShare.oilPriceAmount, '--')}元
                    </div>
                    <div>
                      预计折旧费：
                      {centToYuan?.(valuationShare.depreciationAmount, '--')}元
                    </div>
                  </div>
                  <div>
                    <div>
                      预计路桥费：
                      {centToYuan?.(valuationShare.tollsAmount, '--')}元
                    </div>
                    <div>
                      预计人工费：
                      <span className={needTip ? styles.tip : ''}>
                        {centToYuan?.(
                          valuationShare.laborCostPriceAmount,
                          '--',
                        )}
                        元
                      </span>
                      {needTip && (
                        <Tooltip title="该订单人工成本占比过高">
                          <RiseOutlined
                            className={styles.tip}
                            style={{ marginLeft: 2 }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </Space>
                {hasAddTax && (
                  <>
                    {!_.isNil(taxRate) ? (
                      <div>
                        <div className="link" onClick={handleAddTax}>
                          修改税点
                        </div>
                        <div onClick={handleAddTax}>
                          已扣除{taxRate / 100}%税点
                        </div>
                      </div>
                    ) : (
                      <span className="link" onClick={handleAddTax}>
                        添加税点
                      </span>
                    )}
                  </>
                )}
              </div>
              {errs.length > 0 && (
                <div className={styles.tip} style={{ marginTop: 8 }}>
                  选择{errs.join('、')}
                  后，才能进行用车价格分摊的计算哦！
                </div>
              )}
            </>
          );
        }
        return null;
      }}
    </Form.Item>
  );

  // 是否展示价格类型筛选
  const canShowPriceType = () => {
    return !!form?.getFieldValue('contractInfo');
  };

  const priceRequired = !(
    !canShowPriceType() &&
    form?.getFieldValue('assignType') === 1 &&
    form.getFieldValue('tradeType') === 0
  );
  const handleCheckPrice = (value?: number | string) => {
    if (priceRequired) {
      if (_.isNil(value)) return Promise.reject('请输入价格');
      if (value <= 0) {
        return Promise.reject('输入价格需要大于0元');
      }
    }

    if (!_.isNil(value) && Number.isNaN(Number(value)) && value !== '-') {
      return Promise.reject('请输入数值');
    }
    const includeAmount = form?.getFieldValue('includeAmount');
    const excludeAmount = form?.getFieldValue('excludeAmount');
    const errTexts = [];
    if ((value as number) > MAX_PRICE) errTexts.push('输入价格');
    if (canShowPriceType() && excludeAmount > MAX_PRICE)
      errTexts.push('司机到手价');
    if (includeAmount > MAX_PRICE) errTexts.push('实际支付价格');
    if (errTexts.length > 0) {
      return Promise.reject(`${errTexts.join('，')}不能高于2千万元`);
    }
    return Promise.resolve();
  };

  // render指派车队长信息
  const renderDriverLeaderTip = (getFieldValue: Function) => {
    const contractInfo = getFieldValue('contractInfo');
    // const includeAmount = getFieldValue('includeAmount');
    const excludeAmount = getFieldValue('excludeAmount');
    let flag = false;
    let text;
    if (
      !!contractInfo &&
      getFieldValue('assignType') === 7 &&
      getFieldValue('tradeType') === 0
    ) {
      const monthLimitAmount = centToYuan(
        contractInfo.driverLeaderInfo?.monthLimitAmount,
      );
      const singleLimitAmount = centToYuan(
        contractInfo.driverLeaderInfo?.singleLimitAmount,
      );
      if (
        !_.isNil(monthLimitAmount) &&
        excludeAmount > monthLimitAmount - useFleetQuota
      ) {
        flag = true;
        text = '余额不足，无法发布';
      } else if (
        !_.isNil(singleLimitAmount) &&
        excludeAmount > singleLimitAmount
      ) {
        flag = true;
        text = `到手价不能超过${formatNumber(singleLimitAmount)}元`;
      }
    }
    if (flag) {
      return (
        <div
          className={styles.priceDesc}
          style={{ color: '#F0364A', fontSize: 14 }}
        >
          {text}
        </div>
      );
    }
    return null;
  };

  const renderPriceForm = () => (
    <div>
      <Form.Item required={priceRequired} label="运输费">
        {formType === 'LTL' && (
          <Form.Item noStyle hidden name="costCent">
            <InputOnlyNumber placeholder="请输入" maxLength={13} />
          </Form.Item>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              isNeedShouldUpdate(prev, current, [
                'canCompanyMatchPrice',
                'canDriverMatchPrice',
                'isDriverMatchPrice',
                'isCompanyMatchPrice',
                'assignType',
              ])
            }
          >
            {({ getFieldValue }) =>
              ((!!getFieldValue('canCompanyMatchPrice') &&
                getFieldValue('assignType') === 3) ||
                (!!getFieldValue('canDriverMatchPrice') &&
                  getFieldValue('assignType') === 1)) &&
              !assignDisabled &&
              getFieldValue('tradeType') === 0 && (
                <span
                  className={classNames('link', styles.operateBtn)}
                  onClick={handleInpTypeChange}
                >
                  切换
                  {getIsMatchPrice() ? '手动输入' : '系统匹配'}
                </span>
              )
            }
          </Form.Item>
          <Input.Group compact style={{ display: 'flex' }}>
            {/** 勾选平台承责，选择价格priceType */}
            <Form.Item
              noStyle
              shouldUpdate={(prev, current) =>
                isNeedShouldUpdate(prev, current, [
                  'platformUndertakeDutyDriver',
                  'platformUndertakeDutyGrab',
                  'assignType',
                  'isDriverMatchPrice',
                  'tradeType',
                  'contractInfo.billingType',
                ])
              }
            >
              {({ getFieldValue }) => {
                const contractInfo = getFieldValue('contractInfo');
                if (canShowPriceType()) {
                  return (
                    <Form.Item noStyle name="priceType">
                      <Select
                        style={{ width: 120 }}
                        disabled={assignDisabled || KCDisabled}
                      >
                        {[1, 2].includes(contractInfo?.billingType) && (
                          <Option value={1}>司机到手</Option>
                        )}
                        {[0, 2].includes(contractInfo?.billingType) && (
                          <Option value={0}>含税价</Option>
                        )}
                      </Select>
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prev, current) =>
                isNeedShouldUpdate(prev, current, [
                  'isCompanyMatchPrice',
                  'isDriverMatchPrice',
                  'priceType',
                  'assignType',
                  'tradeType',
                ])
              }
            >
              {({ getFieldValue }) =>
                formType === 'LTL' ? (
                  renderLtlPriceNode(getFieldValue)
                ) : (
                  <Form.Item
                    noStyle
                    name="costCent"
                    rules={[
                      { validator: (rule, val) => handleCheckPrice(val) },
                    ]}
                  >
                    <InputOnlyNumber
                      wait={300}
                      canInputZero={!priceRequired}
                      placeholder={
                        getFieldValue('priceType') !== 1
                          ? '含税价'
                          : '司机到手价'
                      }
                      disabled={
                        getIsMatchPrice() || assignDisabled || KCDisabled
                      }
                    />
                  </Form.Item>
                )
              }
            </Form.Item>
            {formType !== 'LTL' && (
              <span className={styles.inpAfterUnit}>元</span>
            )}
          </Input.Group>
        </div>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, current) =>
          isNeedShouldUpdate(prev, current, [
            'includeAmount',
            'assignType',
            'tradeType',
            'contractInfo',
          ])
        }
      >
        {({ getFieldValue }) => renderDriverLeaderTip(getFieldValue)}
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, current) =>
          isNeedShouldUpdate(prev, current, [
            'excludeAmount',
            'includeAmount',
            'infoServiceAmount',
            'contractInfo',
          ])
        }
      >
        {({ getFieldValue }) => (
          <div className={styles.priceWrap}>
            {canShowPriceType() && (
              <div className={styles.priceDesc} style={{ marginRight: 24 }}>
                司机到手价：
                <span
                  className={classnames(
                    getFieldValue('excludeAmount') > MAX_PRICE && styles.error,
                  )}
                >
                  {formatNumber(getFieldValue('excludeAmount'))}元
                </span>
              </div>
            )}
            <div className={styles.priceDesc} style={{ marginRight: 24 }}>
              实际支付费用：
              <span
                className={classnames(
                  getFieldValue('includeAmount') > MAX_PRICE && styles.error,
                )}
              >
                {formatNumber(
                  getFieldValue('includeAmount'),
                  false,
                  !priceRequired,
                )}
                元
              </span>
            </div>
            {getFieldValue('contractInfo')?.isInfoServeRate === 1 && (
              <div className={styles.priceDesc} style={{ marginRight: 24 }}>
                信息服务费：
                <span>
                  {formatNumber(getFieldValue('infoServiceAmount'))}元
                </span>
              </div>
            )}
          </div>
        )}
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, current) =>
          isNeedShouldUpdate(prev, current, [
            'assignType',
            'tradeType',
            'contractInfo',
            'platformUndertakeDutyDriver',
          ])
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('assignType') === 7 &&
          getFieldValue('tradeType') === 0 &&
          !!getFieldValue('contractInfo') &&
          !_.isNil(
            getFieldValue('contractInfo').driverLeaderInfo?.monthLimitAmount,
          ) &&
          getFieldValue('platformUndertakeDutyDriver') && (
            <div className={styles.priceDesc}>
              当月剩余额度：
              <span>
                {formatNumber(
                  centToYuan(
                    getFieldValue('contractInfo')?.driverLeaderInfo
                      ?.monthLimitAmount,
                  ) - useFleetQuota,
                )}
                元
              </span>
            </div>
          )
        }
      </Form.Item>
      {valuationEnabled && renderPriceList()}
    </div>
  );

  return (
    <div>
      <ModuleTitle title="费用" icon="iconfeiyong" />
      <div className="moduleCon">
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) => prev.tradeType !== current.tradeType}
        >
          {({ getFieldValue }) => (
            <Space size={12} className="customSpace" align="baseline">
              {getFieldValue('tradeType') !== 20 && renderPriceForm()}
              <Form.Item
                label="付款方式"
                name="paymentType"
                rules={[
                  {
                    required: true,
                    message: '请选择付款方式',
                  },
                ]}
              >
                <PxxSelect
                  showSearch={false}
                  style={{ width: '100%' }}
                  placeholder="请选择"
                  dicKey="common.common.payment"
                  allowClear
                  getPopupContainer={(ele) => ele.parentNode}
                  disabled={assignDisabled}
                />
              </Form.Item>
            </Space>
          )}
        </Form.Item>
        {/** 付款方式为现付时表单 */}
        <CashForm />
      </div>
    </div>
  );
};

export default PriceModule;
