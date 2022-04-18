import { Input, InputNumber, Space, Table, Tooltip } from 'antd';
import { Icon, PxxSelect } from '@/baseComponents';
import React, { useState, useRef, useEffect, useContext } from 'react';
import styles from './index.less';
import AddBtn from '../../components/AddBtn';
import { FormContext, checkGoodsFuncs, initalSingleGoods } from '../../utils';
import classnames from 'classnames';
import { InfoCircleFilled } from '@ant-design/icons';
import { formatNumber, getCounts } from '@/pages/order/util';
import { useMemoDeep } from '@/hooks';
import { ObjectType } from '../../types';
import PriceDropdown from '@/pages/order/components/PriceDropdown';
import { global } from '@parallel-line/utils';

type InpValue = string | number | undefined | null;
interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: string;
  record: ObjectType;
  onSave: (record: ObjectType, editKey: string, val: InpValue) => void;
  editOption: ObjectType;
  rowIndex: number;
  disabled: boolean;
  reqIndex?: number;
  validateKey?: string;
}

interface CellInputProps {
  value?: string | number;
  rule?: (val: any) => Promise<any>;
  type: string;
  onSave: (val: InpValue) => void;
  dicKey?: string; // 下拉字典
  selectStyle?: React.CSSProperties;
  selectProps?: ObjectType;
  style?: React.CSSProperties;
  disabled?: boolean;
  precision?: number;
  immutableValue?: boolean;
  reqIndex?: number;
  validateKey?: string;
}

const CellInput: React.FC<CellInputProps> = (props) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<Input & HTMLInputElement>(null);
  const [error, setError] = useState({
    isError: false,
    message: '',
  });

  const [inpValue, setInpValue] = useState<any>(props.value);
  const roundLen = _.isNil(props.precision) ? 2 : 0;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    setInpValue(props.value);
  }, [props.value]);

  // 校验输入
  const check = async (val: InpValue) => {
    const rule = props?.rule;
    if (rule) {
      try {
        await rule(val);
        setError({
          isError: false,
          message: '',
        });
      } catch (err) {
        setError({
          isError: true,
          message: err,
        });
      }
    }
  };

  useEffect(() => {
    // 阶梯价格，取消单价必填
    if (props.immutableValue && error.isError) {
      check(inpValue);
    }
  }, [props.immutableValue]);

  // 接收校验通知进行校验
  global.eventEmitter.useSubscription(
    ({ uniqueKey, type = 'normal', reqIndex }) => {
      if (uniqueKey === props.validateKey) {
        if (type === 'force') check(inpValue);
        if (type === 'normal' && error.isError) check(inpValue);
        if (reqIndex !== undefined && reqIndex === props.reqIndex)
          check(inpValue);
      }
    },
  );

  const toggleEdit = () => {
    // 存在价格阶段是 不可输入单价
    if (props.immutableValue) return;
    if (!props.disabled) setEditing(!editing);
  };

  const save = async (val: InpValue) => {
    toggleEdit();
    props.onSave(val);
  };

  // input更改值
  const handleInpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    check(val);
    setInpValue(val);
  };

  // 数值inpu框更改
  const handleInpNumberChange = (val: InpValue) => {
    let _value = typeof val === 'number' ? _.round(val, roundLen) : val;
    _value = _value || undefined;
    check(_value);
    setInpValue(_value);
  };

  // 下拉框值更改
  const handleSelectChange = (val: InpValue) => {
    check(val);
    setInpValue(val);
    save(val);
  };

  const renderChild = () => {
    if (props.type === 'select') {
      return (
        <PxxSelect
          className={styles.editSelect}
          showSearch={false}
          filterOption={false}
          value={inpValue}
          dicKey={props.dicKey}
          onChange={handleSelectChange}
          getPopupContainer={(ele) => ele.parentNode.parentNode}
          dropdownStyle={{ minWidth: 45 }}
          disabled={props.disabled}
          {...(props.selectProps || {})}
        />
      );
    }
    if (editing) {
      if (props.type === 'input') {
        return (
          <Input
            className={styles.editInput}
            value={inpValue}
            ref={inputRef}
            onBlur={(e) => save(e.target.value)}
            onChange={handleInpChange}
            placeholder="请输入"
            disabled={props.disabled}
          />
        );
      }
      if (props.type === 'inputNumber') {
        return (
          <InputNumber
            className={styles.editInputNum}
            value={inpValue}
            style={{ width: '100%' }}
            ref={inputRef}
            onBlur={(e) =>
              save(_.round(+e.target.value, roundLen) || undefined)
            }
            onChange={handleInpNumberChange}
            placeholder="请输入"
            precision={props.precision}
            disabled={props.disabled}
          />
        );
      }
    }
    return (
      <div
        className={styles.cellInputText}
        onClick={toggleEdit}
        title={inpValue}
      >
        {props.immutableValue ? (
          '--'
        ) : (
          <>
            {(props.type === 'inputNumber'
              ? formatNumber(inpValue, true)
              : inpValue) || (
              <div style={{ color: 'rgba(0, 0, 0, .15)' }}>请输入</div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={classnames(
        styles.cellInput,
        props.disabled && styles.cellInputDisabled,
      )}
      style={props.style}
    >
      {renderChild()}
      {error.isError && (
        <Tooltip title={error.message}>
          <InfoCircleFilled className={styles.errorIcon} />
        </Tooltip>
      )}
    </div>
  );
};

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  onSave,
  editOption,
  rowIndex,
  disabled,
  validateKey,
  reqIndex,
  ...restProps
}) => {
  const save = async (val: InpValue, editKey: string = dataIndex) => {
    onSave({ ...record, rowIndex, [editKey]: val }, editKey, val);
  };

  const renderCellInput = (inputProps: CellInputProps) => (
    <CellInput
      {...inputProps}
      disabled={disabled}
      reqIndex={reqIndex}
      validateKey={validateKey}
    />
  );

  const renderChild = () => {
    if (!editable) {
      return children;
    }
    if (editOption.type === 'input') {
      return renderCellInput({
        type: 'input',
        value: record?.[dataIndex],
        onSave: save,
        rule: editOption?.rules as any,
      });
    }
    if (editOption.type === 'inputNumber') {
      return renderCellInput({
        type: 'inputNumber',
        value: record?.[dataIndex],
        onSave: save,
        rule: editOption?.rules as any,
        precision: editOption.precision,
      });
    }
    if (editOption.type === 'select') {
      return renderCellInput({
        type: 'select',
        dicKey: 'common.common.goods_type',
        value: record?.[dataIndex],
        onSave: save,
        rule: editOption?.rules as any,
      });
    }
    if (editOption.type === 'unitInputNumber') {
      // 单价
      return (
        <div className={styles.unitInputNumber}>
          {renderCellInput({
            type: 'inputNumber',
            value: record[editOption.valueKey],
            onSave: (val: InpValue) => save(val, editOption.valueKey),
            rule: (val) => editOption?.valueRules(val, record),
            style: { flex: 1 },
            immutableValue: record.isExecuteRule,
          })}
          <Space size={0}>
            <span style={{ color: 'rgba(0, 0, 0, .45)' }}>/</span>
            {renderCellInput({
              type: 'select',
              value: record[editOption.unitKey],
              onSave: (val: InpValue) => save(val, editOption.unitKey),
              style: { padding: 0 },
              selectStyle: { width: '100%', marginLeft: 2 },
              selectProps: {
                style: { width: '100%', marginLeft: 2 },
                allowClear: false,
              },
              dicKey: editOption.unitDicKey,
            })}
          </Space>
        </div>
      );
    }
    return children;
  };

  return <td {...restProps}>{renderChild()}</td>;
};

interface EditTableProps {
  onChange?: (val: ObjectType[]) => void;
  value?: any;
  hidePrice?: boolean; // 是否隐藏价格价格信息
  requiredKeys?: string[]; // 必填表格字段
  disabled?: boolean;
  index?: number; // 所处货物需求下表
  hideFooter?: boolean; //隐藏底部统计
  cargoPriceType?: string;
}

const EditTable: React.FC<EditTableProps> = ({
  value = [],
  onChange,
  hidePrice,
  requiredKeys = [],
  disabled,
  index,
  hideFooter,
  cargoPriceType,
}) => {
  const { emitterKeys, isFTL } = useContext(FormContext);

  const emitCalc = (editKey?: string) => {
    global.eventEmitter.emit({
      uniqueKey: emitterKeys.updateReqGoods,
      cargoReqIndex: index,
      // goodsIndex: rowIndex
      editKey,
    });
  };

  const isRequiredKey = (key: string) => requiredKeys.includes(key);

  // 移除货物
  const handleDelete = (i: number) => {
    const arr = [...value];
    arr.splice(i, 1);
    onChange?.(arr);
  };

  // 新增货物
  const handleAdd = () => {
    const arr = [...value];
    arr.push(initalSingleGoods());
    onChange?.(arr);
    emitCalc();
  };

  const getTitle = (title: string, required: boolean) => (
    <span className={classnames({ [styles.editCellRequired]: required })}>
      {title}
    </span>
  );

  const tableColumns: any = useMemoDeep(
    () => [
      {
        title: '序号',
        dataIndex: 'sortNo',
        width: '8%',
        render: (_text: string, _record: ObjectType, i: number) => i + 1,
      },
      {
        title: '货物编码',
        dataIndex: 'goodsCode',
        hide: !_.get(global, 'PXX_SOLUTION.isExt', false) || isFTL,
        editable: true,
        width: '15%',
        editOption: {
          type: 'input',
        },
      },
      {
        title: getTitle('货物名称', isRequiredKey('descriptionOfGoods')),
        dataIndex: 'descriptionOfGoods',
        editable: true,
        width: '15%',
        editOption: {
          type: 'input',
          rules: (val: string) =>
            checkGoodsFuncs.descriptionOfGoods(
              val,
              isRequiredKey('descriptionOfGoods'),
            ),
        },
      },
      {
        title: getTitle(
          '货物类型',
          isRequiredKey('cargoTypeClassificationCode'),
        ),
        dataIndex: 'cargoTypeClassificationCode',
        width: '15%',
        editable: true,
        editOption: {
          type: 'select',
          dicKey: 'common.common.goods_type',
          rules: (val: string) =>
            checkGoodsFuncs.cargoTypeClassificationCode(
              val,
              isRequiredKey('cargoTypeClassificationCode'),
            ),
        },
        render: (text: string) =>
          GetDic('common.common.goods_type', text).value,
      },
      {
        title: getTitle('重量(kg)', isRequiredKey('goodsItemGrossWeight')),
        dataIndex: 'goodsItemGrossWeight',
        width: '10%',
        editable: true,
        editOption: {
          type: 'inputNumber',
          rules: (val: string) =>
            checkGoodsFuncs.goodsItemGrossWeight(
              val,
              isRequiredKey('goodsItemGrossWeight'),
            ),
        },
      },
      {
        title: getTitle('体积(m³)', isRequiredKey('goodsItemCube')),
        dataIndex: 'goodsItemCube',
        width: '12%',
        editable: true,
        editOption: {
          type: 'inputNumber',
          rules: (val: string) =>
            checkGoodsFuncs.goodsItemCube(val, isRequiredKey('goodsItemCube')),
        },
      },
      {
        title: getTitle('数量(件)', isRequiredKey('totalNumberOfPackages')),
        dataIndex: 'totalNumberOfPackages',
        width: '10%',
        editable: true,
        editOption: {
          type: 'inputNumber',
          precision: 0,
          rules: (val: string) =>
            checkGoodsFuncs.totalNumberOfPackages(
              val,
              isRequiredKey('totalNumberOfPackages'),
            ),
        },
      },
      {
        title: getTitle('单价(元)', isRequiredKey('unitPrice')),
        dataIndex: 'unitPrice',
        width: '17%',
        editable: true,
        editOption: {
          type: 'unitInputNumber',
          unitDicKey: 'matching.request.calc_price_units',
          valueKey: 'unitPrice',
          unitKey: 'priceMode',
          valueRules: (val: string, record: ObjectType) =>
            checkGoodsFuncs.unitPrice(
              val,
              !record.isExecuteRule && isRequiredKey('unitPrice'),
            ),
        },
        hide:
          disabled || hidePrice || (cargoPriceType && cargoPriceType !== '0'),
      },
      {
        title: '费用(元)',
        dataIndex: 'accountReceivable',
        width: '13%',
        render: (text: number, record: ObjectType) => (
          <div className={styles.priceOperate}>
            <span
              className={styles.priceShow}
              title={(text && formatNumber(text)) as string}
            >
              {text && formatNumber(text)}
            </span>
            <span>
              {record.isExecuteRule && (
                <PriceDropdown rule={record.rule || {}} />
              )}
            </span>
          </div>
        ),
        hide:
          disabled || hidePrice || (cargoPriceType && cargoPriceType === '1'),
      },
    ],
    [requiredKeys, disabled, value.length, hidePrice, cargoPriceType],
  );

  // 保存
  const handleSave = ({ rowIndex, ...params }: ObjectType, editKey: string) => {
    const arr = [...value];
    const res = arr.map((item, i) => {
      if (i === rowIndex) {
        const assignObj = {
          ...item,
          ...params,
        };
        return { ...assignObj };
      }
      return item;
    });
    onChange?.(res);
    // 通知外部计算应收费用
    // if (editKey === UNIT_MAPPING[params.priceMode]?.key || editKey === 'unitPrice' || editKey === 'priceMode') {
    emitCalc(editKey);
    // }
  };

  const formatColumns: ObjectType[] = tableColumns.reduce(
    (prev: any, item: ObjectType) => {
      if (item.hide) return prev;
      if (!item.editable) {
        prev.push(item);
        return prev;
      }
      prev.push({
        ...item,
        onCell: (record: Record<string, unknown>, i: number) => ({
          record,
          rowIndex: i,
          editable: item.editable,
          dataIndex: item.dataIndex,
          title: item.title,
          onSave: handleSave,
          editOption: item.editOption,
          disabled,
          validateKey: emitterKeys.validateBreakBulk,
          reqIndex: index,
        }),
      });
      return prev;
    },
    [],
  );

  const canShowFooter = () => {
    return (value || []).some(
      (item: ObjectType) =>
        item.goodsItemGrossWeight ||
        item.goodsItemCube ||
        item.totalNumberOfPackages,
    );
  };

  const renderFooterVal = (dataIndex: string) => {
    if (dataIndex === 'goodsItemGrossWeight')
      return getCounts(value, 'goodsItemGrossWeight') + 'kg';
    if (dataIndex === 'goodsItemCube')
      return getCounts(value, 'goodsItemCube') + 'm³';
    if (dataIndex === 'totalNumberOfPackages')
      return getCounts(value, 'totalNumberOfPackages') + '件';
    if (dataIndex === 'accountReceivable')
      return getCounts(value, 'accountReceivable') + '元';
    return undefined;
  };

  const renderFooter = () => {
    if (!canShowFooter() || hideFooter) return null;
    return (
      <div className={styles.footer}>
        {formatColumns.map((item: ObjectType) => (
          <div
            key={item.dataIndex}
            style={{ width: item.width }}
            title={renderFooterVal(item.dataIndex)}
          >
            {renderFooterVal(item.dataIndex)}
          </div>
        ))}
      </div>
    );
  };

  const len = (value || []).length;

  return (
    <div className={styles.EditTable}>
      <Table
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        tableLayout="fixed"
        columns={formatColumns}
        dataSource={value || []}
        pagination={false}
        bordered
        rowKey="tempId"
      />
      {len > 1 && (
        <div className={styles.deleteTable}>
          {_.range(len).map((i) => (
            <div className={styles.deleteWrap} key={i}>
              <Icon
                type="iconshanchu1"
                className={styles.deleteIcon}
                onClick={() => handleDelete(i)}
              />
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <div className={styles.operateWrap}>
          <AddBtn title="新增货物" onClick={handleAdd} />
        </div>
      )}
      {renderFooter()}
    </div>
  );
};

export default EditTable;
