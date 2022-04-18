import React from 'react';
import { render } from '@parallel-line/utils';
import { Modal } from '@parallel-line/components';
import { Button, Form, Input, InputNumber, Switch } from 'antd';
import styles from './index.less';

type SucParams = Record<string, number | boolean>;

interface AddTaxProps {
  onClose?: () => void;
  onSuccess: (params: SucParams) => void;
  taxRate?: number;
}

const AddTax: React.FC<AddTaxProps> = ({ onClose, onSuccess, taxRate }) => {
  // 校验装载率目标
  const checkTaxRate = (val: number | string) => {
    if (_.isNil(val)) return Promise.reject('请输入税点');
    if (Number.isNaN(Number(val)) && val !== '-') {
      return Promise.reject('请输入数值');
    }
    if (val < 0) {
      return Promise.reject('输入税点不能小于0');
    }
    if (val > 100) {
      return Promise.reject('输入税点不能高于100');
    }
    return Promise.resolve();
  };

  const handleSubmit = (params: SucParams) => {
    onSuccess(params);
    onClose?.();
  };

  return (
    <div className={styles.ModalWrap}>
      <h4>{_.isNil(taxRate) ? '添加' : '编辑'}税点</h4>
      <Form
        colon={false}
        className={styles.form}
        labelAlign="left"
        onFinish={handleSubmit}
        initialValues={{ taxRate, defaultTaxRate: true }}
      >
        <Form.Item label="需扣除税点">
          <Input.Group compact style={{ display: 'flex' }}>
            <Form.Item
              noStyle
              name="taxRate"
              rules={[{ validator: (_rule, val) => checkTaxRate(val) }]}
            >
              <InputNumber placeholder="请输入" style={{ flex: 1 }} />
            </Form.Item>
            <span className={styles.inpAfterUnit}>%</span>
          </Input.Group>
        </Form.Item>
        <Form.Item
          label="保存配置"
          name="defaultTaxRate"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <div className={styles.footer}>
          <Button style={{ marginRight: 16 }} onClick={onClose}>
            取消
          </Button>
          <Button type="primary" htmlType="submit">
            确定
          </Button>
        </div>
      </Form>
    </div>
  );
};

const addTax = (params: AddTaxProps) => {
  render(Modal, {
    content: <AddTax {...params} />,
    closable: false,
    maskClosable: false,
    width: 420,
  }).open();
};

export { addTax };
