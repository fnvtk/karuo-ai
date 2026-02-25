# 卡若AI 客户端配置快速说明（Cursor/同类工具）

> 目标：3 分钟完成接入。  
> 适用：Cursor、Cherry Studio、LobeChat、Claude 插件、自建 Agent（支持 OpenAI 兼容协议）。

---

## 一、统一配置参数

- Base URL：`https://kr-ai.quwanzhi.com/v1`
- API Key：`<部门分配的 dept_key>`
- Model：`karuo-ai`

注意：

- Base URL 不要加结尾 `/`
- 必须使用 `https`

---

## 二、Cursor 配置步骤

1. 打开 `Settings -> API Keys`
2. 在 `OpenAI API Key` 填入 `dept_key`
3. 打开 `Override OpenAI Base URL`
4. 填入：`https://kr-ai.quwanzhi.com/v1`
5. 重启 Cursor 后测试一次对话

---

## 三、其它同类工具配置步骤

1. 找到 OpenAI/自定义模型配置页
2. 填 Base URL：`https://kr-ai.quwanzhi.com/v1`
3. 填 API Key：`dept_key`
4. 模型填：`karuo-ai`
5. 先关闭流式输出联调，联通后再开启

---

## 四、联调命令（先测通再用）

```bash
# 1) 健康检查
curl -sS https://kr-ai.quwanzhi.com/v1/health

# 2) 模型列表
curl -sS https://kr-ai.quwanzhi.com/v1/models

# 3) 对话接口
curl -sS https://kr-ai.quwanzhi.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <dept_key>" \
  -d '{"model":"karuo-ai","messages":[{"role":"user","content":"测试连通"}]}'
```

---

## 五、常见问题（简版）

- 报 `Provider Error`：先检查 Base URL 是否为 `https://kr-ai.quwanzhi.com/v1`
- 报 `401 invalid api key`：Key 错误或过期，重新申请部门 key
- 报 `502`：服务链路异常，联系运维检查 Nginx/frp/NAS 网关

