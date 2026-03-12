# 附录 C · FAQ

> 返回 [总目录](../README.md)

---

## 关于卡若AI

**Q：卡若AI 是什么？**
A：卡若的个人数字管家与智能大总管。一套「身份+团队+69技能+规则」的体系，可加载到任何 AI 平台运行。

**Q：和 ChatGPT / Claude / Cursor 是什么关系？**
A：卡若AI 运行在它们之上。它不替代这些平台，而是为它们加载一套团队分工与技能规则。

**Q：5 个角色、14 个成员、69 技能是什么意思？**
A：5 个负责人（金/水/木/火/土）下挂 14 个成员，每人若干技能。按触发词在 SKILL_REGISTRY 中查找。

---

## 关于使用

**Q：没有 Cursor 能用吗？**
A：可以。把 BOOTSTRAP.md 和 SKILL_REGISTRY.md 给任意 AI 作上下文即可；也可通过外网 API 调用。

**Q：怎么用卡若AI？**
A：用自然语言说需求即可。卡若AI 自动匹配技能执行。也可用 `@成员名` 指定。

**Q：外网怎么调用？**
A：`POST https://kr-ai.quwanzhi.com/v1/chat`，Body 为 `{"prompt":"问题"}`。

---

## 关于网站

**Q：卡若AI网站和主仓库的关系？**
A：网站是门面与说明书（展示+控制台），主仓库是大脑与执行环境（规则+技能）。

**Q：网站能直接"用"卡若AI 吗？**
A：首页和 `/chat` 可以对话，但完整能力需在 Cursor 等中加载 BOOTSTRAP 执行。

**Q：网站技术栈？**
A：Next.js 14 + React 18 + Tailwind CSS + SQLite/MongoDB。

---

## 关于运维

**Q：部署在哪？**
A：Docker 容器部署在群晖 NAS，通过 frp 暴露外网端口 3102。

**Q：数据库用什么？**
A：唯一 MongoDB 实例（`datacenter_mongodb:27017`），网站用 `karuo_site` 库。

**Q：怎么更新手册？**
A：有技能新增/变更时，更新对应章节并在附录 D 追加更新记录。
