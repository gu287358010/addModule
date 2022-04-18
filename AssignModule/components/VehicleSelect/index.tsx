import React, { useRef, useState, useContext } from 'react';
import { Select } from 'antd';
import EditVehicle from '@/businessComponent/EditVehicle';
import styles from './index.less';
import { LikeOutlined, PlusCircleFilled } from '@ant-design/icons';
import { get, obtainDic, global } from '@parallel-line/utils';
import { ObjectType } from '../../../types';
import { FormContext, getUniqueVehicle } from '../../../utils';
import { getCargoStatistics } from '@/pages/order/util';
import { useUpdate } from 'ahooks';
import classNames from 'classnames';

const { Option } = Select;

interface VehicleSelectProps {
  style?: React.CSSProperties;
  placeholder: string;
  onChange?: (val?: ObjectType) => void;
  value?: string;
  list: ObjectType[];
  optionType?: 'optGroup' | 'simple';
  isHideInvite?: boolean;
  disabled?: boolean;
}

const VehicleSelect: React.FC<VehicleSelectProps> = (props) => {
  const { form, emitterKeys } = useContext(FormContext);
  const ref = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const visRef = useRef(false);
  const update = useUpdate();

  const { list = [] } = props;

  const filterOption = (input: string, option: any) =>
    (option?.filterkey || '').toLowerCase().includes(input.toLowerCase());

  const handleAdd = (item?: ObjectType, e?: React.MouseEvent<HTMLElement>) => {
    visRef.current = true;
    e?.stopPropagation();
    EditVehicle(item, () => {
      visRef.current = false;
    }).open();
  };

  global.eventEmitter.useSubscription(({ uniqueKey }) => {
    if (uniqueKey === emitterKeys.updatePriceList) update();
  });

  const renderOtherInfo = (item: ObjectType) => {
    if (_.isNil(item.vehicleTonnage) || _.isNil(item.volume)) {
      const spanNode = item.driverType !== 1 && (
        <span className="link" onClick={(e) => handleAdd(item, e)}>
          ，去完善
        </span>
      );
      if (_.isNil(item.vehicleTonnage) && _.isNil(item.volume))
        return <>未维护车辆核载重量和容积，无法计算{spanNode}</>;
      if (_.isNil(item.vehicleTonnage))
        return <>未维护车辆核载重量，无法计算{spanNode}</>;
      return <>未维护车辆容积，无法计算{spanNode}</>;
    }

    return (
      <>
        重量装载量：{item.vehicleTonnageRate}%， 体积装载量：
        {item.vehicleVolumnRate}%
        {item.isRecommended && (
          <LikeOutlined style={{ marginLeft: 8, verticalAlign: -1 }} />
        )}
      </>
    );
  };

  // 渲染单个option
  const renderSingleOption = (item: any) => {
    const vehicleLen = obtainDic({
      dicKey: 'resource.vehicle.vehicle_length',
      dicItemKey: item.vehicleLength,
    }) as ObjectType;
    const vehicleType = obtainDic({
      dicKey: 'resource.vehicle.vehicle_type_code',
      dicItemKey: item.vehicleType,
    }) as ObjectType;
    const vehicleColor = obtainDic({
      dicKey: 'resource.vehicle.vehicle_plate_color_code',
      dicItemKey: item.vehiclePlateColorCode,
    }) as ObjectType;
    const title = `${item?.vehicleNumber}（${vehicleLen?.value}/${vehicleType?.value}）`;
    return (
      <Option
        key={_.uniqueId()}
        value={getUniqueVehicle(item)}
        filterkey={title}
      >
        <div className={styles.vehicleOption}>
          <i style={{ background: vehicleColor?.color }}>
            {vehicleColor?.value}
          </i>
          {title}
        </div>
        <div
          className={classNames(
            styles.vehicleOther,
            item.isRecommended && styles.vehicleRecommend,
          )}
        >
          {renderOtherInfo(item)}
        </div>
      </Option>
    );
  };

  // 给option item添加重量和体积装载率，及计算推荐车辆
  const formatVehicle = (vehicles: ObjectType[]) => {
    const reqs = form?.getFieldValue('cargoRequestList') || [];
    const statistics = getCargoStatistics(reqs, false, false);
    const reqWeights = statistics.goodsWeights;
    const reqVolumns = statistics.goodsVolume;
    const recommendVehicles: ObjectType[] = [];
    vehicles.forEach((vehicle: ObjectType) => {
      vehicle.isRecommended = false; // 初始化推荐
      let tonnageRate;
      let volumnRate;
      if (reqWeights === '--') tonnageRate = '--';
      else
        tonnageRate = _.round(
          ((reqWeights as number) * 100) / vehicle.vehicleTonnage,
          2,
        );
      vehicle.vehicleTonnageRate = tonnageRate;
      if (reqVolumns === '--') volumnRate = '--';
      else
        volumnRate = _.round(
          ((reqVolumns as number) * 100) / vehicle.volume,
          2,
        );
      vehicle.vehicleVolumnRate = volumnRate;
      // 推荐车辆的逻辑：重量装载率和体积装载率需 50%≤重量装载率和体积装载率≤100%，且是在符合条件的数据中，重量装载率最高的；
      if (
        tonnageRate >= 50 &&
        tonnageRate <= 100 &&
        volumnRate >= 50 &&
        volumnRate <= 100
      ) {
        if (recommendVehicles.length === 0) recommendVehicles.push(vehicle);
        else {
          const compareVehicle = recommendVehicles[0];
          if (tonnageRate > compareVehicle.vehicleTonnageRate) {
            recommendVehicles.length = 0;
            recommendVehicles.push(vehicle);
          } else if (tonnageRate === compareVehicle.vehicleTonnageRate) {
            // 重量装载率相等
            if (volumnRate > compareVehicle.vehicleVolumnRate)
              recommendVehicles.length = 0; // 体积装载率高的为推荐
            if (volumnRate >= compareVehicle.vehicleVolumnRate)
              recommendVehicles.push(vehicle);
          }
        }
      }
    });
    recommendVehicles.forEach((vehicle) => {
      vehicle.isRecommended = true;
    });
  };

  // 渲染OptGroup
  const renderOptGroup = (item: any) => {
    if (item.options.length === 0) return null;
    const vehicles = [
      ...get(list, '[0].options', []),
      ...get(list, '[1].options', []),
    ];
    formatVehicle(vehicles);
    return (
      <Select.OptGroup label={item.label} key={_.uniqueId()}>
        {item.options.map((v: any) => renderSingleOption(v))}
      </Select.OptGroup>
    );
  };

  const renderOptions = () => {
    if (props.optionType === 'optGroup') {
      return list?.map((item: any) => renderOptGroup(item));
    }
    formatVehicle(list);
    return list?.map((item: any) => renderSingleOption(item));
  };

  // 邀请
  const handleInvite = () => {
    props.onChange?.({ id: '-99' });
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
      <div className={styles.dropdownFooter} onClick={() => handleAdd()}>
        <PlusCircleFilled style={{ marginRight: 10 }} />
        添加车辆
      </div>
    </div>
  );

  // 选择车辆
  const handleChange = (val: string | undefined) => {
    if (!val) {
      props.onChange?.(undefined);
      return;
    }
    let arr = [];
    if (props.optionType === 'optGroup') {
      arr = [...get(list, '[0].options', []), ...get(list, '[1].options', [])];
    } else arr = [...list];
    const vehicleInfo = arr.find(
      (item: ObjectType) => getUniqueVehicle(item) === val,
    );
    props.onChange?.(vehicleInfo);
  };

  const handleDropdownVisibleChange = (vis: boolean) => {
    if (!visRef.current) setVisible(vis);
  };

  return (
    <Select
      open={visible}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      disabled={props.disabled}
      ref={ref}
      showSearch
      allowClear
      getPopupContainer={(triggerNode) => triggerNode.parentNode}
      value={props.value === '-99' ? '邀请司机接单' : props.value}
      onChange={handleChange}
      style={props.style}
      filterOption={filterOption}
      placeholder={props.placeholder}
      defaultActiveFirstOption={false}
      dropdownRender={renderDropdown}
      dropdownClassName="lower-select-dropdown-zindex"
      dropdownMatchSelectWidth={false}
    >
      {renderOptions()}
    </Select>
  );
};

VehicleSelect.defaultProps = {
  style: { width: 185 },
  placeholder: '',
  onChange: () => {},
};

export default VehicleSelect;
