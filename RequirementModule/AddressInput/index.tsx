import { Icon, SelectAddress } from '@/baseComponents';
import MapModal from '@/businessComponent/AdressSelect/MapModal';
import React, { useState, useContext, useRef } from 'react';
import styles from './index.less';
import { FormContext } from '../../utils';
import selectAddr from '@/businessComponent/SelectAddressDrawer';
import { get } from '@parallel-line/utils';
import { ObjectType } from '../../types';

interface AddressInputProps {
  value?: any;
  onChange?: (value: Record<string, unknown>) => void;
  disabled?: boolean;
  addrPosition?: 'addrCom';
}

const AddressInput: React.FC<AddressInputProps> = ({
  value = {},
  onChange,
  disabled,
  addrPosition,
}) => {
  const form = useContext(FormContext).form;
  const selectRef = useRef<any>(null);
  const [visible, setVisible] = useState(false);

  const triggerChange = (changedValue: any) => {
    if (onChange) {
      onChange({
        ...value,
        ...changedValue,
      });
    }
  };

  // 标记点成功
  const handleMarkPointerSuc = (data: any) => {
    setVisible(false);
    triggerChange({
      pointAddress: data.address,
      pointCode: data.adcode,
      pointLongitude: data.location?.split(',')[0],
      pointLatitude: data.location?.split(',')[1],
    });
  };

  // 选中搜索值
  const handleChange = (data: any) => {
    triggerChange({
      pointAddress: data.formattedAddress,
      pointCode: data.adcode,
      pointLongitude: data.location?.split(',')[0],
      pointLatitude: data.location?.split(',')[1],
    });
  };

  // 常用点选择地点成功回调
  const selectAddrSuccess = (payload: Record<string, any>) => {
    triggerChange({
      contacts: payload.contactsList?.[0]?.contacts,
      contactsPhone: payload.contactsList?.[0]?.contactsPhone,
      pointAddress: payload.realAddress,
      pointCode: payload.regionCode,
      pointLongitude: payload.longitude,
      pointLatitude: payload.latitude,
    });
  };

  const handleDrawerOpen = () => {
    selectAddr({ onSuccess: selectAddrSuccess });
    selectRef.current.blur();
  };

  const getBeingAddress = () => {
    const pointList = form?.getFieldValue('pointList') || [];
    return pointList.reduce((prev: ObjectType[], item: ObjectType) => {
      let point = item;
      if (addrPosition === 'addrCom') point = get(item, 'addrCom', {});
      if (point.pointAddress && point.pointCode) {
        prev.push({
          contacts: point.contacts,
          contactsPhone: point.contactsPhone,
          pointAddress: point.pointAddress,
          pointCode: point.pointCode,
          pointLongitude: point.pointLongitude,
          pointLatitude: point.pointLatitude,
        });
      }
      return prev;
    }, []);
  };

  const beingAddrList = getBeingAddress();

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
    <>
      <SelectAddress
        className={styles.SelectAddress}
        ref={selectRef as any}
        placeholder="请输入"
        width="100%"
        onChange={handleChange}
        value={{ pointAddress: value?.pointAddress }}
        notFoundContent={<div></div>}
        disabled={disabled}
        suffixIcon={
          <Icon
            type="icontubiao"
            style={{
              fontSize: 16,
              marginTop: -3,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (disabled) return;
              selectRef.current.blur();
              setTimeout(() => setVisible(true), 200);
            }}
          />
        }
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
            <div className={styles.selectAddress} onClick={handleDrawerOpen}>
              <span style={{ marginRight: 4 }}>从常用地点中选择</span>
              <Icon type="iconRight" style={{ fontSize: 18 }} />
            </div>
          </div>
        )}
      />
      {visible && (
        <MapModal
          onSuccess={handleMarkPointerSuc}
          onCancel={async () => setVisible(false)}
        />
      )}
    </>
  );
};

export default AddressInput;
