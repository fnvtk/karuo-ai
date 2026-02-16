import React, { useState, useEffect } from "react";
import { SearchOutlined, DeleteOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
import { Button, Input, Popup } from "antd-mobile";
import { Avatar } from "antd-mobile";
import style from "./index.module.scss";
import GroupSelection from "../GroupSelection";
import { GroupSelectionItem } from "../GroupSelection/data";
import request from "@/api/request";

// 群成员接口
export interface GroupMember {
  id: string;
  nickname: string;
  wechatId: string;
  avatar: string;
  gender?: "male" | "female";
  role?: "owner" | "admin" | "member";
}

// 带成员的群选项
export interface GroupWithMembers extends GroupSelectionItem {
  members?: GroupMember[];
  groupId?: string; // 用于关联成员和群
}

interface GroupSelectionWithMembersProps {
  selectedGroups: GroupWithMembers[];
  onSelect: (groups: GroupWithMembers[]) => void;
  placeholder?: string;
  className?: string;
  readonly?: boolean;
}

// 获取群成员列表
const getGroupMembers = async (
  groupId: string,
  page: number = 1,
  limit: number = 100,
  keyword: string = "",
): Promise<GroupMember[]> => {
  try {
    const params: any = {
      page,
      limit,
      groupId,
    };
    if (keyword.trim()) {
      params.keyword = keyword.trim();
    }
    const response = await request("/v1/kefu/wechatChatroom/members", params, "GET");
    // request 拦截器会返回 res.data.data ?? res.data
    // 对于 { code: 200, data: { list: [...] } } 的返回，拦截器会返回 { list: [...] }
    const memberList = response?.list || response?.data?.list || [];

    // 映射接口返回的数据结构到我们的接口
    return memberList.map((item: any) => ({
      id: String(item.id),
      nickname: item.nickname || "",
      wechatId: item.wechatId || "",
      avatar: item.avatar || "",
      gender: undefined, // 接口未返回，暂时设为 undefined
      role: undefined, // 接口未返回，暂时设为 undefined
    }));
  } catch (error) {
    console.error("获取群成员失败:", error);
    return [];
  }
};

const GroupSelectionWithMembers: React.FC<GroupSelectionWithMembersProps> = ({
  selectedGroups,
  onSelect,
  placeholder = "选择聊天群",
  className = "",
  readonly = false,
}) => {
  const [groupSelectionVisible, setGroupSelectionVisible] = useState(false);
  const [memberSelectionVisible, setMemberSelectionVisible] = useState<{
    visible: boolean;
    groupId: string;
  }>({ visible: false, groupId: "" });
  const [allMembers, setAllMembers] = useState<Record<string, GroupMember[]>>({});
  const [selectedMembers, setSelectedMembers] = useState<Record<string, GroupMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchKeyword, setMemberSearchKeyword] = useState("");
  // 存储完整成员列表（用于搜索时切换回完整列表）
  const [fullMembersCache, setFullMembersCache] = useState<Record<string, GroupMember[]>>({});

  // 处理群选择
  const handleGroupSelect = (groups: GroupSelectionItem[]) => {
    const groupsWithMembers: GroupWithMembers[] = groups.map(group => {
      const existing = selectedGroups.find(g => g.id === group.id);
      return {
        ...group,
        members: existing?.members || [],
      };
    });
    onSelect(groupsWithMembers);
    setGroupSelectionVisible(false);
  };

  // 删除群
  const handleRemoveGroup = (groupId: string) => {
    if (readonly) return;
    const newGroups = selectedGroups.filter(g => g.id !== groupId);
    const newSelectedMembers = { ...selectedMembers };
    delete newSelectedMembers[groupId];
    setSelectedMembers(newSelectedMembers);
    onSelect(newGroups);
  };

  // 打开成员选择弹窗
  const handleOpenMemberSelection = async (groupId: string) => {
    if (readonly) return;
    setMemberSelectionVisible({ visible: true, groupId });
    setMemberSearchKeyword(""); // 重置搜索关键词

    // 如果还没有加载过该群的成员列表，则加载所有成员（不使用搜索关键词）
    if (!allMembers[groupId] && !fullMembersCache[groupId]) {
      setLoadingMembers(true);
      try {
        const members = await getGroupMembers(groupId, 1, 100, "");
        setAllMembers(prev => ({ ...prev, [groupId]: members }));
        setFullMembersCache(prev => ({ ...prev, [groupId]: members })); // 缓存完整列表
      } catch (error) {
        console.error("加载群成员失败:", error);
      } finally {
        setLoadingMembers(false);
      }
    } else if (fullMembersCache[groupId] && !allMembers[groupId]) {
      // 如果有缓存但没有显示列表，恢复完整列表
      setAllMembers(prev => ({ ...prev, [groupId]: fullMembersCache[groupId] }));
    }
  };

  // 关闭成员选择弹窗
  const handleCloseMemberSelection = () => {
    setMemberSelectionVisible({ visible: false, groupId: "" });
    setMemberSearchKeyword(""); // 重置搜索关键词
  };

  // 手动触发搜索
  const handleSearchMembers = async () => {
    const groupId = memberSelectionVisible.groupId;
    if (!groupId) return;

    const keyword = memberSearchKeyword.trim();

    // 如果搜索关键词为空，使用缓存的完整列表
    if (!keyword) {
      if (fullMembersCache[groupId] && fullMembersCache[groupId].length > 0) {
        setAllMembers(prev => ({ ...prev, [groupId]: fullMembersCache[groupId] }));
      }
      return;
    }

    // 有搜索关键词时，调用 API 搜索
    setLoadingMembers(true);
    try {
      const members = await getGroupMembers(groupId, 1, 100, keyword);
      setAllMembers(prev => ({ ...prev, [groupId]: members }));
    } catch (error) {
      console.error("搜索群成员失败:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // 清空搜索
  const handleClearSearch = () => {
    setMemberSearchKeyword("");
    const groupId = memberSelectionVisible.groupId;
    if (groupId && fullMembersCache[groupId] && fullMembersCache[groupId].length > 0) {
      setAllMembers(prev => ({ ...prev, [groupId]: fullMembersCache[groupId] }));
    }
  };

  // 选择成员
  const handleSelectMember = (groupId: string, member: GroupMember) => {
    if (readonly) return;
    const currentMembers = selectedMembers[groupId] || [];
    const isSelected = currentMembers.some(m => m.id === member.id);

    let newSelectedMembers = { ...selectedMembers };
    if (isSelected) {
      newSelectedMembers[groupId] = currentMembers.filter(m => m.id !== member.id);
    } else {
      newSelectedMembers[groupId] = [...currentMembers, member];
    }
    setSelectedMembers(newSelectedMembers);

    // 更新群数据
    const updatedGroups = selectedGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: newSelectedMembers[groupId] || [],
        };
      }
      return group;
    });
    onSelect(updatedGroups);
  };

  // 移除成员
  const handleRemoveMember = (groupId: string, memberId: string) => {
    if (readonly) return;
    const currentMembers = selectedMembers[groupId] || [];
    const newMembers = currentMembers.filter(m => m.id !== memberId);

    const newSelectedMembers = { ...selectedMembers };
    newSelectedMembers[groupId] = newMembers;
    setSelectedMembers(newSelectedMembers);

    // 更新群数据
    const updatedGroups = selectedGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          members: newMembers,
        };
      }
      return group;
    });
    onSelect(updatedGroups);
  };

  // 同步 selectedGroups 到 selectedMembers
  useEffect(() => {
    const membersMap: Record<string, GroupMember[]> = {};
    selectedGroups.forEach(group => {
      if (group.members && group.members.length > 0) {
        membersMap[group.id] = group.members;
      }
    });
    setSelectedMembers(membersMap);
  }, [selectedGroups.length]);

  // 获取显示文本
  const getDisplayText = () => {
    if (selectedGroups.length === 0) return "";
    return `已选择${selectedGroups.length}个群聊`;
  };

  const currentGroupMembers = allMembers[memberSelectionVisible.groupId] || [];
  const currentSelectedMembers = selectedMembers[memberSelectionVisible.groupId] || [];

  return (
    <div className={`${style.container} ${className}`}>
      {/* 输入框 */}
      <div
        className={style.inputWrapper}
        onClick={() => !readonly && setGroupSelectionVisible(true)}
      >
        <SearchOutlined className={style.inputIcon} />
        <Input
          placeholder={placeholder}
          value={getDisplayText()}
          readOnly
          className={style.input}
        />
        {!readonly && selectedGroups.length > 0 && (
          <Button
            fill="none"
            size="small"
            className={style.clearBtn}
            onClick={e => {
              e.stopPropagation();
              setSelectedMembers({});
              onSelect([]);
            }}
          >
            <DeleteOutlined />
          </Button>
        )}
      </div>

      {/* 已选群列表 */}
      {selectedGroups.length > 0 && (
        <div className={style.selectedGroupsList}>
          {selectedGroups.map(group => (
            <div key={group.id} className={style.groupCard}>
              {/* 群信息 */}
              <div className={style.groupHeader}>
                <div className={style.groupInfo}>
                  <Avatar src={group.avatar} className={style.groupAvatar} />
                  <div className={style.groupDetails}>
                    <div className={style.groupName}>{group.name}</div>
                    <div className={style.groupId}>ID: {group.chatroomId || group.id}</div>
                  </div>
                </div>
                {!readonly && (
                  <Button
                    fill="none"
                    size="small"
                    className={style.deleteGroupBtn}
                    onClick={() => handleRemoveGroup(group.id)}
                  >
                    <DeleteOutlined />
                  </Button>
                )}
              </div>

              {/* 成员选择区域 */}
              <div className={style.membersSection}>
                <div className={style.membersLabel}>
                  采集群内指定成员 ({group.members?.length || 0}人)
                </div>
                <div className={style.membersList}>
                  {group.members?.map(member => (
                    <div key={member.id} className={style.memberItem}>
                      <Avatar src={member.avatar} className={style.memberAvatar} />
                      <div className={style.memberName}>{member.nickname}</div>
                      {!readonly && (
                        <Button
                          fill="none"
                          size="small"
                          className={style.removeMemberBtn}
                          onClick={() => handleRemoveMember(group.id, member.id)}
                        >
                          <DeleteOutlined />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!readonly && (
                    <div
                      className={style.addMemberBtn}
                      onClick={() => handleOpenMemberSelection(group.id)}
                    >
                      <PlusOutlined />
                      <span>添加</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 群选择弹窗 */}
      <GroupSelection
        selectedOptions={selectedGroups as GroupSelectionItem[]}
        onSelect={handleGroupSelect}
        placeholder={placeholder}
        visible={groupSelectionVisible}
        onVisibleChange={setGroupSelectionVisible}
        showInput={false}
        showSelectedList={false}
      />

      {/* 成员选择弹窗 */}
      <Popup
        visible={memberSelectionVisible.visible}
        onMaskClick={handleCloseMemberSelection}
        position="bottom"
        bodyStyle={{
          height: "70vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <div className={style.memberSelectionPopup}>
          <div className={style.popupHeader}>
            <div className={style.popupTitle}>选择成员</div>
            <Button
              fill="none"
              size="small"
              onClick={handleCloseMemberSelection}
              className={style.closeBtn}
            >
              完成
            </Button>
          </div>
          <div className={style.searchBox}>
            <div className={style.searchInputWrapper}>
              <Input
                placeholder="搜索成员昵称或微信号"
                value={memberSearchKeyword}
                onChange={val => setMemberSearchKeyword(val)}
                onEnterPress={handleSearchMembers}
                className={style.searchInput}
              />
              {memberSearchKeyword && (
                <Button
                  fill="none"
                  size="small"
                  className={style.clearSearchBtn}
                  onClick={handleClearSearch}
                >
                  <CloseOutlined />
                </Button>
              )}
            </div>
            <Button
              color="primary"
              size="small"
              onClick={handleSearchMembers}
              loading={loadingMembers}
              className={style.searchBtn}
            >
              搜索
            </Button>
          </div>
          <div className={style.memberList}>
            {loadingMembers ? (
              <div className={style.loadingBox}>
                <div className={style.loadingText}>加载中...</div>
              </div>
            ) : currentGroupMembers.length > 0 ? (
              currentGroupMembers.map(member => {
                const isSelected = currentSelectedMembers.some(m => m.id === member.id);
                return (
                  <div
                    key={member.id}
                    className={`${style.memberListItem} ${isSelected ? style.selected : ""}`}
                    onClick={() => handleSelectMember(memberSelectionVisible.groupId, member)}
                  >
                    <Avatar src={member.avatar} className={style.memberListItemAvatar} />
                    <div className={style.memberListItemName}>{member.nickname}</div>
                    {isSelected && <div className={style.checkmark}>✓</div>}
                  </div>
                );
              })
            ) : (
              <div className={style.emptyBox}>
                <div className={style.emptyText}>暂无成员数据</div>
              </div>
            )}
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default GroupSelectionWithMembers;
