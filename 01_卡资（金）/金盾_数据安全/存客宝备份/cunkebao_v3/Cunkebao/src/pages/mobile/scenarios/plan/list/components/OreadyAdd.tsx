import React, { useEffect, useState } from "react";
import { Popup, Avatar, SpinLoading } from "antd-mobile";
import { Button, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import style from "./Popups.module.scss";
import { getUserList } from "../api";

interface AccountItem {
  id: string | number;
  nickname?: string;
  wechatId?: string;
  avatar?: string;
  status?: string;
  userinfo: {
    alias: string;
    nickname: string;
    avatar: string;
    wechatId: string;
  };
  phone?: string;
}

interface AccountListModalProps {
  visible: boolean;
  onClose: () => void;
  ruleId?: number;
  ruleName?: string;
}

const AccountListModal: React.FC<AccountListModalProps> = ({
  visible,
  onClose,
  ruleId,
  ruleName,
}) => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取账号数据
  const fetchAccounts = async () => {
    if (!ruleId) return;

    setLoading(true);
    try {
      const detailRes = await getUserList(ruleId.toString(), 2);
      const accountData = detailRes?.list || [];
      setAccounts(accountData);
    } catch (error) {
      console.error("获取账号详情失败:", error);
      message.error("获取账号详情失败");
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗打开且有ruleId时，获取数据
  useEffect(() => {
    if (visible && ruleId) {
      fetchAccounts();
    }
  }, [visible, ruleId]);

  const title = ruleName ? `${ruleName} - 已添加账号列表` : "已添加账号列表";
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "normal":
        return "#52c41a";
      case "limited":
        return "#faad14";
      case "blocked":
        return "#ff4d4f";
      default:
        return "#d9d9d9";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "normal":
        return "正常";
      case "limited":
        return "受限";
      case "blocked":
        return "封禁";
      default:
        return "未知";
    }
  };

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        height: "70vh",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
    >
      <div className={style.accountModal}>
        {/* 头部 */}
        <div className={style.accountModalHeader}>
          <h3 className={style.accountModalTitle}>{title}</h3>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={style.accountModalClose}
          />
        </div>

        {/* 账号列表 */}
        <div className={style.accountList}>
          {loading ? (
            <div className={style.accountLoading}>
              <SpinLoading color="primary" />
              <div className={style.accountLoadingText}>
                正在加载账号列表...
              </div>
            </div>
          ) : accounts.length > 0 ? (
            accounts.map((account, index) => (
              <div key={account.id || index} className={style.accountItem}>
                <div className={style.accountAvatar}>
                  <Avatar
                    src={account.userinfo.avatar}
                    style={{ "--size": "48px" }}
                    fallback={
                      (account.userinfo.nickname ||
                        account.userinfo.alias ||
                        "账号")[0]
                    }
                  />
                </div>
                <div className={style.accountInfo}>
                  <div className={style.accountName}>
                    {account.userinfo.nickname ||
                      account.userinfo.alias ||
                      `账号${account.phone || account.id}`}
                  </div>
                  <div className={style.accountWechatId}>
                    {account.userinfo.wechatId || "未绑定微信号"}
                  </div>
                </div>
                <div className={style.accountStatus}>
                  <span
                    className={style.statusDot}
                    style={{ backgroundColor: getStatusColor(account.status) }}
                  />
                  <span className={style.statusText}>
                    {getStatusText(account.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className={style.accountEmpty}>
              <div className={style.accountEmptyText}>暂无账号数据</div>
            </div>
          )}
        </div>

        {/* 底部统计 */}
        <div className={style.accountModalFooter}>
          <div className={style.accountStats}>
            <span>共 {accounts.length} 个账号</span>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default AccountListModal;
