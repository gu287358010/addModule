import { PlusCircleFilled } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { FormInstance, Select, Switch } from 'antd';
import React, { useContext, useRef, useState } from 'react';
import styles from './index.less';
import CarrierForm from '@/pages-e/transportation/carrier/components/CarrierForms';
import { executeRule, searchCompanyRefCarriers } from '@/services/order';
import { render } from '@parallel-line/utils';
import { Drawer } from '@parallel-line/components';
import { ObjectType } from '../../../types';
import { get } from '@parallel-line/utils';
import { FormContext, matchPrice, matchPriceByRange } from '../../../utils';
import { useEffectDeep } from '@/hooks';
import EnterpriseConfigDetail from '@/pages-e/company/enterpriseConfig/valuationComponent/detail';

const { Option } = Select;

interface CompanySelectProps {
  options?: ObjectType[];
  onFetchFinish?: (list: ObjectType[], flag?: boolean) => void;
  onChange?: (id: ObjectType | undefined) => void;
  value?: string;
  isHideInvite?: boolean;
  form?: FormInstance | null;
  onIsMatchPriceChange?: (val?: boolean) => void;
  isCompanyMatchPrice?: boolean;
  onSetIsPayMatchPrice?: (val?: boolean) => void;
  disabled?: boolean;
  companyList?: ObjectType[];
  companyPriceList?: ObjectType[];
}

const getCalcUnitKey = (key: number) => {
  if (key === 51 || key === 52) return 'goodsItemGrossWeight';
  if (key === 61) return 'goodsItemCube';
  if (key === 71) return 'totalNumberOfPackages';
  return undefined;
};

const CompanySelect: React.FC<CompanySelectProps> = ({
  options,
  onFetchFinish,
  onChange,
  value,
  isHideInvite,
  form,
  isCompanyMatchPrice,
  onSetIsPayMatchPrice,
  disabled,
  companyList: tempCompanyList,
  companyPriceList,
}) => {
  const { emitterKeys } = useContext(FormContext);

  // 计算货物单位总量
  const calcGoodsTotal = (key: string) => {
    const reqs = form?.getFieldValue('cargoRequestList') || [];
    return reqs.reduce((prev: number, item: ObjectType) => {
      const goodsList = get(item, 'cargoGoodsList', []);
      goodsList.forEach((goods: ObjectType) => {
        if (_.isNumber(goods[key])) prev += goods[key];
      });
      return prev;
    }, 0);
  };

  // const updateCompanyPriceList = (res: ObjectType[]) => {
  //   setPriceList(res);
  //   onFetchFinish?.(res, true);
  // }

  // 往列表里面添加价格并排序
  const formatPriceList = (list: ObjectType[], needSetProps = false) => {
    const result = list.map((item) => {
      // 元/趟单位，不需要计算货物总量
      if (item.valuationUnit === 11) {
        return {
          ...item,
          price: Number(item.onceAmount),
          isMatchPrice: Number(item.onceAmount) > 0,
        };
      }
      const key = getCalcUnitKey(item.valuationUnit);
      let count = calcGoodsTotal(key as string);
      if (item.valuationUnit === 52) count /= 1000;
      const rules = item.ladders;
      const price =
        item.ladderType === 2
          ? matchPriceByRange(rules, count)
          : matchPrice(rules, count);
      return { ...item, price, isMatchPrice: Number(price) > 0 };
    });
    return _.orderBy(result, 'price', 'asc');
  };

  // 价格列表
  const [priceList, setPriceList] = useState<ObjectType[]>(
    formatPriceList(companyPriceList || []),
  );

  useEffectDeep(() => {
    if (!_.isEqual(priceList, companyPriceList))
      onFetchFinish?.(priceList, true);
  }, [priceList]);

  const ref = useRef<any>(null);
  const [switchVal, setSwitchVal] = useState<undefined | boolean>(
    isCompanyMatchPrice,
  );

  const [visible, setVisible] = useState(false);
  const visRef = useRef(false);

  const [showSwitch, setShowSwitch] = useState(false);

  // 普通承运商列表
  const [companyList, setCompanyList] = useState<ObjectType[]>(
    tempCompanyList || [],
  );

  const updateSwitchVal = (val?: boolean) => {
    setSwitchVal(val);
    onSetIsPayMatchPrice?.(val);
  };

  const companyListReq = useRequest(searchCompanyRefCarriers, {
    // manual: true,
    ready: !tempCompanyList,
    formatResult: (res) => res.data || [],
    onSuccess: (result) => {
      // 用车需求导入，后端暂时无法返回companyId，需要根据companyName和companyPhone匹配正确的companyId
      if (!isCompanyMatchPrice) {
        const companyInfo = form?.getFieldValue('companyInfo');
        if (!companyInfo?.carrierId) {
          const companyData = result.find(
            (item: ObjectType) =>
              item.contactPhone === companyInfo?.companyPhone &&
              item.companyName === companyInfo?.companyName,
          );
          if (companyData) form?.setFieldsValue({ companyInfo: companyData });
        }
      }
      setCompanyList?.(result);
      onFetchFinish?.(result);
    },
  });

  // 重置价格和承运商
  const resetCompanyInfo = () => {
    form?.setFieldsValue({
      companyInfo: undefined,
      priceMode: form.getFieldValue('tempPriceMode'),
    });
    eventEmitter.emit({ uniqueKey: emitterKeys.resetPriceByCarryInfoChange });
  };

  // 价格列表请求
  const priceReq = useRequest((params) => executeRule(params), {
    manual: true,
    formatResult: (res) => {
      const result = formatPriceList(res.data || []);
      return result;
    },
    onSuccess: (res, params) => {
      setPriceList(res);
      setShowSwitch(res.length > 0);
      let companyInfo = form?.getFieldValue('companyInfo');
      // 非初始化时，价格列表发生变化，重置承运信息
      if (!get(params, '[0].isInital')) {
        // 价格发生变化，且当前为价格匹配，重置承运商信息
        if (!_.isEqual(res, priceList) && switchVal === true)
          resetCompanyInfo();
        // 未选择承运商时，存在规则，自动切换至匹配价格列表
        if (switchVal === undefined && !companyInfo && res.length > 0)
          updateSwitchVal(true);
        // 当前为价格匹配但返回计价规则为空，切回普通匹配，且重置承运商公司
        else if (switchVal === true && res.length === 0) {
          updateSwitchVal(false);
          if (companyInfo) resetCompanyInfo();
        }
        // 当前是手动改为非价格匹配且为选中承运商，计价规则为空，初始化switchVal
        else if (switchVal === false && !companyInfo && res.length === 0)
          updateSwitchVal(undefined);
      } else if (switchVal) {
        // 编辑或者再来一单
        if (companyInfo) {
          let companyData;
          if (companyInfo.carrierId) {
            companyData = res.find(
              (item: ObjectType) =>
                item.carrierId === companyInfo.carrierId &&
                item.ruleId === companyInfo.ruleId,
            );
          } else {
            // 导入数据可能不包含carrierId，使用compamyName和companyPhone匹配
            companyData = res.find(
              (item: ObjectType) =>
                item.companyPhone === companyInfo.companyPhone &&
                item.companyName === companyInfo.companyName &&
                item.ruleId === companyInfo.ruleId,
            );
          }
          form?.setFieldsValue({ companyInfo: companyData });
          if (!companyData) resetCompanyInfo();
        }
        updateSwitchVal(res.length > 0);
      }
    },
  });

  // 接收校验通知进行校验
  eventEmitter.useSubscription(({ uniqueKey, priceReqParams }: ObjectType) => {
    if (uniqueKey === 'E_EDIT_CARRIERS') {
      // 新增承运商，刷新列表
      companyListReq.run();
      eventEmitter.emit({ uniqueKey: emitterKeys.fetchPriceRulesList });
    }
    // 拉取公司价格匹配列表
    if (uniqueKey === emitterKeys.fetchPriceRulesList) {
      const {
        startAddrCom,
        endAddrCom,
        businessType = 2,
        isInital = false,
        assignType,
      } = priceReqParams || {};
      if (!_.isEmpty(startAddrCom) && !_.isEmpty(endAddrCom)) {
        const params = {
          addressStart: get(startAddrCom, 'pointAddress'),
          addressEnd: get(endAddrCom, 'pointAddress'),
          directionStart: get(startAddrCom, 'pointCode'),
          directionEnd: get(endAddrCom, 'pointCode'),
          businessType, // 2: 零担  1: 整车
          valuationType: 1, // 应付
          assignType,
          isInital,
        };
        priceReq.run(params);
      } else {
        setPriceList([]);
        if (priceList.length !== 0 && switchVal) resetCompanyInfo();
        setShowSwitch(false);
        updateSwitchVal(switchVal === undefined ? undefined : false);
      }
    }

    // 修改公司列表价格
    if (uniqueKey === emitterKeys.updatePriceList) {
      if (!switchVal) return;
      const newList = formatPriceList(priceList);

      if (!_.isEqual(newList, priceList)) {
        setPriceList(newList);
        resetCompanyInfo();
      }
    }
  });

  // 更改switch
  const handleSwitchChange = (val: boolean) => {
    updateSwitchVal(val);
    // 切换为匹配，重新计算价格列表
    if (val) {
      const newList = formatPriceList(priceList);
      if (!_.isEqual(newList, priceList)) {
        setPriceList(newList);
      }
    }
    resetCompanyInfo();
  };

  // 添加公司
  const handleCompanyAdd = () => {
    render(Drawer, {
      title: '添加承运商',
      content: <CarrierForm />,
    }).open();
    ref.current?.blur();
  };

  // 查看计价规则
  const viewPriceRule = (id: string, e: any) => {
    visRef.current = true;
    e.stopPropagation();
    render(Drawer, {
      title: '计价详情',
      width: 450,
      content: <EnterpriseConfigDetail id={id} />,
      onClose: () => {
        visRef.current = false;
      },
    }).open();
  };

  // 渲染选中值
  const renderValue = (item: ObjectType) =>
    item.companyName || item.contactPhone || item.carrierId;

  // 渲染options
  const renderOptions = () => {
    if (switchVal) {
      return (priceList || []).map((item: Record<string, any>) => (
        <Option
          key={_.uniqueId()}
          value={item.carrierId + '_' + item.ruleId}
          className={styles.dropdownItem}
          filterkey={renderValue(item)}
        >
          <div className={styles.priceWrap}>
            <div className={styles.companyVal}>{renderValue(item)}</div>
            <div className={styles.priceVal}>
              {item.valuationUnitDesc}&nbsp;
              {item.price > 0 && <span>预计{item.price}元</span>}
              <span
                style={{ marginLeft: 8 }}
                className="link"
                onClick={(e) => viewPriceRule(item.ruleId, e)}
              >
                查看计价规则
              </span>
            </div>
          </div>
        </Option>
      ));
    }

    return companyList.map((item: any) => (
      <Option
        key={item.carrierId}
        value={item.carrierId}
        className={styles.dropdownItem}
        filterkey={renderValue(item)}
      >
        {renderValue(item)}
      </Option>
    ));
  };

  // 邀请
  const handleInvite = () => {
    onChange?.({ carrierId: '-99' });
    ref.current?.blur();
  };

  const handleDropdownVisibleChange = (vis: boolean) => {
    if (!visRef.current) setVisible(vis);
  };

  // 选择承运商
  const handleChange = (val: string) => {
    const list = switchVal ? priceList : companyList;
    const companyInfo = list.find((item: ObjectType) => {
      const key = switchVal
        ? item.carrierId + '_' + item.ruleId
        : item.carrierId;
      return val === key;
    });
    onChange?.(companyInfo);
  };

  const filterOption = (input: string, option: any) =>
    (option?.filterkey || '').toLowerCase().includes(input.toLowerCase());

  return (
    <Select
      onDropdownVisibleChange={handleDropdownVisibleChange}
      disabled={disabled}
      ref={ref}
      open={visible}
      style={{ width: '100%' }}
      dropdownClassName="lower-select-dropdown-zindex"
      placeholder="选择承运商"
      loading={companyListReq.loading || priceReq.loading}
      getPopupContainer={(node) => node.parentNode.parentNode}
      allowClear
      showSearch
      onChange={handleChange}
      value={value === '-99' ? '邀请承运商接单' : value}
      filterOption={filterOption}
      dropdownRender={(menu) => (
        <div className={styles.dropdownWrap}>
          {showSwitch && (
            <div className={styles.dropdownHeader}>
              <span>是否自动匹配计价规则</span>
              <Switch checked={switchVal} onChange={handleSwitchChange} />
            </div>
          )}
          <div>{menu}</div>
          {!isHideInvite && (
            <div className={styles.dropdownItem} onClick={handleInvite}>
              <div>
                <div className={styles.desc} style={{ marginBottom: 6 }}>
                  邀请承运商
                </div>
                <div>
                  邀请承运商接单
                  <span className={styles.desc}>
                    （保存后可发送链接/二维码去邀请）
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className={styles.dropdownFooter} onClick={handleCompanyAdd}>
            <PlusCircleFilled style={{ marginRight: 10 }} />
            添加承运商
          </div>
        </div>
      )}
    >
      {renderOptions()}
    </Select>
  );
};

export default CompanySelect;
