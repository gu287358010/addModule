import React from 'react';
import { Dropdown, Menu } from 'antd';
import { CheckCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import styles from './index.less';

interface RouteOrderlyProps {
  onChange: (val: string) => void;
}

const AddDropdown: React.FC<RouteOrderlyProps> = ({ onChange }) => {
  const handleCli = ({ key }: Record<string, any>) => {
    onChange(key === '1' ? 'add' : 'download');
  };

  const menu = (
    <Menu onClick={handleCli}>
      <Menu.Item key="1" className={styles.menuItem}>
        <PlusCircleOutlined className={styles.icon} />
        新建货物需求
      </Menu.Item>
      <div></div>
      <Menu.Item key="2" className={styles.menuItem}>
        <CheckCircleOutlined className={styles.icon} />
        导入货物需求
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown
      overlay={menu}
      trigger={['click']}
      getPopupContainer={(ele) => ele.parentNode as HTMLElement}
    >
      <span className={styles.menuItem}>
        <PlusCircleOutlined className={styles.icon} />
        新增
      </span>
    </Dropdown>
  );
};

export default AddDropdown;
