import { useDebounceFn } from 'ahooks';
import { InputNumber } from 'antd';
import React, { useEffect, useState } from 'react';
import { formatInpNumber, parserInpNumber } from '../../utils';

interface DebounceInputNumberProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const DebounceInputNumber: React.FC<DebounceInputNumberProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [inpVal, setInpVal] = useState(value);

  const { run } = useDebounceFn(
    (val: number) => {
      onChange?.(val);
    },
    {
      wait: 200,
    },
  );

  useEffect(() => {
    setInpVal(value);
  }, [value]);

  const handleChange = (val: number) => {
    setInpVal(val);
    run(val);
  };

  return (
    <InputNumber
      value={inpVal}
      formatter={formatInpNumber}
      parser={parserInpNumber}
      placeholder={placeholder}
      precision={2}
      onChange={(val: number) => handleChange(val)}
      style={{ flex: 1 }}
      disabled={disabled}
    />
  );
};

export default DebounceInputNumber;
