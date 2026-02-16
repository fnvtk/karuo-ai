// 群组接口类型
export interface WechatGroup {
  id: string;
  chatroomId: string;
  name: string;
  avatar: string;
  ownerWechatId: string;
  ownerNickname: string;
  ownerAvatar: string;
}

export interface GroupSelectionItem {
  id: string;
  avatar: string;
  chatroomId?: string;
  createTime?: number;
  identifier?: string;
  name: string;
  ownerAlias?: string;
  ownerAvatar?: string;
  ownerNickname?: string;
  ownerWechatId?: string;
  [key: string]: any;
}

// 组件属性接口
export interface GroupSelectionProps {
  selectedOptions: GroupSelectionItem[];
  onSelect: (groups: GroupSelectionItem[]) => void;
  onSelectDetail?: (groups: WechatGroup[]) => void;
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
    selectedItems: GroupSelectionItem[],
  ) => void; // 新增
}
