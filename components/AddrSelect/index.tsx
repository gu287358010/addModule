import React, { useContext, useState, useRef } from 'react';
import { Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import styles from './index.less';
import AddrSelectModal from './AddrSelectModal';
import selectAddr from '@/businessComponent/SelectAddressDrawer';
import { useEffectDeep } from '@/hooks';
import { formatShowAddrInfo } from '@/pages/order/util';
import { FormContext } from '../../utils';

type AddrCom<T = string> = Record<string, T>;

export type AddrType = 10 | 20 | 30 | 40 | 50 | 60 | 70;

const ADDR_LABELS = {
  10: '发货地',
  20: '收货地',
  30: '装货地',
  40: '卸货地',
  50: '经停点',
  60: '起始地',
  70: '目的地',
};

interface AddrSelectProps {
  onChange?: (addrCom: AddrCom) => void;
  value?: AddrCom;
  addrType: AddrType;
  disabled?: boolean;
  contactsRequired?: boolean; // 联系人,联系电话是否必填
  hideSite?: boolean; // 隐藏路线站点选择，整车和货物需求不展示
  hideAddrName?: boolean; // 隐藏站点名称输入，起始地和目的地隐藏
}

const AddrSelect: React.FC<AddrSelectProps> = ({
  onChange,
  value,
  addrType,
  disabled,
  contactsRequired = true,
  hideSite = true,
  hideAddrName = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [inp, setInp] = useState<string | null | undefined>(null);
  const { form } = useContext(FormContext);
  const selectRef = useRef<any>(null);

  useEffectDeep(() => {
    const showList = [
      value?.contacts,
      value?.contactsPhone,
      value?.addressName,
      value?.pointAddress,
    ];
    if (hideAddrName) showList.splice(2, 1);
    if (_.compact(showList).length > 0) setInp(formatShowAddrInfo(showList));
    else setInp(null);
  }, [value]);

  const triggerChange = (changedValue: AddrCom) => {
    onChange?.({
      ...value,
      ...changedValue,
    });
  };

  const selectAddrByDrawerSuc = (params: AddrCom<any>) => {
    const list = (params.contactsList || []).filter(
      (item: Record<string, any>) => item.contacts || item.contactsPhone,
    );
    triggerChange({
      addressName: params.addrName,
      contacts: list?.[0]?.contacts,
      contactsPhone: list?.[0]?.contactsPhone,
      pointAddress: params.realAddress,
      pointCode: params.regionCode,
      pointLongitude: params.longitude,
      pointLatitude: params.latitude,
    });
  };

  // 选择框选中回调
  const handleSelectChange = (val: number) => {
    if (val === 0) {
      setVisible(true);
    } else if (val === 1) {
      selectAddr({ onSuccess: selectAddrByDrawerSuc });
    }
  };

  // 地址填写完成回调
  const handleSuccess = (params: AddrCom) => {
    setVisible(false);
    triggerChange({
      addressName: params.addressName,
      contacts: params.contacts,
      contactsPhone: params.contactsPhone,
      pointAddress: params.pointAddress,
      pointCode: params.pointCode,
      pointLongitude: params.pointLongitude,
      pointLatitude: params.pointLatitude,
    });
  };

  const text = ADDR_LABELS[addrType];

  const getBeingAddress = () => {
    const pointList = form?.getFieldValue('pointList') || [];
    const temp: string[] = [];
    const list = pointList.map((item: Record<string, any>) => {
      return {
        contacts: item.contacts,
        contactsPhone: item.contactsPhone,
        pointAddress: item.pointAddress,
        pointCode: item.pointCode,
        pointLongitude: item.pointLongitude,
        pointLatitude: item.pointLatitude,
      };
    });
    temp.length = 0;
    return list;
  };

  const beingAddrList = hideSite ? [] : getBeingAddress();

  const handleBeingAddrCli = (i: number) => {
    const payload = beingAddrList[i];
    triggerChange({
      ...value,
      contacts: payload?.contacts,
      contactsPhone: payload?.contactsPhone,
      pointAddress: payload.pointAddress,
      pointCode: payload.pointCode,
      pointLongitude: payload.pointLongitude,
      pointLatitude: payload.pointLatitude,
    });
    selectRef.current.blur();
  };

  return (
    <div className={styles.AddrSelect}>
      <Select
        ref={selectRef}
        placeholder="请选择"
        getPopupContainer={(node) => node.parentNode}
        onChange={handleSelectChange}
        value={(inp as unknown) as number}
        disabled={disabled}
        dropdownRender={(menu) => (
          <div>
            {menu}
            {beingAddrList.length > 0 && (
              <div className={styles.beingAddress}>
                {beingAddrList.map((item: Record<string, any>, i: number) => (
                  <div
                    className={styles.addressItem}
                    key={i}
                    onClick={() => handleBeingAddrCli(i)}
                  >
                    <div className={styles.adressVal}>{item.pointAddress}</div>
                    <div className={styles.adressTag}>线路地点</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      >
        <Select.Option value={0}>
          <div className={styles.option1}>
            <EditOutlined style={{ marginRight: 10 }} />
            {inp ? `修改${text}信息` : `填写${text}信息`}
          </div>
        </Select.Option>
        <Select.Option value={1}>
          <div className={styles.option2}>从常用地点中选择</div>
        </Select.Option>
      </Select>
      {visible && (
        <AddrSelectModal
          onSuccess={handleSuccess}
          onCancel={() => setVisible(false)}
          defaultVal={value}
          title={text}
          contactsRequired={contactsRequired}
          hideAddrName={hideAddrName}
        />
      )}
    </div>
  );
};

export default AddrSelect;
