import React from 'react';
import { BaseTable, Drawer } from '@parallel-line/components';
import { render } from '@parallel-line/utils';
import { Button } from 'antd';

const list = [
  { label: '车长≤4.2米', id: 1, value: '100元' },
  { label: '4.2米＜车长≤9.6米', id: 2, value: '300元' },
  { label: '车长＞9.6米', id: 3, value: '500元' },
];

const columns = [
  {
    key: 'label',
    dataIndex: 'label',
    title: '车辆长度',
    width: 200,
  },
  {
    key: 'value',
    dataIndex: 'value',
    title: '保证金金额',
    width: 200,
  },
];

interface DetailProps {
  onClose?: () => void;
}

const Detail: React.FC<DetailProps> = ({ onClose }) => {
  return (
    <div>
      <div>
        1、运力需缴纳保证金才能承运货源，不同车型需缴纳的保证金金额如下：
      </div>
      <div style={{ marginTop: 16 }}>
        <BaseTable
          dataSource={list}
          columns={columns}
          rowKey="id"
          bordered={false}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        2、保证金需在关联订单结算完成后才能赎回，赎回后资金自动回到钱包；
      </div>
      <div style={{ marginTop: 16 }}>
        3、由于运力个人原因取消订单或接单后没有按照要求履约，平台将扣除运力的保证金，如有异议，请联系客服，最终解释权归平台所有。
      </div>
      <div className="pxx-drawer-footer">
        <div>
          <Button type="primary" onClick={onClose}>
            知道了
          </Button>
        </div>
      </div>
    </div>
  );
};

const viewDetail = (onClose: () => void) => {
  render(Drawer, {
    content: <Detail />,
    title: '保证金',
    width: 448,
    onClose,
  }).open();
};

export default viewDetail;
