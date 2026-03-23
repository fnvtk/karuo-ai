# 视频号凭证目录（开放平台）

## 用途

- **微信开放平台**绑定的视频号业务：用 **AppID + AppSecret** 换取 `access_token` / `stable_token`，再调用 [视频号助手 API](https://developers.weixin.qq.com/doc/channels/api/)。
- 与 **网页扫码**得到的 `../脚本/channels_storage_state.json` **不是同一套凭证**，不要混在一个文件里。

## 标准做法（以后都按这个来）

1. 在本目录维护 **`.env.open_platform`**（文件名以 `.env.` 开头，已被卡若AI 仓库根 `.gitignore` 中 `.env.*` 忽略，**不会进 Git**）。
2. 需要示例可复制 **`open_platform.env.example`** 为 `.env.open_platform` 再填值。
3. 脚本中读取示例（Python）：

```python
from pathlib import Path

def load_open_platform_env():
    p = Path(__file__).resolve().parent.parent / "credentials" / ".env.open_platform"
    if not p.exists():
        return {}
    out = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, _, v = line.partition("=")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out
```

4. 取 token：按官方文档调用 `https://api.weixin.qq.com/cgi-bin/stable_token` 或 `token`（grant_type=client_credential），**不要把 token 写进本仓库**；可只在内存或本机另一个忽略文件里缓存。

## 变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `WECHAT_OPEN_APPID` | 是 | 开放平台应用 AppID |
| `WECHAT_OPEN_APPSECRET` | 是 | 开放平台应用 AppSecret |
| `WECHAT_OPEN_STABLE_TOKEN` | 否 | 若你手动缓存 stable_token，可放这里（仍勿提交）；否则留空每次用 Secret 换 |

## 安全

- **AppSecret 泄露 = 立刻到公众平台重置**，并更新本文件。
- 勿把本目录任何含 Secret 的文件拖进聊天、截图、PR。
