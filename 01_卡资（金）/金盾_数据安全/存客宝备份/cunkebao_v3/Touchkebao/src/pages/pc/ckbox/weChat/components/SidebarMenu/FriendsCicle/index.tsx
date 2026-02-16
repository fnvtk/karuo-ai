import React, { useState, useEffect } from "react";
import { Collapse } from "antd";
import { ChromeOutlined } from "@ant-design/icons";
import { MomentList } from "./components/friendCard";

import dayjs from "dayjs";
import styles from "./index.module.scss";
import { fetchFriendsCircleData } from "./api";
import { useCustomerStore } from "@/store/module/weChat/customer";
import { useWeChatStore } from "@/store/module/weChat/weChat";

interface FriendsCircleProps {
  wechatFriendId?: number;
}

const FriendsCircle: React.FC<FriendsCircleProps> = ({ wechatFriendId }) => {
  const currentCustomer = useCustomerStore(state => state.currentCustomer);
  const { clearMomentCommon, updateMomentCommonLoading } = useWeChatStore();
  const MomentCommon = useWeChatStore(state => state.MomentCommon);
  const MomentCommonLoading = useWeChatStore(
    state => state.MomentCommonLoading,
  );

  // 页面重新渲染时重置MomentCommonLoading状态
  useEffect(() => {
    updateMomentCommonLoading(false);
  }, []);

  // 状态管理
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 加载更多我的朋友圈
  const loadMomentData = async (loadMore: boolean = false) => {
    updateMomentCommonLoading(true);
    // 加载数据;
    const requestData = {
      cmdType: "CmdFetchMoment",
      wechatAccountId: currentCustomer?.id || 0,
      wechatFriendId: wechatFriendId || 0,
      createTimeSec: Math.floor(dayjs().subtract(2, "month").valueOf() / 1000),
      prevSnsId: loadMore
        ? Number(MomentCommon[MomentCommon.length - 1]?.snsId) || 0
        : 0,
      count: 10,
      isTimeline: expandedKeys.includes("1"),
      seq: Date.now(),
    };
    await fetchFriendsCircleData(requestData);
  };

  // 处理折叠面板展开/收起
  const handleCollapseChange = (keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    setExpandedKeys(keyArray);
    if (!MomentCommonLoading && keys.length > 0) {
      clearMomentCommon();
      loadMomentData(false);
    }
  };

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 默认头像路径
  const defaultAvatar = "/assets/face/smile.png";

  const collapseItems = [
    {
      key: "1",
      label: (
        <div className={styles.collapseHeader}>
          <img
            className={styles.avatar}
            src={currentCustomer?.avatar || defaultAvatar}
            alt="客服头像"
            onError={e => {
              // 如果图片加载失败，使用默认头像
              const target = e.target as HTMLImageElement;
              if (target.src !== defaultAvatar) {
                target.src = defaultAvatar;
              }
            }}
          />
          <span className={styles.specialText}>我的朋友圈</span>
        </div>
      ),
      children: (
        <MomentList
          currentCustomer={currentCustomer}
          MomentCommon={MomentCommon}
          MomentCommonLoading={MomentCommonLoading}
          loadMomentData={loadMomentData}
          formatTime={formatTime}
        />
      ),
    },
    {
      key: "2",
      label: (
        <div className={styles.collapseHeader}>
          <ChromeOutlined style={{ fontSize: 20 }} />
          <span className={styles.specialText}>朋友圈广场</span>
        </div>
      ),
      children: (
        <MomentList
          currentCustomer={currentCustomer}
          MomentCommon={MomentCommon}
          MomentCommonLoading={MomentCommonLoading}
          loadMomentData={loadMomentData}
          formatTime={formatTime}
        />
      ),
    },
    ...(wechatFriendId
      ? [
          {
            key: "3",
            label: (
              <div className={styles.collapseHeader}>
                <ChromeOutlined style={{ fontSize: 20 }} />
                <span className={styles.specialText}>好友朋友圈</span>
              </div>
            ),
            children: (
              <MomentList
                currentCustomer={currentCustomer}
                MomentCommon={MomentCommon}
                MomentCommonLoading={MomentCommonLoading}
                loadMomentData={loadMomentData}
                formatTime={formatTime}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={styles.friendsCircle}>
      {/* 可折叠的特殊模块，包含所有朋友圈数据 */}
      <Collapse
        items={collapseItems}
        className={styles.collapseContainer}
        ghost
        accordion
        activeKey={expandedKeys}
        onChange={handleCollapseChange}
      />
    </div>
  );
};

export default FriendsCircle;
