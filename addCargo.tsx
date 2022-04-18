/** 货物需求下单 */
/* eslint-disable @typescript-eslint/no-loop-func */
import React from 'react';
import { get } from '@parallel-line/utils';
import CargoForm from './CargoForm';
import styles from './index.less';

interface AddCargoProps {
  location: Location;
  match: Record<string, any>;
}

const Reg = /^\/order\/cargo\/(.*)$/;

const AddCargo: React.FC<AddCargoProps> = ({ location, match }) => {
  const operateId = get(location, 'query.id');

  let operateType = match.path.match(Reg)?.[1] || 'add';
  if (operateType === 'add') {
    const queryType = get(location, 'query.type');
    if (queryType === 'copy') operateType = 'copy';
  }

  const operateTitle = operateType === 'edit' ? '修改' : '保存';

  // 保存成功回调
  const handleSubmitSuccess = () => {
    eventEmitter.emit({
      uniqueKey: 'PAGE_TABS',
      action: 'onClose',
      value: {
        pathname: location.pathname,
        nextPathname: '/cargoDemand/list',
      },
    });
  };

  return (
    <div className={styles.BreakBulkAdd}>
      <div className={styles.con}>
        <div className={styles.leftWrap}>
          <div className={styles.leftModule}>
            <CargoForm
              onSuccess={handleSubmitSuccess}
              operateId={operateId}
              operateType={operateType}
              operateTitle={operateTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCargo;
