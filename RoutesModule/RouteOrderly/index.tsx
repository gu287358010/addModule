/**
 * 选择是否按照站点执行
 */
import React from 'react';
import { Dropdown, Menu } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import styles from './index.less';

interface RouteOrderlyProps {
  value?: number;
  onChange?: (number: number) => void;
}

const list = [
  {
    key: 1,
    label: '按站点顺序执行',
    desc: '司机将会按照线路站点顺序依次执行',
  },
  {
    key: 2,
    label: '无需按站点顺序执行',
    desc: '对站点顺序无顺序要求，司机可根据实际情况灵活安排',
  },
];

const RouteOrderly: React.FC<RouteOrderlyProps> = ({ value, onChange }) => {
  const menu = (
    <Menu onClick={({ key }) => onChange?.(+key)}>
      {list.map((item) => (
        <Menu.Item
          key={item.key}
          className={item.key === value && styles.menuActive}
        >
          <div className={styles.label}>{item.label}</div>
          <div className={styles.desc}>{item.desc}</div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div>
      <Dropdown overlay={menu} trigger={['click', 'hover']}>
        <span className={styles.title}>
          {list.find((item) => item.key === value)?.label}
          <DownOutlined
            style={{ marginLeft: 4, color: 'rgba(0, 0, 0, .25)' }}
          />
        </span>
      </Dropdown>
    </div>
  );
};

export default RouteOrderly;
