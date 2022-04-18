import React, { useEffect } from 'react';
import { Form, Space, Button, Input } from 'antd';
import { PxxModal2, Popup2 } from '@/baseComponents';
import styles from './index.less';
import { DatePicker } from '@parallel-line/components';
import {
  checkConcatPhone,
  checkSupplementOrderTimeIsError,
  compareTime,
} from '../../utils';
import moment from 'moment';

interface UpdateSiteInfoProps {
  onSuccess: (val: any) => void;
  onClose?: () => void;
  defaultValue: Record<string, string>;
  type: string;
  hideSendTime: boolean; // 最后一个站点不需要发车时间
  index: number; // 站点所处位置
  shouldCheckCurTime?: boolean;
  shouldSupplementOrder?: boolean;
  supplementOrdeDate?: number;
}

const UpdateSiteInfo: React.FC<UpdateSiteInfoProps> = (props) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (props.defaultValue) {
      form.setFieldsValue(props.defaultValue);
    }
  }, []);

  // 校验到达时间
  const checkArriveTime = (value: undefined | moment.Moment) => {
    if (!value && props.index === 0) {
      return Promise.reject('请选择到达时间');
    }

    if (value) {
      if (props.shouldSupplementOrder) {
        const isError = checkSupplementOrderTimeIsError(
          value,
          props.supplementOrdeDate || 0,
        );
        if (isError)
          return Promise.reject(
            `到达时间不能早于当前时间${props.supplementOrdeDate}天以上`,
          );
      } else if (props.shouldCheckCurTime && compareTime(undefined, value)) {
        return Promise.reject('到达时间需要大于当前时间');
      }
      if (
        form.getFieldValue('sendTime') &&
        compareTime(value, form.getFieldValue('sendTime'))
      ) {
        return Promise.reject('到达时间需要小于发车时间');
      }
    }
    return Promise.resolve();
  };

  // 校验发车时间
  const checkSendTime = (value: undefined | moment.Moment) => {
    if (value) {
      if (props.shouldSupplementOrder) {
        const isError = checkSupplementOrderTimeIsError(
          value,
          props.supplementOrdeDate || 0,
        );
        if (isError)
          return Promise.reject(
            `发车时间不能早于当前时间${props.supplementOrdeDate}天以上`,
          );
      } else if (props.shouldCheckCurTime && compareTime(undefined, value)) {
        return Promise.reject('发车时间需要大于当前时间');
      }
      if (
        form.getFieldValue('arriveTime') &&
        compareTime(form.getFieldValue('arriveTime'), value)
      ) {
        return Promise.reject('发车时间需要大于到达时间');
      }
    }
    return Promise.resolve();
  };

  const handleValuesChange = (changeVal: Record<string, any>) => {
    if (
      _.has(changeVal, 'sendTime') &&
      form.getFieldValue('arriveTime') &&
      compareTime(changeVal.sendTime, form.getFieldValue('arriveTime'))
    ) {
      form.validateFields(['arriveTime']); // 取消之前的错误校验
    }
    if (
      _.has(changeVal, 'arriveTime') &&
      form.getFieldValue('sendTime') &&
      compareTime(form.getFieldValue('sendTime'), changeVal.arriveTime)
    ) {
      form.validateFields(['sendTime']); // 取消之前的错误校验
    }
  };

  const handleFinish = (payload: Record<string, any>) => {
    props.onSuccess(payload);
    props.onClose && props.onClose();
  };

  return (
    <div className={styles.TimeSelectModal}>
      <div className={styles.title}>
        {props.type === 'time' ? '选择时间' : '信息'}
      </div>
      <Form
        colon={false}
        name="time-select-modal"
        onFinish={handleFinish}
        form={form}
        onValuesChange={handleValuesChange}
      >
        {props.type === 'time' && (
          <>
            <Form.Item
              label="到达时间"
              rules={[{ validator: (rule, value) => checkArriveTime(value) }]}
              name="arriveTime"
              required={props.index === 0}
            >
              <DatePicker placeholder="请选择" style={{ width: '100%' }} />
            </Form.Item>
            {!props.hideSendTime && (
              <Form.Item
                label="发车时间"
                rules={[{ validator: (rule, value) => checkSendTime(value) }]}
                name="sendTime"
              >
                <DatePicker placeholder="请选择" style={{ width: '100%' }} />
              </Form.Item>
            )}
          </>
        )}
        {props.type === 'concat' && (
          <>
            <Form.Item
              label="站点联系人"
              // rules={[{ required: true, message: '请输入站点联系人' }]}
              name="contacts"
            >
              <Input placeholder="请输入" />
            </Form.Item>
            <Form.Item
              label="联系电话"
              rules={[
                { validator: (rule, val) => checkConcatPhone(val, false) },
              ]}
              name="contactsPhone"
              // required
            >
              <Input placeholder="请输入" maxLength={20} />
            </Form.Item>
          </>
        )}
        <div className={styles.btnsWrap}>
          <Space>
            <Button onClick={props.onClose}>取消</Button>
            <Button type="primary" htmlType="submit">
              确定
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

const updateSiteInfo = (props: UpdateSiteInfoProps) => {
  new Popup2(PxxModal2, {
    closable: false,
    width: 420,
    footer: null,
    content: <UpdateSiteInfo {...props} />,
  } as any).open();
};

export default updateSiteInfo;
