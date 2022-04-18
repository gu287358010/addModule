import React from 'react';
import ModuleTitle from '../components/ModuleTitle';
import { Form, Space, Input } from 'antd';
import AddressInput from '../RequirementModule/AddressInput';
import { checkConcatPhone } from '../utils';
import { GoodsFormType } from '../types';
import { get } from '@parallel-line/utils';
import ItemSelect from '../components/ItemSelect';

interface TransportModuleProps {
  goodsFormType: GoodsFormType;
  position?: string;
}

const TransportModule: React.FC<TransportModuleProps> = ({
  goodsFormType,
  position,
}) => {
  const additionals = GetDic('common.common.additional_requirement');

  return (
    <div>
      <ModuleTitle title="运输要求" icon="iconyunshuyaoqiu" />
      <div className="moduleCon">
        {goodsFormType === 'addBreakbulk' && (
          <>
            <Form.Item
              label="回单要求（多选）"
              name={['receipt', 'receiptType']}
            >
              <ItemSelect.Group type="multiple">
                <ItemSelect value="0">邮寄纸质回单</ItemSelect>
                <ItemSelect value="1">上传回单照片</ItemSelect>
              </ItemSelect.Group>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, current) =>
                prev.receipt?.receiptType !== current.receipt?.receiptType ||
                !_.isEqual(prev.pointList, current.pointList)
              }
            >
              {({ getFieldValue }) => {
                return get(
                  getFieldValue('receipt'),
                  'receiptType',
                  [],
                ).includes('0') ? (
                  <Space size={12} className="customSpace">
                    <Form.Item name={['receipt', 'addrCom']}>
                      <AddressInput
                        addrPosition={
                          position === 'entrieCar' ? 'addrCom' : undefined
                        }
                      />
                    </Form.Item>
                    <Space size={12} className="customSpace">
                      <Form.Item name={['receipt', 'addrCom', 'contacts']}>
                        <Input placeholder="联系人信息" maxLength={20} />
                      </Form.Item>
                      <Form.Item
                        name={['receipt', 'addrCom', 'contactsPhone']}
                        rules={[
                          {
                            validator: (rule, value) =>
                              checkConcatPhone(value, false),
                          },
                        ]}
                      >
                        <Input placeholder="联系人电话" maxLength={11} />
                      </Form.Item>
                    </Space>
                  </Space>
                ) : null;
              }}
            </Form.Item>
          </>
        )}
        <Form.Item label="附加要求（多选）" name="attachCodeList">
          <ItemSelect.Group type="multiple">
            {additionals.map((item: any) => (
              <ItemSelect value={item.key} key={item.key}>
                {item.value}
              </ItemSelect>
            ))}
          </ItemSelect.Group>
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input
            placeholder="请输入备注需求"
            style={{ width: '100%' }}
            maxLength={30}
          />
        </Form.Item>
      </div>
    </div>
  );
};

export default TransportModule;
