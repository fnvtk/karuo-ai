export interface GroupSelectionItem {
  id: string;
  title: string;
  cover?: string;
  status: number;
  [key: string]: any;
}

// 组件属性接口
export interface GroupSelectionProps {
  selectedOptions: GroupSelectionItem[];
  onSelect: (groups: GroupSelectionItem[]) => void;
  onSelectDetail?: (groups: GroupSelectionItem[]) => void;
  placeholder?: string;
  className?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  selectedListMaxHeight?: number;
  showInput?: boolean;
  showSelectedList?: boolean;
  readonly?: boolean;
  selectionMode?: "multiple" | "single"; // 新增：选择模式，默认为多选
  onConfirm?: (
    selectedIds: string[],
    selectedItems: GroupSelectionItem[],
  ) => void;
}
