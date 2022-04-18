// 抢单保证金选择

import { Select } from 'antd';
import React, { useRef, useState } from 'react';
import { ObjectType } from '../../../types';
import viewDetail from './viewDetail';

interface DepositSelectProps {
  onChange?: (val?: string) => void;
  value?: string;
  style?: React.CSSProperties;
}

const DepositSelect: React.FC<DepositSelectProps> = (props) => {
  const visRef = useRef(false);
  const [visible, setVisible] = useState(false);

  const list = GetDic('trade.trade.deposit_config_code');

  const viewDepositDetail = (e: React.MouseEvent<HTMLElement>) => {
    visRef.current = true;
    e.stopPropagation();
    viewDetail(() => {
      visRef.current = false;
    });
  };

  const handleDropdownVisibleChange = (vis: boolean) => {
    if (!visRef.current) setVisible(vis);
  };

  return (
    <Select
      onDropdownVisibleChange={handleDropdownVisibleChange}
      dropdownClassName="lower-select-dropdown-zindex"
      open={visible}
      style={props.style}
      placeholder="请选择"
      value={props.value}
      onChange={props.onChange}
      allowClear
      optionLabelProp="label"
    >
      {list.map((item: ObjectType) => (
        <Select.Option key={item.key} value={item.key} label={item.value}>
          {item.value}
          <span
            className="link"
            style={{ fontSize: 12, marginLeft: 8 }}
            onClick={viewDepositDetail}
          >
            查看详情
          </span>
        </Select.Option>
      ))}
    </Select>
  );
};

export default DepositSelect;
