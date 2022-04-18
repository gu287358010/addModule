import React, { useState } from 'react';
import { render } from '@parallel-line/utils';
import { Modal } from '@parallel-line/components';
import { CheckCircleFilled } from '@ant-design/icons';
import { Button, ButtonProps, Space } from 'antd';
import style from './index.less';

interface ActionBtnProps extends ButtonProps {
  cb?: () => void;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ cb, ...buttonProps }) => {
  const [loading, setLoading] = useState(false);

  const handleCli = async (
    cliEvent: React.MouseEventHandler<HTMLElement> | undefined,
    e: React.MouseEvent<HTMLElement, MouseEvent>,
  ) => {
    if (!cliEvent) return;
    const func = (cliEvent(e) as unknown) as Function;
    if (func instanceof Promise) {
      // 拦截Promise
      setLoading(true);
      func
        .then(() => {
          setLoading(false);
          cb?.();
        })
        .catch(() => setLoading(false));
      return;
    } else cb?.();
  };

  return (
    <Button
      {...buttonProps}
      loading={loading}
      onClick={(e) => handleCli(buttonProps.onClick, e)}
    />
  );
};

interface ContentProps {
  btns: ButtonProps[];
  onClose?: () => void;
  title: string;
  desc?: string;
}

const Content: React.FC<ContentProps> = ({ btns, onClose, title, desc }) => {
  return (
    <div className={style.Content}>
      <Space size={16} align="baseline">
        <CheckCircleFilled
          style={{ color: '#00B86B', fontSize: 24, verticalAlign: -5 }}
        />
        <div>
          <div className={style.title}>{title}</div>
          <div className={style.desc}>{desc || ''}</div>
        </div>
      </Space>
      <Space size={16} className={style.btns}>
        {btns.map((btn, index) => (
          <ActionBtn key={index} {...btn} cb={onClose} />
        ))}
      </Space>
    </div>
  );
};

export default (props: ContentProps) => {
  render(Modal, {
    title: null,
    content: <Content {...props} />,
    footer: null,
    closable: false,
    maskClosable: false,
    width: 460,
  } as any).open();
};
