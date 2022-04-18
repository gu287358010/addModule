import React, { useEffect, useState, useContext } from 'react';
import { Space, Tooltip } from 'antd';
import classnames from 'classnames';
import { Icon } from '@/baseComponents';
import styles from './index.less';
import { FormContext } from '../../utils';
import ItemForm from './ItemForm';
import { GoodsFormType } from '../../types';
import { get, global } from '@parallel-line/utils';
import { getCargoStatistics } from '@/pages/order/util';

interface GoodsFormItemProps {
  fieldName: number;
  index: number;
  length: number;
  onRemove: () => void;
  goodsFormType?: GoodsFormType;
  isInModal?: boolean;
}

const GoodsFormItem: React.FC<GoodsFormItemProps> = ({
  fieldName,
  index,
  length,
  onRemove,
}) => {
  const { form, operateType, isTms, emitterKeys, isFTL } = useContext(
    FormContext,
  );
  const cargoDisabled = useContext(FormContext).cargoDisabled;

  const data = form?.getFieldValue('cargoRequestList')[index] || {};

  const [collapsed, setCollapsed] = useState(false);
  const [isError, setIsError] = useState(false);

  // 不允许删除货物需求
  const disableDelete =
    (operateType === 'assign' || cargoDisabled) && data.cargoRequestId;

  useEffect(() => {
    if (index !== length - 1) setCollapsed(true);
  }, [length]);

  // 提交前检测到该需求存在不合理字段，标记
  global.eventEmitter.useSubscription(({ uniqueKey, value }) => {
    if (uniqueKey === emitterKeys.failReqValidate && value === index) {
      setIsError(true);
    } else if (uniqueKey === emitterKeys.passReqValidate && value === index) {
      setIsError(false);
    }
  });

  // 展开需求
  const handleOpen = () => {
    setCollapsed(!collapsed);
    if (isError) {
      // 如果当前存在错我标记，展开进行校验
      setIsError(false); // 删除当前错误标记
      setTimeout(() => {
        global.eventEmitter.emit({
          uniqueKey: emitterKeys.validateBreakBulk,
          reqIndex: index,
        }); // 通知货物列表进行校验
        form?.validateFields([
          ['cargoRequestList', fieldName, 'cargoPointList', 0, 'address'], // 校验发货地址
          [
            'cargoRequestList',
            fieldName,
            'cargoPointList',
            0,
            'address',
            'contacts',
          ], // 校验发货地址联系人
          [
            'cargoRequestList',
            fieldName,
            'cargoPointList',
            0,
            'address',
            'contactsPhone',
          ], // 校验发货地址联系人电话
          ['cargoRequestList', fieldName, 'cargoPointList', 1, 'address'], // 校验收货地址
          [
            'cargoRequestList',
            fieldName,
            'cargoPointList',
            1,
            'address',
            'contacts',
          ], // 校验收货地址联系人
          [
            'cargoRequestList',
            fieldName,
            'cargoPointList',
            1,
            'address',
            'contactsPhone',
          ], // 校验收货地址联系人电话
        ]);
      }, 100);
    }
  };

  const renderDeleteIcon =
    operateType === 'match' ? (
      <Tooltip title="移出货物需求">
        <Icon type="iconshanchu" onClick={onRemove} className={styles.delete} />
      </Tooltip>
    ) : (
      <Icon type="iconshanchu" onClick={onRemove} className={styles.delete} />
    );

  const renderCollapseRequire = () => {
    const statistics = getCargoStatistics([data]);

    return (
      <div
        className={classnames(
          styles.collapsedWrap,
          isError && styles.errorCollapseWrap,
          `cargoReqItem-${data.cargoRequestNo}`,
        )}
        onClick={handleOpen}
      >
        <div className={styles.left}>
          <div className={styles.itemAddress}>
            <span className={styles.requestNo}>
              需求编号{data.cargoRequestNo}
            </span>
            <div className={styles.addrWrap}>
              <span className={styles.address}>
                {get(
                  data,
                  'cargoPointList[0].address.pointAddress',
                  '暂未填写',
                )}
              </span>
              <Icon type="icongengduo" />
              <span className={styles.address}>
                {get(
                  data,
                  'cargoPointList[1].address.pointAddress',
                  '暂未填写',
                )}
              </span>
            </div>
          </div>
          {data.cargoOwner && (
            <div className={styles.item} style={{ marginRight: 16 }}>
              {data.cargoOwner}
            </div>
          )}
          <div className={styles.itemGoods}>
            {statistics.goodsCounts}单货物&nbsp;/&nbsp;
            {statistics.goodsWeights}kg&nbsp;/&nbsp;
            {statistics.goodsVolume}m³&nbsp;/&nbsp;
            {statistics.goodsTotals}件
          </div>
        </div>
        <Space size={16} className={styles.operateWrap}>
          {!disableDelete && renderDeleteIcon}
          <Icon type="iconunfold" />
        </Space>
      </div>
    );
  };

  return collapsed ? (
    renderCollapseRequire()
  ) : (
    <div className={classnames(styles.GoodsFormCard, 'goodsFormCard')}>
      <div
        className={styles.header}
        style={{ cursor: 'pointer' }}
        onClick={() =>
          operateType !== 'addCargo' ? setCollapsed(!collapsed) : () => {}
        }
      >
        {operateType !== 'addCargo' && <>需求编号{data.cargoRequestNo}</>}
        {operateType !== 'addCargo' && (
          <Space size={16} className={styles.operateWrap}>
            {!disableDelete && renderDeleteIcon}
            <Icon type="iconfold" />
          </Space>
        )}
      </div>
      <ItemForm
        isFTL={isFTL}
        index={index}
        fieldName={fieldName}
        form={form as any}
        cargoDisabled={cargoDisabled && data.isIn}
        // matchReqDisable={data.id && operateType === 'match'}
        matchReqDisable={data.cargoRequestId && operateType !== 'addCargo'}
        formType={2}
        operateType={operateType}
        isTms={isTms}
        calcPriceKey={emitterKeys.updateReqGoods}
      />
    </div>
  );
};

export default GoodsFormItem;
