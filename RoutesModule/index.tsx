import { Form } from 'antd';
import React, { useContext } from 'react';
import ModuleTitle from '../components/ModuleTitle';
import styles from './index.less';
import SiteList from './SiteList';
import selectRoute from '@/businessComponent/SelectRouteDrawer';
import { FormContext, initalSite, formatMinuteTime } from '../utils';
import RouteOrderly from './RouteOrderly';

const RoutesModule = () => {
  const { form, emitterKeys, isAssign } = useContext(FormContext);

  // 线路选择成功
  const selectRouteSuccess = (params: Record<string, any>) => {
    const pointList = form?.getFieldValue('pointList') || [];
    const points = (params.pointList || []).reduce(
      (prev: any, { pointAddressCom, ...point }: Record<string, any>) => {
        const index = prev.findIndex(
          (p: Record<string, any>) =>
            p.pointAddress === pointAddressCom?.pointAddress,
        );
        if (index === -1) {
          prev.push({
            ...initalSite(),
            ...point,
            arriveTime: formatMinuteTime(point.arriveTime),
            sendTime: formatMinuteTime(point.sendTime),
            pointAddress: pointAddressCom?.pointAddress,
            pointCode: pointAddressCom?.pointCode,
            pointLatitude: pointAddressCom?.pointLatitude,
            pointLongitude: pointAddressCom?.pointLongitude, // 站点地址
          });
        }
        return prev;
      },
      [...pointList],
    );
    form?.setFieldsValue({ pointList: points });

    // 导入路线，重新请求承运商价格列表接口
    eventEmitter.emit({ uniqueKey: emitterKeys.updatePointsSuc }); // 拖拽完成，发出站点变更通知
  };

  const handleSelectRoute = () => {
    selectRoute({
      position: 'addRequirement',
      onSuccess: selectRouteSuccess,
    });
  };

  return (
    <div className={styles.RoutesModule}>
      <div className={styles.header}>
        <ModuleTitle title="线路流向" />
        {!isAssign && <span onClick={handleSelectRoute}>选择路线</span>}
      </div>
      {isAssign ? (
        <div style={{ marginTop: 24 }}></div>
      ) : (
        <div className={styles.switchWrap}>
          <Form.Item noStyle name="orderly">
            <RouteOrderly />
          </Form.Item>
        </div>
      )}
      <SiteList />
    </div>
  );
};

export default RoutesModule;
