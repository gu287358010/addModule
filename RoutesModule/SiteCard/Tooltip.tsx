import React from 'react';
import { Tooltip } from 'antd';
import { getAncestorEle } from '../../utils';

interface CusTooltipProps {
  visible: boolean;
  title: string;
  children: React.ReactNode;
}

const CusTooltip: React.FC<CusTooltipProps> = (props) => {
  return (
    <Tooltip
      title={props.title}
      visible={props.visible}
      getPopupContainer={(ele) =>
        getAncestorEle(ele, 'site-list-module') as HTMLElement
      }
      placement="bottomLeft"
      color="#E94444"
    >
      {props.children}
    </Tooltip>
  );
};

export default CusTooltip;
