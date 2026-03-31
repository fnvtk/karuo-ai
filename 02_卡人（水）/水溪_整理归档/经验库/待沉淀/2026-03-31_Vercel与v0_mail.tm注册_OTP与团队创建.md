# Vercel / v0 邮箱注册（mail.tm）实操要点

**日期**：2026-03-31  
**相关**：木根 `03_卡木（木）/木根_逆向分析/全网AI自动注册/`（`EmailService` + mail.tm）；金盾 `01_卡资（金）/金盾_数据安全/Vercel与v0部署流水线/SKILL.md`（部署，不负责从零注册）

## 背景

用 mail.tm 辅助注册 Vercel（与 v0 同账号体系）时，需区分 **登录页试邮** 与 **注册页**：无账号时 Vercel 会发「Attempted Sign-in」邮件，内附带 `email=` 参数的 **signup** 链接，应打开该链接继续，而非只在登录页死等 OTP。

## 做法

1. **mail.tm**：与 `config.yaml` 中 `email.type: mailtm` 同源 API；固定邮箱用 `MAILTM_ADDRESS` / `MAILTM_PASSWORD` 或脚本现场 `POST /accounts` + `/token`。
2. **登录页** `Continue with Email`：若无账号，收件为说明邮件 + signup URL，不是 6 位登录码。
3. **注册页** `Continue with Email`：收件主题为 **Vercel Sign-up Verification**，正文为 6 位数字。
4. **OTP 输入**：无障碍树可能合并为**单个** `textbox`，整段 `fill` 易只写入一格导致校验失败；应 **逐格输入**、或 `browser_type` 的 **slowly** 模拟逐键，或换新码后重试。
5. **Create Team**：需 **Team Name** + **Team URL**（全局唯一）；按钮短时 loading 属正常，勿重复狂点；若流程被拉回「Work Email」，多为会话或风控中断，重新 `Continue with Email` 并取**新** OTP。

## 适用场景

临时邮箱开 Vercel/v0 测试号、与「全网 AI 自动注册」收信链组合。

## 限制

- Turnstile / 企业策略可能拦截自动化或一次性域名。
- 客观无法代劳时：向卡若交付 **可勾选清单**（含「逐格 OTP」等），符合 `.cursor/rules/karuo-ai.mdc` 问题自治分工。

## 循环策略（取码不行就换邮箱 · 做通）

**原则**：不要跟**同一封收不到码 / 只有 Attempted Sign-in / OTP 总失败**的邮箱死磕——**超时无「Sign-up Verification」→ 放弃该 mail.tm → 脚本自动生成下一邮箱 → 继续注册**。

**脚本（木根）**：`03_卡木（木）/木根_逆向分析/全网AI自动注册/脚本/vercel_mailtm_signup_loop.py`

```bash
cd "/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木根_逆向分析/全网AI自动注册/脚本"
# 每轮打印新邮箱 + 注册链接；你在浏览器点 Continue with Email；收不到注册验证码则自动下一轮
python3 vercel_mailtm_signup_loop.py --max-rounds 8 --poll-timeout 180

# 需要先手动点发码再轮询时：
python3 vercel_mailtm_signup_loop.py --pause-enter --poll-timeout 240

# 每轮结果落盘备查：
python3 vercel_mailtm_signup_loop.py --out-jsonl ./vercel_mailtm_rounds.jsonl
```

说明：脚本**忽略**环境变量 `MAILTM_ADDRESS` / `MAILTM_PASSWORD`，每轮都是**全新** mail.tm，避免固定邮箱卡死。
