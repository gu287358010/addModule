import { PlusOutlined } from '@ant-design/icons';
import React from 'react';
import styles from './index.less';

interface AddBtnProps {
  title: string;
  onClick: () => void;
  style?: React.CSSProperties;
}

const AddBtn: React.FC<AddBtnProps> = ({ title, onClick, style }) => {
  return (
    <span className={styles.AddBtn} style={style} onClick={onClick}>
      <PlusOutlined style={{ marginRight: 8 }} />
      {title}
    </span>
  );
};

export default AddBtn;
