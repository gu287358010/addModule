import React, { useState } from 'react';
import { Form, Space } from 'antd';
import EditTable from '../../components/EditTable';
import AddrSelect from '../../components/AddrSelect';
import {
  checkConcatPhone,
  checkPrice,
  checkRequireFuncs,
  checkRules,
  compareTime,
  isNeedShouldUpdate,
} from '../../utils';
import { FormInstance } from 'antd/es/form/Form';
import AddressInput from '../AddressInput';
import { OperateType } from '../../types';
import { get, global } from '@parallel-line/utils';
import { DatePicker, Input } from '@parallel-line/components';
import styles from './index.less';
import { PxxSelect } from '@/baseComponents';
import { getCargoStatistics } from '@/pages/order/util';
import ItemSelect from '../../components/ItemSelect';
import { CARGO_PRICE_TYPES, GOODS_KEY_IN_PRICE_MODE } from '../../constants';
import { InputNumberUnit } from '@/businessComponent';

const { Item } = Form;

type UseFormType = 1 | 2; // 1：普通零担需求  2：货物需求，配载相关

interface AddCargoFormProps {
  index: number;
  fieldName: number;
  cargoDisabled?: boolean;
  matchReqDisable?: boolean; // 在货物配载情况下disable控制
  form?: FormInstance;
  formType: UseFormType;
  operateType?: OperateType;
  isTms?: boolean;
  calcPriceKey: string | symbol;
  isFTL?: boolean;
}

const { isShipper, isCarrier, isExt } = global.PXX_SOLUTION || {}; // 是否为货主

const AddCargoForm: React.FC<AddCargoFormProps> = ({
  index,
  fieldName,
  cargoDisabled,
  form,
  // formType,
  operateType,
  isTms,
  matchReqDisable,
  calcPriceKey,
  isFTL,
}) => {
  const disabled = cargoDisabled || matchReqDisable;

  const [visAddr, setVisAddr] = useState(false);

  const getValue = (key: string) =>
    form?.getFieldValue(['cargoRequestList', index, key]);

  const getNames = (name: string | string[]) =>
    _.isString(name) ? [fieldName, name] : [fieldName, ...name];

  const handleEmitCalc = () => {
    global.eventEmitter.emit({
      uniqueKey: calcPriceKey,
      cargoReqIndex: index,
    });
  };

  // 校验货物需求时间校验
  const checkCargoTime = (val: undefined | moment.Moment, i: number) => {
    if (!val) return Promise.resolve();
    const times = getValue('cargoPointList');
    if (i === 0) {
      // 取货时间
      const contrastTime = get(times, '[1].address.arriveTime');
      if (contrastTime && compareTime(val, contrastTime)) {
        return Promise.reject('取货时间需要小于到货时间');
      }
    } else {
      // 收货时间
      const contrastTime = get(times, '[0].address.arriveTime');
      if (contrastTime && compareTime(contrastTime, val)) {
        return Promise.reject('到货时间需要大于取货时间');
      }
    }
    return Promise.resolve();
  };

  // 时间更改重置校验
  const handleTimeChange = (i: number) => {
    if (i === 1) {
      const field = [
        'cargoRequestList',
        index,
        'cargoPointList',
        0,
        'address',
        'arriveTime',
      ];
      if (form?.getFieldValue(field)) form?.validateFields([field]);
    } else {
      const field = [
        'cargoRequestList',
        index,
        'cargoPointList',
        1,
        'address',
        'arriveTime',
      ];
      if (form?.getFieldValue(field)) form?.validateFields([field]);
    }
  };

  // 地址发生变化，校验发货点和收货点是否相同
  const checkAddr = (_index: number) => {
    handleEmitCalc();
    // 需要校验的地址
    const validatorName = [
      'cargoRequestList',
      index,
      'cargoPointList',
      _index === 0 ? 1 : 0,
      'address',
    ];
    if (get(form?.getFieldValue(validatorName), 'pointAddress')) {
      form?.validateFields([validatorName]);
    }
  };

  const tableRequiredKeys = (isRequired: boolean) => {
    // 货物需求下单，添加货物需求
    if (operateType === 'addCargo' && !isRequired)
      return ['descriptionOfGoods'];
    const priceMode = form?.getFieldValue('priceMode');
    const requiredList = _.compact([GOODS_KEY_IN_PRICE_MODE[priceMode]]);
    if (!isTms || isRequired)
      return [
        ...requiredList,
        'descriptionOfGoods',
        'cargoTypeClassificationCode',
        'goodsItemGrossWeight',
        'goodsItemCube',
        'totalNumberOfPackages',
      ];
    return requiredList;
  };

  const receiptForm = (
    <>
      <Form.Item
        label="回单要求（多选）"
        name={getNames(['receipt', 'receiptType'])}
      >
        <ItemSelect.Group disabled={disabled} type="multiple">
          <ItemSelect value="0">邮寄纸质回单</ItemSelect>
          <ItemSelect value="1">上传回单照片</ItemSelect>
        </ItemSelect.Group>
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          !_.isEqual(
            get(prevValues, `cargoRequestList[${index}].receipt.receiptType`),
            get(
              currentValues,
              `cargoRequestList[${index}].receipt.receiptType`,
            ),
          )
        }
      >
        {({ getFieldValue }) => {
          return (
            getFieldValue([
              'cargoRequestList',
              index,
              'receipt',
              'receiptType',
            ]) || []
          ).includes('0') ? (
            <Space size={12} className="customSpace">
              <Form.Item name={getNames(['receipt', 'addrCom'])}>
                <AddressInput disabled={disabled} onChange={handleEmitCalc} />
              </Form.Item>
              <Space size={12} className="customSpace">
                <Form.Item name={getNames(['receipt', 'addrCom', 'contacts'])}>
                  <Input
                    placeholder="联系人信息"
                    maxLength={20}
                    disabled={disabled}
                  />
                </Form.Item>
                <Form.Item
                  name={getNames(['receipt', 'addrCom', 'contactsPhone'])}
                  rules={[
                    {
                      validator: (rule, value) =>
                        checkConcatPhone(value, false),
                    },
                  ]}
                >
                  <Input
                    placeholder="联系人电话"
                    maxLength={11}
                    disabled={disabled}
                  />
                </Form.Item>
              </Space>
            </Space>
          ) : null;
        }}
      </Form.Item>
    </>
  );

  // 展示起始地和目的地
  const canShowSites = !!getValue('startAddr') || !!getValue('endAddr');

  // 目的地 起始点
  const siteFormItems = () => {
    if (isCarrier && (visAddr || canShowSites))
      return (
        <Space size={12} className="customSpace">
          <Item name={getNames('startAddr')} label="起始地">
            <AddrSelect
              addrType={60}
              disabled={disabled}
              contactsRequired={false}
              hideAddrName
            />
          </Item>
          <Item name={getNames('endAddr')} label="目的地">
            <AddrSelect
              addrType={70}
              disabled={disabled}
              contactsRequired={false}
              hideAddrName
            />
          </Item>
        </Space>
      );
    return null;
  };

  const extFormItems = () => {
    if (isExt)
      return (
        <>
          <Space size={12} className="customSpace">
            <Item label="紧急程度" name={getNames('urgentType')}>
              <PxxSelect dicKey="request.request.urgent_type" />
            </Item>
            <Item label="业务类型" name={getNames('cargoBusinessType')}>
              <PxxSelect
                dicKey="shipment.shipment.cargo_business_type"
                disabled={disabled}
              />
            </Item>
          </Space>
          <Item label="备注" name={getNames('remark')}>
            <Input maxLength={20} disabled={disabled} />
          </Item>
          <Space size={12} className="customSpace">
            <Item label="外部订单号1" name={getNames('ext10')}>
              <Input maxLength={20} disabled={disabled} />
            </Item>
            <Item label="外部订单号2" name={getNames('ext11')}>
              <Input maxLength={20} disabled={disabled} />
            </Item>
          </Space>
        </>
      );
    return (
      <Item label="紧急程度" name={getNames('urgentType')}>
        <PxxSelect dicKey="request.request.urgent_type" />
      </Item>
    );
  };

  const commonFormItems = () => {
    if (isCarrier)
      return (
        <>
          <Space size={12} className="customSpace">
            <Item
              name={getNames('cargoOwner')}
              label="货主"
              rules={[
                {
                  validator: (_rule, val) =>
                    checkRules(
                      [
                        ['maxLength', 15],
                        ['emoji', true],
                        ['specialChat', true],
                      ],
                      val,
                    ),
                },
              ]}
            >
              <Input disabled={disabled} onBlur={handleEmitCalc} />
            </Item>
            <Item name={getNames('paymentType')} label="收款方式">
              <PxxSelect
                dicKey="common.common.payment"
                disabled={disabled}
                getPopupContainer={(node) => node.parentNode}
              />
            </Item>
          </Space>
        </>
      );
    return null;
  };

  const statistics = getCargoStatistics([
    form?.getFieldValue('cargoRequestList')[index],
  ]);

  const showOtherAddr = isCarrier && !(visAddr || canShowSites);

  const commonTableForm = (
    <>
      {!isShipper && (
        <Space size={12} className="customSpace">
          <Item name={getNames('cargoPriceType')} label="计价方式">
            <ItemSelect.Group
              dicKey="request.cargo_request.cargo_price_type"
              onChange={handleEmitCalc}
            />
          </Item>
          <Item
            noStyle
            shouldUpdate={(prev, current) =>
              isNeedShouldUpdate(
                prev,
                current,
                `cargoRequestList[${index}].cargoPriceType`,
              )
            }
          >
            {() => {
              const cargoPriceType = getValue('cargoPriceType');
              if (cargoPriceType === '0') return null;
              return (
                <Item
                  name={getNames('cargoPriceValue')}
                  label="价格"
                  rules={[
                    { validator: (rule, value) => checkPrice(value, false) },
                  ]}
                >
                  <InputNumberUnit
                    placeholder="请输入"
                    unit={CARGO_PRICE_TYPES[cargoPriceType]?.label}
                    onChange={handleEmitCalc}
                    precision={2}
                  />
                </Item>
              );
            }}
          </Item>
        </Space>
      )}
      <Item
        noStyle
        shouldUpdate={(prev, current) =>
          isNeedShouldUpdate(
            prev,
            current,
            `cargoRequestList[${index}].cargoTotalCost`,
          )
        }
      >
        {() => (
          <div className={styles.goodsLabel}>
            <span>货物</span>
            <div style={{ color: 'rgba(0, 0, 0, .6)' }}>
              合计：
              {statistics.goodsCounts}单&nbsp;/&nbsp;
              {statistics.goodsWeights}kg&nbsp;/&nbsp;
              {statistics.goodsVolume}m³&nbsp;/&nbsp;
              {statistics.goodsTotals}件
              {!isShipper && (
                <>， 应收费用&nbsp;{statistics.goodsTotalPrice}元</>
              )}
            </div>
          </div>
        )}
      </Item>
      <Item
        noStyle
        shouldUpdate={(prev, current) =>
          isNeedShouldUpdate(prev, current, [
            `cargoRequestList[${index}].cargoPriceType`,
            `cargoRequestList[${index}].cargoGoodsList`,
          ])
        }
      >
        {() => (
          <Item
            name={getNames('cargoGoodsList')}
            style={{ marginBottom: showOtherAddr ? 8 : 12 }}
          >
            <EditTable
              index={index}
              disabled={cargoDisabled}
              hidePrice={isShipper}
              requiredKeys={tableRequiredKeys(false)}
              hideFooter={!isFTL}
              cargoPriceType={getValue('cargoPriceType')}
            />
          </Item>
        )}
      </Item>
      {showOtherAddr && (
        <div
          className="link"
          style={{ fontSize: 12, marginBottom: 12 }}
          onClick={() => setVisAddr(true)}
        >
          备注地址信息
        </div>
      )}
    </>
  );

  return (
    <div>
      <Item name={getNames('id')} hidden>
        <Input disabled />
      </Item>
      {commonFormItems()}
      <Form.List name={getNames('cargoPointList')}>
        {(fields) =>
          fields.map((field, i) => (
            <Space size={12} className="customSpace" key={field.key}>
              <Item
                name={[field.name, 'address']}
                label={`${i === 0 ? '发' : '收'}货地`}
                required
                rules={[
                  {
                    validator: (rule, val: Record<string, any>) =>
                      checkRequireFuncs[`cargoPointList[${i}].address`](
                        val,
                        get(
                          getValue('cargoPointList'),
                          `[${i === 0 ? 1 : 0}]address.pointAddress`,
                        ),
                      ),
                  },
                ]}
              >
                <AddrSelect
                  addrType={i === 0 ? 10 : 20}
                  disabled={disabled}
                  onChange={() => checkAddr(i)}
                  // contactsRequired={operateType !== 'addCargo'}
                  contactsRequired={false}
                  hideSite={operateType === 'assign'}
                />
              </Item>
              <Item
                name={[field.name, 'address', 'arriveTime']}
                label={`${i === 0 ? '取货时间' : '收货时间'}`}
                rules={[
                  { validator: (rule, value) => checkCargoTime(value, i) },
                ]}
              >
                <DatePicker
                  // showTime
                  placeholder="请选择"
                  style={{ width: '100%' }}
                  disabled={disabled}
                  onChange={() => handleTimeChange(i)}
                />
              </Item>
            </Space>
          ))
        }
      </Form.List>
      {commonTableForm}
      {siteFormItems()}
      {receiptForm}
      {extFormItems()}
    </div>
  );
};

export default AddCargoForm;
