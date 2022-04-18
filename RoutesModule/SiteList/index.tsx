import React, { useContext } from 'react';
import { DatePicker, Form, Input } from 'antd';
import { Icon } from '@/baseComponents';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  checkSupplementOrderTimeIsError,
  compareTime,
  FormContext,
  getTimeErr,
} from '../../utils';
import SiteCard from '../SiteCard';
import styles from './index.less';
import classnames from 'classnames';
import { checkConcatPhone } from '../../utils';
import { getSiteGoodsData } from '@/pages/order/util';
import { global } from '@parallel-line/utils';

const { eventEmitter } = global;

const SiteList = () => {
  const {
    form,
    emitterKeys,
    isAssign,
    shouldSupplementOrder,
    shouldCheckCurTime,
  } = useContext(FormContext);

  // 拖拽完成
  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    if (result.destination.index === result.source.index) {
      return;
    }
    const routes = [...form?.getFieldValue('pointList')];
    const [removed] = routes.splice(result.source.index, 1);
    // 移到最后一项，将sendTime置为undefined
    if (result.destination.index === routes.length)
      removed.sendTime = undefined;
    routes.splice(result.destination.index, 0, removed);
    form?.setFieldsValue({ pointList: routes });

    eventEmitter.emit({ uniqueKey: emitterKeys.updatePointsSuc }); // 拖拽完成，发出站点变更通知
  };

  // 更改站点的联系信息和到达时间，发车时间
  const handleSiteInfoUpdate = (payload: any, type: string, index: number) => {
    const routes = [...form?.getFieldValue('pointList')];
    let newRoute = { ...routes[index] };
    let needEmitSupplyOrder = false; // 是否需要计算后补单
    if (type === 'time') {
      newRoute.arriveTime = payload.arriveTime;
      newRoute.sendTime = payload.sendTime;
      if (index === 0) {
        needEmitSupplyOrder = true;
      }
    } else {
      newRoute = { ...routes[index], ...payload };
    }
    routes[index] = newRoute;
    form?.setFieldsValue({ pointList: routes });
    eventEmitter.emit({ uniqueKey: emitterKeys.updatePointsSuc }); // 站点信息发送变化
    if (needEmitSupplyOrder)
      global.eventEmitter.emit({ uniqueKey: emitterKeys.calcSupplyPrice });
  };

  const getSiteTimeErrBetweenSite = (
    index: number,
    arriveTime?: moment.Moment,
    sendTime?: moment.Moment,
  ) => {
    let timeError = 0;
    const pointList = form?.getFieldValue('pointList');
    if (index > 0 && (arriveTime || sendTime)) {
      let tempIndex = index - 1;
      while (tempIndex >= 0) {
        // 获取前面站点
        const prevSite = pointList[tempIndex];
        const prevTime = prevSite.sendTime || prevSite.arriveTime;
        if (prevTime) {
          if (arriveTime && compareTime(prevTime, arriveTime)) {
            return 1;
          } else if (sendTime && compareTime(prevTime, sendTime)) {
            return 2;
          }
          break;
        }
        tempIndex -= 1;
      }
    }
    return timeError;
  };

  const checkSendTime = (value: undefined | moment.Moment, index: number) => {
    const supplementOrdeDate =
      form?.getFieldValue('contractInfo')?.backupOrderDay || 0;
    if (value) {
      if (shouldSupplementOrder) {
        const isError = checkSupplementOrderTimeIsError(
          value,
          supplementOrdeDate,
        );
        if (isError) return Promise.reject(getTimeErr(7, supplementOrdeDate));
      } else if (shouldCheckCurTime && compareTime(undefined, value))
        return Promise.reject(getTimeErr(6));
      const timeError = getTimeErr(
        getSiteTimeErrBetweenSite(index, undefined, value),
        supplementOrdeDate,
      );
      if (timeError) return Promise.reject(timeError);
    }
    return Promise.resolve();
  };

  const checkArriveTime = (value: undefined | moment.Moment, index: number) => {
    const supplementOrdeDate =
      form?.getFieldValue('contractInfo')?.backupOrderDay || 0;
    if (!value && index === 0) return Promise.reject(getTimeErr(3));

    if (value) {
      if (shouldSupplementOrder) {
        const isError = checkSupplementOrderTimeIsError(
          value,
          supplementOrdeDate,
        );
        if (isError) return Promise.reject(getTimeErr(5, supplementOrdeDate)); // 到达时间不能早于当前时间{supplementOrdeDate}以上
      } else if (shouldCheckCurTime && compareTime(undefined, value))
        return Promise.reject(getTimeErr(4, supplementOrdeDate)); // 到达时间需要大于当前时间

      const timeError = getTimeErr(
        getSiteTimeErrBetweenSite(index, value),
        supplementOrdeDate,
      );
      if (timeError) return Promise.reject(timeError);
    }
    return Promise.resolve();
  };

  // 移除
  const handleRemove = (remove: (v: number) => void, index: number) => {
    remove(index);
    eventEmitter.emit({ uniqueKey: emitterKeys.updatePointsSuc }); // 站点信息发送变化
  };

  const renderSiteCard = (
    remove: (val: number) => void,
    index: number,
    length: number,
    field: Record<string, any>,
  ) => {
    const point = form?.getFieldValue('pointList')[index];
    // const timeError = getSiteTimeErr(index);
    const timeError = getSiteTimeErrBetweenSite(
      index,
      point.arriveTime,
      point.sendTime,
    );

    const siteCard = (provided?: any) => (
      <>
        <SiteCard
          length={length}
          position="breakBulkAdd"
          index={index}
          data={point}
          onRemove={() => handleRemove(remove, index)}
          timeError={timeError}
          onSiteInfoUpdate={(val: any, type: string) =>
            handleSiteInfoUpdate(val, type, index)
          }
          provided={provided}
          sendGoods={getSiteGoodsData(
            point.sendGoods,
            form?.getFieldValue('cargoRequestList') || [],
          )}
          dischargeGoods={getSiteGoodsData(
            point.dischargeGoods,
            form?.getFieldValue('cargoRequestList') || [],
          )}
          emitterKey={emitterKeys}
          isAssign={isAssign}
          shouldSupplementOrder={shouldSupplementOrder}
          shouldCheckCurTime={shouldCheckCurTime}
          supplementOrdeDate={
            form?.getFieldValue('contractInfo')?.backupOrderDay || 0
          }
        />
        <Form.Item
          hidden
          name={[field.name, 'contactsPhone']}
          rules={[{ validator: (_rule, val) => checkConcatPhone(val, false) }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          hidden
          name={[field.name, 'arriveTime']}
          rules={[{ validator: (rule, val) => checkArriveTime(val, index) }]}
        >
          <DatePicker />
        </Form.Item>
        {index < length - 1 && (
          <Form.Item
            hidden
            name={[field.name, 'sendTime']}
            rules={[{ validator: (rule, val) => checkSendTime(val, index) }]}
          >
            <DatePicker />
          </Form.Item>
        )}
      </>
    );

    if (isAssign)
      return (
        <div className={styles.siteCardWrap} key={point.tempId}>
          {siteCard()}
        </div>
      );
    return (
      <Draggable draggableId={point.tempId} key={point.tempId} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={classnames({
              [styles.isDragging]: snapshot.isDragging,
              [styles.siteCardWrap]: true,
            })}
          >
            {siteCard(provided)}
          </div>
        )}
      </Draggable>
    );
  };

  // 不需要拖拽
  const renderNormalList = () => (
    <Form.Item
      noStyle
      shouldUpdate={(prev, current) =>
        !_.isEqual(prev.cargoRequestList, current.cargoRequestList)
      }
    >
      {() => (
        <Form.List name="pointList">
          {(fields, { remove }) =>
            fields.length === 0 ? (
              <div className={styles.emptyCon}>
                <Icon type="iconFrame" style={{ fontSize: 64 }} />
                <div style={{ marginTop: 24 }}>
                  暂无货物需求，无法生成线路流向， <br />
                  请填写货物需求
                </div>
              </div>
            ) : (
              fields.map((field, index) =>
                renderSiteCard(remove, index, fields.length, field),
              )
            )
          }
        </Form.List>
      )}
    </Form.Item>
  );

  return (
    <div className={`${styles.siteListWrap} site-list-module`}>
      {isAssign ? (
        renderNormalList()
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {renderNormalList()}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};

export default SiteList;
