import React, { useRef, useState, useContext } from 'react';
import { Select, Switch } from 'antd';
import { Popup2, PxxDrawer2 } from '@/baseComponents';
import styles from './index.less';
import { LikeOutlined, PlusCircleFilled } from '@ant-design/icons';
import { ObjectType } from '../../../types';
import { get, toTime } from '@parallel-line/utils';
import { getAdcodeLabel, getUniqueDriver } from '../../../utils';
import EditDriver from '@/businessComponent/EditDriver';
import EnterpriseConfigDetail from '@/pages-e/company/enterpriseConfig/valuationComponent/detail';
import viewDetail from '@/pages/recruit/agreement/list/components/viewDetail';
import { DriverContext } from './useDriverSel';

const { Option } = Select;

interface DriverSelectSelectProps {
  style?: React.CSSProperties;
  placeholder: string;
  onChange?: (val?: ObjectType) => void;
  value?: any;
  ref?: any;
  list: any[];
  optionType?: string;
  isHideInvite?: boolean;
  disabled?: boolean;
}

const DriverSelect: React.FC<DriverSelectSelectProps> = (props) => {
  const ref = useRef<any>(null);
  const {
    normalList,
    priceList,
    showSwitch,
    switchVal,
    onSwitchChange,
  } = useContext(DriverContext);

  const { list = [] } = props;

  const visRef = useRef(false);
  const [visible, setVisible] = useState(false);

  const handleChange = (val: string) => {
    if (!val) {
      props.onChange?.(undefined);
      return;
    }
    let arr = [];
    if (props.optionType === 'optGroup')
      arr = [...get(list, '[0].options', []), ...get(list, '[1].options', [])];
    else arr = [...list];
    const driverInfo = arr.find(
      (item: ObjectType) =>
        val === getUniqueDriver(item, switchVal ? item.ruleId : undefined),
    );
    props.onChange?.(driverInfo);
  };

  const filterOption = (input: string, option: any) =>
    (option?.filterkey || '').toLowerCase().includes(input.toLowerCase());

  const viewPriceRule = (id: string, e: React.MouseEvent<HTMLElement>) => {
    visRef.current = true;
    e.stopPropagation();
    new Popup2(PxxDrawer2, {
      title: '计价详情',
      width: 450,
      content: <EnterpriseConfigDetail id={id} />,
      onClose: () => {
        visRef.current = false;
      },
    }).open();
  };

  const viewAgreement = (id: string, e: React.MouseEvent<HTMLElement>) => {
    visRef.current = true;
    e.stopPropagation();
    viewDetail({
      id,
      position: 'order',
      onClose: () => {
        visRef.current = false;
      },
    });
  };

  const renderOptionItem = (item: ObjectType) => {
    if (switchVal) {
      if (item.driverType === 1) {
        return (
          <div className={styles.priceWrap}>
            <div className={styles.companyVal}>
              <span></span>
              {item.driverName || '--'}&nbsp;/&nbsp;{item.driverPhone}
              <span className={styles.preferred}>
                <LikeOutlined style={{ marginRight: 4, verticalAlign: -1 }} />
                优选司机
              </span>
            </div>
            <div className={styles.priceVal}>
              {item.valuationUnitDesc}，
              {item.price > 0 && <span>预计{item.price}元，</span>}
              {getAdcodeLabel(item.startPointCode)}-
              {getAdcodeLabel(item.endPointCode)}，
              {toTime([item.serviceStartTime, item.serviceEndTime]).join(' - ')}
              <span
                style={{ marginLeft: 8 }}
                className="link"
                onClick={(e) => viewAgreement(item.agreementNo, e)}
              >
                查看协议
              </span>
            </div>
          </div>
        );
      }
      return (
        <div className={styles.priceWrap}>
          <div className={styles.companyVal}>
            {item.driverName || '--'}&nbsp;/&nbsp;{item.driverPhone}
          </div>
          <div className={styles.priceVal}>
            {item.valuationUnitDesc}&nbsp;
            {item.price > 0 && <span>预计{item.price}元，</span>}
            <span
              style={{ marginLeft: 8 }}
              className="link"
              onClick={(e) => viewPriceRule(item.ruleId, e)}
            >
              查看计价规则
            </span>
          </div>
        </div>
      );
    }
    return `${item.driverName || '--'} / ${item.driverPhone}`;
  };

  // 渲染单个option
  const renderSingleOption = (item: any) => (
    <Option
      key={_.uniqueId()}
      value={getUniqueDriver(item, switchVal ? item.ruleId : undefined)}
      filterkey={`${item.driverPhone}${item.driverName}`}
      showvalue={`${item.driverName || '--'} / ${item.driverPhone}`}
    >
      {renderOptionItem(item)}
    </Option>
  );

  // 渲染OptGroup
  const renderOptGroup = (item: any) => {
    if (item.options?.length === 0) return null;
    return (
      <Select.OptGroup label={item.label} key={_.uniqueId()}>
        {(item.options || []).map((v: any) => renderSingleOption(v))}
      </Select.OptGroup>
    );
  };

  const renderOption = () => {
    if (props.optionType === 'optGroup' && !switchVal)
      return list?.map((item: any) => renderOptGroup(item));
    const actualList = switchVal ? priceList?.drivers : normalList?.drivers;
    return (actualList || [])?.map((item: any) => renderSingleOption(item));
  };

  const handleAdd = () => {
    EditDriver().open();
  };

  // 邀请
  const handleInvite = () => {
    props.onChange?.({ id: '-99' });
    ref.current?.blur();
  };

  const renderDropdown = (menu: any) => (
    <div className={styles.dropdownWrap}>
      {showSwitch && (
        <div className={styles.dropdownHeader}>
          <span>是否自动匹配计价规则</span>
          <Switch checked={switchVal} onChange={onSwitchChange} />
        </div>
      )}
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
        添加司机
      </div>
    </div>
  );

  const handleDropdownVisibleChange = (vis: boolean) => {
    if (!visRef.current) setVisible(vis);
  };

  return (
    <Select
      onDropdownVisibleChange={handleDropdownVisibleChange}
      disabled={props.disabled}
      dropdownClassName="lower-select-dropdown-zindex"
      open={visible}
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
      optionLabelProp="showvalue"
      // dropdownMatchSelectWidth={false}
    >
      {renderOption()}
    </Select>
  );
};

DriverSelect.defaultProps = {
  style: { width: 185 },
  placeholder: '',
  onChange: () => {},
};

export default DriverSelect;
