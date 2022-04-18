import React, { useContext } from 'react';
import ModuleTitle from '../components/ModuleTitle';
import styles from './index.less';
import { Form } from 'antd';
import GoodsFormItem from './GoodsFormItem';
import { FormContext, initalRequirement, transNumber } from '../utils';
import { fetchRequestNo } from '@/services/order';
import { GoodsFormType, ObjectType } from '../types';
import { get, global } from '@parallel-line/utils';
import AddDropdown from './AddDropdown';
import selectCargoReq from '../components/CaogoListDrawer/new';
import {
  formatNumber,
  formatTimeBySeconds,
  getCargoStatistics,
} from '../../util';

const { isShipper } = global.PXX_SOLUTION;

const CargoReqStatistics = ({ form }: ObjectType) => {
  const statistics = getCargoStatistics(
    form?.getFieldValue('cargoRequestList') || [],
  );

  const paymentCostcent = form?.getFieldValue('paymentCostcent');
  const time = form?.getFieldValue('estimateDurationMinute');
  const distance = form?.getFieldValue('estimateMeter');

  return (
    <div className={styles.statistics}>
      <div>
        共&nbsp;
        {statistics.cargoReqs}&nbsp;个货物需求，总计&nbsp;
        {statistics.goodsCounts}&nbsp;单货物&nbsp;/&nbsp;
        {statistics.goodsWeights}kg&nbsp;/&nbsp;
        {statistics.goodsVolume}&nbsp;m³/&nbsp;
        {statistics.goodsTotals}件{/** 货主不展示应收费用 */}
        {!isShipper && <>， 总应收：{paymentCostcent || '--'}元</>}
      </div>
      <div>
        计划里程{formatNumber(transNumber(distance, 'metreToKilometre'))}
        km，预计在途时长{formatTimeBySeconds(time ? time * 60 : undefined)}
      </div>
    </div>
  );
};

interface RequirementModuleProps {
  goodsFormType?: GoodsFormType;
  isInModal?: boolean;
}

const RequirementModule: React.FC<RequirementModuleProps> = ({
  goodsFormType,
  isInModal,
}) => {
  const { operateType, form, emitterKeys } = useContext(FormContext);

  // 添加货物需求
  const handleAdd = async (add: (info: Record<string, any>) => void) => {
    const requireNo = await fetchRequestNo();
    add(initalRequirement(get(requireNo, 'data[0]')));
  };

  // 导入货物需求
  const handleSelectCargoReq = () => {
    selectCargoReq({
      matchedRows: (form?.getFieldValue('cargoRequestList') || []).filter(
        (row: ObjectType) => row.cargoRequestId,
      ),
      onSuccess: (list) => {
        const reqs = form?.getFieldValue('cargoRequestList') || [];
        const res = [...reqs, ...list];
        form?.setFieldsValue({ cargoRequestList: res });
        global.eventEmitter.emit({
          uniqueKey: emitterKeys.importCargoSuc,
          addCargoReqs: list,
        });
      },
    });
  };

  return (
    <div className={styles.RequirementModule}>
      {!isInModal && <ModuleTitle title="货物需求" icon="iconhuowu" />}
      <div className="moduleCon">
        <Form.List name="cargoRequestList">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <GoodsFormItem
                  goodsFormType={goodsFormType}
                  fieldName={field.name}
                  index={index}
                  key={field.key}
                  length={fields.length}
                  onRemove={() => {
                    remove(index);
                  }}
                />
              ))}
              {operateType !== 'addCargo' && (
                <div className={styles.moduleFooter}>
                  {operateType !== 'assign' ? (
                    <AddDropdown
                      onChange={(v: string) => {
                        if (v === 'add') handleAdd(add);
                        else handleSelectCargoReq();
                      }}
                    />
                  ) : (
                    <div></div>
                  )}
                  <CargoReqStatistics form={form} />
                </div>
              )}
            </>
          )}
        </Form.List>
      </div>
    </div>
  );
};

export default RequirementModule;
