---
name: 抖音发布
description: 通过抖音开放平台实现抖音登录（OAuth）与视频发布。与 Soul 竖屏成片、视频切片联动，将成片一键发布到抖音。若使用存客宝/腕推等矩阵工具发布抖音，可在此 Skill 补充对接方式。
triggers: 抖音发布、发布到抖音、抖音登录、抖音上传、腕推抖音
owner: 木叶
group: 木
version: "1.0"
updated: "2026-02-28"
---

# 抖音发布

> **登录与发布**：使用**抖音开放平台** OAuth 获取用户授权（access_token、open_id），再调用「上传视频」+「创建视频」接口发布。  
> **存客宝**：当前存客宝 Skill 与文档中无抖音发布 SDK；若后续存客宝或腕推等工具提供抖音发布能力，可在此 Skill 补充脚本与配置。

---

## 一、流程概览

```
抖音开放平台应用（申请「代替用户发布内容到抖音」）
  → 用户 OAuth 登录授权 → 获得 access_token、open_id
  → 上传视频（upload_video）→ 获得 video_id
  → 创建视频（create_video）→ 发布到抖音
```

---

## 二、前置条件

1. **抖音开放平台**： [https://partner.open-douyin.com](https://partner.open-douyin.com) 注册开发者、创建应用。
2. **能力申请**：应用详情 → 能力管理 → 能力实验室 → **代替用户发布内容到抖音**。
3. **用户授权**：用户通过 OAuth 授权后，获得 `access_token`（约 15 天）、`open_id`；可存于本地或存客宝等系统供脚本使用。

---

## 三、一键命令（发布单条成片）

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音发布/脚本

# 使用已保存的 token 发布（需先跑一次登录并保存）
python3 douyin_publish.py --video "/path/to/成片/标题.mp4" --title "视频标题 #话题"

# 指定 token 文件（默认读 脚本/.env 或 config.json 中的 access_token、open_id）
python3 douyin_publish.py --video "/path/to/xxx.mp4" --title "标题" --token-file ./tokens.json
```

---

## 四、登录形式（获取 access_token / open_id）

抖音开放平台采用 **OAuth 2.0**：

1. **授权码模式**：引导用户打开授权页 → 用户同意后回调带 `code` → 用 `code` 换 `access_token`、`open_id`。  
2. **脚本用法**：首次需在浏览器完成授权，或使用开放平台「获取 access_token」接口（需 client_key、client_secret、code）。将得到的 `access_token`、`open_id` 写入 `脚本/tokens.json` 或环境变量，供 `douyin_publish.py` 读取。

详见：`参考资料/抖音开放平台_登录与发布流程.md`。

---

## 五、与视频切片 / Soul 竖屏的联动

- **成片目录**：Soul 竖屏成片输出在 `xxx_output/成片/`，文件名为标题（如 `没人来就一个人站站到最后钱才来.mp4`）。
- **批量发布**：可对 `成片/` 目录遍历，逐条调用 `douyin_publish.py --video <path> --title <文件名或 highlights 标题>`；标题可来自 `成片/目录索引.md` 或 `highlights.json`。示例：119 场成片可用 `脚本/batch_publish_119.py`（成片目录需与脚本内一致），发布清单见成片目录下 `119场_抖音发布清单.md`。
- **腕推 / 存客宝 / 卡罗维亚**：若使用腕推、卡罗维亚或存客宝的抖音发布能力，可将对接方式（API 文档、SDK 路径）补充到本 Skill 的「参考资料」或脚本说明中，脚本可改为调其接口；**标题与描述**可直接使用每批成片目录下的「发布清单」复制进对应工具。
- **小黄车与挂载**：开放平台 create_video 支持挂载小程序；电商小黄车需在抖音端发布后编辑挂载或使用创作者中心。详见 `参考资料/抖音开放平台_登录与发布流程.md` 第四节。

---

## 六、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/douyin_publish.py` | 发布脚本：读 token → 上传视频 → 创建视频 |
| `参考资料/抖音开放平台_登录与发布流程.md` | 开放平台 OAuth、上传、创建视频接口说明与链接 |

---

## 七、API 摘要（抖音开放平台）

| 步骤 | 接口 | 说明 |
|------|------|------|
| 登录 | OAuth 授权 → access_token、open_id | 用户授权后获得 |
| 上传 | POST `/api/douyin/v1/video/upload_video/` | form: video=@文件；返回加密 video_id |
| 发布 | POST `/api/douyin/v1/video/create_video/` | body: video_id、text（标题，可带话题） |

视频时长不超过 15 分钟；标题不超过 1000 字；每日发布上限 75 条（同一应用下）。
