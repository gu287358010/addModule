/** 货物需求下单 */
/* eslint-disable @typescript-eslint/no-loop-func */
import React, { useEffect, useRef, useState } from 'react';
import { Spin, Form, Button, message } from 'antd';
import styles from './index.less';
import RequirementModule from './RequirementModule';
import {
  addCargoRequest,
  cargoRequestDraft,
  editCargoRequest,
  fetchRequestNo,
} from '@/services/order';
import {
  checkGoodsFuncs,
  FormContext,
  initalRequirement,
  resetEmitterKeys,
} from './utils';
import { useRequest } from 'ahooks';
import { get, render } from '@parallel-line/utils';
import { formatCargoSubmitData } from './formatData';
import useCalcReceivablePrice from './useCalcReceivablePrice';
import { Modal } from '@parallel-line/components';
import classnames from 'classnames';
import { EmitterKeys } from './types';

interface CargoFormProps {
  onSuccess?: () => void;
  operateId?: string;
  operateType?: string;
  operateTitle?: string;
  onClose?: () => void;
  isInModal?: boolean;
}

const CargoForm: React.FC<CargoFormProps> = ({
  operateId,
  operateType,
  operateTitle,
  onSuccess,
  onClose,
  isInModal = false,
}) => {
  const [form] = Form.useForm();
  const [cargoDisabled, setCargoDisabled] = useState(false);
  const emitterKeys = useRef<EmitterKeys>(resetEmitterKeys());

  // 计算应收费用
  useCalcReceivablePrice(form, emitterKeys.current);

  // 获取需求no
  const fetchNoReq = useRequest(fetchRequestNo, {
    manual: true,
    onSuccess: ({ data }) => {
      form.setFieldsValue({
        cargoRequestList: [initalRequirement(data[0])],
      });
    },
  });

  // 获取货物需求
  const fetchDetailReq = useRequest(
    () => cargoRequestDraft([operateId as string], operateType),
    {
      manual: true,
      onSuccess: (data) => {
        form.setFieldsValue(data);
        setCargoDisabled(
          get(data, 'cargoRequestList[0].carrierRequest') === 1 &&
            operateType === 'edit',
        );
        // get(data, 'cargoRequestList', []).forEach(
        //   (_item: any, index: number) => {
        //     calcReceivablePrice(index, undefined, true);
        //   },
        // );
      },
    },
  );

  // 提交表单信息
  const submitReq = useRequest(
    (params) =>
      operateType === 'edit'
        ? editCargoRequest(params)
        : addCargoRequest(params),
    {
      manual: true,
      onSuccess: () => {
        eventEmitter.emit({
          uniqueKey: 'CAROG_DEMAND_LIST',
          action: 'reload',
        });
        message.success(`货物需求${operateTitle}成功`);
        onSuccess?.();
        onClose?.();
      },
    },
  );

  useEffect(() => {
    if (operateId) fetchDetailReq.run();
    else fetchNoReq.run();
  }, [operateId]);

  // 校验需求是否完全通过
  const checkReqsForm = async () => {
    const reqs = form.getFieldValue('cargoRequestList');
    let isReqValidPass = true;
    // eslint-disable-next-line no-restricted-syntax
    for (const req of reqs) {
      /** 收集需求中货物列表的校验规则 */
      const list = req.cargoGoodsList || [];
      const rules = list.reduce(
        (prev: Promise<any>[], item: Record<string, any>) => {
          const vals2 = Object.keys(checkGoodsFuncs);
          const temps = vals2.map((key: string) => {
            if (key === 'descriptionOfGoods') {
              return checkGoodsFuncs[key](get(item, key), true);
            }
            // if (key === 'unitPrice') {
            //   return checkGoodsFuncs[key](get(item, key), false);
            // }
            return checkGoodsFuncs[key](get(item, key), false);
          });
          prev.push(...temps);
          return prev;
        },
        [],
      );
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(rules).catch((err) => {
        console.log(err);
        isReqValidPass = false;
      });
    }
    return isReqValidPass;
  };

  // 提交货物需求
  const handleSubmit = () => {
    eventEmitter.emit({
      uniqueKey: emitterKeys.current.validateBreakBulk,
      type: 'force',
    }); // 通知在于form表单外的其他内容进行校验
    // 校验其他项
    form
      .validateFields()
      .then(async (values) => {
        const isReqValidPass = await checkReqsForm();
        if (isReqValidPass) {
          const params = formatCargoSubmitData(values, operateType as string);
          submitReq.run(params);
        }
      })
      .catch((err) => {
        console.log(err);
        // 跳转到错误列
        checkReqsForm();
      });
  };

  return (
    <div className={styles.BreakBulkAdd} style={{ overflow: 'initial' }}>
      <Spin
        spinning={fetchNoReq.loading || fetchDetailReq.loading}
        size="large"
      >
        <Form
          colon={false}
          name="breakbulk-add"
          form={form}
          initialValues={{ cargoRequestList: [{}] }}
        >
          <FormContext.Provider
            value={{
              form,
              operateType: 'addCargo',
              cargoDisabled,
              emitterKeys: emitterKeys.current,
            }}
          >
            <div
              className={classnames(
                styles.moduleItem,
                isInModal && 'modalCargoReq',
              )}
            >
              <RequirementModule
                goodsFormType="addCargo"
                isInModal={isInModal}
              />
            </div>
            <div
              className={classnames(
                styles.operateBts,
                isInModal && styles.modalCargoBtns,
              )}
            >
              {isInModal && (
                <Button style={{ marginRight: 16 }} onClick={onClose}>
                  取消
                </Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                onClick={handleSubmit}
                loading={submitReq.loading}
              >
                {operateTitle}
              </Button>
            </div>
          </FormContext.Provider>
        </Form>
      </Spin>
    </div>
  );
};

export function addCargoModal(props: CargoFormProps) {
  const popup = render(Modal, {
    width: 760,
    title: props.operateType === 'edit' ? '编辑货物需求' : '新建货物需求',
    maskClosable: false,
    bodyStyle: { padding: '0 0 6px' },
    content: (
      <CargoForm
        {...props}
        operateTitle="保存"
        isInModal={true}
        onClose={() => popup.close()}
      />
    ),
  }).open();
}

export default CargoForm;
