import { Icon } from '@/baseComponents';
import React, { useEffect, useState } from 'react';
import styles from './index.less';
import classname from 'classnames';
import { Space, Tooltip } from 'antd';
import updateSiteInfo from '../updateSiteInfo';
import {
  checkSupplementOrderTimeIsError,
  compareTime,
  getAncestorEle,
  getTimeErr,
} from '../../utils';
import { formatNumber } from '@/pages/order/util';
import { global } from '@parallel-line/utils';
import { formatShowTime } from '@/utils';
import CusTooltip from './Tooltip';
import { EmitterKeys } from '../../types';

const { eventEmitter } = global;

interface SiteCardProps {
  data: any;
  index: number;
  length?: number;
  position: 'breakBulkAdd' | 'orderDetail'; // 使用位置， 新建或者订单详情路线
  onRemove?: () => void;
  onSiteInfoUpdate?: (val: Record<string, any>, type: string) => void;
  provided?: any;
  timeError?: number;
  sendGoods: Record<string, any>[];
  dischargeGoods: Record<string, any>[];
  emitterKey: EmitterKeys;
  isAssign?: boolean;
  shouldSupplementOrder?: boolean;
  shouldCheckCurTime?: boolean;
  supplementOrdeDate?: number;
}

const SiteCard: React.FC<SiteCardProps> = ({
  position,
  data,
  index,
  onRemove,
  onSiteInfoUpdate,
  provided,
  length = 0,
  timeError = 0,
  sendGoods,
  dischargeGoods,
  emitterKey,
  isAssign,
  shouldSupplementOrder,
  shouldCheckCurTime,
  supplementOrdeDate = 0,
}) => {
  // const [concatIsErr, setContactIsErr] = useState(false);
  const [sendTimeIsErr, setSendTimeIsErr] = useState(false);
  const [arriveTimeErrType, setArriveTimeErrType] = useState(0); // 0: 无错误  1：未填写  2：小于当前时间
  const [tooltipVis, setTooltipVis] = useState(false); // 拖拽

  const isLast = length - 1 === index; // 当前是最后一个站点
  const canOperate = position === 'breakBulkAdd'; // 零担可执行操作
  const assignDisableOperate = !isAssign && canOperate; // 指派操作下无法修改联系人和拖拽站点，只允许修改时间

  const handleMouseOperate = (
    tempId: string,
    reqNo: string,
    type: 'mouseOver' | 'mouseOut' = 'mouseOver',
  ) => {
    const nodeList = document.querySelectorAll(
      `.formGoodsItem-${tempId}`,
    ) as any;
    [...nodeList].forEach((node) => {
      if (type === 'mouseOver') node.classList.add('detailGoodsItemHover');
      else node.classList.remove('detailGoodsItemHover');
    });
    const cargeReqNode = document.querySelector(`.cargoReqItem-${reqNo}`);
    if (cargeReqNode) {
      if (type === 'mouseOver')
        cargeReqNode.classList.add('goodsFormCardSelect');
      else cargeReqNode.classList.remove('goodsFormCardSelect');
    }
  };

  useEffect(() => {
    setArriveTimeErrType(0);
  }, [index]);

  eventEmitter.useSubscription(({ uniqueKey, type }: Record<string, any>) => {
    if (uniqueKey === emitterKey?.validateRoutesTime) {
      if (type === 'force') {
        if (index === 0) {
          let isErr = false;
          if (!data.arriveTime) {
            setArriveTimeErrType(3);
            isErr = true;
          } else {
            if (shouldSupplementOrder) {
              const isError = checkSupplementOrderTimeIsError(
                data.arriveTime,
                supplementOrdeDate,
              );
              if (isError) {
                // 到达时间不能早于当前时间{supplementOrdeDate}以上
                setArriveTimeErrType(5);
                isErr = true;
              }
            } else if (
              shouldCheckCurTime &&
              compareTime(undefined, data.arriveTime)
            ) {
              setArriveTimeErrType(4);
              isErr = true;
            }
          }
          if (isErr) eventEmitter.emit({ uniqueKey: emitterKey?.scrollTop });
        }
      }
      if (type === 'tmsStatusChange') {
        if (
          index === 0 &&
          (arriveTimeErrType === 5 ||
            arriveTimeErrType === 4 ||
            arriveTimeErrType === -1)
        ) {
          if (shouldSupplementOrder) {
            const isError = checkSupplementOrderTimeIsError(
              data.arriveTime,
              supplementOrdeDate,
            );
            setArriveTimeErrType(isError ? 5 : -1);
          } else if (
            shouldCheckCurTime &&
            compareTime(undefined, data.arriveTime)
          ) {
            setArriveTimeErrType(4);
          } else {
            setArriveTimeErrType(-1);
          }
        }
      }
    }
  });

  const handleTimeSelect = (type = 'time') => {
    const defaultValue: Record<string, string> = {};
    if (type === 'time') {
      if (!isLast) defaultValue.sendTime = data.sendTime;
      defaultValue.arriveTime = data.arriveTime;
    } else {
      defaultValue.contacts = data.contacts;
      defaultValue.contactsPhone = data.contactsPhone;
    }
    updateSiteInfo({
      defaultValue,
      type,
      hideSendTime: length - 1 === index,
      index,
      shouldCheckCurTime,
      supplementOrdeDate,
      shouldSupplementOrder,
      onSuccess: (payload: Record<string, any>) => {
        if (type === 'time') {
          setArriveTimeErrType(0);
          setSendTimeIsErr(false);
        }
        onSiteInfoUpdate && onSiteInfoUpdate(payload, type);
      },
    });
  };

  const renderConcatInfo = () => {
    if (data.contacts || data.contactsPhone) {
      return (
        <div className={classname(styles.operateWrap)}>
          <div>
            {data.contacts} {data.contactsPhone}
          </div>
          {assignDisableOperate && (
            <span
              className={styles.operate}
              onClick={() => handleTimeSelect('concat')}
            >
              修改
            </span>
          )}
        </div>
      );
    }
    if (assignDisableOperate) {
      return (
        <div className={classname(styles.timeWrap)}>
          <span className="link" onClick={() => handleTimeSelect('concat')}>
            填写站点联系人信息
            {/* <span className={styles.requireMark}></span> */}
          </span>
          {/* {concatIsErr && (
            <span style={{ color: '#E94444' }}>请填写站点联系人信息</span>
          )} */}
        </div>
      );
    }
    return null;
  };

  const renderArriveTime = (
    <div className={styles.operateInner}>
      <CusTooltip
        title={getTimeErr(timeError || arriveTimeErrType, supplementOrdeDate)}
        visible={timeError === 1 || [3, 4, 5].includes(arriveTimeErrType)}
      >
        <span>到达时间：{formatShowTime(data.arriveTime)}</span>
      </CusTooltip>
    </div>
  );

  const renderSendTime = (
    <div className={styles.operateInner}>
      {timeError === 2 ? (
        <CusTooltip
          title={getTimeErr(timeError, supplementOrdeDate)}
          visible={timeError === 2}
        >
          <span>发车时间：{formatShowTime(data.sendTime)}</span>
        </CusTooltip>
      ) : (
        <>发车时间：{formatShowTime(data.sendTime)}</>
      )}
    </div>
  );

  const renderTimeInfo = () => {
    // 时间已全部填写完成
    if ((data.arriveTime && data.sendTime) || (data.arriveTime && isLast)) {
      return (
        <div className={styles.operateWrap}>
          <div>
            {renderArriveTime}
            {data.sendTime && !isLast && renderSendTime}
          </div>
          {canOperate && (
            <span className={styles.operate} onClick={() => handleTimeSelect()}>
              修改
            </span>
          )}
        </div>
      );
    }
    // 只填写部分信息
    if (data.arriveTime || data.sendTime) {
      let sendTimeCon = null;
      if (data.sendTime) {
        sendTimeCon = (
          <div className={styles.operateWrap}>
            {renderSendTime}
            {canOperate && (
              <span
                className={styles.operate}
                onClick={() => handleTimeSelect()}
              >
                修改
              </span>
            )}
          </div>
        );
      } else if (canOperate) {
        sendTimeCon = (
          <div className={styles.timeWrap}>
            <span className="link" onClick={() => handleTimeSelect()}>
              选择发车时间
            </span>
            {sendTimeIsErr && (
              <span className={styles.error}>请选择发车时间</span>
            )}
          </div>
        );
      }
      let arriveTimeCon = null;
      if (data.arriveTime) {
        arriveTimeCon = (
          <div className={styles.operateWrap}>
            {renderArriveTime}
            {canOperate && (
              <span
                className={styles.operate}
                onClick={() => handleTimeSelect()}
              >
                修改
              </span>
            )}
          </div>
        );
      } else if (canOperate) {
        arriveTimeCon = (
          <div className={styles.timeWrap}>
            <span
              className={classname('link', styles.operateInner)}
              onClick={() => handleTimeSelect()}
            >
              <CusTooltip
                title={getTimeErr(3, supplementOrdeDate)}
                visible={arriveTimeErrType === 3}
              >
                选择到达时间
              </CusTooltip>
            </span>
          </div>
        );
      }
      return (
        <div>
          {arriveTimeCon}
          {!isLast && sendTimeCon}
        </div>
      );
    }
    if (canOperate) {
      return (
        <div className={classname(styles.timeWrap)}>
          <span
            className={classname('link', styles.operateInner)}
            onClick={() => handleTimeSelect()}
          >
            <CusTooltip
              title={getTimeErr(3, supplementOrdeDate)}
              visible={arriveTimeErrType === 3}
            >
              <span>
                选择【到达时间】
                {index === 0 && <span className={styles.requireMark}></span>}
                {length - 1 !== index && '【发车时间】'}
              </span>
            </CusTooltip>
          </span>
        </div>
      );
    }
    return null;
  };

  const renderGoodsItem = (
    item: Record<string, any>,
    i: number,
    reqNo: string,
  ) => (
    <div
      key={i}
      className={classname(styles.goodsItem, `formGoodsItem-${item.tempId}`)}
      onMouseOver={() => handleMouseOperate(item.tempId, reqNo)}
      onMouseOut={() => handleMouseOperate(item.tempId, reqNo, 'mouseOut')}
    >
      {i + 1}、{item.descriptionOfGoods || '--'}&nbsp;/&nbsp;
      {formatNumber(item.goodsItemGrossWeight)}kg&nbsp;/&nbsp;
      {formatNumber(item.goodsItemCube)}m³&nbsp;/&nbsp;
      {formatNumber(item.totalNumberOfPackages)} 件
    </div>
  );

  const renderList = (list: any[], type = 'send') => {
    if (list.length > 0) {
      return list.map((item: Record<string, any>) => {
        const children = (item.list || []).filter(
          (v: Record<string, any>) =>
            v.descriptionOfGoods ||
            v.goodsItemCube ||
            v.goodsItemGrossWeight ||
            v.unitPrice,
        );
        if (children.length > 0) {
          return (
            <div
              key={item.require.cargoRequestNo}
              className={classname(
                styles.goodsWrap,
                type === 'send'
                  ? styles.sendGoodsWrap
                  : styles.dischargeGoodsWrap,
              )}
            >
              <div className={styles.line}></div>
              <div className={styles.goodsCon}>
                <div className={styles.goodsLabel}>
                  <span>{type === 'send' ? '装车' : '卸货'}</span>
                  <span>{item.require.cargoOwner}</span>
                </div>
                {children.map((v: Record<string, any>, i: number) =>
                  renderGoodsItem(v, i, item.require.cargoRequestNo),
                )}
              </div>
            </div>
          );
        }
        return null;
      });
    }
    return null;
  };

  return (
    <div className={styles.SiteCard}>
      <div
        className={styles.header}
        {...(assignDisableOperate
          ? {
              ...provided.dragHandleProps,
              style: { cursor: 'move' },
              onMouseOver: () => setTooltipVis(true),
              onMouseOut: () => setTooltipVis(false),
            }
          : {})}
      >
        <div className={styles.label}>
          <div className={styles.order}>{index + 1}</div>
          <div style={{ fontSize: 12 }}>站点{index + 1}</div>
        </div>
        <Space size={16}>
          {sendGoods.length === 0 && dischargeGoods.length === 0 && (
            <Icon
              type="iconshanchu"
              className={styles.deleteIcon}
              onClick={onRemove}
            />
          )}
          {assignDisableOperate && (
            <Tooltip
              title="拖拽移动站点"
              visible={tooltipVis}
              getPopupContainer={(ele) =>
                getAncestorEle(ele, 'site-list-module') as HTMLElement
              }
            >
              <Icon type="icontuozhuai" />
            </Tooltip>
          )}
        </Space>
      </div>
      {data.pointAddress && (
        <div className={classname(styles.addressWrap, styles.operateWrap)}>
          <div className={styles.addressBox}>
            {data.pointAddress && (
              <div className={styles.address} title={data.pointAddress}>
                {data.addressName && data.addressName + '/'}
                {data.pointAddress}
              </div>
            )}
          </div>
          {/* <span className={styles.operate}>修改</span> */}
        </div>
      )}

      {renderConcatInfo()}
      {renderTimeInfo()}
      {/* {index === 0 && arriveTimeErrType === 2 && (
        <div className={classname(styles.timeWrap, styles.error)}>
          到达时间需要大于当前时间
        </div>
      )} */}

      {renderList(sendGoods)}
      {renderList(dischargeGoods, 'discharge')}
    </div>
  );
};

export default SiteCard;
