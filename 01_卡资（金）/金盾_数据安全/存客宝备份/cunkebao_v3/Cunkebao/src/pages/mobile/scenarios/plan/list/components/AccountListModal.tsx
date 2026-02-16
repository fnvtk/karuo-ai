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
  fail_reason: string;
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
      const detailRes = await getUserList(ruleId.toString(), 1);
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
  const getStatusColor = (status?: string | number) => {
    // 确保status是数字类型
    const statusNum = Number(status);

    switch (statusNum) {
      case 0:
        return "#faad14"; // 待添加 - 黄色警告色
      case 1:
        return "#1890ff"; // 添加中 - 蓝色进行中
      case 2:
        return "#ff4d4f"; // 添加失败 - 红色错误色
      case 3:
        return "#ff4d4f"; // 添加失败 - 红色错误色
      case 4:
        return "#52c41a"; // 已添加 - 绿色成功色
      default:
        return "#d9d9d9"; // 未知状态 - 灰色
    }
  };

  const getStatusText = (status?: number) => {
    switch (status) {
      case 0:
        return "待添加";
      case 1:
        return "添加中";
      case 2:
        return "请求已发送待通过";
      case 3:
        return "添加失败";
      case 4:
        return "已添加";
      default:
        return "未知状态";
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
                  {account.fail_reason && (
                    <div style={{ fontSize: 12, color: "red", marginTop: 4 }}>
                      原因：{account.fail_reason}
                    </div>
                  )}
                </div>
                <div className={style.accountStatus}>
                  <span
                    className={style.statusDot}
                    style={{
                      backgroundColor: getStatusColor(account.status),
                    }}
                  />
                  <span className={style.statusText}>
                    {getStatusText(Number(account.status))}
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
