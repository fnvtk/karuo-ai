import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar, List, Dialog, Toast, Card, Input } from "antd-mobile";
import {
  LockOutlined,
  MobileOutlined,
  SafetyOutlined,
  RightOutlined,
} from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import { useUserStore } from "@/store/module/user";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";
const SecuritySetting: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 修改密码
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({ content: "请填写完整信息", position: "top" });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ content: "两次输入的新密码不一致", position: "top" });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({ content: "新密码长度不能少于6位", position: "top" });
      return;
    }

    try {
      // TODO: 调用修改密码API
      Toast.show({ content: "密码修改成功", position: "top" });
      setShowPasswordDialog(false);
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      Toast.show({ content: error.message || "密码修改失败", position: "top" });
    }
  };

  // 绑定手机号
  const handleBindPhone = () => {
    Toast.show({ content: "功能开发中", position: "top" });
  };

  // 登录设备管理
  const handleDeviceManagement = () => {
    Toast.show({ content: "功能开发中", position: "top" });
  };

  // 安全设置项
  const securityItems = [
    {
      id: "password",
      title: "修改密码",
      description: "定期更换密码，保护账号安全",
      icon: <LockOutlined />,
      onClick: () => setShowPasswordDialog(true),
    },
    {
      id: "phone",
      title: "绑定手机号",
      description: user?.phone
        ? `已绑定：${user.phone}`
        : "绑定手机号，提高账号安全性",
      icon: <MobileOutlined />,
      onClick: handleBindPhone,
    },
    {
      id: "devices",
      title: "登录设备管理",
      description: "查看和管理已登录的设备",
      icon: <SafetyOutlined />,
      onClick: handleDeviceManagement,
    },
  ];

  return (
    <Layout header={<NavCommon title="安全设置" />}>
      <div className={style["setting-page"]}>
        {/* 安全提示卡片 */}
        <Card className={style["security-tip-card"]}>
          <div className={style["tip-content"]}>
            <SafetyOutlined className={style["tip-icon"]} />
            <div className={style["tip-text"]}>
              <div className={style["tip-title"]}>账号安全提醒</div>
              <div className={style["tip-description"]}>
                建议定期更换密码，开启双重验证，保护您的账号安全
              </div>
            </div>
          </div>
        </Card>

        {/* 安全设置列表 */}
        <Card className={style["setting-group"]}>
          <div className={style["group-title"]}>安全设置</div>
          <List>
            {securityItems.map(item => (
              <List.Item
                key={item.id}
                prefix={item.icon}
                title={item.title}
                description={item.description}
                onClick={item.onClick}
              />
            ))}
          </List>
        </Card>

        {/* 安全建议 */}
        <Card className={style["security-advice-card"]}>
          <div className={style["advice-title"]}>安全建议</div>
          <div className={style["advice-list"]}>
            <div className={style["advice-item"]}>
              <span className={style["advice-dot"]}>•</span>
              <span>使用强密码，包含字母、数字和特殊字符</span>
            </div>
            <div className={style["advice-item"]}>
              <span className={style["advice-dot"]}>•</span>
              <span>定期更换密码，建议每3个月更换一次</span>
            </div>
            <div className={style["advice-item"]}>
              <span className={style["advice-dot"]}>•</span>
              <span>不要在公共场所登录账号</span>
            </div>
            <div className={style["advice-item"]}>
              <span className={style["advice-dot"]}>•</span>
              <span>及时清理不常用的登录设备</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 修改密码对话框 */}
      <Dialog
        visible={showPasswordDialog}
        title="修改密码"
        content={
          <div className={style["password-form"]}>
            <div className={style["line"]}>
              <Input
                type="password"
                placeholder="请输入当前密码"
                value={passwordForm.oldPassword}
                onChange={value =>
                  setPasswordForm(prev => ({ ...prev, oldPassword: value }))
                }
              />
            </div>
            <div className={style["line"]}>
              <Input
                type="password"
                placeholder="请输入新密码"
                value={passwordForm.newPassword}
                onChange={value =>
                  setPasswordForm(prev => ({ ...prev, newPassword: value }))
                }
              />
            </div>
            <div className={style["line"]}>
              <Input
                type="password"
                placeholder="请确认新密码"
                value={passwordForm.confirmPassword}
                onChange={value =>
                  setPasswordForm(prev => ({ ...prev, confirmPassword: value }))
                }
              />
            </div>
          </div>
        }
        closeOnAction
        actions={[
          [
            {
              key: "cancel",
              text: "取消",
              onClick: () => {
                setShowPasswordDialog(false);
                setPasswordForm({
                  oldPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              },
            },
            {
              key: "confirm",
              text: "确认修改",
              bold: true,
              onClick: handleChangePassword,
            },
          ],
        ]}
        onClose={() => {
          setShowPasswordDialog(false);
          setPasswordForm({
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }}
      />
    </Layout>
  );
};

export default SecuritySetting;
