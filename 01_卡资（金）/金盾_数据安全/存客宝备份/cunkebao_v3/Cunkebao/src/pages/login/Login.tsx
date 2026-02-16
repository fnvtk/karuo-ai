import React, { useState, useEffect } from "react";
import { Form, Input, Button, Toast, Checkbox } from "antd-mobile";
import {
  EyeInvisibleOutline,
  EyeOutline,
  UserOutline,
} from "antd-mobile-icons";
import { useUserStore } from "@/store/module/user";

import { loginWithPassword, loginWithCode, sendVerificationCode } from "./api";
import style from "./login.module.scss";

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState(1); // 1: 密码登录, 2: 验证码登录
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { login, login2 } = useUserStore();

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendVerificationCode = async () => {
    const account = form.getFieldValue("account");

    if (!account) {
      Toast.show({ content: "请输入手机号", position: "top" });
      return;
    }

    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(account)) {
      Toast.show({ content: "请输入正确的11位手机号", position: "top" });
      return;
    }

    try {
      setLoading(true);
      await sendVerificationCode({
        mobile: account,
        type: "login",
      });

      Toast.show({ content: "验证码已发送", position: "top" });
      setCountdown(60);
    } catch (error) {
      // 错误已在request中处理，这里不需要额外处理
    } finally {
      setLoading(false);
    }
  };

  const getToken = (values: any) => {
    // 添加typeId参数
    const loginParams = {
      ...values,
      typeId: 1,
    };

    const response =
      activeTab === 1
        ? loginWithPassword(loginParams)
        : loginWithCode(loginParams);

    response.then(res => {
      const { member, deviceTotal } = res;
      // 清空WebSocket连接状态
      login(res.token, member, deviceTotal);
    });
  };

  // 登录处理
  const handleLogin = async (values: any) => {
    if (!agreeToTerms) {
      Toast.show({ content: "请同意用户协议和隐私政策", position: "top" });
      return;
    }
    //获取存客宝
    getToken(values);
  };

  // 第三方登录处理
  const handleWechatLogin = () => {
    Toast.show({ content: "微信登录功能开发中", position: "top" });
  };

  const handleAppleLogin = () => {
    Toast.show({ content: "Apple登录功能开发中", position: "top" });
  };
  const paddingTop = localStorage.getItem("paddingTop") || "44px";
  return (
    <div className={style["login-page"]}>
      <div style={{ height: paddingTop }}></div>
      <div style={{ height: "80px" }}></div>
      {/* 背景装饰 */}
      <div className={style["bg-decoration"]}>
        <div className={style["bg-circle"]}></div>
        <div className={style["bg-circle"]}></div>
        <div className={style["bg-circle"]}></div>
      </div>

      <div className={style["login-container"]}>
        {/* Logo和标题区域 */}
        <div className={style["login-header"]}>
          <div className={style["logo-section"]}>
            <div className={style["logo-icon"]}>
              <UserOutline />
            </div>
            <h1 className={style["app-name"]}>存客宝</h1>
          </div>
          <p className={style["subtitle"]}>登录您的账户继续使用</p>
        </div>

        {/* 登录表单 */}
        <div className={style["form-container"]}>
          {/* 标签页切换 */}
          <div className={style["tab-container"]}>
            <div
              className={`${style["tab-item"]} ${
                activeTab === 1 ? style["active"] : ""
              }`}
              onClick={() => setActiveTab(1)}
            >
              密码登录
            </div>
            <div
              className={`${style["tab-item"]} ${
                activeTab === 2 ? style["active"] : ""
              }`}
              onClick={() => setActiveTab(2)}
            >
              验证码登录
            </div>
            <div
              className={`${style["tab-indicator"]} ${
                activeTab === 2 ? style["slide"] : ""
              }`}
            ></div>
          </div>

          <Form
            form={form}
            layout="vertical"
            className={style["login-form"]}
            onFinish={handleLogin}
          >
            {/* 手机号输入 */}
            <Form.Item
              name="account"
              label="手机号"
              rules={[
                { required: true, message: "请输入手机号" },
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: "请输入正确的11位手机号",
                },
              ]}
            >
              <div className={style["input-wrapper"]}>
                <span className={style["input-prefix"]}>+86</span>
                <Input
                  placeholder="请输入手机号"
                  clearable
                  className={style["phone-input"]}
                />
              </div>
            </Form.Item>

            {/* 密码输入 */}
            {activeTab === 1 && (
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <div className={style["input-wrapper"]}>
                  <Input
                    placeholder="请输入密码"
                    clearable
                    type={showPassword ? "text" : "password"}
                    className={style["password-input"]}
                  />
                  <div
                    className={style["eye-icon"]}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOutline /> : <EyeInvisibleOutline />}
                  </div>
                </div>
              </Form.Item>
            )}

            {/* 验证码输入 */}
            {activeTab === 2 && (
              <Form.Item
                name="verificationCode"
                label="验证码"
                rules={[{ required: true, message: "请输入验证码" }]}
              >
                <div className={style["input-wrapper"]}>
                  <Input
                    placeholder="请输入验证码"
                    clearable
                    className={style["code-input"]}
                  />
                  <button
                    type="button"
                    className={`${style["send-code-btn"]} ${
                      countdown > 0 ? style["disabled"] : ""
                    }`}
                    onClick={handleSendVerificationCode}
                    disabled={loading || countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </button>
                </div>
              </Form.Item>
            )}

            {/* 用户协议 */}
            <div className={style["agreement-section"]}>
              <Checkbox
                checked={agreeToTerms}
                onChange={setAgreeToTerms}
                className={style["agreement-checkbox"]}
              >
                <span className={style["agreement-text"]}>
                  我已阅读并同意
                  <span className={style["agreement-link"]}>
                    《存客宝用户协议》
                  </span>
                  和
                  <span className={style["agreement-link"]}>《隐私政策》</span>
                </span>
              </Checkbox>
            </div>

            {/* 登录按钮 */}
            <Button
              block
              type="submit"
              color="primary"
              loading={loading}
              size="large"
              className={style["login-btn"]}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </Form>

          {/* 分割线 */}
          <div className={style["divider"]}>
            <span>其他登录方式</span>
          </div>

          {/* 第三方登录 */}
          <div className={style["third-party-login"]}>
            <div
              className={style["third-party-item"]}
              onClick={handleWechatLogin}
            >
              <div className={style["wechat-icon"]}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  height="24"
                  width="24"
                  className={style["wechat-icon"]}
                >
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.595-6.348zM5.959 5.48c.609 0 1.104.498 1.104 1.112 0 .612-.495 1.11-1.104 1.11-.612 0-1.108-.498-1.108-1.11 0-.614.496-1.112 1.108-1.112zm5.315 0c.61 0 1.107.498 1.107 1.112 0 .612-.497 1.11-1.107 1.11-.611 0-1.105-.498-1.105-1.11 0-.614.494-1.112 1.105-1.112z"></path>
                  <path d="M23.002 15.816c0-3.309-3.136-6-7-6-3.863 0-7 2.691-7 6 0 3.31 3.137 6 7 6 .814 0 1.601-.099 2.338-.285a.7.7 0 0 1 .579.08l1.5.87a.267.267 0 0 0 .135.044c.13 0 .236-.108.236-.241 0-.06-.023-.118-.038-.17l-.309-1.167a.476.476 0 0 1 .172-.534c1.645-1.17 2.387-2.835 2.387-4.597zm-9.498-1.19c-.497 0-.9-.407-.9-.908a.905.905 0 0 1 .9-.91c.498 0 .9.408.9.91 0 .5-.402.908-.9.908zm4.998 0c-.497 0-.9-.407-.9-.908a.905.905 0 0 1 .9-.91c.498 0 .9.408.9.91 0 .5-.402.908-.9.908z"></path>
                </svg>
              </div>
              <span>微信</span>
            </div>
            <div
              className={style["third-party-item"]}
              onClick={handleAppleLogin}
            >
              <div className={style["apple-icon"]}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              <span>Apple</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
