# Cursor 自动注册 · 环境说明与排错

## 进度摘要（2026-03-18）

- **邮箱**：已接 mail.tm，`config.yaml` 使用 `type: mailtm`，可正常收验证码。
- **浏览器**：DrissionPage 在本机常连接失败 → 已加 **Playwright 回退**，自动切换。
- **流程**：曾跑通至 1/6～3/6（打开页面、填表、Turnstile）；5/6 验证码框偶未识别；6/6 Token 提取失败。
- **本次改动**：DrissionPage 路径延长 OTP 等待（45s）、多选择器；Playwright 路径先等验证码框再拉邮件、选择器增强。注册已再次发起，结果见终端或 `list -p cursor`。

## 当前环境（2026-03-18）

- **本机**：macOS（ARM），无预装 Google Chrome
- **已做**：安装 Chromium（brew）、配置 `config.yaml` 的 `chrome_path`、为 DrissionPage 增加独立端口/用户目录/重试/`--remote-allow-origins=*`
- **现象**：浏览器进程能启动，DevTools 监听正常，但 DrissionPage 连接时出现 **WebSocket Handshake 404 Not Found**

## 可能原因

- DrissionPage 与 **Chromium**（非 Chrome）在部分版本的 CDP 路径上不兼容，导致握手 404
- 建议优先使用 **Google Chrome** 路径再试

## 操作建议

1. **安装 Google Chrome**（若未安装）  
   `brew install --cask google-chrome`  
   安装后在 `config.yaml` 中设置：  
   `chrome_path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`

2. **单账号先跑通**  
   `python3 auto_register.py register -p cursor -n 1`  
   确认 1 个成功后再提高并发或数量。

3. **批量可先走 Cerebras**  
   Cursor 依赖浏览器且受 Turnstile 限制；若需批量 Key，可先用：  
   `python3 auto_register.py register -p cerebras -n 10`  
   或 `python3 key_pool_manager.py auto-fill -n 10`

## 已修改的 Cursor Provider（cursor_provider.py）

- 独立 `--remote-debugging-port`、`set_local_port`、`set_user_data_path`，避免多实例冲突
- `--remote-allow-origins=*`，允许 CDP 连接
- `co.set_retry(15, 2)`，等待浏览器就绪（ARM/Rosetta 启动较慢）
- `--no-sandbox`、`--disable-dev-shm-usage`，提升 headless 稳定性
