import { Tooltip } from 'antd';
import React, { useMemo } from 'react';
import Qrcode from 'qrcode.react';
import styles from './index.less';
import qrcodeLogo from '@/assets/images/qrcode_logo.svg';
import { Icon } from '@/baseComponents';

const InvationQrcode = () => {
  // 下载二维码
  const handleDownload = () => {
    const canvas = document.querySelector('#downloadQrcode') as any;
    if (!canvas) return;
    const el = document.createElement('a');
    el.href = canvas.toDataURL();
    el.download = '二维码';

    // 创建一个点击事件并对 a 标签进行触发
    const event = new MouseEvent('click');
    el.dispatchEvent(event);
  };

  const renderQrcode = useMemo(
    () => (
      <div className={styles.qrcodeDrop}>
        <Qrcode
          value="https://a.app.qq.com/o/simple.jsp?pkgname=com.pxx.transport&fromcase=40003"
          size={156}
          level="H"
          includeMargin
          id="downloadQrcode"
          imageSettings={{
            src: qrcodeLogo,
            height: 40,
            width: 40,
          }}
        />
        <div className={styles.qrcodeDropBtn} onClick={handleDownload}>
          <Icon type="icondaoru1" style={{ fontSize: 14 }} />
          下载二维码
        </div>
      </div>
    ),
    [],
  );

  return (
    <div className={styles.qrcodeCon}>
      您指派的司机还未登录过平行线APP，可分享二维码去下载APP
      <Tooltip
        color="#000"
        // placement="topCenter"
        // arrow
        title={renderQrcode}
        getPopupContainer={(node) => node.parentNode as HTMLElement}
      >
        <span>查看APP下载二维码</span>
      </Tooltip>
    </div>
  );
};

export default InvationQrcode;
