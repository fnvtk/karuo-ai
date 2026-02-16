/**
 * 分组右键菜单组件
 * 仅负责右键菜单展示与事件派发，具体弹窗由上层组件实现
 */

import React from "react";
import { Menu } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { ContactGroup } from "@/store/module/weChat/contacts.data";
import styles from "./index.module.scss";

/**
 * 分组右键菜单Props
 */
export interface GroupContextMenuProps {
  /** 当前分组（编辑/删除时使用） */
  group?: ContactGroup;
  /** 分组类型（新增时使用） */
  groupType?: 1 | 2;
  /** 菜单位置 */
  x: number;
  y: number;
  /** 是否显示 */
  visible: boolean;
  /** 关闭菜单 */
  onClose: () => void;
  /** 操作完成回调 */
  onComplete?: () => void;
  /** 新增分组点击（由上层打开新增分组弹窗） */
  onAddClick?: (groupType: 1 | 2) => void;
  /** 编辑分组点击（由上层打开编辑分组弹窗） */
  onEditClick?: (group: ContactGroup) => void;
  /** 删除分组点击（由上层打开删除确认弹窗） */
  onDeleteClick?: (group: ContactGroup) => void;
  /** 遮罩层右键事件回调（用于在新位置打开菜单） */
  onOverlayContextMenu?: (e: React.MouseEvent) => void;
}

/**
 * 分组右键菜单组件
 */
export const GroupContextMenu: React.FC<GroupContextMenuProps> = ({
  group,
  groupType = 1,
  x,
  y,
  visible,
  onClose,
  onComplete,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onOverlayContextMenu,
}) => {
  // 默认群分组 / 未分组：id 为 0，且 groupType 为 1 或 2
  const isDefaultOrUngrouped =
    !!group &&
    group.id === 0 &&
    (group.groupType === 1 || group.groupType === 2);

  // 处理新增分组
  const handleAdd = () => {
    onClose();
    onAddClick?.(groupType);
  };

  // 处理编辑分组
  const handleEdit = () => {
    if (!group || isDefaultOrUngrouped) return;
    onClose();
    onEditClick?.(group);
  };

  // 处理删除分组
  const handleDelete = () => {
    if (!group || isDefaultOrUngrouped) return;
    onClose();
    onDeleteClick?.(group);
  };

  // 菜单项
  const menuItems = [
    {
      key: "add",
      label: "新增分组",
      icon: <PlusOutlined />,
      onClick: handleAdd,
    },
    ...(group
      ? [
          {
            key: "edit",
            label: "编辑分组",
            icon: <EditOutlined />,
            onClick: handleEdit,
            disabled: isDefaultOrUngrouped,
          },
          {
            key: "delete",
            label: "删除分组",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: handleDelete,
            disabled: isDefaultOrUngrouped,
          },
        ]
      : []),
  ];

  if (!visible) return null;

  // 处理遮罩层右键事件：关闭菜单并通知父组件处理新位置的右键事件
  const handleOverlayContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 关闭当前菜单
    onClose();
    // 通知父组件处理新位置的右键事件
    if (onOverlayContextMenu) {
      // 使用 setTimeout 确保菜单先关闭，然后再处理新事件
      setTimeout(() => {
        onOverlayContextMenu(e);
      }, 0);
    }
  };

  return (
    <>
      <div
        className={styles.contextMenuOverlay}
        onClick={onClose}
        onContextMenu={handleOverlayContextMenu}
      />
      <Menu
        className={styles.contextMenu}
        style={{
          position: "fixed",
          left: x,
          top: y,
          zIndex: 1000,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.32)",
        }}
        items={menuItems}
        onClick={onClose}
      />
    </>
  );
};
