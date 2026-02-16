// 账号对象类型
export interface AccountItem {
  id: number;
  userName: string;
  realName: string;
  departmentName: string;
  avatar?: string;
  [key: string]: any;
}
//弹窗的
export interface SelectionPopupProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  selectedOptions: AccountItem[];
  onSelect: (options: AccountItem[]) => void;
  readonly?: boolean;
  onConfirm?: (selectedOptions: AccountItem[]) => void;
}

// 组件属性接口
export interface AccountSelectionProps {
  selectedOptions: AccountItem[];
  onSelect: (options: AccountItem[]) => void;
  accounts?: AccountItem[]; // 可选：用于在外层显示已选账号详情
  placeholder?: string;
  className?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  selectedListMaxHeight?: number;
  showInput?: boolean;
  showSelectedList?: boolean;
  readonly?: boolean;
  onConfirm?: (selectedOptions: AccountItem[]) => void;
  accountGroups?: any[]; // 传递账号组数据
}
