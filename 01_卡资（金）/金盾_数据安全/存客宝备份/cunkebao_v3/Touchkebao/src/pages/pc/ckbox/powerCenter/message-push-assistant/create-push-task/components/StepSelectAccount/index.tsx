"use client";

import React, { useMemo, useState } from "react";
import { Avatar, Empty, Input } from "antd";
import { CheckCircleOutlined, SearchOutlined } from "@ant-design/icons";

import styles from "../../index.module.scss";

interface StepSelectAccountProps {
  customerList: any[];
  selectedAccounts: any[];
  onChange: (accounts: any[]) => void;
}

const StepSelectAccount: React.FC<StepSelectAccountProps> = ({
  customerList,
  selectedAccounts,
  onChange,
}) => {
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredAccounts = useMemo(() => {
    if (!searchKeyword.trim()) return customerList;
    const keyword = searchKeyword.toLowerCase();
    return customerList.filter(
      account =>
        (account.nickname || "").toLowerCase().includes(keyword) ||
        (account.wechatId || "").toLowerCase().includes(keyword),
    );
  }, [customerList, searchKeyword]);

  const handleAccountToggle = (account: any) => {
    const isSelected = selectedAccounts.some(a => a.id === account.id);
    if (isSelected) {
      onChange(selectedAccounts.filter(a => a.id !== account.id));
      return;
    }
    onChange([...selectedAccounts, account]);
  };

  return (
    <div className={styles.step1Content}>
      <div className={styles.stepHeader}>
        <h3>选择微信账号</h3>
        <p>可选择多个微信账号进行推送</p>
      </div>

      <div className={styles.searchBar}>
        <Input
          placeholder="请输入昵称/微信号进行搜索"
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          allowClear
        />
      </div>

      {filteredAccounts.length > 0 ? (
        <div className={styles.accountCards}>
          {filteredAccounts.map(account => {
            const isSelected = selectedAccounts.some(s => s.id === account.id);
            return (
              <div
                key={account.id}
                className={`${styles.accountCard} ${isSelected ? styles.selected : ""}`}
                onClick={() => handleAccountToggle(account)}
              >
                <Avatar
                  src={account.avatar}
                  size={40}
                  style={{ backgroundColor: "#1890ff" }}
                  shape="square"
                >
                  {!account.avatar &&
                    (account.nickname || account.name || "").charAt(0)}
                </Avatar>
                <div className={styles.accountInfo}>
                  <div className={styles.accountName}>
                    {account.nickname || account.name || "未知"}
                  </div>
                  <div className={styles.accountStatus}>
                    <span
                      className={`${styles.statusDot} ${account.isOnline ? styles.online : styles.offline}`}
                    />
                    <span className={styles.statusText}>
                      {account.isOnline ? "在线" : "离线"}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircleOutlined className={styles.checkmark} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          description={searchKeyword ? "未找到匹配的账号" : "暂无微信账号"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
};

export default StepSelectAccount;
