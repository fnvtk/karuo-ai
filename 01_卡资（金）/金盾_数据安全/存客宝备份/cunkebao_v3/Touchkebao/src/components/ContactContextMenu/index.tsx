/**
 * 联系人右键菜单组件
 * 支持修改备注、移动分组操作
 */

import React, { useState, useEffect } from "react";
import { Menu, Modal, Input, Form, Select, message } from "antd";
import { EditOutlined, SwapOutlined } from "@ant-design/icons";
import { Contact } from "@/utils/db";
import { ContactGroup } from "@/store/module/weChat/contacts.data";
import styles from "./index.module.scss";

/**
 * 联系人右键菜单Props
 */
export interface ContactContextMenuProps {
  /** 当前联系人 */
  contact: Contact;
  /** 所有分组列表 */
  groups: ContactGroup[];
  /** 菜单位置 */
  x: number;
  y: number;
  /** 是否显示 */
  visible: boolean;
  /** 关闭菜单 */
  onClose: () => void;
  /** 操作完成回调 */
  onComplete?: () => void;
  /** 修改备注回调 */
  onUpdateRemark?: (contact: Contact, remark: string) => Promise<void>;
  /** 移动分组回调 */
  onMoveGroup?: (contact: Contact, targetGroupId: number) => Promise<void>;
}

/**
 * 联系人编辑表单数据
 */
interface ContactFormData {
  remark: string;
  targetGroupId: number;
}

/**
 * 联系人右键菜单组件
 */
export const ContactContextMenu: React.FC<ContactContextMenuProps> = ({
  contact,
  groups,
  x,
  y,
  visible,
  onClose,
  onComplete,
  onUpdateRemark,
  onMoveGroup,
}) => {
  const [remarkForm] = Form.useForm<{ remark: string }>();
  const [moveForm] = Form.useForm<{ targetGroupId: number }>();
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // 初始化备注表单
  useEffect(() => {
    if (remarkModalVisible) {
      remarkForm.setFieldsValue({
        remark: contact.conRemark || "",
      });
    }
  }, [remarkModalVisible, contact.conRemark, remarkForm]);

  // 初始化移动分组表单
  useEffect(() => {
    if (moveModalVisible) {
      // 找到联系人当前所在的分组
      const currentGroup = groups.find(g => {
        // 这里需要根据实际业务逻辑找到联系人所在的分组
        // 暂时使用第一个匹配的分组
        return true;
      });
      moveForm.setFieldsValue({
        targetGroupId: currentGroup?.id || 0,
      });
    }
  }, [moveModalVisible, groups, moveForm]);

  // 处理修改备注
  const handleEditRemark = () => {
    setRemarkModalVisible(true);
    onClose();
  };

  // 处理移动分组
  const handleMoveToGroup = () => {
    setMoveModalVisible(true);
    onClose();
  };

  // 提交修改备注
  const handleRemarkSubmit = async () => {
    try {
      const values = await remarkForm.validateFields();
      setLoading(true);

      if (onUpdateRemark) {
        await onUpdateRemark(contact, values.remark);
        message.success("修改备注成功");
      } else {
        message.warning("修改备注功能未实现");
      }

      setRemarkModalVisible(false);
      remarkForm.resetFields();
      onComplete?.();
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误，不显示错误消息
        return;
      }
      console.error("修改备注失败:", error);
      message.error(error?.message || "修改备注失败");
    } finally {
      setLoading(false);
    }
  };

  // 提交移动分组
  const handleMoveSubmit = async () => {
    try {
      const values = await moveForm.validateFields();
      setLoading(true);

      if (onMoveGroup) {
        await onMoveGroup(contact, values.targetGroupId);
        message.success("移动分组成功");
      } else {
        message.warning("移动分组功能未实现");
      }
      setMoveModalVisible(false);
      moveForm.resetFields();
      onComplete?.();
    } catch (error: any) {
      if (error?.errorFields) {
        // 表单验证错误，不显示错误消息
        return;
      }
      console.error("移动分组失败:", error);
      message.error(error?.message || "移动分组失败");
    } finally {
      setLoading(false);
    }
  };

  // 菜单项
  const menuItems = [
    {
      key: "remark",
      label: "修改备注",
      icon: <EditOutlined />,
      onClick: handleEditRemark,
    },
    {
      key: "move",
      label: "移动分组",
      icon: <SwapOutlined />,
      onClick: handleMoveToGroup,
    },
  ];

  // 过滤分组选项（只显示相同类型的分组）
  const filteredGroups = groups.filter(
    g => g.groupType === (contact.type === "group" ? 2 : 1),
  );

  return (
    <>
      {visible && (
        <>
          <div
            className={styles.contextMenuOverlay}
            onClick={onClose}
            onContextMenu={e => e.preventDefault()}
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
      )}

      {/* 修改备注Modal */}
      <Modal
        title="修改备注"
        open={remarkModalVisible}
        onOk={handleRemarkSubmit}
        onCancel={() => {
          setRemarkModalVisible(false);
          remarkForm.resetFields();
        }}
        confirmLoading={loading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={remarkForm} layout="vertical">
          <Form.Item
            name="remark"
            label="备注名称"
            rules={[{ max: 20, message: "备注名称不能超过20个字符" }]}
          >
            <Input placeholder="请输入备注名称" maxLength={20} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 移动分组Modal */}
      <Modal
        title="移动分组"
        open={moveModalVisible}
        onOk={handleMoveSubmit}
        onCancel={() => {
          setMoveModalVisible(false);
          moveForm.resetFields();
        }}
        confirmLoading={loading}
        okText="确定"
        cancelText="取消"
      >
        <Form form={moveForm} layout="vertical">
          <Form.Item
            name="targetGroupId"
            label="目标分组"
            rules={[{ required: true, message: "请选择目标分组" }]}
          >
            <Select placeholder="请选择目标分组">
              {filteredGroups.map(group => (
                <Select.Option key={group.id} value={group.id}>
                  {group.groupName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
