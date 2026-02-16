import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Button, Toast, Card } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import AvatarUpload from "@/components/Upload/AvatarUpload";
import { useUserStore } from "@/store/module/user";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";
import { editUserInfo } from "./api";

const UserSetting: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const [nickname, setNickname] = useState(user?.username || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  // 保存个人信息
  const handleSave = async () => {
    if (!nickname.trim()) {
      Toast.show({ content: "昵称不能为空", position: "top" });
      return;
    }

    if (nickname.length > 20) {
      Toast.show({ content: "昵称长度不能超过20个字符", position: "top" });
      return;
    }

    setSaving(true);
    try {
      // 调用API更新用户信息
      const params = {
        userId: user.id,
        username: nickname,
        avatar: avatar,
      };
      await editUserInfo(params);

      // 更新本地用户信息
      setUser({
        ...user,
        username: nickname,
        avatar: avatar,
      });

      Toast.show({ content: "保存成功", position: "top" });
      navigate(-1);
    } catch (error: any) {
      console.error("保存失败:", error);
      Toast.show({ content: error.message || "保存失败", position: "top" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      header={<NavCommon title="个人信息" />}
      footer={
        <div className={style["save-buttons"]}>
          <Button block color="primary" onClick={handleSave} loading={saving}>
            保存
          </Button>
        </div>
      }
    >
      <div className={style["setting-page"]}>
        {/* 头像设置 */}
        <Card className={style["avatar-card"]}>
          <div className={style["avatar-section"]}>
            <div className={style["avatar-title"]}>头像</div>
            <div className={style["avatar-container"]}>
              <AvatarUpload
                value={avatar}
                onChange={setAvatar}
                size={100}
                disabled={saving}
              />
            </div>
          </div>
        </Card>

        {/* 基本信息 */}
        <Card className={style["info-card"]}>
          <div className={style["info-section"]}>
            <div className={style["info-title"]}>基本信息</div>

            <div className={style["input-group"]}>
              <label className={style["input-label"]}>昵称</label>
              <Input
                className={style["input-field"]}
                value={nickname}
                onChange={setNickname}
                placeholder="请输入昵称"
                maxLength={20}
                clearable
                disabled={saving}
              />
              <div className={style["input-tip"]}>{nickname.length}/20</div>
            </div>

            <div className={style["input-group"]}>
              <label className={style["input-label"]}>账号</label>
              <div className={style["readonly-field"]}>
                {user?.account || "未知账号"}
              </div>
            </div>

            <div className={style["input-group"]}>
              <label className={style["input-label"]}>手机号</label>
              <div className={style["readonly-field"]}>
                {user?.phone || "未绑定"}
              </div>
            </div>

            <div className={style["input-group"]}>
              <label className={style["input-label"]}>角色</label>
              <div className={style["readonly-field"]}>
                {user?.isAdmin === 1 ? "管理员" : "普通用户"}
              </div>
            </div>
          </div>
        </Card>

        {/* 提示信息 */}
        <Card className={style["tip-card"]}>
          <div className={style["tip-content"]}>
            <div className={style["tip-title"]}>温馨提示</div>
            <div className={style["tip-list"]}>
              <div className={style["tip-item"]}>
                • 昵称修改后将在下次登录时生效
              </div>
              <div className={style["tip-item"]}>
                • 头像支持JPG、PNG格式，建议尺寸200x200像素
              </div>
              <div className={style["tip-item"]}>
                • 请确保上传的头像符合相关法律法规
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default UserSetting;
