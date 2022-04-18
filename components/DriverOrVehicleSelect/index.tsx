import React, { useRef } from 'react';
import { Select } from 'antd';
import EditDriver from '@/businessComponent/EditDriver';
import EditVehicle from '@/businessComponent/EditVehicle';
import { getPageKey } from '@/utils';
import styles from './index.less';
import { PlusCircleFilled } from '@ant-design/icons';

const { Option } = Select;

interface DriverOrVehicleSelectProps {
  style?: React.CSSProperties;
  placeholder: string;
  onChange?: (val: any) => void;
  value?: any;
  ref?: any;
  optionFields?: {
    key?: string;
    value?: string | ((val: any) => string);
    label?: string | ((val: any) => void);
  };
  list: any[];
  optionType?: string;
  selectType?: 'vehicle' | 'driver';
  isHideInvite?: boolean;
}

const DriverOrVehicleSelect: React.FC<DriverOrVehicleSelectProps> = (props) => {
  const ref = useRef<any>(null);
  const { optionFields = {}, list = [] } = props;

  const onChange = (item: string) => {
    props.onChange && props.onChange(item);
  };

  const filterOption = (input: any, option: any) => {
    return (
      (option.children || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
    );
  };

  const renderOptionItem = (item: Record<string, any>) => {
    if (props.selectType === 'driver')
      return `${item.driverName} / ${item.driverPhone}`;
    return (
      <span className={styles.vehicleOption}>
        <i
          style={{
            background: GetDic(
              'resource.vehicle.vehicle_plate_color_code',
              item.vehiclePlateColorCode,
            )?.color,
          }}
        >
          {
            GetDic(
              'resource.vehicle.vehicle_plate_color_code',
              item.vehiclePlateColorCode,
            )?.value
          }
        </i>
        {item.vehicleNumber}（
        {GetDic('resource.vehicle.vehicle_length', item.vehicleLength).value}/
        {GetDic('resource.vehicle.vehicle_type_code', item.vehicleType).value}）
      </span>
    );
  };

  // 渲染单个option
  const renderSingleOption = (item: any) => (
    <Option
      key={_.uniqueId()}
      value={
        optionFields.value instanceof Function
          ? optionFields.value(item)
          : item[optionFields.value || 'value']
      }
    >
      {renderOptionItem(item)}
    </Option>
  );

  // 渲染OptGroup
  const renderOptGroup = (item: any) => {
    if (item.options.length === 0) return null;
    return (
      <Select.OptGroup label={item.label} key={_.uniqueId()}>
        {item.options.map((v: any) => renderSingleOption(v))}
      </Select.OptGroup>
    );
  };

  const renderOption = () => {
    if (props.optionType === 'optGroup')
      return list?.map((item: any) => renderOptGroup(item));
    return list?.map((item: any) => renderSingleOption(item));
  };

  const handleAdd = () => {
    if (props.selectType === 'driver') {
      EditDriver().open();
    } else {
      EditVehicle().open();
    }
  };

  // 邀请
  const handleInvite = () => {
    onChange('-99');
    ref.current?.blur();
  };

  const renderDropdown = (menu: any) => (
    <div className={styles.dropdownWrap}>
      <div>{menu}</div>
      {!props.isHideInvite && (
        <div className={styles.dropdownItem} onClick={handleInvite}>
          <div>
            <div
              className={styles.desc}
              style={{ marginBottom: 6, fontSize: 12 }}
            >
              邀请司机
            </div>
            <div>
              邀请司机接单
              <span className={styles.desc}>
                （保存后可发送链接/二维码去邀请）
              </span>
            </div>
          </div>
        </div>
      )}
      <div className={styles.dropdownFooter} onClick={handleAdd}>
        <PlusCircleFilled style={{ marginRight: 10 }} />
        添加{props.selectType === 'driver' ? '司机' : '车辆'}
      </div>
    </div>
  );

  return (
    <Select
      ref={ref}
      showSearch
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentNode}
      value={props.value === '-99' ? '邀请司机接单' : props.value}
      onChange={onChange}
      style={props.style}
      filterOption={filterOption}
      placeholder={props.placeholder}
      defaultActiveFirstOption={false}
      dropdownRender={renderDropdown}
      // notFoundContent={notFoundContent}
      dropdownClassName="lower-select-dropdown-zindex"
    >
      {renderOption()}
    </Select>
  );
};

DriverOrVehicleSelect.defaultProps = {
  style: { width: 185 },
  placeholder: '',
  onChange: () => {},
};

export default DriverOrVehicleSelect;
