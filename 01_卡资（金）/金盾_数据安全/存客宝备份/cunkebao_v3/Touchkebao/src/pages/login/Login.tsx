import React, { useState, useEffect } from "react";
import { useCkChatStore } from "@/store/module/ckchat/ckchat";
import { Form, Input, Button, Toast, Checkbox } from "antd-mobile";
import {
  EyeInvisibleOutline,
  EyeOutline,
  UserOutline,
} from "antd-mobile-icons";
import { useUserStore } from "@/store/module/user";
import { useWebSocketStore } from "@/store/module/websocket/websocket";

import {
  loginWithPassword,
  loginWithCode,
  sendVerificationCode,
  getVerifyCode,
} from "./api";
import style from "./login.module.scss";

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState(1); // 1: 密码登录, 2: 验证码登录
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { setUserInfo } = useCkChatStore.getState();
  const { login, login2 } = useUserStore();
  const [verify, setVerify] = useState<{
    verifyCodeImage: string;
    verifySessionId: string;
  }>({
    verifyCodeImage: "",
    verifySessionId: "",
  });
  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const getVerifyCodeFunction = async () => {
    const res = await getVerifyCode();
    setVerify({
      verifyCodeImage: res.verifyCodeImage,
      verifySessionId: res.verifySessionId,
    });
  };

  useEffect(() => {
    getVerifyCodeFunction();
  }, []);

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
      verifySessionId: verify.verifySessionId,
      typeId: 1,
    };

    const response =
      activeTab === 1
        ? loginWithPassword(loginParams)
        : loginWithCode(loginParams);

    response
      .then(res => {
        const { member, kefuData } = res;
        // 清空WebSocket连接状态
        useWebSocketStore.getState().clearConnectionState();
        login(res.token, member);
        const { self, token } = kefuData;
        login2(token.access_token);
        setUserInfo(self);
      })
      .catch(() => {
        getVerifyCodeFunction();
      });
  };

  // 登录处理
  const handleLogin = async (values: any) => {
    if (!agreeToTerms) {
      Toast.show({ content: "请同意用户协议和隐私政策", position: "top" });
      return;
    }
    //获取触客宝
    getToken(values);
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
            <h1 className={style["app-name"]}>触客宝</h1>
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
              label="账号"
              rules={[{ required: true, message: "请输入账号" }]}
            >
              <div className={style["input-wrapper"]}>
                <Input
                  placeholder="请输入账号"
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
            {activeTab == 1 && verify.verifyCodeImage && (
              <Form.Item
                name="verifyCode"
                label="验证码"
                rules={[{ required: true, message: "请输入验证码" }]}
              >
                <div className={style["input-wrapper"]}>
                  <Input
                    placeholder="请输入验证码"
                    clearable
                    className={style["code-input"]}
                  />
                  <img
                    className={style["verify-code-img"]}
                    src={verify.verifyCodeImage}
                    alt="验证码"
                    onClick={getVerifyCodeFunction}
                  />
                </div>
              </Form.Item>
            )}
            {/* 验证码输入2 */}
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
                    《触客宝用户协议》
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
        </div>
      </div>
    </div>
  );
};

export default Login;
