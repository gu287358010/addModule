/**
 * 现付信息表单
 */
import React from 'react';
import { Form, Radio, Space } from 'antd';
import { Input } from '@parallel-line/components';

const CashForm = () => {
  const payChannels = GetDic('finance.ebill.payment_channel');

  const renderPayChannel = (payChannel: string = '0') => {
    if (payChannel === '0' || payChannel === '1') {
      // 微信 支付宝
      return (
        <Space size={12} className="customSpace">
          <Form.Item
            name={['cash', 'accountNo']}
            required={false}
            rules={[
              {
                required: true,
                message: `请输入${
                  payChannel === '0' ? '对方微信号' : '对方支付宝账号'
                }`,
              },
            ]}
          >
            <Input
              placeholder={payChannel === '0' ? '对方微信号' : '对方支付宝账号'}
            />
          </Form.Item>
          <Form.Item
            name={['cash', 'contacts']}
            rules={[{ required: true, message: '请输入对方联系人姓名' }]}
          >
            <Input placeholder="对方联系人姓名" />
          </Form.Item>
        </Space>
      );
    }
    if (payChannel === '2') {
      // 银行卡
      return (
        <Space size={12} className="customSpace">
          <Form.Item
            name={['cash', 'accountNo']}
            required={false}
            rules={[{ required: true, message: '请输入对方银行卡号' }]}
          >
            <Input placeholder="对方银行卡号" />
          </Form.Item>
          <Space size={12} className="customSpace">
            <Form.Item
              name={['cash', 'bankName']}
              rules={[{ required: true, message: '请输入银行名称' }]}
            >
              <Input placeholder="银行名称" />
            </Form.Item>
            <Form.Item
              name={['cash', 'contacts']}
              rules={[{ required: true, message: '请输入开户人' }]}
            >
              <Input placeholder="开户人" />
            </Form.Item>
          </Space>
        </Space>
      );
    }
    return (
      <Form.Item
        name={['cash', 'remark']}
        required={false}
        rules={[{ required: true, message: '请输入备注信息' }]}
      >
        <Input placeholder="备注信息" />
      </Form.Item>
    );
  };

  return (
    <Form.Item
      noStyle
      shouldUpdate={(prev, current) => prev.paymentType !== current.paymentType}
    >
      {({ getFieldValue }) =>
        String(getFieldValue('paymentType')) === '10' && (
          <>
            <Form.Item
              label="转账类型"
              required
              initialValue="0"
              name={['cash', 'paymentChannel']}
            >
              <Radio.Group>
                {payChannels.map((item: any) => (
                  <Radio
                    value={item.key}
                    key={item.key}
                    style={{ marginRight: 40 }}
                  >
                    {item.value}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, current) =>
                prev.cash?.paymentChannel !== current.cash?.paymentChannel
              }
            >
              {() => renderPayChannel(getFieldValue('cash')?.paymentChannel)}
            </Form.Item>
          </>
        )
      }
    </Form.Item>
  );
};

export default CashForm;
