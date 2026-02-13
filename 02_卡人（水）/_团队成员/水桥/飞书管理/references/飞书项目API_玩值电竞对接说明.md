# 飞书项目 API · 玩值电竞对接说明

> 存客宝公司 · 玩值电竞 · 账号金融 空间

---

## 1. 配置项（已记录）

| 变量 | 值 |
|:---|:---|
| Plugin ID | MII_698EA68807C08CB2 |
| Plugin Secret | 63D218CF0E3B0CBC456B09FF4F7F2ED3 |
| PROJECT_KEY | 玩值电竞 |
| USER_KEY | 756877947514450739 |
| API 基址 | https://project.feishu.cn |

---

## 2. 接口差异

| 能力 | 飞书知识库 | 飞书项目 |
|:---|:---|:---|
| 域名 | open.feishu.cn | project.feishu.cn |
| 认证 | Bearer + access_token | X-PLUGIN-TOKEN + X-USER-KEY |

---

## 3. Token 获取

```
POST https://project.feishu.cn/open_api/authen/plugin_token
Body: {"plugin_id":"...", "plugin_secret":"..."}
```

## 4. 创建工作项接口

**路径**：`POST /open_api/{project_key}/work_item/create`

**请求头**：
- Content-Type: application/json
- X-PLUGIN-TOKEN: {从 plugin_token 接口获取}
- X-USER-KEY: {必填，飞书项目内双击头像获取}

**参考请求体**：
```json
{
  "name": "任务名称",
  "work_item_type_key": "requirement",
  "field_values": [
    {"field_key": "name", "value": "任务名称"},
    {"field_key": "status", "value": "待产品评审"}
  ]
}
```

---

## 5. 相关脚本

| 脚本 | 功能 |
|:---|:---|
| wanzhi_feishu_project_sync.py | 从甘特图同步任务到飞书项目 |

---

**更新**：2026-02-13
