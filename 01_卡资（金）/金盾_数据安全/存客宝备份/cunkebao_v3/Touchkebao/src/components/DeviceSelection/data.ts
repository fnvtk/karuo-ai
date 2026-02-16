// 设备选择项接口
export interface DeviceSelectionItem {
  id: number;
  memo: string;
  imei: string;
  wechatId: string;
  status: "online" | "offline";
  wxid?: string;
  nickname?: string;
  usedInPlans?: number;
  avatar?: string;
  totalFriend?: number;
}

// 组件属性接口
export interface DeviceSelectionProps {
  selectedOptions: DeviceSelectionItem[];
  onSelect: (devices: DeviceSelectionItem[]) => void;
  placeholder?: string;
  className?: string;
  mode?: "input" | "dialog"; // 新增，默认input
  open?: boolean; // 仅mode=dialog时生效
  onOpenChange?: (open: boolean) => void; // 仅mode=dialog时生效
  selectedListMaxHeight?: number; // 新增，已选列表最大高度，默认500
  showInput?: boolean; // 新增
  showSelectedList?: boolean; // 新增
  readonly?: boolean; // 新增
  deviceGroups?: any[]; // 传递设备组数据
}
