import { PxxSelect } from '@/baseComponents';
import { Input } from '@parallel-line/components';
import { global } from '@parallel-line/utils';
import { Space, Form, InputNumber } from 'antd';
import { valueType } from 'antd/lib/statistic/utils';
import React, { useState, useContext, useEffect } from 'react';
import AddBtn from '../components/AddBtn';
import ModuleTitle from '../components/ModuleTitle';
import {
  checkPrice,
  formatInpNumber,
  FormContext,
  isNeedShouldUpdate,
  parserInpNumber,
} from '../utils';
import styles from './index.less';

const { isCarrier, KCEnabled } = global.PXX_SOLUTION ?? {};

interface OtherModuleProps {
  assignDisabled?: boolean;
  isFromShipper?: boolean; // 是否来源于货主指派
}

const OtherModule: React.FC<OtherModuleProps> = ({
  assignDisabled,
  isFromShipper,
}) => {
  const { isFTL, isTms, form, emitterKeys } = useContext(FormContext);

  const canShowOwner = isFTL && isCarrier && !isFromShipper;

  const [collapsed, setCollapsed] = useState(!(KCEnabled && canShowOwner));

  const handlePriceChange = (value?: valueType) => {
    if (KCEnabled) {
      form?.setFieldsValue({ costCent: value || undefined });
      global.eventEmitter.emit({ uniqueKey: emitterKeys.calcRealPrice });
    }
  };

  useEffect(() => {
    if (!isTms) {
      setCollapsed(false);
    }
  }, [isTms]);

  const isHasValue = (getF: any) => {
    let res = false;
    if (canShowOwner) {
      const requestCost = getF('requestCost') || {};
      res =
        getF('cargoOwner') ||
        !!requestCost.costCent ||
        !!requestCost.ownerPaymentType;
    }
    res = res || !!getF('businessType');
    return res;
  };

  return (
    <Form.Item
      noStyle
      shouldUpdate={(prev, current) =>
        isNeedShouldUpdate(prev, current, [
          'businessType',
          'requestCost',
          'cargoOwner',
        ])
      }
    >
      {({ getFieldValue }) =>
        !collapsed || isHasValue(getFieldValue) ? (
          <div>
            <ModuleTitle title="其他" icon="iconqita" />
            <div className="moduleCon">
              {canShowOwner && (
                <Space size={12} className="customSpace">
                  <Form.Item label="货主" name="cargoOwner">
                    <Input disabled={assignDisabled} />
                  </Form.Item>
                  <Form.Item label="应收费用">
                    <Input.Group compact style={{ display: 'flex' }}>
                      <Form.Item
                        noStyle
                        name={['requestCost', 'costCent']}
                        rules={[
                          {
                            validator: (rule, val) => checkPrice(val, false),
                          },
                        ]}
                      >
                        <InputNumber
                          disabled={assignDisabled}
                          style={{ flex: 1 }}
                          placeholder="请输入"
                          formatter={formatInpNumber}
                          parser={parserInpNumber}
                          precision={2}
                          onChange={handlePriceChange}
                        />
                      </Form.Item>
                      <span className={styles.inpAfterUnit}>元</span>
                    </Input.Group>
                  </Form.Item>
                </Space>
              )}
              <Space size={12} className="customSpace">
                {canShowOwner && (
                  <Form.Item
                    label="收款方式"
                    name={['requestCost', 'ownerPaymentType']}
                  >
                    <PxxSelect
                      disabled={assignDisabled}
                      style={{ width: '100%' }}
                      placeholder="请选择"
                      dicKey="common.common.payment"
                      allowClear
                      getPopupContainer={(ele) => ele.parentNode}
                    />
                  </Form.Item>
                )}
                <Form.Item
                  label="运输业务类型"
                  name="businessType"
                  rules={[{ required: !isTms, message: '请选择运输业务类型' }]}
                >
                  <PxxSelect
                    placeholder="请选择"
                    dicKey="common.common.business_type"
                    showSearch={false}
                  />
                </Form.Item>
              </Space>
            </div>
          </div>
        ) : (
          <AddBtn
            title="添加其他信息"
            onClick={() => setCollapsed(false)}
            style={{ marginLeft: 48 }}
          />
        )
      }
    </Form.Item>
  );
};

export default OtherModule;
