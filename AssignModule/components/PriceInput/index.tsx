import { Input, InputNumber } from 'antd';
import React from 'react';
import { formatInpNumber, parserInpNumber } from '../../../utils';
import styles from './index.less';

// 报价范围
const PriceInp = (props: Record<string, any>) => {
  return (
    <Input.Group compact className={styles.PriceInp}>
      <InputNumber
        {...props}
        className={styles.inp}
        formatter={formatInpNumber}
        parser={parserInpNumber}
        precision={2}
      />
      <span className={styles.unit}>元</span>
    </Input.Group>
  );
};

export default PriceInp;
