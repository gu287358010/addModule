import React, { useState } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import { Space, Tooltip, TooltipProps } from 'antd';
import { useEffectDeep } from '@/hooks';
import { ObjectType } from '../../types';
import { TooltipIcon } from '@/baseComponents';

type Value = string | number;

interface ItemSelectProps {
  children: React.ReactNode;
  disabled?: boolean;
  checked?: boolean;
  value: string | number;
  onChange?: (value: Value) => void;
  tooltip?: TooltipProps;
  suffixTooltip?: TooltipProps;
}

const Item: React.FC<ItemSelectProps> = ({
  children,
  disabled,
  checked,
  onChange,
  value,
  tooltip,
  suffixTooltip,
}) => {
  const handleChange = () => {
    if (!disabled) onChange?.(value);
  };

  const renderNode = () => (
    <span
      className={classnames({
        [styles.ItemSelect]: true,
        [styles.itemSelectDisabled]: disabled,
        [styles.itemSelectActived]: checked,
      })}
      onClick={handleChange}
    >
      {children}
      {suffixTooltip && (
        <TooltipIcon className={styles.suffixTooltip} {...suffixTooltip} />
      )}
    </span>
  );

  return tooltip ? (
    <Tooltip {...tooltip}>{renderNode()}</Tooltip>
  ) : (
    renderNode()
  );
};

interface GroupProps {
  children?: React.ReactNode;
  value?: Value | Value[];
  type?: 'multiple' | 'single'; // 'multiple': 多选  'single': 单选
  disabled?: boolean;
  onChange?: (val: Value | Value[]) => void;
  dicKey?: string; // 字典
}

const Group: React.FC<GroupProps> = ({
  children,
  value,
  type,
  disabled,
  onChange,
  dicKey,
}) => {
  const [_vals, setVals] = useState(value);

  const vals = _.isNil(_vals) ? [] : [..._.castArray(_vals)];

  useEffectDeep(() => {
    setVals(value);
  }, [value]);

  const handleChange = (val: Value) => {
    // 多选
    if (type === 'multiple') {
      const newVals = [...vals];
      const index = newVals.findIndex((item) => item === val);
      if (index > -1) newVals.splice(index, 1);
      // 移除
      else newVals.push(val); // 添加
      setVals(newVals);
      onChange?.(newVals);
    } else {
      // 单选
      setVals(val);
      onChange?.(val);
    }
  };

  if (dicKey) {
    const dics = GetDic(dicKey);
    return (
      <Space size={16}>
        {dics.map((item: ObjectType) => (
          <Item
            value={item.key}
            key={item.key}
            onChange={() => handleChange(item.key)}
            disabled={disabled}
            checked={vals.includes(item.key)}
          >
            {item.value}
          </Item>
        ))}
      </Space>
    );
  }

  return (
    <Space size={16}>
      {React.Children.map(children, (child: any) => {
        if (child) {
          const checked = vals.includes(child.props.value);
          const props = {
            onChange: handleChange,
            ...child.props,
            checked,
            disabled: disabled || child.props.disabled,
          };
          return React.cloneElement(child, props);
        }
        return null;
      })}
    </Space>
  );
};

type Props = typeof Item;

interface CompoundedComponent extends Props {
  Group: typeof Group;
}

const ItemSelect = Item as CompoundedComponent;
ItemSelect.Group = Group;

export { Group };
export default ItemSelect;
