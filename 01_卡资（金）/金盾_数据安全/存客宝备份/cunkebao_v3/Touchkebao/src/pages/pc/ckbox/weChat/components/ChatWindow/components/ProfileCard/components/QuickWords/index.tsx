import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Space,
  Tabs,
  Tree,
  Modal,
  Form,
  message,
  Tooltip,
  Spin,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  QuickWordsItem,
  QuickWordsReply,
  setFriendInjectConfig,
  addReply,
  updateReply,
  deleteReply,
  updateGroup,
  deleteGroup,
  AddReplyRequest,
  AddGroupRequest,
  addGroup,
} from "./api";
import Layout from "@/components/Layout/LayoutFiexd";
import QuickReplyModal from "./components/QuickReplyModal";
import GroupModal from "./components/GroupModal";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { ChatRecord } from "@/pages/pc/ckbox/data";

// 消息类型枚举
export enum MessageType {
  TEXT = 1,
  IMAGE = 3,
  VIDEO = 43,
  LINK = 49,
}

// 快捷语类型枚举
export enum QuickWordsType {
  PERSONAL = 1, // 个人
  PUBLIC = 0, // 公共
  DEPARTMENT = 2, // 部门
}

export interface QuickWordsProps {
  onInsert?: (reply: QuickWordsReply) => void;
}

const QuickWords: React.FC<QuickWordsProps> = ({ onInsert }) => {
  const [activeTab, setActiveTab] = useState<QuickWordsType>(
    QuickWordsType.PERSONAL,
  );
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickWordsData, setQuickWordsData] = useState<QuickWordsItem[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // 模态框状态
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<QuickWordsReply | null>(null);
  const [editingGroup, setEditingGroup] = useState<QuickWordsItem | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();
  const updateQuoteMessageContent = useWeChatStore(
    state => state.updateQuoteMessageContent,
  );
  const currentContract = useWeChatStore(state => state.currentContract);
  const addMessage = useWeChatStore(state => state.addMessage);
  const { sendCommand } = useWebSocketStore.getState();

  const sendQuickReplyNow = (reply: QuickWordsReply) => {
    if (!currentContract) return;
    const messageId = Date.now();
    const params = {
      wechatAccountId: currentContract.wechatAccountId,
      wechatChatroomId: currentContract?.chatroomId ? currentContract.id : 0,
      wechatFriendId: currentContract?.chatroomId ? 0 : currentContract.id,
      msgSubType: 0,
      msgType: reply.msgType,
      content: reply.content,
      seq: messageId,
    } as any;

    if (reply.msgType !== MessageType.TEXT) {
      const localMessage: ChatRecord = {
        id: messageId,
        wechatAccountId: params.wechatAccountId,
        wechatFriendId: params.wechatFriendId,
        wechatChatroomId: params.wechatChatroomId,
        tenantId: 0,
        accountId: 0,
        synergyAccountId: 0,
        content: params.content,
        msgType: reply.msgType,
        msgSubType: params.msgSubType,
        msgSvrId: "",
        isSend: true,
        createTime: new Date().toISOString(),
        isDeleted: false,
        deleteTime: "",
        sendStatus: 1,
        wechatTime: Date.now(),
        origin: 0,
        msgId: 0,
        recalled: false,
        seq: messageId,
      };
      addMessage(localMessage);
    }
    sendCommand("CmdSendMessage", params);
  };

  const previewAndConfirmSend = (reply: QuickWordsReply) => {
    let previewNode: React.ReactNode = null;
    if (reply.msgType === MessageType.IMAGE) {
      previewNode = (
        <div style={{ textAlign: "center" }}>
          <img
            src={reply.content}
            alt="预览"
            style={{ maxWidth: 360, maxHeight: 320, borderRadius: 6 }}
          />
        </div>
      );
    } else if (reply.msgType === MessageType.VIDEO) {
      try {
        const json = JSON.parse(reply.content || "{}");
        const cover = json.previewImage || json.thumbPath || "";
        previewNode = (
          <div style={{ textAlign: "center" }}>
            {cover ? (
              <img
                src={String(cover)}
                alt="视频预览"
                style={{ maxWidth: 360, maxHeight: 320, borderRadius: 6 }}
              />
            ) : (
              <div>视频消息</div>
            )}
          </div>
        );
      } catch {
        previewNode = <div>视频消息</div>;
      }
    } else if (reply.msgType === MessageType.LINK) {
      previewNode = (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{reply.title}</div>
          <div style={{ color: "#1677ff" }}>{reply.content}</div>
        </div>
      );
    }

    Modal.confirm({
      title: "确认发送该快捷语？",
      content: previewNode,
      okText: "发送",
      cancelText: "取消",
      onOk: () => {
        sendQuickReplyNow(reply);
        message.success("已发送");
      },
    });
  };

  // 获取快捷语数据
  const fetchQuickWords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await setFriendInjectConfig({ replyType: activeTab });
      setQuickWordsData(data || []);
    } catch (error) {
      message.error("获取快捷语数据失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // 初始化数据
  useEffect(() => {
    fetchQuickWords();
  }, [fetchQuickWords]);

  // 获取消息类型图标
  const getMessageTypeIcon = (msgType: number) => {
    switch (msgType) {
      case MessageType.TEXT:
        return <FileTextOutlined style={{ color: "#1890ff" }} />;
      case MessageType.IMAGE:
        return <PictureOutlined style={{ color: "#52c41a" }} />;
      case MessageType.VIDEO:
        return <PlayCircleOutlined style={{ color: "#fa8c16" }} />;
      default:
        return <FileTextOutlined style={{ color: "#8c8c8c" }} />;
    }
  };

  // 将数据转换为Tree组件需要的格式
  const convertToTreeData = (data: QuickWordsItem[]): any[] => {
    return data.map(item => ({
      key: `group-${item.id}`,
      title: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span>{item.groupName}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <Tooltip title="编辑分组">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  handleEditGroup(item);
                }}
              />
            </Tooltip>
            <Tooltip title="删除分组">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteGroup(item.id);
                }}
              />
            </Tooltip>
          </div>
        </div>
      ),
      children: [
        ...item.replies.map(reply => ({
          key: `reply-${reply.id}`,
          title: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
              onClick={e => {
                e.stopPropagation();
                // 将快捷语内容写入输入框（仅文本或可直接粘贴的内容）
                try {
                  if ([MessageType.TEXT].includes(reply.msgType)) {
                    updateQuoteMessageContent(reply.content || "");
                  } else if ([MessageType.LINK].includes(reply.msgType)) {
                    previewAndConfirmSend(reply);
                  } else {
                    // 图片/视频等类型：弹出预览确认后直接发送
                    previewAndConfirmSend(reply);
                  }
                } catch (_) {}
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {getMessageTypeIcon(reply.msgType)}
                <span>{reply.title}</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      handleEditReply(reply);
                    }}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteReply(reply.id);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          ),
          isLeaf: true,
        })),
        ...convertToTreeData(item.children || []),
      ],
    }));
  };

  // 处理添加快捷回复
  const handleAddReply = async (values: AddReplyRequest) => {
    try {
      const fallbackGroupId =
        selectedKeys[0]?.toString().replace("group-", "") ||
        groupOptions[0]?.value ||
        "";
      await addReply({
        ...values,
        groupId: values.groupId || fallbackGroupId,
        replyType: [activeTab.toString()],
      });
      message.success("添加快捷回复成功");
      setAddModalVisible(false);
      form.resetFields();
      fetchQuickWords();
    } catch (error) {
      message.error("添加快捷回复失败");
    }
  };

  // 处理编辑快捷回复
  const handleEditReply = (reply: QuickWordsReply) => {
    setEditingItem(reply);
    setEditModalVisible(true);
  };

  // 处理更新快捷回复
  const handleUpdateReply = async (values: AddReplyRequest) => {
    if (!editingItem) return;

    try {
      await updateReply({
        ...values,
        id: editingItem.id.toString(),
      });
      message.success("更新快捷回复成功");
      setEditModalVisible(false);
      setEditingItem(null);
      fetchQuickWords();
    } catch (error) {
      message.error("更新快捷回复失败");
    }
  };

  // 处理删除快捷回复
  const handleDeleteReply = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个快捷回复吗？",
      onOk: async () => {
        try {
          await deleteReply({ id: id.toString() });
          message.success("删除成功");
          fetchQuickWords();
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  // 处理编辑分组
  const handleEditGroup = (group: QuickWordsItem) => {
    setIsAddingGroup(false);
    setEditingGroup(group);
    setGroupModalVisible(true);
  };

  // 打开新增分组
  const handleOpenAddGroup = () => {
    setIsAddingGroup(true);
    setEditingGroup(null);
    groupForm.resetFields();
    setGroupModalVisible(true);
  };

  // 处理更新分组
  const handleUpdateGroup = async (values: AddGroupRequest) => {
    if (!editingGroup) return;

    try {
      await updateGroup({
        ...values,
        id: editingGroup.id.toString(),
      });
      message.success("更新分组成功");
      setGroupModalVisible(false);
      setEditingGroup(null);
      fetchQuickWords();
    } catch (error) {
      message.error("更新分组失败");
    }
  };

  // 处理新增分组
  const handleAddGroup = async (values: AddGroupRequest) => {
    try {
      await addGroup({
        ...values,
        parentId: selectedKeys[0]?.toString().startsWith("group-")
          ? selectedKeys[0]?.toString().replace("group-", "")
          : "0",
        replyType: [activeTab.toString()],
      });
      message.success("新增分组成功");
      setGroupModalVisible(false);
      setIsAddingGroup(false);
      fetchQuickWords();
    } catch (error) {
      message.error("新增分组失败");
    }
  };

  // 处理删除分组
  const handleDeleteGroup = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这个分组吗？删除后该分组下的所有快捷回复也会被删除。",
      onOk: async () => {
        try {
          await deleteGroup({ id: id.toString() });
          message.success("删除成功");
          fetchQuickWords();
        } catch (error) {
          message.error("删除失败");
        }
      },
    });
  };

  // 过滤数据
  const filteredData = useMemo(() => {
    if (!keyword.trim()) return quickWordsData;

    const filterData = (data: QuickWordsItem[]): QuickWordsItem[] => {
      return data
        .map(item => ({
          ...item,
          replies: item.replies.filter(
            reply =>
              reply.title.toLowerCase().includes(keyword.toLowerCase()) ||
              reply.content.toLowerCase().includes(keyword.toLowerCase()),
          ),
          children: filterData(item.children || []),
        }))
        .filter(
          item =>
            item.replies.length > 0 ||
            item.children.length > 0 ||
            item.groupName.toLowerCase().includes(keyword.toLowerCase()),
        );
    };

    return filterData(quickWordsData);
  }, [quickWordsData, keyword]);

  const treeData = convertToTreeData(filteredData);

  // 供新增/编辑快捷语使用的分组下拉数据
  const groupOptions = useMemo(() => {
    const flat: { label: string; value: string }[] = [];
    const walk = (items: QuickWordsItem[]) => {
      items.forEach(it => {
        flat.push({ label: it.groupName, value: it.id.toString() });
        if (it.children && it.children.length) walk(it.children);
      });
    };
    walk(quickWordsData);
    return flat;
  }, [quickWordsData]);

  return (
    <Layout
      header={
        <div style={{ padding: "0 16px" }}>
          <Tabs
            activeKey={activeTab.toString()}
            onChange={key => setActiveTab(Number(key) as QuickWordsType)}
            items={[
              {
                key: QuickWordsType.PERSONAL.toString(),
                label: "个人快捷语",
              },

              {
                key: QuickWordsType.DEPARTMENT.toString(),
                label: "公司快捷语",
              },
            ]}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Space.Compact style={{ flex: 1 }}>
              <Input
                placeholder="输入关键字过滤"
                allowClear
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                prefix={<SearchOutlined />}
                onPressEnter={() => {}}
              />
            </Space.Compact>
            <Dropdown
              menu={{
                items: [
                  { key: "add-group", label: "添加新分组" },
                  { key: "add-reply", label: "新增快捷语" },
                  { key: "import-reply", label: "导入快捷语" },
                ],
                onClick: ({ key }) => {
                  if (key === "add-group") return handleOpenAddGroup();
                  if (key === "add-reply") return setAddModalVisible(true);
                  if (key === "import-reply")
                    return message.info("导入快捷语功能开发中");
                },
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Tooltip title="添加">
                <Button type="primary" icon={<PlusOutlined />} />
              </Tooltip>
            </Dropdown>
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={fetchQuickWords} />
            </Tooltip>
          </div>
        </div>
      }
    >
      <Space direction="vertical" style={{ width: "100%", padding: 16 }}>
        <Spin spinning={loading}>
          <Tree
            showLine
            showIcon
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            onExpand={setExpandedKeys}
            onSelect={setSelectedKeys}
            treeData={treeData}
          />
        </Spin>
      </Space>

      <QuickReplyModal
        open={addModalVisible}
        mode="add"
        groupOptions={groupOptions}
        defaultGroupId={
          selectedKeys[0]?.toString().replace("group-", "") ||
          groupOptions[0]?.value
        }
        onSubmit={handleAddReply}
        onCancel={() => setAddModalVisible(false)}
      />

      <QuickReplyModal
        open={editModalVisible}
        mode="edit"
        groupOptions={groupOptions}
        defaultGroupId={selectedKeys[0]?.toString().replace("group-", "")}
        initialValues={
          editingItem
            ? {
                title: editingItem.title,
                content: editingItem.content,
                msgType: [editingItem.msgType.toString()],
                groupId:
                  editingItem.groupId?.toString?.() ||
                  selectedKeys[0]?.toString().replace("group-", ""),
              }
            : undefined
        }
        onSubmit={handleUpdateReply}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
        }}
      />

      <GroupModal
        open={groupModalVisible}
        mode={isAddingGroup ? "add" : "edit"}
        initialValues={
          editingGroup ? { groupName: editingGroup.groupName } : undefined
        }
        onSubmit={isAddingGroup ? handleAddGroup : handleUpdateGroup}
        onCancel={() => {
          setGroupModalVisible(false);
          setEditingGroup(null);
          setIsAddingGroup(false);
        }}
      />
    </Layout>
  );
};

export default QuickWords;
