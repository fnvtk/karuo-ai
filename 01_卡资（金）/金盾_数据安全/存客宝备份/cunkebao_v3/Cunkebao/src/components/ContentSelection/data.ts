// 内容库接口类型
export interface ContentItem {
  id: number;
  name: string;
  [key: string]: any;
}

// 组件属性接口
export interface ContentSelectionProps {
  selectedOptions: ContentItem[];
  onSelect: (selectedItems: ContentItem[]) => void;
  placeholder?: string;
  className?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  selectedListMaxHeight?: number;
  showInput?: boolean;
  showSelectedList?: boolean;
  readonly?: boolean;
  onConfirm?: (selectedItems: ContentItem[]) => void;
}
