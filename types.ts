import { FormInstance } from 'antd/es/form';
import { EMITTER_KEYS } from './constants';

export type OperateType = 'add' | 'edit' | 'match' | 'addCargo' | 'assign';

export type EmitterKeys = {
  [propname in keyof typeof EMITTER_KEYS]: string | symbol;
};

export type ObjectType<T = any> = Record<string, T>;

export interface Context {
  form: FormInstance | null;
  isTms?: boolean;
  cargoDisabled?: boolean; // 货主指派订单不可修改货物信息
  operateId?: string; // 操作id
  operateType?: OperateType; // 操作类型
  emitterKeys: EmitterKeys; // 防止打开多个页面调用推送对别的下单页面产生影响，必须使key唯一
  isAssign?: boolean; // 是否为指派
  canFetchVehicles?: boolean; //
  isFTL?: boolean; //
  shouldSupplementOrder?: boolean; // 是否需要后补单校验
  transContractList: ObjectType[];
  shouldCheckCurTime: boolean;
}

export type GoodsFormType = 'addCargo' | 'addBreakbulk' | 'matchCargo'; // addCargo: 添加货物需求 addBreakbulk：普通零担需求 matchCargo：配载

export type VehicleList = {
  drivers: ObjectType[];
  vehicles: ObjectType[];
};

export type FormType = 'LTL' | 'FTL';
