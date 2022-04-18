import React, { useEffect, useState } from 'react';
import { CloseOutlined, InfoCircleFilled } from '@ant-design/icons';
import styles from './index.less';
import { history } from 'umi';

const AdmittanceTip = () => {
  const { type } = window?.companyInfo;

  const [visible, setVisible] = useState(!type);

  useEffect(() => {
    setVisible(!type);
  }, [type]);

  return visible ? (
    <div className={styles.AdmittanceTip}>
      <div>
        <InfoCircleFilled style={{ marginRight: 6 }} />
        后续若进行企业相关交易，则需进行企业认证。
        <span
          className="link"
          onClick={() => history.push('/company/enterpriseInfo')}
        >
          去认证
        </span>
      </div>
      <CloseOutlined
        style={{ cursor: 'pointer' }}
        onClick={() => setVisible(false)}
      />
    </div>
  ) : null;
};

export default AdmittanceTip;
