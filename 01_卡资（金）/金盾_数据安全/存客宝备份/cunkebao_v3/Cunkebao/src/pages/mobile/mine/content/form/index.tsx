import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input as AntdInput, Switch, Tag } from "antd";
import { Button, Collapse, Toast, DatePicker, Tabs } from "antd-mobile";
import { DownOutlined } from "@ant-design/icons";
import NavCommon from "@/components/NavCommon";
import FriendSelection from "@/components/FriendSelection";
import GroupSelection from "@/components/GroupSelection";
import GroupSelectionWithMembers from "@/components/GroupSelectionWithMembers";
import DeviceSelection from "@/components/DeviceSelection";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import { getContentLibraryDetail, updateContentLibrary, createContentLibrary } from "./api";
import { GroupSelectionItem } from "@/components/GroupSelection/data";
import { GroupWithMembers } from "@/components/GroupSelectionWithMembers";
import { FriendSelectionItem } from "@/components/FriendSelection/data";
import { DeviceSelectionItem } from "@/components/DeviceSelection/data";

const { TextArea } = AntdInput;

function formatDate(date: Date | null) {
  if (!date) return "";
  // 格式化为 YYYY-MM-DD
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ContentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const [sourceType, setSourceType] = useState<"friends" | "groups">("friends");
  const [name, setName] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelectionItem[]>([]);
  const [deviceSelectionVisible, setDeviceSelectionVisible] = useState(false);

  // 处理设备选择（单选模式）
  const handleDeviceSelect = (devices: DeviceSelectionItem[]) => {
    // 单选模式：只保留最后一个选中的设备
    setSelectedDevices(devices.length > 0 ? [devices[devices.length - 1]] : []);
    setDeviceSelectionVisible(false);
  };
  const [friendsGroups, setSelectedFriends] = useState<string[]>([]);
  const [friendsGroupsOptions, setSelectedFriendsOptions] = useState<
    FriendSelectionItem[]
  >([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedGroupsOptions, setSelectedGroupsOptions] = useState<
    GroupSelectionItem[]
  >([]);
  const [selectedGroupsWithMembers, setSelectedGroupsWithMembers] = useState<
    GroupWithMembers[]
  >([]);
  const [useAI, setUseAI] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("重写这条朋友圈 要求：  1、原本的字数和意思不要修改超过10%  2、出现品牌名或个人名字就去除");
  const [enabled, setEnabled] = useState(true);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [keywordsInclude, setKeywordsInclude] = useState("");
  const [keywordsExclude, setKeywordsExclude] = useState("");
  const [catchType, setCatchType] = useState<string[]>([
    "text",
    "image",
    "video",
    "link",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // 编辑模式下拉详情并回填
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getContentLibraryDetail(id)
        .then(data => {
          setName(data.name || "");
          setSourceType(data.sourceType === 1 ? "friends" : "groups");
          // 详情接口中的采集设备数据可能在 devices / selectedDevices / deviceGroupsOptions 中
          const deviceOptions: DeviceSelectionItem[] =
            data.devices ||
            data.selectedDevices ||
            (data.deviceGroupsOptions
              ? (data.deviceGroupsOptions as any[]).map(item => ({
                  id: item.id,
                  memo: item.memo,
                  imei: item.imei,
                  wechatId: item.wechatId,
                  status: item.alive === 1 ? "online" : "offline",
                  nickname: item.nickname,
                  avatar: item.avatar,
                  totalFriend: item.totalFriend,
                }))
              : []);
          setSelectedDevices(deviceOptions || []);
          setSelectedFriends(data.sourceFriends || []);
          // 使用 wechatGroupsOptions 作为群列表数据
          const groupsOptions = data.wechatGroupsOptions || data.selectedGroupsOptions || [];
          setSelectedGroupsOptions(groupsOptions);
          // 从 groupsOptions 中提取群 ID 列表，如果没有 selectedGroups 的话
          const groupIds = data.selectedGroups && data.selectedGroups.length > 0
            ? data.selectedGroups
            : groupsOptions.map((g: any) => String(g.id));
          setSelectedGroups(groupIds);
          // 处理带成员的群数据
          // groupMembersOptions 是一个对象，key是群ID（字符串），value是成员数组
          const groupMembersMap = data.groupMembersOptions || {};
          const groupsWithMembers: GroupWithMembers[] = groupsOptions.map(
            (group: any) => {
              const groupIdStr = String(group.id);
              const members = groupMembersMap[groupIdStr] || [];
              // 映射成员数据结构
              return {
                ...group,
                members: members.map((member: any) => ({
                  id: String(member.id),
                  nickname: member.nickname || "",
                  wechatId: member.wechatId || "",
                  avatar: member.avatar || "",
                  gender: undefined,
                  role: undefined,
                })),
              };
            },
          );
          setSelectedGroupsWithMembers(groupsWithMembers);
          setSelectedFriendsOptions(data.friendsGroupsOptions || []);
          setKeywordsInclude((data.keywordInclude || []).join(","));
          setKeywordsExclude((data.keywordExclude || []).join(","));
          setCatchType(data.catchType || ["text", "image", "video", "link"]);
          setAIPrompt(data.aiPrompt || "");
          // aiEnabled 为 AI 提示词开关，1 开启 0 关闭
          if (typeof data.aiEnabled !== "undefined") {
            setUseAI(data.aiEnabled === 1);
          } else {
            // 兼容旧数据，默认根据是否有 aiPrompt 判断
          setUseAI(!!data.aiPrompt);
          }
          setEnabled(data.status === 1);
          // 时间范围
          const start = data.timeStart || data.startTime;
          const end = data.timeEnd || data.endTime;
          setDateRange([
            start ? new Date(start) : null,
            end ? new Date(end) : null,
          ]);
        })
        .catch(e => {
          Toast.show({
            content: e?.message || "获取详情失败",
            position: "top",
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isEdit, id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      Toast.show({ content: "请输入内容库名称", position: "top" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        sourceType: sourceType === "friends" ? 1 : 2,
        devices: selectedDevices.map(d => d.id),
        friendsGroups: friendsGroups,
        wechatGroups: selectedGroups,
        groupMembers: selectedGroupsWithMembers.reduce(
          (acc, group) => {
            if (group.members && group.members.length > 0) {
              acc[group.id] = group.members.map(m => m.id);
            }
            return acc;
          },
          {} as Record<string, string[]>,
        ),
        keywordInclude: keywordsInclude
          .split(/,|，|\n|\s+/)
          .map(s => s.trim())
          .filter(Boolean),
        keywordExclude: keywordsExclude
          .split(/,|，|\n|\s+/)
          .map(s => s.trim())
          .filter(Boolean),
        catchType,
        aiPrompt,
          aiEnabled: useAI ? 1 : 0,
        timeEnabled: dateRange[0] || dateRange[1] ? 1 : 0,
        startTime: dateRange[0] ? formatDate(dateRange[0]) : "",
        endTime: dateRange[1] ? formatDate(dateRange[1]) : "",
        status: enabled ? 1 : 0,
      };
      if (isEdit && id) {
        await updateContentLibrary({ id, ...payload });
        Toast.show({ content: "保存成功", position: "top" });
      } else {
        await createContentLibrary(payload);
        Toast.show({ content: "创建成功", position: "top" });
      }
      navigate("/mine/content");
    } catch (e: any) {
      Toast.show({
        content: e?.message || (isEdit ? "保存失败" : "创建失败"),
        position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupsChange = (groups: GroupSelectionItem[]) => {
    setSelectedGroups(groups.map(g => g.id.toString()));
    setSelectedGroupsOptions(groups);
  };

  const handleGroupsWithMembersChange = (groups: GroupWithMembers[]) => {
    setSelectedGroupsWithMembers(groups);
    setSelectedGroups(groups.map(g => g.id.toString()));
    setSelectedGroupsOptions(groups);
  };

  const handleFriendsChange = (friends: FriendSelectionItem[]) => {
    setSelectedFriends(friends.map(f => f.id.toString()));
    setSelectedFriendsOptions(friends);
  };

  return (
    <Layout
      header={<NavCommon title={isEdit ? "编辑内容库" : "新建内容库"} />}
      footer={
        <div style={{ padding: "16px", backgroundColor: "#fff" }}>
          <Button
            block
            color="primary"
            loading={submitting || loading}
            disabled={submitting || loading}
            onClick={handleSubmit}
          >
            {isEdit
              ? submitting
                ? "保存中..."
                : "保存内容库"
              : submitting
                ? "创建中..."
                : "创建内容库"}
          </Button>
        </div>
      }
    >
      <div className={style["form-page"]}>
        <form
          className={style["form-main"]}
          onSubmit={e => e.preventDefault()}
          autoComplete="off"
        >
          <div className={style["form-card"]}>
            <label className={style["form-label"]}>
              <span style={{ color: "#ff4d4f", marginRight: 4 }}>*</span>
              内容库名称
            </label>
            <AntdInput
              placeholder="请输入内容库名称"
              value={name}
              onChange={e => setName(e.target.value)}
              className={style["input"]}
            />
          </div>

          <div className={style["form-card"]}>
            <label className={style["form-label"]}>
              <span style={{ color: "#ff4d4f", marginRight: 4 }}>*</span>
              来源渠道
            </label>
            <Tag color="blue" className={style["source-tag"]}>
              微信
            </Tag>
          </div>

          <div className={style["form-card"]}>
            <label className={style["form-label"]}>
              <span style={{ color: "#ff4d4f", marginRight: 4 }}>*</span>
              选择采集设备
            </label>
            {selectedDevices.length > 0 ? (
              <div
                className={style["device-card"]}
                onClick={() => setDeviceSelectionVisible(true)}
              >
                <div className={style["device-avatar"]}>
                  {selectedDevices[0].avatar ? (
                    <img
                      src={selectedDevices[0].avatar}
                      alt="头像"
                      className={style["avatar-img"]}
                    />
                  ) : (
                    <span className={style["avatar-text"]}>
                      {(selectedDevices[0].memo ||
                        selectedDevices[0].wechatId ||
                        "设")[0]}
                    </span>
                  )}
                </div>
                <div className={style["device-info"]}>
                  <div className={style["device-name-row"]}>
                    <span className={style["device-name"]}>
                      {selectedDevices[0].nickname || selectedDevices[0].memo}
                    </span>
                    {selectedDevices[0].memo &&
                     selectedDevices[0].nickname &&
                     selectedDevices[0].memo !== selectedDevices[0].nickname && (
                      <span className={style["device-tag"]}>
                        {selectedDevices[0].memo}
                      </span>
                    )}
                    <span
                      className={`${style["status-dot"]} ${
                        selectedDevices[0].status === "online"
                          ? style["online"]
                          : style["offline"]
                      }`}
                    />
                  </div>
                  <div className={style["device-wechat-id"]}>
                    微信ID: {selectedDevices[0].wechatId}
                  </div>
                </div>
                <div className={style["device-arrow"]}>
                  <DownOutlined />
                </div>
              </div>
            ) : (
              <div className={style["device-input-wrapper"]}>
                <DeviceSelection
                  selectedOptions={selectedDevices}
                  onSelect={handleDeviceSelect}
                  placeholder="选择采集设备"
                  showInput={true}
                  showSelectedList={false}
                  singleSelect={true}
                  className={style["device-input"]}
                />
              </div>
            )}
            {/* 隐藏的设备选择组件，用于打开弹窗 */}
            <div style={{ display: "none" }}>
              <DeviceSelection
                selectedOptions={selectedDevices}
                onSelect={handleDeviceSelect}
                placeholder="选择采集设备"
                showInput={false}
                showSelectedList={false}
                singleSelect={true}
                mode="dialog"
                open={deviceSelectionVisible}
                onOpenChange={setDeviceSelectionVisible}
              />
            </div>
          </div>

          <div className={style["section-title"]}>采集内容配置</div>
          <div className={style["form-card"]}>
            <Tabs
              activeKey={sourceType}
              onChange={key => setSourceType(key as "friends" | "groups")}
              className={style["tabs-bar"]}
            >
              <Tabs.Tab title="选择微信好友" key="friends">
                <FriendSelection
                  selectedOptions={friendsGroupsOptions}
                  onSelect={handleFriendsChange}
                  placeholder="选择微信好友"
                  deviceIds={selectedDevices.map(d => Number(d.id))}
                />
              </Tabs.Tab>
              <Tabs.Tab title="选择聊天群" key="groups">
                <GroupSelectionWithMembers
                  selectedGroups={selectedGroupsWithMembers}
                  onSelect={handleGroupsWithMembersChange}
                  placeholder="选择聊天群"
                />
              </Tabs.Tab>
            </Tabs>
          </div>

          <div className={style["form-card"]}>
            <Collapse className={style["keyword-collapse"]}>
            <Collapse.Panel
              key="keywords"
                title={
                  <div className={style["keyword-header"]}>
                    <span className={style["keyword-title"]}>关键词设置</span>
                    <DownOutlined className={style["keyword-arrow"]} />
                  </div>
                }
            >
              <div className={style["form-section"]}>
                <label className={style["form-label"]}>包含关键词</label>
                <TextArea
                  placeholder="多个关键词用逗号分隔"
                  value={keywordsInclude}
                  onChange={e => setKeywordsInclude(e.target.value)}
                  className={style["input"]}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </div>
              <div className={style["form-section"]}>
                <label className={style["form-label"]}>排除关键词</label>
                <TextArea
                  placeholder="多个关键词用逗号分隔"
                  value={keywordsExclude}
                  onChange={e => setKeywordsExclude(e.target.value)}
                  className={style["input"]}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </div>
            </Collapse.Panel>
          </Collapse>
          </div>

          {/* 采集内容类型 */}
          <div className={style["form-card"]}>
            <div className={style["content-type-header"]}>
              <span className={style["content-type-title"]}>采集内容类型</span>
            </div>
            <div className={style["content-type-buttons"]}>
              {["text", "image", "video", "link"].map(type => (
                <button
                  key={type}
                  className={`${style["content-type-btn"]} ${
                    catchType.includes(type) ? style["active"] : ""
                  }`}
                  onClick={() => {
                    setCatchType(prev =>
                      prev.includes(type)
                        ? prev.filter(t => t !== type)
                        : [...prev, type],
                    );
                  }}
                >
                    {type === "text"
                      ? "文本"
                      : type === "image"
                        ? "图片"
                        : type === "video"
                          ? "视频"
                          : "链接"}
                </button>
              ))}
            </div>
          </div>

          <div className={style["form-card"]}>
          <div
            className={style["form-section"]}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Switch checked={useAI} onChange={setUseAI} />
            <span className={style["ai-desc"]}>
                启用后,该内容库下的内容会通过AI生成
            </span>
          </div>
          {useAI && (
            <div className={style["form-section"]}>
              <label className={style["form-label"]}>AI提示词</label>
              <TextArea
                  placeholder="请输入AI提示词"
                  value={aiPrompt}
                  onChange={e => setAIPrompt(e.target.value)}
                  className={style["input"]}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                />
            </div>
          )}
          </div>

          <div className={style["form-card"]}>
            <div className={style["time-limit-header"]}>
              <span className={style["time-limit-title"]}>时间限制</span>
            </div>
            <div className={style["date-inputs"]}>
              <div className={style["date-item"]}>
                <label className={style["date-label"]}>开始时间</label>
              <AntdInput
                readOnly
                  value={
                    dateRange[0]
                      ? `${dateRange[0].getFullYear()}/${String(dateRange[0].getMonth() + 1).padStart(2, "0")}/${String(dateRange[0].getDate()).padStart(2, "0")}`
                      : ""
                  }
                placeholder="年/月/日"
                  className={style["date-input"]}
                onClick={() => setShowStartPicker(true)}
              />
              <DatePicker
                visible={showStartPicker}
                title="开始时间"
                value={dateRange[0]}
                onClose={() => setShowStartPicker(false)}
                onConfirm={val => {
                  setDateRange([val, dateRange[1]]);
                  setShowStartPicker(false);
                }}
              />
            </div>
              <div className={style["date-item"]}>
                <label className={style["date-label"]}>结束时间</label>
              <AntdInput
                readOnly
                  value={
                    dateRange[1]
                      ? `${dateRange[1].getFullYear()}/${String(dateRange[1].getMonth() + 1).padStart(2, "0")}/${String(dateRange[1].getDate()).padStart(2, "0")}`
                      : ""
                  }
                placeholder="年/月/日"
                  className={style["date-input"]}
                onClick={() => setShowEndPicker(true)}
              />
              <DatePicker
                visible={showEndPicker}
                title="结束时间"
                value={dateRange[1]}
                onClose={() => setShowEndPicker(false)}
                onConfirm={val => {
                  setDateRange([dateRange[0], val]);
                  setShowEndPicker(false);
                }}
              />
              </div>
            </div>
          </div>

          <div className={style["form-card"]}>
            <div className={style["enable-section"]}>
              <span className={style["enable-label"]}>是否启用</span>
            <Switch checked={enabled} onChange={setEnabled} />
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
