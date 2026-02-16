export interface FriendSelectionItem {
  id: number;
  wechatId: string;
  nickname: string;
  avatar: string;
  [key: string]: any;
}

// 组件属性接口
export interface FriendSelectionProps {
  selectedOptions?: FriendSelectionItem[];
  onSelect: (friends: FriendSelectionItem[]) => void;
  deviceIds?: number[];
  enableDeviceFilter?: boolean;
  placeholder?: string;
  className?: string;
  visible?: boolean; // 新增
  onVisibleChange?: (visible: boolean) => void; // 新增
  selectedListMaxHeight?: number;
  showInput?: boolean;
  showSelectedList?: boolean;
  readonly?: boolean;
  onConfirm?: (
    selectedIds: number[],
    selectedItems: FriendSelectionItem[],
  ) => void; // 新增
}
