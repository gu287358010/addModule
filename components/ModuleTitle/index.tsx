import { Icon } from '@/baseComponents';
import { Space } from 'antd';
import React from 'react';
import styles from './index.less';

interface ModuleTitleProps {
  title: string;
  icon?: string;
  rightCon?: React.ReactNode;
}

const ModuleTitle: React.FC<ModuleTitleProps> = ({ title, icon, rightCon }) => {
  return (
    <div className={styles.ModuleTitle}>
      <Space size={16}>
        {icon && <Icon type={icon} className={styles.icon} />}
        <div className={styles.title}>{title}</div>
      </Space>
      {rightCon}
    </div>
  );
};

export default ModuleTitle;
