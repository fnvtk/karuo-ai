import React, { useState } from "react";
import { Card, Avatar, Button, Checkbox, Empty } from "antd-mobile";
import { DeleteOutline } from "antd-mobile-icons";
import styles from "./UserListPreview.module.scss";

interface User {
  id: string;
  name: string;
  avatar: string;
  tags: string[];
  rfmScore: number;
  lastActive: string;
  consumption: number;
}

interface UserListPreviewProps {
  users: User[];
  onRemoveUser: (userId: string) => void;
}

const UserListPreview: React.FC<UserListPreviewProps> = ({
  users,
  onRemoveUser,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleRemoveSelected = () => {
    selectedUsers.forEach(userId => onRemoveUser(userId));
    setSelectedUsers([]);
  };

  const getRfmLevel = (score: number) => {
    if (score >= 12) return { level: "高价值", color: "#ff4d4f" };
    if (score >= 8) return { level: "中等价值", color: "#faad14" };
    if (score >= 4) return { level: "低价值", color: "#52c41a" };
    return { level: "潜在客户", color: "#bfbfbf" };
  };

  if (users.length === 0) {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <Empty description="暂无用户数据" />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>用户列表预览</div>
          <div className={styles.userCount}>共 {users.length} 个用户</div>
        </div>

        {users.length > 0 && (
          <div className={styles.batchActions}>
            <Checkbox
              checked={
                selectedUsers.length === users.length && users.length > 0
              }
              onChange={handleSelectAll}
              className={styles.selectAllCheckbox}
            >
              全选
            </Checkbox>
            {selectedUsers.length > 0 && (
              <Button
                size="small"
                color="danger"
                fill="outline"
                onClick={handleRemoveSelected}
                className={styles.removeSelectedBtn}
              >
                移除选中 ({selectedUsers.length})
              </Button>
            )}
          </div>
        )}

        <div className={styles.userList}>
          {users.map(user => {
            const rfmInfo = getRfmLevel(user.rfmScore);

            return (
              <div key={user.id} className={styles.userItem}>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onChange={checked => handleSelectUser(user.id, checked)}
                  className={styles.userCheckbox}
                />

                <Avatar src={user.avatar} className={styles.userAvatar} />

                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.name}</div>
                  <div className={styles.userId}>ID: {user.id}</div>
                  <div className={styles.userTags}>
                    {user.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={styles.userStats}>
                    <span className={styles.statItem}>
                      RFM:{" "}
                      <span style={{ color: rfmInfo.color }}>
                        {rfmInfo.level}
                      </span>
                    </span>
                    <span className={styles.statItem}>
                      活跃: {user.lastActive}
                    </span>
                    <span className={styles.statItem}>
                      消费: ¥{user.consumption}
                    </span>
                  </div>
                </div>

                <Button
                  size="small"
                  fill="none"
                  onClick={() => onRemoveUser(user.id)}
                  className={styles.removeBtn}
                >
                  <DeleteOutline />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default UserListPreview;
