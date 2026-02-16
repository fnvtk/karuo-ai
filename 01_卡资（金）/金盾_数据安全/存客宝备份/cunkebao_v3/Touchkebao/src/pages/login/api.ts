import request from "@/api/request";
import request2 from "@/api/request2";

// 密码登录
export function loginWithPassword(params: any) {
  return request("/v1/kefu/login", params, "POST");
}

// 验证码登录
export function loginWithCode(params: any) {
  return request("/v1/auth/login-code", params, "POST");
}

// 发送验证码
export function sendVerificationCode(params: any) {
  return request("/v1/auth/code", params, "POST");
}

// 退出登录
export function logout() {
  return request("/v1/auth/logout", {}, "POST");
}

// 获取用户信息
export function getUserInfo() {
  return request("/v1/auth/user-info", {}, "GET");
}

// ==================================================================
// 触客宝接口; 2025年8月16日 17:19:15
// 开发：yongpxu
// ==================================================================

//触客宝登陆
export function loginWithToken(params: any) {
  return request2(
    "/token",
    params,
    "POST",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
    1000,
  );
}

// 获取触客宝用户信息
export function getChuKeBaoUserInfo() {
  return request2("/api/account/self", {}, "GET");
}

//验证码
export function getVerifyCode() {
  return request("/v1/api/user/verify-code", {}, "GET");
}
