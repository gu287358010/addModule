/**
 * 整车下单
 */

import React, { useRef } from 'react';
import styles from './index.less';
import { get } from '@parallel-line/utils';
import EntireForm from './EntireForm';

const Reg = /^\/order\/entire\/(.*)$/;

const OPERATE_TYPE = {
  edit: '发布',
  appoint: '发布',
  add: '发布',
  copy: '发布',
};

interface AddEntireProps {
  location: Location;
  match: Record<string, any>;
}

const AddEntire: React.FC<AddEntireProps> = ({ location, match }) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  const operateId = get(location, 'query.id');
  const assignDisabled = get(location, 'query.assignDisabled') === '1'; // 执行中订单，无法修改承运信息和运输费用

  let operateType = match.path.match(Reg)?.[1] || 'add';
  if (operateType === 'add') {
    const queryType = get(location, 'query.type');
    if (queryType === 'copy') operateType = 'copy';
  }

  const operateTitle = OPERATE_TYPE[operateType];

  return (
    <div className={styles.BreakBulkAdd} id="order-vl-add" ref={wrapRef}>
      <div className={styles.con}>
        <div className={styles.leftWrap}>
          <div
            className={styles.leftModule}
            style={{ padding: '56px 80px', overflow: 'initial' }}
          >
            {/* <AdmittanceTip /> */}
            <EntireForm
              location={location}
              operateId={operateId}
              operateType={operateType}
              operateTitle={operateTitle}
              assignDisabled={assignDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEntire;
