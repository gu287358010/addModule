import React, { useEffect, useState, useRef } from 'react';
import { Button, Form, Modal, Space, Checkbox, Input } from 'antd';
import styles from './AddrSelectModal.less';
import { Icon, SelectAddress } from '@/baseComponents';
import MapModal from '@/businessComponent/AdressSelect/MapModal';
import { checkAdress, checkConcatPhone, checkRules } from '../../utils';
import { useRequest } from 'ahooks';
import { addMapAddress } from '@/services/companyMapinfo';
import { getCitysInfosByLoop } from '@/utils';

interface AddrSelectModalProps {
  onSuccess: (info: Record<string, string>) => void;
  onCancel: () => void;
  defaultVal?: Record<string, string>;
  title: string;
  contactsRequired?: boolean;
  hideAddrName?: boolean;
}

const AddrSelectModal: React.FC<AddrSelectModalProps> = ({
  onSuccess,
  onCancel,
  defaultVal,
  title,
  contactsRequired,
  hideAddrName,
}) => {
  const [form] = Form.useForm();
  const [mapVis, setMapVis] = useState(false);
  const [checked, setChecked] = useState(false);
  const sucParamsRef = useRef<any>(null);

  useEffect(() => {
    form.setFieldsValue({
      addressName: defaultVal?.addressName,
      addr: defaultVal,
      contacts: defaultVal?.contacts,
      contactsPhone: defaultVal?.contactsPhone,
    });
  }, [defaultVal]);

  const submitReq = useRequest((params) => addMapAddress(params), {
    manual: true,
    onSuccess: () => {
      onSuccess(sucParamsRef.current);
    },
  });

  // 选中搜索值
  const handleChange = (data: any) => {
    form.setFieldsValue({
      addr: {
        pointAddress: data.formattedAddress,
        pointCode: data.adcode,
        pointLongitude: data.location?.split(',')[0],
        pointLatitude: data.location?.split(',')[1],
      },
    });
  };

  const handleMarkPointerSuc = (data: Record<string, string>) => {
    setMapVis(false);
    form.setFieldsValue({
      addr: {
        // addressName: data.addressName,
        pointAddress: data.address,
        pointCode: data.adcode,
        pointLongitude: data.location?.split(',')[0],
        pointLatitude: data.location?.split(',')[1],
      },
    });
  };

  const handleSubmit = ({ addr, ...others }: Record<string, any>) => {
    sucParamsRef.current = { ...addr, ...others };
    if (checked) {
      const addrName =
        others.addressName ||
        getCitysInfosByLoop(addr.pointCode).cityNames?.join('');
      const params = {
        addrName,
        longitude: addr.pointLongitude,
        latitude: addr.pointLatitude,
        regionCode: addr.pointCode,
        realAddress: addr.pointAddress,
        regionName: addrName,
        isFencing: 0,
        contactsList: [
          {
            contacts: others.contacts,
            contactsPhone: others.contactsPhone,
            contactsSort: 1,
          },
        ],
      };
      submitReq.run(params);
      return;
    }
    onSuccess(sucParamsRef.current);
  };

  return (
    <Modal
      title={null}
      footer={null}
      width={520}
      visible
      maskClosable={false}
      closable={false}
    >
      <div className={styles.AddrSelectModal}>
        <div className={styles.header}>填写{title}信息</div>
        <Form
          colon={false}
          name="addr-select-modal"
          form={form}
          onFinish={handleSubmit}
        >
          <div>
            {!hideAddrName && (
              <Form.Item
                label={`${title}名称`}
                name="addressName"
                rules={[
                  {
                    validator: (_rule, val) =>
                      checkRules(
                        [
                          ['maxLength', 20],
                          ['emoji', true],
                        ],
                        val,
                      ),
                  },
                ]}
              >
                <Input style={{ width: '100%' }} placeholder="请输入" />
              </Form.Item>
            )}
            <Form.Item
              label={title}
              name="addr"
              required
              rules={[{ validator: (rule, addr) => checkAdress(addr) }]}
            >
              <SelectAddress
                style={{ width: '100%' }}
                onChange={handleChange}
                suffixIcon={
                  <Icon
                    type="icontubiao"
                    style={{ fontSize: 16, marginTop: -3 }}
                    onClick={() => setMapVis(true)}
                  />
                }
              />
            </Form.Item>
            <Space size={16} className="customSpace">
              <Form.Item
                label="联系人"
                name="contacts"
                rules={[
                  {
                    validator: (_rule, val) =>
                      checkRules(
                        [
                          ['required', contactsRequired],
                          ['maxLength', 15],
                          ['emoji', true],
                          ['specialChat', true],
                        ],
                        val,
                      ),
                  },
                ]}
              >
                <Input style={{ width: '100%' }} placeholder="请输入" />
              </Form.Item>
              <Form.Item
                label="联系人电话"
                name="contactsPhone"
                required={contactsRequired}
                rules={[
                  {
                    validator: (rule, val) =>
                      checkConcatPhone(val, contactsRequired),
                  },
                ]}
              >
                <Input
                  style={{ width: '100%' }}
                  maxLength={20}
                  placeholder="请输入"
                />
              </Form.Item>
            </Space>
          </div>
          <div>
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            >
              保存到地址管理
            </Checkbox>
          </div>
          <div className={styles.btns}>
            <Button style={{ marginRight: 16 }} onClick={onCancel}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitReq.loading}
            >
              确定
            </Button>
          </div>
        </Form>
      </div>
      {mapVis && (
        <MapModal
          onSuccess={handleMarkPointerSuc}
          onCancel={() => setMapVis(false)}
        />
      )}
    </Modal>
  );
};

export default AddrSelectModal;
