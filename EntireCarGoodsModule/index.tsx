import React, { useContext, useMemo } from 'react';
import { Form } from 'antd';
import ModuleTitle from '../components/ModuleTitle';
import EditTable from '../components/EditTable';
import { FormContext, isNeedShouldUpdate, transNumber } from '../utils';
import {
  formatNumber,
  formatTimeBySeconds,
  getCargoStatistics,
} from '../../util';
import { global } from '@parallel-line/utils';
import styles from './index.less';

interface EntireCarGoodsModuleProps {
  position?: string;
  isFromShipper?: boolean;
}

const { isCarrier } = global.PXX_SOLUTION;

const EntireCarGoodsModule: React.FC<EntireCarGoodsModuleProps> = ({
  position,
  isFromShipper,
}) => {
  const { isTms } = useContext(FormContext);

  const tableRequiredKeys = useMemo(() => {
    if (position === 'logistics')
      return ['descriptionOfGoods', 'goodsItemGrossWeight'];
    if (!isTms)
      return [
        'descriptionOfGoods',
        'cargoTypeClassificationCode',
        'goodsItemGrossWeight',
        'goodsItemCube',
        'totalNumberOfPackages',
      ];
    return [];
  }, [isTms]);

  // const validator = (params: any, value: any) => {
  //   let isNull: boolean = false;
  //   value.forEach((item: any) => {
  //     if (!item.descriptionOfGoods || !item.cargoTypeClassificationCode) {
  //       isNull = true;
  //     }
  //   });
  //   return isNull
  //     ? Promise.reject('货物的货物名称和货物类型不能为空')
  //     : Promise.resolve();
  // };
  const canShowOwner = isCarrier && !isFromShipper;

  return (
    <div>
      <ModuleTitle title="货物信息" icon="iconhuowu" />
      <div className="moduleCon">
        <Form.Item
          name="cargoGoodsList"
          // rules={[{ required: true, validator }]}
        >
          <EditTable requiredKeys={tableRequiredKeys} hidePrice hideFooter />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, cur) =>
            isNeedShouldUpdate(prev, cur, [
              'cargoGoodsList',
              'estimateMeter',
              'estimateDurationMinute',
              'requestCost.costCent',
            ])
          }
        >
          {({ getFieldValue }) => {
            const statistics = getCargoStatistics([
              { cargoGoodsList: getFieldValue('cargoGoodsList') },
            ]);
            const distance = getFieldValue('estimateMeter');
            const time = getFieldValue('estimateDurationMinute');
            const costCent = getFieldValue(['requestCost', 'costCent']);
            return (
              <div className={styles.statistics}>
                <div>
                  共&nbsp;
                  {statistics.goodsWeights}kg&nbsp;/&nbsp;
                  {statistics.goodsVolume}&nbsp;m³/&nbsp;
                  {statistics.goodsTotals}件{/** 货主不展示应收费用 */}
                  {canShowOwner && !!costCent && (
                    <>， 应收费用：{costCent || '--'}元</>
                  )}
                  {/* {!isShipper && <>， 应收费用：{costCent || '--'}元</>} */}
                </div>
                <div>
                  计划里程
                  {formatNumber(transNumber(distance, 'metreToKilometre'))}
                  km，预计在途时长
                  {formatTimeBySeconds(time ? time * 60 : undefined)}
                </div>
              </div>
            );
          }}
        </Form.Item>
      </div>
    </div>
  );
};

export default EntireCarGoodsModule;
