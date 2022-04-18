import React, { useContext } from 'react';
import { Form, Checkbox, Space, Tooltip, TooltipProps } from 'antd';
import { FormContext } from '../../../utils';
import RemoteSearch from '@/baseComponents/RemoteSearch';
import viewContractDetail from '@/pages-e/company/enterpriseConfig/components/viewContractDetail';

interface Props {
  disabled?: boolean;
  checkTooltip?: TooltipProps;
  name?: string;
}

const DutyFormItem: React.FC<Props> = ({
  disabled,
  checkTooltip,
  name = 'platformUndertakeDutyDriver',
}) => {
  const { transContractList } = useContext(FormContext);

  const renderCheckFormItem = () => (
    <Form.Item name={name} valuePropName="checked" style={{ minWidth: 120 }}>
      <Checkbox disabled={disabled}>选择承责合同</Checkbox>
    </Form.Item>
  );

  const renderTip = (getFieldValue: Function) => {
    const assignType = getFieldValue('assignType');
    const contractInfo = getFieldValue('contractInfo');
    if (!!getFieldValue(name) && !!contractInfo) {
      if (
        assignType === 7 &&
        contractInfo.driverLeaderInfo?.driverLeader !== 1
      ) {
        return (
          <span
            style={{
              position: 'absolute',
              right: -165,
              top: 4,
              color: '#ff4d4f',
            }}
          >
            该合同不支持指派车队长
          </span>
        );
      }
      return (
        <span
          style={{ position: 'absolute', right: -68, top: 4 }}
          className="link"
          onClick={() =>
            viewContractDetail({
              id: getFieldValue('contractInfo').id,
              detailType: 'transport',
              position: 'order',
            })
          }
        >
          查看详情
        </span>
      );
    }
    return null;
  };

  return (
    <Space size={12} className="customSpace">
      <div style={{ display: 'flex', position: 'relative' }}>
        {checkTooltip ? (
          <Tooltip {...checkTooltip}>{renderCheckFormItem()}</Tooltip>
        ) : (
          renderCheckFormItem()
        )}
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) => prev[name] !== current[name]}
        >
          {({ getFieldValue }) =>
            !!getFieldValue(name) && (
              <Form.Item name="contractInfo" style={{ flex: 1, width: 0 }}>
                <RemoteSearch
                  uniqueKey="id"
                  showKey={(val) =>
                    `${val.contractName}(${val.serviceProviderName})(编号:${val.id})`
                  }
                  style={{ width: '100%' }}
                  options={transContractList}
                  formatChangeValue={(val, list) => _.find(list, { id: val })}
                  formatValue={(val) => val?.id}
                />
              </Form.Item>
            )
          }
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prev, current) =>
            prev.contractInfo !== current.contractInfo ||
            prev[name] !== current[name] ||
            prev.assignType !== current.assignType
          }
        >
          {({ getFieldValue }) => renderTip(getFieldValue)}
        </Form.Item>
      </div>
      <span></span>
    </Space>
  );
};

export default DutyFormItem;
