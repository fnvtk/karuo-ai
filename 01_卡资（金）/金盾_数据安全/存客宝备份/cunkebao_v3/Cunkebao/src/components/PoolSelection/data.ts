// 流量池包接口类型
export interface PoolPackageItem {
  id: number;
  name: string;
  description: string;
  createTime: string;
  num: number;
}

// 原流量池接口类型（保留以兼容现有代码）
export interface PoolItem {
  id: number;
  identifier: string;
  mobile: string;
  wechatId: string;
  fromd: string;
  status: number;
  createTime: string;
  companyId: number;
  sourceId: string;
  type: number;
  nickname: string;
  avatar: string;
  gender: number;
  phone: string;
  alias: string;
  packages: any[];
  tags: any[];
}

export interface PoolSelectionItem {
  id: string;
  avatar?: string;
  name: string;
  wechatId?: string;
  mobile?: string;
  nickname?: string;
  createTime?: string;
  description?: string;
  num?: number;
  [key: string]: any;
}

// 组件属性接口
export interface PoolSelectionProps {
  selectedOptions: PoolSelectionItem[];
  onSelect: (Pools: PoolSelectionItem[]) => void;
  onSelectDetail?: (Pools: PoolPackageItem[]) => void;
  placeholder?: string;
  className?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  selectedListMaxHeight?: number;
  showInput?: boolean;
  showSelectedList?: boolean;
  readonly?: boolean;
  onConfirm?: (
    selectedIds: string[],
    selectedItems: PoolSelectionItem[],
  ) => void;
}
