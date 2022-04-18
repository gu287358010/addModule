import React, { useRef } from 'react';
import { Select } from '@parallel-line/components';
import { obtainDic } from '@parallel-line/utils';
import { OptionData } from 'rc-select/lib/interface';

interface VehicleTypeSelectProps {
  value?: string[];
  onChange?: (value?: string[]) => void;
  disabled?: boolean;
}

const VehicleTypeSelect: React.FC<VehicleTypeSelectProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const tempRef = useRef<string[] | undefined>(value as string[] | undefined);

  const handleChange = (val?: any) => {
    let newVal = val as string[];
    if (!val) newVal = val;
    else if (val.includes('0') && !tempRef.current?.includes('0'))
      newVal = ['0'];
    // 当前选中为不限，清除其他车型
    else if (val.includes('0')) newVal = _.without(val, '0'); // 选择其他，移除不限
    onChange?.(newVal);
    tempRef.current = newVal;
  };

  return (
    <Select
      value={value}
      options={
        obtainDic({
          dicKey: 'entire.vehicle_type_code',
        }) as OptionData[]
      }
      mode="multiple"
      onChange={handleChange}
      disabled={disabled}
    />
  );
};

export default VehicleTypeSelect;
