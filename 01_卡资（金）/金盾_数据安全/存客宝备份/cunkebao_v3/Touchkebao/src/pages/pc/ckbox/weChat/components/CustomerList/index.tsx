import React, { useEffect, useState } from "react";
import { Avatar, Badge } from "antd";
import styles from "./com.module.scss";
import {
  useCustomerStore,
  updateCurrentCustomer,
  updateCustomerList,
} from "@weChatStore/customer";
import { getChatSessions } from "@storeModule/ckchat/ckchat";
import { getCustomerList } from "@apiModule/wechat";
const CustomerList: React.FC = () => {
  const [loading, setLoading] = useState(true);

  //初始化获取客服列表
  useEffect(() => {
    setLoading(true);
    getCustomerList()
      .then(res => {
        updateCustomerList(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);
  const handleUserSelect = (userId: number) => {
    updateCurrentCustomer(
      customerList.find(customer => customer.id === userId) || null,
    );
  };
  const customerList = useCustomerStore(state => state.customerList);
  const currentCustomer = useCustomerStore(state => state.currentCustomer);

  const chatSessions = getChatSessions();
  const getUnreadCount = (customerId: number) => {
    if (currentCustomer?.id != 0) {
      const session = chatSessions.filter(
        v => v.wechatAccountId === customerId,
      );
      return session.reduce(
        (pre, cur) => pre + (cur.config.unreadCount || 0),
        0,
      );
    } else {
      return chatSessions.reduce(
        (pre, cur) => pre + (cur.config?.unreadCount || 0),
        0,
      );
    }
  };

  // 骨架屏组件
  const SkeletonItem = () => (
    <div className={styles.skeletonItem}>
      <div className={styles.skeletonAvatar} />
      <div className={styles.skeletonIndicator} />
    </div>
  );

  // 骨架屏列表
  const SkeletonList = () => (
    <div className={styles.skeletonContainer}>
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </div>
  );

  return (
    <div className={styles.customerList}>
      <div className={styles.userListHeader}>
        <div className={styles.allFriends}>微信号</div>
      </div>
      <div className={styles.userList}>
        {loading ? (
          <SkeletonList />
        ) : (
          <>
            <div
              className={styles.userItem}
              onClick={() => handleUserSelect(0)}
            >
              <Badge
                count={getUnreadCount(0)}
                overflowCount={99}
                className={styles.messageBadge}
              >
                <div className={styles.allUser}>全部</div>
              </Badge>
            </div>
            {customerList.map(customer => (
              <div
                key={customer.id}
                className={`${styles.userItem} ${currentCustomer?.id === customer.id ? styles.active : ""}`}
                onClick={() => handleUserSelect(customer.id)}
              >
                <Badge
                  count={getUnreadCount(customer.id)}
                  overflowCount={99}
                  className={styles.messageBadge}
                >
                  <div className={styles.avatarWrapper}>
                    <Avatar
                      src={customer.avatar}
                      size={50}
                      className={`${styles.userAvatar} ${!customer.isOnline ? styles.offline : ""}`}
                      style={{
                        backgroundColor: !customer.avatar
                          ? "#1890ff"
                          : undefined,
                      }}
                    >
                      {!customer.avatar && customer.name.charAt(0)}
                    </Avatar>
                    {customer.isOnline && (
                      <span
                        className={`${styles.onlineIndicator} ${styles.online}`}
                      />
                    )}
                  </div>
                </Badge>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
