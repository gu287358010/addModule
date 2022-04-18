/**
 * 承运信息表单
 */

import React, {
  forwardRef,
  useState,
  useContext,
  useRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import ModuleTitle from '../components/ModuleTitle';
import { global, obtainDic } from '@parallel-line/utils';
import { history } from 'umi';
import { Form, Space, Cascader, DatePicker, InputNumber } from 'antd';
import {
  checkPrice,
  FormContext,
  getAncestorEle,
  getDateValue,
  compareTime,
} from '../utils';
import { ObjectType } from '../types';
import AssignVehicle from './components/AssignVehicle';
import CompanySelect from './components/CompanySelect';
import { TooltipIcon } from '@/baseComponents';
import ItemSelect from '../components/ItemSelect';
import DepositSelect from './components/DepositSelect';
import { Rule } from 'antd/es/form';
import styles from './index.less';
import PriceInput from './components/PriceInput';
import { SwapRightOutlined } from '@ant-design/icons';
import { Select } from '@parallel-line/components';
import VehicleTypeSelect from './components/VehicleTypeSelect';
import useDriverSel, {
  DriverContext,
} from './components/DriverSelect/useDriverSel';
import DutyFormItem from './components/DutyFormItem';

const FORMAT_TIME = 'YYYY-MM-DD HH:mm';
interface AssignModuleProps {
  onSetTms: (val: boolean) => void;
  isDriverMatchPrice?: boolean;
  isCompanyMatchPrice?: boolean;
  onSetIsDriverMatchPrice?: (val: boolean | undefined) => void;
  onSetIsCompanyMatchPrice?: (val: boolean | undefined) => void;
  assignDisabled?: boolean;
}

const isAutentication = global.PXX_USER_STATE.isAutentication; // 是否已认证
const isFleet = global.PXX_SOLUTION.isFleet; // 指派车队长
const { isAssignPlatform, isGrab, isQuote } = global.PXX_SOLUTION as ObjectType;

const AssignModule = forwardRef((props: AssignModuleProps, ref) => {
  const { form, transContractList } = useContext(FormContext);
  const [companyList, setCompanyList] = useState<ObjectType[] | undefined>();

  const {
    priceList,
    normalList,
    showSwitch,
    reqFetched,
    switchVal,
    onSwitchChange,
    normalReqFetched,
  } = useDriverSel({
    isDriverMatchPrice: props.isDriverMatchPrice,
    onSetIsDriverMatchPrice: props.onSetIsDriverMatchPrice,
  });

  // 减少多次请求，存储司机车辆列表数据
  const dataRef = useRef<any>({
    vehicleList: undefined,
    vehiclePriceList: undefined,
    companyList: undefined,
    companyPriceList: undefined,
  });

  const vehicleRef = useRef<ObjectType>({});

  const lengthTypes = GetDic('vehicle_length_type').map(
    (length: ObjectType) => {
      return {
        ...length,
        children: (length.children || []).map((item: ObjectType) => {
          return { ...item, children: undefined };
        }),
      };
    },
  );

  useImperativeHandle(ref, () => ({
    onSetRefresh: vehicleRef.current?.onSetRefresh,
  }));

  // 公司列表数据请求完成
  const handleCompanyFetched = (result: any[], isPriceList = false) => {
    if (isPriceList) dataRef.current.companyPriceList = result;
    else dataRef.current.companyList = result;
    setCompanyList(result);
  };

  // 司机车辆列表数据请求变化或完成
  const handleVehicleFetched = (result?: ObjectType, isPriceList = false) => {
    if (isPriceList) dataRef.current.vehiclePriceList = result;
    else dataRef.current.vehicleList = result;
  };

  const getCompanyValueProps = (val: ObjectType | undefined) => {
    let companyId;
    if (val) {
      if (val?.carrierId === '-99' || !props.isCompanyMatchPrice)
        companyId = val?.carrierId;
      else companyId = val?.carrierId + '_' + val?.ruleId;
    }
    return {
      value: companyId,
    };
  };

  // 检测指派信息
  const checkAssign = (_rule: any, value: number) => {
    if (![1, 2, 3, 7].includes(value)) {
      return Promise.reject('请选择指派信息');
    }
    return Promise.resolve();
  };

  // 交易时间校验
  const checkTradeTime = (rule: Rule, value: null | moment.Moment[]) => {
    if (!value) return Promise.reject('请选择交易生效时间');
    if (compareTime(undefined, value[0])) {
      return Promise.reject('交易生效时间需要大于当前时间');
    }
    if (compareTime(value[0], value[1])) {
      return Promise.reject('交易失效时间需要大于生效时间');
    }
    // const points = form?.getFieldValue('pointList') || [];
    // const arriveTime = get(points, '[0].arriveTime');
    // if (arriveTime && compareTime(value[1], arriveTime)) {
    //   if (isFTL) return Promise.reject('交易失效时间需要小于装货时间');
    //   return Promise.reject('交易失效时间需要小于到达时间');
    // }
    return Promise.resolve();
  };

  /**
   * 校验竞价定标截止时间
   * 必填，定标截止时间需大于交易生效时间，大于失效时间且小于站点装货时间
   * @param value
   */
  const checkQuoteEndTime = (value: undefined | moment.Moment) => {
    if (!value) return Promise.reject('请选择定标截止时间');
    const tradeTime = form?.getFieldValue('tradeTime');
    if (tradeTime) {
      if (
        getDateValue(value, FORMAT_TIME) <=
        getDateValue(tradeTime[1], FORMAT_TIME)
      ) {
        return Promise.reject('定标截止时间需要大于交易失效时间');
      }
    }
    // const arriveTime = get(form?.getFieldValue('pointList'), '[0].arriveTime');
    // if (
    //   arriveTime &&
    //   getDateValue(value, FORMAT_TIME) >= getDateValue(arriveTime, FORMAT_TIME)
    // ) {
    //   if (isFTL) return Promise.reject('定标截止时间需要小于装货时间');
    //   return Promise.reject('定标截止时间需要小于到达时间');
    // }
    return Promise.resolve();
  };

  // 校验最小报价
  const checkMinPrice = (value?: number | string) => {
    return checkPrice(value, false, () => {
      const max = form?.getFieldValue('quoteMax');
      if (max) {
        if ((value as number) > max)
          return Promise.reject('输入最低价不能高于最高价');
      }
      return Promise.resolve();
    });
  };

  // 校验最高报价
  const checkMaxPrice = (value?: number | string) => {
    return checkPrice(value, false, () => {
      const min = form?.getFieldValue('quoteMin');
      if (min) {
        if ((value as number) < min)
          return Promise.reject('输入最高价不能低于最低价');
      }
      return Promise.resolve();
    });
  };

  const checkAssignInfo = (value: ObjectType, key: string, errText: string) => {
    if (!value?.[key]) return Promise.reject(errText);
    return Promise.resolve();
  };

  // 最小价格变化
  const handleMinPriceChange = (value?: number) => {
    const max = form?.getFieldValue('quoteMax');
    if (value && value <= max) form?.validateFields(['quoteMax']);
  };

  const handleMaxPriceChange = (value?: number) => {
    const min = form?.getFieldValue('quoteMin');
    if (value && value >= min) form?.validateFields(['quoteMin']);
  };

  // 交易时间更改，主动校验定标截止时间
  const handleTradeTimeChange = () => {
    if (form?.getFieldValue('quoteEndTime')) {
      form.validateFields(['quoteEndTime']);
    }
  };

  const getPopupContainer = (node: any) =>
    getAncestorEle(node, 'form-assgin-module') as HTMLElement;

  // 车长车型
  const renderVehicleInfo = (required = true) => (
    <Form.Item
      label="车长车型"
      name="vehicleData"
      rules={[
        {
          required,
          message: '请选择车长信息',
        },
      ]}
    >
      <Cascader
        getPopupContainer={getPopupContainer}
        placeholder="请选择"
        fieldNames={{
          label: 'value',
          value: 'key',
        }}
        options={lengthTypes}
        disabled={props.assignDisabled}
      />
    </Form.Item>
  );

  const renderVehicleData = () => (
    <Form.Item
      noStyle
      shouldUpdate={(prevValues, currentValues) =>
        prevValues.assignType !== currentValues.assignType
      }
    >
      {({ getFieldValue }) =>
        renderVehicleInfo(getFieldValue('assignType') === 2)
      }
    </Form.Item>
  );

  const renderCompany = () => (
    <>
      <Space size={12} className="customSpace">
        <Form.Item
          name="companyInfo"
          label="承运商"
          required
          rules={[
            {
              validator: (rule, value) =>
                checkAssignInfo(value, 'carrierId', '请选择承运商'),
            },
          ]}
          style={{
            display: 'flex',
          }}
          getValueProps={getCompanyValueProps}
        >
          <CompanySelect
            companyList={dataRef.current.companyList}
            companyPriceList={dataRef.current.companyPriceList}
            onFetchFinish={handleCompanyFetched}
            form={form}
            onSetIsPayMatchPrice={props.onSetIsCompanyMatchPrice}
            options={companyList}
            isCompanyMatchPrice={props.isCompanyMatchPrice}
            disabled={props.assignDisabled}
            isHideInvite
          />
        </Form.Item>
        {renderVehicleData()}
      </Space>
    </>
  );

  // 派单表单
  const renderDistributeOrderForm = () => {
    return (
      <>
        <Form.Item
          label="发布对象"
          name="assignType"
          required
          rules={[{ validator: checkAssign }]}
        >
          <ItemSelect.Group disabled={props.assignDisabled}>
            <ItemSelect value={1}>指派车辆</ItemSelect>
            <ItemSelect value={3}>指派承运商</ItemSelect>
            {isFleet && <ItemSelect value={7}>指派车队长</ItemSelect>}
          </ItemSelect.Group>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) =>
            prev.assignType !== current.assignType
          }
        >
          {({ getFieldValue }) => (
            <>
              {[1, 7].includes(getFieldValue('assignType')) && (
                <AssignVehicle
                  onVehicleFetched={handleVehicleFetched}
                  vehiclePriceList={dataRef.current.vehiclePriceList}
                  vehicleList={dataRef.current.vehicleList}
                  onSetIsDriverMatchPrice={props.onSetIsDriverMatchPrice}
                  onSetTms={props.onSetTms}
                  assignDisabled={props.assignDisabled}
                  isDriverMatchPrice={props.isDriverMatchPrice}
                  ref={vehicleRef}
                  vehicleRequired={form?.getFieldValue('assignType') === 1}
                  transConList={transContractList}
                />
              )}
              {getFieldValue('assignType') === 3 && renderCompany()}
              {getFieldValue('assignType') === 2 && renderVehicleData()}
            </>
          )}
        </Form.Item>
      </>
    );
  };

  const renderTooltipLabel = (
    label: string,
    title: React.ReactNode,
    others: ObjectType<string> = {},
  ) => (
    <span>
      {label}
      <TooltipIcon
        style={{ marginLeft: 4, marginRight: 4 }}
        getPopupContainer={getPopupContainer}
        title={title}
        {...others}
      />
    </span>
  );

  // 交易生效时间formItem
  const renderTradeTimeForm = (text: string) => (
    <Form.Item
      label={renderTooltipLabel('交易生效时间', text)}
      required
      name="tradeTime"
      rules={[{ validator: checkTradeTime }]}
    >
      <DatePicker.RangePicker
        showTime={{ format: 'HH:mm' }}
        format="YYYY-MM-DD HH:mm"
        style={{ width: '100%' }}
        onChange={handleTradeTimeChange}
        disabled={props.assignDisabled}
      />
    </Form.Item>
  );

  // 发布对象
  const renderBidderScopeForm = useMemo(
    () => (
      <Space className="customSpace" size={12}>
        <Form.Item
          label={renderTooltipLabel(
            '发布对象',
            '发布对象是指发布交易后，哪些用户可以进行交易，如选择全体个体司机，则所有司机都可以进行交易，如选择部分司机，仅您指定的司机可以进行交易。',
          )}
          name="bidderScope"
          required
        >
          <ItemSelect.Group disabled={props.assignDisabled}>
            <ItemSelect value={10}>全网司机</ItemSelect>
            <ItemSelect value={20}>仅我的司机</ItemSelect>
          </ItemSelect.Group>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) =>
            prev.bidderScope !== current.bidderScope
          }
        >
          {({ getFieldValue }) =>
            getFieldValue('bidderScope') === 20 && (
              <Form.Item label="指定司机" name="scopeTag" required>
                <ItemSelect.Group
                  disabled={props.assignDisabled}
                  dicKey="request.request.scope_tag"
                />
              </Form.Item>
            )
          }
        </Form.Item>
      </Space>
    ),
    [],
  );

  // 校验车型必填
  const checkoutVehicleTypes = (val: string[]) => {
    if (!val || val.length === 0) return Promise.reject('请选择车型');
    return Promise.resolve();
  };

  const renderVehTypeAndLen = () => (
    <Space className="customSpace" size={12}>
      <Form.Item
        name="vehicleTypeList"
        label="车型"
        required
        rules={[{ validator: (_rule, val) => checkoutVehicleTypes(val) }]}
      >
        <VehicleTypeSelect disabled={props.assignDisabled} />
      </Form.Item>
      <Form.Item
        name="vehicleLength"
        label="车长"
        rules={[{ required: true, message: '请选择车长' }]}
      >
        <Select
          disabled={props.assignDisabled}
          options={
            obtainDic({
              dicKey: 'resource.vehicle.vehicle_length',
            }) as any[]
          }
        />
      </Form.Item>
    </Space>
  );

  // 抢单表单
  const renderGrabOrderForm = () => {
    return (
      <>
        {renderBidderScopeForm}
        <Space className="customSpace" size={12}>
          <Form.Item label="是否需要保证金" name="needDeposit" required>
            <ItemSelect.Group disabled={props.assignDisabled}>
              <ItemSelect value={0}>无需保证金</ItemSelect>
              <ItemSelect value={1}>需要保证金</ItemSelect>
            </ItemSelect.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              prev.needDeposit !== current.needDeposit
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('needDeposit') === 1 && (
                <Form.Item
                  label={renderTooltipLabel(
                    '保证金',
                    '为了保障您的订单正常履行，您可要求运力在抢单时是否需要缴纳保证金，如需缴纳，平台会要求司机缴纳保证金，缴纳后，运力如飞单，平台会扣除运力保证金，以降低运力的飞单情况。',
                  )}
                  name="depositCode"
                  required
                  rules={[{ required: true, message: '请选择保证金 ' }]}
                >
                  <DepositSelect style={{ width: '100%' }} />
                </Form.Item>
              )
            }
          </Form.Item>
        </Space>
        <Space className="customSpace" size={12}>
          {renderTradeTimeForm(
            '运力在交易生失效时间内才能看见订单并且可以进行抢单。',
          )}
          {renderVehTypeAndLen()}
        </Space>
        {transContractList.length > 0 && (
          <DutyFormItem name="platformUndertakeDuty" />
        )}
      </>
    );
  };

  // 竞价form
  const renderQuoteForm = () => {
    return (
      <>
        {renderBidderScopeForm}
        <Space className="customSpace" size={12}>
          {renderTradeTimeForm(
            '运力在交易生失效时间内才能看见竞价订单并且可以进行报价。',
          )}
          <Form.Item
            label={renderTooltipLabel(
              '定标截止时间',
              '货主可在交易生效时间后，在定标截止时间前，进行人工定标，超过定标截止时间后则无法进行人工定标。',
            )}
            required
            name="quoteEndTime"
            rules={[{ validator: (rule, value) => checkQuoteEndTime(value) }]}
          >
            <DatePicker
              placeholder="请选择"
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>
        <Space className="customSpace" size={12}>
          {renderVehTypeAndLen()}
          <Form.Item
            label={renderTooltipLabel(
              '报价范围',
              '配置报价范围后，运力报价只能在报价范围内，注意最高价不要定太低哟~',
            )}
            style={{ marginBottom: 0 }}
          >
            <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
              <Form.Item
                style={{ flex: 1 }}
                name="quoteMin"
                rules={[{ validator: (rule, value) => checkMinPrice(value) }]}
              >
                <PriceInput
                  placeholder="最低价"
                  onChange={handleMinPriceChange}
                />
              </Form.Item>
              <SwapRightOutlined style={{ margin: '8px 8px 0' }} />
              <Form.Item
                style={{ flex: 1 }}
                name="quoteMax"
                rules={[{ validator: (rule, value) => checkMaxPrice(value) }]}
              >
                <PriceInput
                  placeholder="最高价"
                  onChange={handleMaxPriceChange}
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Space>
        <Form.Item
          name="quoteCount"
          label={renderTooltipLabel(
            '报价次数限制',
            '限制每位运力对同一个竞价订单的最大报价次数，最多只能设置为10次。',
          )}
          required
          rules={[
            { required: true, message: '请输入报价次数' },
            { type: 'number', max: 10, message: '报价次数最多只能设置为10次' },
            { type: 'number', min: 1, message: '报价次数最少要设置为1次' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入"
            precision={0}
          />
        </Form.Item>
        {transContractList.length > 0 && (
          <DutyFormItem name="platformUndertakeDuty" />
        )}
      </>
    );
  };

  const renderTradeTypeTooltip = useMemo(
    () => (
      <div className={styles.TooltipWrap}>
        {isGrab && (
          <div className={styles.TooltipItem}>
            <h5>抢单</h5>
            <div>
              抢单指订单发布后，运力可在APP内直接进行抢单，先到先得，抢单价格以您填写的价格为准。
            </div>
          </div>
        )}
        {isQuote && (
          <div className={styles.TooltipItem}>
            <h5>竞价</h5>
            <div>
              竞价指订单发布后，运力可在APP内直接进行报价，货主可根据运力报价选择指定司机接单，运单金额以您选择的报价价格为准。
            </div>
          </div>
        )}
        {isAssignPlatform && (
          <div className={styles.TooltipItem}>
            <h5>平台承运</h5>
            <div>本条需求由平行线替您找车承运。</div>
          </div>
        )}
      </div>
    ),
    [],
  );

  // 获取企业未认证提示
  const getAutenticationTooltip = (tradeType = 10) => {
    return {
      title: !isAutentication && (
        <div>
          企业未认证，无法选择“{tradeType === 10 ? '抢单' : '竞价'}”模式。
          <span
            className="link"
            onClick={() => history.push('/company/enterpriseInfo')}
          >
            去认证
          </span>
        </div>
      ),
      getPopupContainer,
    };
  };

  const preferredCount = (priceList?.drivers || []).filter(
    (item: ObjectType) => item.driverType === 1,
  ).length;

  return (
    <div className="form-assgin-module">
      <ModuleTitle title="承运信息" icon="iconzhipai" />
      <div className="moduleCon">
        <Form.Item
          label={
            isGrab || isQuote || isAssignPlatform
              ? renderTooltipLabel('交易类型', renderTradeTypeTooltip, {
                  color: 'rgba(40,45,60,0.95)',
                })
              : '交易类型'
          }
          name="tradeType"
          required
        >
          <ItemSelect.Group disabled={props.assignDisabled}>
            <ItemSelect value={0}>派单</ItemSelect>
            {isGrab && (
              <ItemSelect
                value={10}
                disabled={!isAutentication}
                tooltip={getAutenticationTooltip(10)}
              >
                抢单
              </ItemSelect>
            )}
            {isQuote && (
              <ItemSelect
                value={20}
                disabled={!isAutentication}
                tooltip={getAutenticationTooltip(20)}
              >
                竞价
              </ItemSelect>
            )}
            {isAssignPlatform && <ItemSelect value={40}>平台承运</ItemSelect>}
          </ItemSelect.Group>
        </Form.Item>
        {!(!isGrab && !isAssignPlatform && !isQuote) && preferredCount > 0 && (
          <div style={{ color: '#FF8B1C', marginTop: -16, marginBottom: 8 }}>
            已匹配到{preferredCount}个优选司机，推荐选择派单
          </div>
        )}
        <DriverContext.Provider
          value={{
            priceList,
            normalList,
            showSwitch,
            reqFetched,
            switchVal,
            onSwitchChange,
            normalReqFetched,
          }}
        >
          <Form.Item
            noStyle
            shouldUpdate={(prev, current) =>
              prev.tradeType !== current.tradeType
            }
          >
            {({ getFieldValue }) => {
              const transactionType = getFieldValue('tradeType');
              if (transactionType === 0) return renderDistributeOrderForm();
              if (transactionType === 10) return renderGrabOrderForm();
              if (transactionType === 20) return renderQuoteForm();
              return renderVehicleInfo();
            }}
          </Form.Item>
        </DriverContext.Provider>
      </div>
    </div>
  );
});

export default AssignModule;
