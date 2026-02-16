# 大文件外置目录

> 规则：Skill 目录下不放超过 20MB 的文件，大文件统一放这里。
> 需要时从这里引用或软链接。

---

## 文件清单

| 文件 | 大小 | 原位置 | 说明 |
|:---|:---|:---|:---|
| 视频切片_models/ggml-small.bin | 466MB | 火眸/视频切片/models/ | Whisper 语音识别模型 |
| 视频切片_视频/SOUL...带字幕.mp4 | 89MB | 火眸/视频切片/视频/ | SOUL会议录像 |
| 视频切片_视频/SOUL...mp4 | 69MB | 火眸/视频切片/视频/ | SOUL会议录像（原版） |
| 财务管理_data/chat.snapshot_收集.db | 88MB | 土簿/财务管理/财务收集/ | 微信聊天快照数据库 |
| 财务管理_data/chat.snapshot_data.db | 88MB | 土簿/财务管理/data/ | 微信聊天快照数据库 |
| 消息中枢_dist/windows控制包.zip | 47MB | 火炬/消息中枢/dist/ | Windows 控制包 |
| 消息中枢_dist/windows控制包_references.zip | 47MB | 火炬/消息中枢/references/ | Windows 控制包（引用） |

---

## 使用方式

需要用到大文件时，从这里引用路径即可：

```bash
# 视频切片模型
ln -s "/Users/karuo/Documents/个人/卡若AI/_大文件外置/视频切片_models/ggml-small.bin" "火眸/视频切片/models/ggml-small.bin"
```
