import React, { useState, useEffect, useMemo } from "react";
import {
  Input,
  Button,
  Avatar,
  Tooltip,
  Card,
  Tag,
  message,
  Modal,
} from "antd";
// 不再需要导入updateFriendInfo，因为已经在detailValue.tsx中使用
import {
  UserOutlined,
  CloseOutlined,
  EditOutlined,
  CheckOutlined,
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { ContractData, weChatGroup } from "@/pages/pc/ckbox/data";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { useMessageStore } from "@weChatStore/message";
import { useUserStore } from "@storeModule/user";
import { useWebSocketStore } from "@/store/module/websocket/websocket";
import { useWeChatStore } from "@/store/module/weChat/weChat";
import { contactUnifiedService } from "@/utils/db";
import { MessageManager } from "@/utils/dbAction/message";
import { generateAiText } from "@/api/ai";
import TwoColumnSelection from "@/components/TwoColumnSelection/TwoColumnSelection";
import TwoColumnMemberSelection from "@/components/MemberSelection/TwoColumnMemberSelection";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import DetailValue from "./components/detailValue";
import { getFriendInfo, FriendDetailResponse, updateFriendInfo } from "./api";
import styles from "./Person.module.scss";
interface PersonProps {
  contract: ContractData | weChatGroup;
}

const Person: React.FC<PersonProps> = ({ contract }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [remarkValue, setRemarkValue] = useState(contract.conRemark || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    contract.labels || [],
  );
  const [allAvailableTags, setAllAvailableTags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");
  const [friendDetail, setFriendDetail] = useState<FriendDetailResponse | null>(
    null,
  );

  // 会话列表 & 当前用户，用于在备注更新后同步会话列表显示
  const setSessions = useMessageStore(state => state.setSessions);
  // ✅ 使用 selector 避免 getSnapshot 警告
  const currentUserId = useUserStore(state => state.user?.id) || 0;

  // 判断是否为群聊
  const isGroup = "chatroomId" in contract;

  // 群聊相关状态
  const [groupNameValue, setGroupNameValue] = useState(contract.name || "");
  const [groupNoticeValue, setGroupNoticeValue] = useState(
    contract.notice || "",
  );
  const [selfDisplayNameValue, setSelfDisplayNameValue] = useState(
    contract.selfDisplyName || "",
  );
  const [isGroupNoticeModalVisible, setIsGroupNoticeModalVisible] =
    useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(
    `请为我们的微信群生成一个友好、专业的群公告。

群公告应该包含：
1. 欢迎新成员加入
2. 群聊的基本规则和礼仪
3. 鼓励大家积极交流
4. 保持群聊环境和谐

请用温馨友好的语调，字数控制在200字以内。`,
  );
  const [aiGeneratedContent, setAiGeneratedContent] = useState("");

  const currentGroupMembers = useWeChatStore(
    state => state.currentGroupMembers,
  );

  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [isAddFriendModalVisible, setIsAddFriendModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [greeting, setGreeting] = useState("");

  // 群管理弹窗状态
  const [isFriendSelectionVisible, setIsFriendSelectionVisible] =
    useState(false);
  const [isMemberSelectionVisible, setIsMemberSelectionVisible] =
    useState(false);
  const [isAdminSelectionVisible, setIsAdminSelectionVisible] = useState(false);
  const [isRemoveAdminSelectionVisible, setIsRemoveAdminSelectionVisible] =
    useState(false);
  const [isTransferOwnerSelectionVisible, setIsTransferOwnerSelectionVisible] =
    useState(false);

  const [contractList, setContractList] = useState<any[]>([]);

  const handleAddFriend = member => {
    setSelectedMember(member);
    setGreeting(`你好, 我来自群聊${contractInfo.name}`);
    setIsAddFriendModalVisible(true);
  };

  // 群管理操作处理函数
  const handleAddMember = (
    selectedIds: number[],
    selectedItems: FriendSelectionItem[],
  ) => {
    console.log("添加成员:", selectedIds, selectedItems);
    sendCommand("CmdChatroomInvite", {
      wechatChatroomId: contract.id,
      wechatFriendIds: selectedIds,
    });
    messageApi.success(`已添加 ${selectedItems.length} 个成员`);
    setIsFriendSelectionVisible(false);
  };

  //删除群成员
  const handleRemoveMember = (selectedIds: string[]) => {
    console.log("删除成员:", selectedIds);
    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 2,
      extra: JSON.stringify({
        friendIdList: selectedIds,
      }),
    });
    messageApi.success(`已删除 ${selectedIds.length} 个成员`);
    setIsMemberSelectionVisible(false);
  };
  //添加管理员
  const handleAddAdmin = (selectedIds: string[]) => {
    console.log("添加管理员:", selectedIds);
    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 12,
      extra: JSON.stringify({
        wechatIds: selectedIds,
      }),
    });
    messageApi.success(`已添加 ${selectedIds.length} 个管理员`);
    setIsAdminSelectionVisible(false);
  };

  //删除管理员
  const handleRemoveAdmin = (selectedIds: string[]) => {
    console.log("删除管理员:", selectedIds);

    selectedIds.forEach(wechatId => {
      sendCommand("CmdChatroomOperate", {
        wechatAccountId: contract.wechatAccountId,
        wechatChatroomId: contract.id,
        chatroomOperateType: 8, // 8 for remove admin
        extra: JSON.stringify({
          wechatId: wechatId,
        }),
      });
    });

    messageApi.success(`已删除 ${selectedIds.length} 个管理员`);
    setIsRemoveAdminSelectionVisible(false);
  };

  //群主转让 √
  const handleTransferOwner = (selectedIds: string[]) => {
    if (selectedIds.length !== 1) {
      messageApi.error("只能选择一个成员作为新群主");
      return;
    }
    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 10,
      extra: JSON.stringify({
        wechatId: selectedIds[0],
      }),
    });
    messageApi.success("群主转让成功");
    setIsTransferOwnerSelectionVisible(false);
  };

  const handleSendFriendRequest = () => {
    if (!selectedMember) return;

    sendCommand("CmdChatroomOperate", {
      chatroomOperateTyp: 1,
      extra: JSON.stringify({
        wechatId: selectedMember.wechatId,
        sendWord: greeting,
      }),
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
    });

    messageApi.success("好友请求已发送");
    setIsAddFriendModalVisible(false);
    setSelectedMember(null);
    setGreeting("");
  };

  // 构建联系人或群聊详细信息

  // 优化：使用选择器函数直接订阅匹配的客服对象，避免订阅整个 customerList
  // 添加相等性比较，只有当匹配的客服对象或其 labels 真正变化时才触发重新渲染
  const kfSelectedUser = useCustomerStore(state => {
    if (!contract.wechatAccountId) return null;
    return (
      state.customerList.find(
        (customer: any) => customer.id === contract.wechatAccountId,
      ) || null
    );
  });

  // 不再需要从useContactStore获取getContactsByCustomer

  // ✅ 使用 selector 避免 getSnapshot 警告
  const sendCommand = useWebSocketStore(state => state.sendCommand);

  // 权限控制：检查当前客服是否有群管理权限
  const hasGroupManagePermission = () => {
    // 暂时给所有用户完整的群管理权限
    return true;
  };

  // 获取所有可用标签
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const kfTags = (kfSelectedUser as any)?.labels || [];
        const contractTags = contract.labels || [];
        const allTags = [...new Set([...kfTags, ...contractTags])];
        setAllAvailableTags(allTags);
      } catch (error) {
        console.error("获取标签失败:", error);
      }
    };
    fetchAvailableTags();
  }, [kfSelectedUser, contract.labels]);

  // 获取好友详细信息 - 静默请求，成功时更新数据，失败时不做任何处理
  const fetchFriendDetail = React.useCallback(async () => {
    if (isGroup) return; // 群聊不需要获取好友详情

    try {
      // 静默请求，不显示加载状态
      const response = await getFriendInfo({ id: contract.id });
      // 请求成功时更新数据
      setFriendDetail(response);

      // 解析扩展字段
      try {
        const extendFieldsObj = JSON.parse(
          response.detail.extendFields || "{}",
        );
        setExtendFields(extendFieldsObj);
      } catch (e) {
        console.error("Failed to parse extendFields:", e);
        // 解析失败时不更新状态，保持原有数据
      }
    } catch (err) {
      // 请求失败时静默处理，只记录日志，不更新UI状态
      console.error("获取好友详情失败:", err);
    }
  }, [contract.id, isGroup]);

  // 当contract变化时在后台静默获取好友详情
  useEffect(() => {
    if (!isGroup && contract.id) {
      // 使用setTimeout将请求移至下一个事件循环，确保UI先渲染
      setTimeout(() => {
        fetchFriendDetail();
      }, 0);
    }
  }, [contract.id, isGroup, fetchFriendDetail]);

  // 当contract变化时更新各种值
  useEffect(() => {
    setRemarkValue(contract.conRemark || "");
    setSelectedTags(contract.labels || []);
    try {
      // 确保extendFields是最新的值
      const extFieldsObj =
        typeof contract.extendFields === "string"
          ? JSON.parse(contract.extendFields || "{}")
          : contract.extendFields || {};
      setExtendFields(extFieldsObj);
    } catch (e) {
      console.error("Failed to parse extendFields in useEffect:", e);
      setExtendFields({});
    }

    if (isGroup) {
      setGroupNameValue(contract.name || "");
      setGroupNoticeValue(contract.notice || "");
      setSelfDisplayNameValue(contract.selfDisplyName || "");
    }

    // 不再需要在这里触发获取好友详情，已在单独的useEffect中处理
  }, [
    contract.conRemark,
    contract.labels,
    contract.name,
    contract.notice,
    contract.selfDisplyName,
    contract.extendFields,
    contract.id,
    isGroup,
    fetchFriendDetail,
  ]);

  // 处理备注保存
  const handleSaveRemark = async (
    values: Record<string, string>,
    changedKeys: string[],
  ) => {
    // 构建更新后的扩展字段
    const updatedExtendFields = { ...extendFields };

    // 更新各个扩展字段
    const extendFieldKeys = [
      "phone",
      "company",
      "position",
      "email",
      "address",
      "qq",
      "remark",
    ];
    extendFieldKeys.forEach(key => {
      if (changedKeys.includes(key) && values[key] !== undefined) {
        updatedExtendFields[key] = values[key];
      }
    });

    const extendFieldsStr = JSON.stringify(updatedExtendFields || {});

    // 更新remarkValue
    if (changedKeys.includes("conRemark")) {
      setRemarkValue(values.conRemark);
    }

    // 更新所有扩展字段
    setExtendFields(updatedExtendFields);

    // 更新父组件中的contract副本，确保切换tab后数据不会丢失
    if (contract && typeof contract === "object") {
      // 更新contract的extendFields字段
      contract.extendFields = extendFieldsStr;

      // 如果有备注变更，同时更新备注
      if (changedKeys.includes("conRemark")) {
        contract.conRemark = values.conRemark;
      }
    }

    try {
      // 仅使用WebSocket命令同步备注信息
      if (
        changedKeys.includes("conRemark") ||
        changedKeys.some(key => extendFieldKeys.includes(key))
      ) {
        if (isGroup) {
          // 群聊备注修改
          sendCommand("CmdModifyGroupRemark", {
            wechatAccountId: contract.wechatAccountId,
            chatroomId: contract.chatroomId,
            newRemark: values.conRemark,
            extendFields: extendFieldsStr,
          });
        } else {
          // 好友备注修改
          sendCommand("CmdModifyFriendRemark", {
            wechatAccountId: contract.wechatAccountId,
            wechatFriendId: contract.id,
            newRemark: values.conRemark,
            extendFields: extendFieldsStr,
          });

          // 同步好友信息到后端
          updateFriendInfo({
            id: Number(contract.id) || 0,
            conRemark: values.conRemark || "",
            phone: values.phone || "",
            company: values.company || "",
            name: values.name || "",
            position: values.position || "",
            email: values.email || "",
            address: values.address || "",
            qq: values.qq || "",
            remark: values.remark || "",
          }).catch(err => {
            console.error("更新好友信息失败:", err);
          });

          // 备注变更时，同步更新会话列表 UI 和本地会话数据库
          if (changedKeys.includes("conRemark")) {
            const newRemark = values.conRemark || "";

            // 1. 立即更新会话列表 UI（乐观更新）
            setSessions(prev =>
              prev.map(session =>
                session.type === "friend" && session.id === contract.id
                  ? { ...session, conRemark: newRemark }
                  : session,
              ),
            );

            // 2. 同步到会话本地数据库
            if (currentUserId) {
              MessageManager.updateRemark(
                currentUserId,
                Number(contract.id) || 0,
                "friend",
                newRemark,
              ).catch(err => {
                console.error("更新会话备注失败:", err);
              });
            }
          }
        }
      }

      // 如果有API返回的详情数据，更新本地状态
      if (friendDetail && !isGroup) {
        setFriendDetail(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            detail: {
              ...prev.detail,
              conRemark: changedKeys.includes("conRemark")
                ? values.conRemark
                : prev.detail.conRemark,
              extendFields: extendFieldsStr,
            },
          };
        });
      }
    } catch (error) {
      console.error("保存好友信息失败:", error);
      return Promise.reject(error);
    }

    // 返回Promise以便DetailValue组件处理成功状态
    return Promise.resolve();
  };

  // 处理群名称保存
  const handleSaveGroupName = async (
    values: Record<string, string>,
    changedKeys: string[],
  ) => {
    if (!hasGroupManagePermission()) {
      messageApi.error("只有群主才能修改群名称");
      return Promise.reject("没有权限");
    }

    // 更新groupNameValue
    if (changedKeys.includes("groupName")) {
      setGroupNameValue(values.groupName);
    }

    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 6,
      extra: `{"chatroomName":"${values.groupName}"}`,
    });

    return Promise.resolve();
  };

  // 处理群公告保存
  const handleSaveGroupNotice = () => {
    if (!hasGroupManagePermission()) {
      messageApi.error("只有群主才能修改群公告");
      return;
    }
    setConfirmLoading(true);
    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 5,
      extra: `{"announce":"${groupNoticeValue}"}`,
    });

    // 模拟延迟
    setTimeout(() => {
      messageApi.success("群公告修改成功");
      setIsGroupNoticeModalVisible(false);
      setConfirmLoading(false);
    }, 1000);
  };

  // 打开AI编写弹框
  const handleOpenAiModal = () => {
    if (!hasGroupManagePermission()) {
      messageApi.error("只有群主才能使用AI编写功能");
      return;
    }
    setIsAiModalVisible(true);
    setAiGeneratedContent(""); // 清空之前生成的内容
  };

  // 处理AI生成群公告
  const handleAiGenerateNotice = async () => {
    setAiGenerating(true);
    try {
      // 调用AI接口生成群公告
      const aiResponse = await generateAiText(aiPrompt, {
        wechatAccountId: contract.wechatAccountId,
        groupId: contract.id,
      });

      setAiGeneratedContent(aiResponse);
      messageApi.success("AI生成群公告成功！");
    } catch (error: any) {
      console.error("AI生成失败:", error);
      messageApi.error(error.message || "AI生成失败，请重试");
    } finally {
      setAiGenerating(false);
    }
  };

  // 确认使用AI生成的内容
  const handleConfirmAiContent = () => {
    setGroupNoticeValue(aiGeneratedContent);
    setIsAiModalVisible(false);
    messageApi.success("已应用AI生成的群公告内容");
  };

  // 处理我在本群中的昵称保存
  const handleSaveSelfDisplayName = async (
    values: Record<string, string>,
    changedKeys: string[],
  ) => {
    // 更新selfDisplayNameValue
    if (changedKeys.includes("selfDisplayName")) {
      setSelfDisplayNameValue(values.selfDisplayName);
    }

    sendCommand("CmdChatroomOperate", {
      wechatAccountId: contract.wechatAccountId,
      wechatChatroomId: contract.id,
      chatroomOperateType: 8,
      extra: `${values.selfDisplayName}`,
    });

    return Promise.resolve();
  };

  // 这里不再需要handleCancelEdit，已由DetailValue组件内部处理

  // 处理标签点击切换
  const handleTagToggle = (tagName: string) => {
    const newSelectedTags = selectedTags.includes(tagName)
      ? selectedTags.filter(tag => tag !== tagName)
      : [...selectedTags, tagName];

    setSelectedTags(newSelectedTags);

    // 使用WebSocket发送修改标签命令
    if (isGroup) {
      // 群聊标签修改
      sendCommand("CmdModifyGroupLabel", {
        labels: newSelectedTags,
        seq: +new Date(),
        wechatAccountId: contract.wechatAccountId,
        chatroomId: contract.chatroomId,
      });
    } else {
      // 好友标签修改
      sendCommand("CmdModifyFriendLabel", {
        labels: newSelectedTags,
        seq: +new Date(),
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: contract.id,
      });
    }

    messageApi.success(
      `标签"${tagName}"${selectedTags.includes(tagName) ? "已取消" : "已选中"}`,
    );
  };

  // 处理新增标签
  const handleAddTag = () => {
    if (!newTagValue.trim()) {
      messageApi.error("请输入标签名称");
      return;
    }

    if (allAvailableTags.includes(newTagValue.trim())) {
      messageApi.error("标签已存在");
      return;
    }

    const newTag = newTagValue.trim();

    // 添加到可用标签列表
    setAllAvailableTags(prev => [...prev, newTag]);

    // 自动选中新添加的标签
    setSelectedTags(prev => [...prev, newTag]);

    // 使用WebSocket发送新增标签命令
    if (isGroup) {
      // 群聊标签修改
      sendCommand("CmdModifyGroupLabel", {
        labels: [...selectedTags, newTag],
        seq: +new Date(),
        wechatAccountId: contract.wechatAccountId,
        chatroomId: contract.chatroomId,
      });
    } else {
      // 好友标签修改
      sendCommand("CmdModifyFriendLabel", {
        labels: [...selectedTags, newTag],
        seq: +new Date(),
        wechatAccountId: contract.wechatAccountId,
        wechatFriendId: contract.id || contract.wechatId,
      });
    }

    messageApi.success(`标签"${newTag}"添加成功`);
    setNewTagValue("");
    setIsAddingTag(false);
  };

  // 处理取消新增标签
  const handleCancelAddTag = () => {
    setNewTagValue("");
    setIsAddingTag(false);
  };

  // 处理退出群聊
  const handleLeaveGroup = () => {
    Modal.confirm({
      title: "确定要退出群聊吗？",
      content: "退出后将不再接收此群聊消息。",
      okText: "确定",
      cancelText: "取消",
      onOk: () => {
        sendCommand("CmdChatroomOperate", {
          wechatAccountId: contract.wechatAccountId,
          wechatChatroomId: contract.id,
          chatroomOperateType: 4, // 4 for quit
        });
        messageApi.success("已退出群聊");
      },
    });
  };
  const [extendFields, setExtendFields] = useState(() => {
    try {
      return JSON.parse(contract.extendFields || "{}");
    } catch (e) {
      console.error("Failed to parse extendFields:", e);
      return {};
    }
  });
  // 构建联系人或群聊详细信息
  const contractInfo = useMemo(() => {
    // 如果是个人资料且有API返回的详情数据，优先使用API数据
    if (!isGroup && friendDetail?.detail) {
      const detail = friendDetail.detail;
      // 解析扩展字段
      let extendFieldsObj: Record<string, string> = {};
      try {
        extendFieldsObj = JSON.parse(detail.extendFields || "{}");
      } catch (e) {
        console.error("Failed to parse extendFields in contractInfo:", e);
      }

      return {
        name: detail.nickname || detail.alias,
        nickname: detail.nickname,
        alias: detail.alias,
        wechatId: detail.wechatId,
        avatar: detail.avatar,
        phone: extendFieldsObj.phone || detail.phone || "",
        conRemark: detail.conRemark || remarkValue,
        remark: extendFieldsObj.remark || "",
        email: extendFieldsObj.email || "",
        department: detail.company || "", // 使用company作为department
        position: extendFieldsObj.position || detail.position || "",
        company: extendFieldsObj.company || detail.company || "",
        region: detail.region || "",
        joinDate: detail.createTime || "", // 使用createTime作为joinDate
        status: "在线",
        tags: detail.labels || selectedTags,
        bio: detail.signature || "",
        address: extendFieldsObj.address || "",
        qq: extendFieldsObj.qq || "",
      };
    }

    // 否则使用传入的contract数据
    return {
      name: contract.name || contract.nickname,
      nickname: contract.nickname,
      alias: contract.alias,
      wechatId: contract.wechatId,
      chatroomId: isGroup ? contract.chatroomId : undefined,
      chatroomOwner: isGroup ? contract.chatroomOwner : undefined,
      avatar: contract.avatar || contract.chatroomAvatar,
      phone: contract.phone || "",
      conRemark: remarkValue, // 使用当前编辑的备注值
      remark: extendFields?.remark || "",
      email: contract.email || "",
      department: contract.department || "",
      position: contract.position || "",
      company: contract.company || "",
      region: contract.region || "",
      joinDate: contract.joinDate || "",
      notice: isGroup ? contract.notice : undefined,
      selfDisplyName: isGroup ? contract.selfDisplyName : undefined,
      status: "在线",
      tags: selectedTags,
      bio: contract.bio || contract.signature || "",
      address: contract.address || "",
      qq: contract.qq || "",
    };
  }, [
    contract,
    friendDetail,
    isGroup,
    remarkValue,
    selectedTags,
    extendFields,
  ]);

  // 分页状态
  const [currentContactPage, setCurrentContactPage] = useState(1);
  const [contactPageSize] = useState(10);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // 从数据库获取联系人数据的通用函数
  const fetchContacts = async (page = 1) => {
    try {
      const { databaseManager, initializeDatabaseFromPersistedUser } =
        await import("@/utils/db");

      // 检查数据库初始化状态
      if (!databaseManager.isInitialized()) {
        await initializeDatabaseFromPersistedUser();
      }

      // 获取当前用户ID
      const userId = (kfSelectedUser as any)?.userId || 0;
      const storeUserId = databaseManager.getCurrentUserId();
      const effectiveUserId = storeUserId || userId;

      if (!effectiveUserId) {
        messageApi.error("无法获取用户信息，请尝试重新登录");
        return [];
      }

      // 查询联系人数据
      const allContacts = await contactUnifiedService.findWhereMultiple([
        { field: "userId", operator: "equals", value: effectiveUserId },
        {
          field: "wechatAccountId",
          operator: "equals",
          value: contract.wechatAccountId,
        },
        { field: "type", operator: "equals", value: "friend" },
      ]);

      // 手动分页
      const startIndex = (page - 1) * contactPageSize;
      const endIndex = startIndex + contactPageSize;
      return allContacts.slice(startIndex, endIndex);
    } catch (error) {
      console.error("获取联系人数据失败:", error);
      messageApi.error("获取联系人数据失败");
      return [];
    }
  };

  const addMember = async () => {
    try {
      setIsLoadingContacts(true);
      const pagedContacts = await fetchContacts(currentContactPage);
      // 转换为选择器需要的数据格式
      const friendSelectionData = pagedContacts.map(item => ({
        id: item.id || item.serverId,
        wechatId: item.wechatId,
        nickname: item.nickname,
        avatar: item.avatar || "",
        conRemark: item.conRemark,
        name: item.conRemark || item.nickname, // 用于搜索显示
      }));

      setContractList(friendSelectionData);
      setIsFriendSelectionVisible(true);

      // 如果没有联系人数据，显示提示
      if (friendSelectionData.length === 0) {
        messageApi.info("未找到可添加的联系人，可能需要先同步联系人数据");
      }
    } catch (error) {
      console.error("获取联系人列表失败:", error);
      messageApi.error("获取联系人列表失败");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // 加载更多联系人
  const loadMoreContacts = async () => {
    if (isLoadingContacts) return;
    try {
      setIsLoadingContacts(true);
      const nextPage = currentContactPage + 1;
      setCurrentContactPage(nextPage);
      // 使用通用函数获取下一页联系人数据
      const pagedContacts = await fetchContacts(nextPage);
      // 转换数据格式
      const newFriendSelectionData = pagedContacts.map(item => ({
        id: item.id || item.serverId,
        wechatId: item.wechatId,
        nickname: item.nickname,
        avatar: item.avatar || "",
        conRemark: item.conRemark,
        name: item.conRemark || item.nickname,
      }));

      // 更新列表并去重
      setContractList(prev => {
        const newList = [...prev, ...newFriendSelectionData];
        // 确保列表中没有重复项
        const uniqueMap = new Map();
        const uniqueList = newList.filter(item => {
          if (uniqueMap.has(item.id)) {
            return false;
          }
          uniqueMap.set(item.id, true);
          return true;
        });
        return uniqueList;
      });

      messageApi.success(`已加载${pagedContacts.length}条联系人数据`);
    } catch (error) {
      console.error("加载更多联系人失败:", error);
      messageApi.error("加载更多联系人失败");
    } finally {
      setIsLoadingContacts(false);
    }
  };
  // 不再需要加载状态和错误状态的渲染，始终显示缓存数据

  return (
    <>
      {contextHolder}
      <div className={styles.profileContainer}>
        {/* 头像和基本信息 */}
        <div className={styles.profileBasic} style={{ alignItems: "center" }}>
          <Avatar size={80} src={contractInfo.avatar} icon={<UserOutlined />} />
          <div className={styles.profileInfo} style={{ textAlign: "center" }}>
            <div className={styles.profileStatus}>
              <span className={styles.statusDot}></span>
              {contractInfo.status}
            </div>
            <Tooltip
              title={contractInfo.nickname || contractInfo.name}
              placement="top"
            >
              <h4
                className={styles.profileNickname}
                style={{ margin: "8px 0 0" }}
              >
                {contractInfo.nickname || contractInfo.name}
              </h4>
            </Tooltip>
          </div>
        </div>

        {/* 详细信息卡片 */}
        <Card title="详细信息" className={styles.profileCard}>
          {isGroup ? (
            // 群聊信息
            <DetailValue
              fields={[
                {
                  key: "groupName",
                  label: "群名称",
                  ifEdit: hasGroupManagePermission(),
                  placeholder: "请输入群名称",
                  type: "text",
                },
                {
                  key: "chatroomId",
                  label: "群ID",
                  ifEdit: false,
                },
                {
                  key: "chatroomOwner",
                  label: "群主",
                  ifEdit: false,
                },
                {
                  key: "selfDisplayName",
                  label: "群昵称",
                  placeholder: "点击添加群昵称",
                  type: "text",
                },
              ]}
              value={{
                groupName: groupNameValue,
                chatroomId: contractInfo.chatroomId || "",
                chatroomOwner: contractInfo.chatroomOwner || "",
                selfDisplayName: selfDisplayNameValue,
              }}
              saveHandler={async (values, changedKeys) => {
                if (changedKeys.includes("groupName")) {
                  await handleSaveGroupName(values, ["groupName"]);
                }
                if (changedKeys.includes("selfDisplayName")) {
                  await handleSaveSelfDisplayName(values, ["selfDisplayName"]);
                }
                return Promise.resolve();
              }}
              onSaveSuccess={(values, changedKeys) => {
                // 更新本地值
                if (changedKeys.includes("groupName")) {
                  setGroupNameValue(values.groupName);
                }
                if (changedKeys.includes("selfDisplayName")) {
                  setSelfDisplayNameValue(values.selfDisplayName);
                }
              }}
            />
          ) : (
            // 好友信息
            <DetailValue
              fields={[
                {
                  key: "wechatId",
                  label: "微信号",
                  ifEdit: false,
                },
                {
                  key: "region",
                  label: "地区",
                  ifEdit: false,
                },
                {
                  key: "address",
                  label: "地址",
                  placeholder: "点击添加",
                  ifEdit: true,
                },
                {
                  key: "phone",
                  label: "电话",
                  placeholder: "点击添加",
                  ifEdit: true,
                },
                {
                  key: "qq",
                  label: "QQ",
                  placeholder: "点击添加",
                  ifEdit: true,
                },
                {
                  key: "email",
                  label: "邮箱",
                  placeholder: "点击添加",
                  ifEdit: true,
                },
                {
                  key: "company",
                  label: "公司",
                  placeholder: "点击添加",
                  type: "textarea",
                  ifEdit: true,
                },
                {
                  key: "position",
                  label: "职位",
                  placeholder: "点击添加",
                  ifEdit: true,
                },
                {
                  key: "conRemark",
                  label: "微信备注",
                  placeholder: "点击添加备注",
                  type: "text",
                },
                {
                  key: "remark",
                  label: "描述",
                  placeholder: "点击添加描述",
                  type: "textarea",
                },
              ]}
              value={{
                id: contract.id.toString() || "",
                wechatId: contractInfo.alias || contractInfo.wechatId || "",
                phone: contractInfo.phone || "",
                region: contractInfo.region || "",
                conRemark: contractInfo.conRemark || "",
                remark: contractInfo.remark || "",
                address: contractInfo.address || "",
                qq: contractInfo.qq || "",
                email: contractInfo.email || "",
                company: contractInfo.company || "",
                position: contractInfo.position || "",
              }}
              saveHandler={handleSaveRemark}
              onSaveSuccess={(values, changedKeys) => {
                // 更新本地值
                if (changedKeys.includes("conRemark")) {
                  setRemarkValue(values.conRemark);
                }
              }}
            />
          )}
        </Card>

        {/* 标签 - 仅在非群聊时显示 */}
        {!isGroup && (
          <Card title="标签" className={styles.profileCard}>
            <div className={styles.tagsContainer}>
              {/* 渲染所有可用标签，选中的排在前面 */}
              {[...new Set([...selectedTags, ...allAvailableTags])].map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Tag
                    key={tag}
                    color={isSelected ? "blue" : "default"}
                    style={{
                      cursor: "pointer",
                      border: isSelected
                        ? "1px solid #1890ff"
                        : "1px solid #d9d9d9",
                      backgroundColor: isSelected ? "#e6f7ff" : "#fafafa",
                    }}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Tag>
                );
              })}

              {/* 新增标签区域 */}
              {isAddingTag ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <Input
                    value={newTagValue}
                    onChange={e => setNewTagValue(e.target.value)}
                    placeholder="请输入标签名称"
                    size="small"
                    style={{ width: "120px" }}
                    onPressEnter={handleAddTag}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={handleAddTag}
                    style={{ color: "#52c41a" }}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleCancelAddTag}
                    style={{ color: "#ff4d4f" }}
                  />
                </div>
              ) : (
                <Tag
                  style={{
                    cursor: "pointer",
                    border: "1px dashed #d9d9d9",
                    backgroundColor: "#fafafa",
                  }}
                  onClick={() => setIsAddingTag(true)}
                >
                  <PlusOutlined /> 新增标签
                </Tag>
              )}

              {allAvailableTags.length === 0 && !isAddingTag && (
                <span style={{ color: "#999", fontSize: "12px" }}>
                  暂无可用标签
                </span>
              )}
            </div>
          </Card>
        )}

        {/* 群公告 - 仅在群聊时显示 */}
        {isGroup && (
          <Card title="群公告" className={styles.profileCard}>
            {/* 群聊简介（原群公告） */}
            <div
              className={styles.infoValue}
              onClick={
                hasGroupManagePermission()
                  ? () => {
                      setGroupNoticeValue(contractInfo.notice || "");
                      setIsGroupNoticeModalVisible(true);
                    }
                  : undefined
              }
              style={{
                cursor: hasGroupManagePermission() ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className={styles.bioText}
                  style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                    paddingRight: "5px",
                    flex: 1,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    lineHeight: "1.5",
                  }}
                >
                  {contractInfo.notice || "点击添加群公告"}
                </div>
                {hasGroupManagePermission() && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    style={{ marginLeft: "8px" }}
                  />
                )}
              </div>
            </div>
          </Card>
        )}

        {isGroup && (
          <Card title="群成员" className={styles.profileCard}>
            <div className={styles.groupManagement} style={{ width: "100%" }}>
              {/* 第一行：2个按钮均分 */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "5px",
                  width: "100%",
                }}
              >
                <Button
                  icon={<PlusOutlined />}
                  onClick={addMember}
                  type="primary"
                  style={{
                    flex: 1,
                    height: "32px",
                    minWidth: 0,
                  }}
                >
                  添加成员
                </Button>
                {hasGroupManagePermission() && (
                  <Button
                    icon={<MinusOutlined />}
                    onClick={() => setIsMemberSelectionVisible(true)}
                    type="primary"
                    danger
                    style={{
                      flex: 1,
                      height: "32px",
                      minWidth: 0,
                    }}
                  >
                    删除成员
                  </Button>
                )}
              </div>
              {/* 第二行：3个按钮均分 */}
              {hasGroupManagePermission() && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => setIsAdminSelectionVisible(true)}
                    type="default"
                    style={{
                      flex: 1,
                      height: "32px",
                      minWidth: 0,
                      fontSize: "12px",
                      padding: "4px 8px",
                    }}
                  >
                    添加管理
                  </Button>
                  <Button
                    icon={<MinusOutlined />}
                    onClick={() => setIsRemoveAdminSelectionVisible(true)}
                    type="default"
                    style={{
                      flex: 1,
                      height: "32px",
                      minWidth: 0,
                      fontSize: "12px",
                      padding: "4px 8px",
                    }}
                  >
                    删除管理
                  </Button>
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => setIsTransferOwnerSelectionVisible(true)}
                    type="primary"
                    style={{
                      flex: 1,
                      height: "32px",
                      minWidth: 0,
                      fontSize: "12px",
                      padding: "4px 8px",
                      fontWeight: "600",
                      background:
                        "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
                      border: "none",
                      boxShadow: "0 2px 4px rgba(24, 144, 255, 0.2)",
                    }}
                  >
                    转让群主
                  </Button>
                </div>
              )}
            </div>
            <div
              className={styles.groupMemberList}
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {currentGroupMembers.map(member => (
                <Tooltip title={member.nickname} key={member.wechatId}>
                  <div
                    className={styles.groupMember}
                    onMouseEnter={() => setHoveredMember(member.wechatId)}
                    onMouseLeave={() => setHoveredMember(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Avatar size={32} src={member.avatar} />
                    <span
                      style={{
                        marginLeft: "8px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        width: "66%",
                      }}
                    >
                      {member.nickname}
                    </span>
                    {hoveredMember === member.wechatId && (
                      <Button
                        icon={<PlusOutlined />}
                        size="small"
                        type="text"
                        onClick={e => {
                          e.stopPropagation();
                          handleAddFriend(member);
                        }}
                        className={styles.addFriendButton}
                        style={{ textAlign: "center" }}
                      />
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>

            <Button
              type="link"
              danger
              block
              style={{ marginTop: "16px" }}
              onClick={handleLeaveGroup}
            >
              退出群聊
            </Button>
          </Card>
        )}

        <Modal
          title={`请求添加${selectedMember?.nickname}为好友`}
          open={isAddFriendModalVisible}
          onOk={handleSendFriendRequest}
          onCancel={() => setIsAddFriendModalVisible(false)}
          okText="确定"
          cancelText="取消"
        >
          <Input.TextArea
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            placeholder="请输入招呼语"
            rows={4}
          />
        </Modal>
      </div>

      {/* 群公告编辑弹窗 */}
      <Modal
        title="发布群公告"
        open={isGroupNoticeModalVisible}
        onCancel={() => setIsGroupNoticeModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsGroupNoticeModalVisible(false)}
          >
            取消
          </Button>,
          hasGroupManagePermission() && (
            <Button
              key="ai-generate"
              onClick={handleOpenAiModal}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                color: "white",
              }}
            >
              🤖 AI编写
            </Button>
          ),
          <Button
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={handleSaveGroupNotice}
            disabled={!hasGroupManagePermission()}
          >
            确定
          </Button>,
        ].filter(Boolean)}
      >
        {!hasGroupManagePermission() && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: "6px",
              color: "#d46b08",
            }}
          >
            ⚠️ 您不是群主，无法修改群公告
          </div>
        )}
        <div style={{ marginBottom: "12px" }}>
          <Input.TextArea
            value={groupNoticeValue}
            onChange={e => setGroupNoticeValue(e.target.value)}
            placeholder={
              hasGroupManagePermission()
                ? "请输入群公告内容，或点击AI编写按钮自动生成"
                : "仅群主可以修改群公告"
            }
            rows={8}
            style={{
              resize: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: "1.5",
            }}
            disabled={!hasGroupManagePermission()}
          />
        </div>
        <div style={{ fontSize: "12px", color: "#999", lineHeight: "1.4" }}>
          💡 提示：
          {hasGroupManagePermission()
            ? "AI编写功能将根据默认模板生成专业的群公告内容，您可以在生成后进行个性化修改。"
            : "只有群主才能编辑群公告内容。"}
        </div>
      </Modal>

      {/* AI编写群公告弹框 */}
      <Modal
        title="AI编写群公告"
        open={isAiModalVisible}
        onCancel={() => setIsAiModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsAiModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="generate"
            type="primary"
            loading={aiGenerating}
            onClick={handleAiGenerateNotice}
            disabled={!aiPrompt.trim()}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
            }}
          >
            {aiGenerating ? "生成中..." : "🤖 生成内容"}
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={handleConfirmAiContent}
            disabled={!aiGeneratedContent}
          >
            确认使用
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 提示词区域 */}
          <div>
            <div style={{ marginBottom: "8px", fontWeight: "500" }}>
              📝 AI提示词
            </div>
            <Input.TextArea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="请输入AI生成群公告的提示词..."
              rows={6}
              style={{ resize: "none" }}
            />
            <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
              💡 提示：详细的提示词能帮助AI生成更符合您需求的群公告内容
            </div>
          </div>

          {/* 生成内容区域 */}
          <div>
            <div style={{ marginBottom: "8px", fontWeight: "500" }}>
              🤖 AI生成的群公告
            </div>
            <Input.TextArea
              value={aiGeneratedContent}
              onChange={e => setAiGeneratedContent(e.target.value)}
              placeholder={
                aiGenerating
                  ? "AI正在生成中，请稍候..."
                  : "点击上方'生成内容'按钮，AI将根据提示词生成群公告"
              }
              rows={8}
              style={{ resize: "none" }}
              disabled={aiGenerating}
            />
            {aiGeneratedContent && (
              <div
                style={{ fontSize: "12px", color: "#52c41a", marginTop: "4px" }}
              >
                ✅ 内容已生成，您可以编辑后点击“确认使用”应用到群公告
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 群管理弹窗组件 */}
      {/* 添加成员弹窗 */}
      <TwoColumnSelection
        visible={isFriendSelectionVisible}
        onCancel={() => {
          setIsFriendSelectionVisible(false);
          setCurrentContactPage(1); // 重置页码
        }}
        onConfirm={(selectedIds, selectedItems) => {
          handleAddMember(
            selectedIds.map(id => parseInt(id)),
            selectedItems,
          );
          setCurrentContactPage(1); // 重置页码
        }}
        dataSource={contractList}
        title="添加群成员"
        onLoadMore={loadMoreContacts}
        hasMore={true} // 强制设置为true，确保显示加载更多按钮
        loading={isLoadingContacts}
      />

      {/* 删除成员弹窗 */}
      <TwoColumnMemberSelection
        visible={isMemberSelectionVisible}
        members={currentGroupMembers.map(member => ({
          id: member.wechatId,
          nickname: member.nickname,
          avatar: member.avatar,
        }))}
        onCancel={() => setIsMemberSelectionVisible(false)}
        onConfirm={handleRemoveMember}
        title="删除群成员"
        allowMultiple={false}
      />

      {/* 添加管理员弹窗 */}
      <TwoColumnMemberSelection
        visible={isAdminSelectionVisible}
        members={currentGroupMembers.map(member => ({
          id: member.wechatId,
          nickname: member.nickname,
          avatar: member.avatar,
        }))}
        onCancel={() => setIsAdminSelectionVisible(false)}
        onConfirm={handleAddAdmin}
        title="添加管理员"
        allowMultiple={false}
      />

      {/* 删除管理员弹窗 */}
      <TwoColumnMemberSelection
        visible={isRemoveAdminSelectionVisible}
        members={currentGroupMembers.map(member => ({
          id: member.wechatId,
          nickname: member.nickname,
          avatar: member.avatar,
        }))}
        onCancel={() => setIsRemoveAdminSelectionVisible(false)}
        onConfirm={handleRemoveAdmin}
        title="删除管理员"
        allowMultiple={false}
      />

      {/* 转让群主弹窗 */}
      <TwoColumnMemberSelection
        visible={isTransferOwnerSelectionVisible}
        members={currentGroupMembers.map(member => ({
          id: member.wechatId,
          nickname: member.nickname,
          avatar: member.avatar,
        }))}
        onCancel={() => setIsTransferOwnerSelectionVisible(false)}
        onConfirm={handleTransferOwner}
        title="转让群主"
        allowMultiple={false}
      />
    </>
  );
};

export default Person;
