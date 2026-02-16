# 更新日志

## [2.0.0] - 2026-01-21

### 🎯 重大更新
- 结合实际聊天记录优化整个Skill体系
- 统一所有配置文件中的NAS IP为 192.168.1.201
- 修正所有脚本中的密码为小写 `zhiqun1984`

### ✨ 新增功能
- 添加 `quick_connect_test.sh` - 快速连接测试脚本
- 新增 README.md - 快速开始指南
- 优化 MongoDB 连接信息获取流程
- 增强 SKILL.md 文档完整性

### 🔧 优化改进
- 统一所有脚本的SSH参数配置
- 优化错误提示和用户反馈
- 改进脚本执行权限管理
- 完善Cursor集成说明

### 📝 文件更新清单

#### 核心文档
- `SKILL.md` - 主Skill文件，添加详细的MongoDB操作说明
- `README.md` - 新增快速开始指南
- `CHANGELOG.md` - 新增更新日志

#### 脚本文件
- `scripts/nas_status.sh` - 更新密码配置
- `scripts/docker_list.sh` - 更新密码配置
- `scripts/get_mongodb_info.py` - 更新密码配置
- `scripts/synology_api_demo.py` - 更新密码配置
- `scripts/quick_connect_test.sh` - 新增快速测试脚本

### 🔐 安全更新
- 所有密码统一为小写 `zhiqun1984`
- 确认所有敏感信息仅在本地使用
- 添加SSH连接超时和错误处理

### 📦 依赖要求
- sshpass (必需)
- Python 3.x (部分脚本)
- nc/netcat (端口检查)
- mongosh (可选，MongoDB命令行)

### 🎯 测试验证
```bash
# 运行快速测试
cd scripts && ./quick_connect_test.sh

# 验证NAS连接
./nas_status.sh

# 验证MongoDB
python3 get_mongodb_info.py
```

### 📌 重要提醒
- IP地址保持不变: 192.168.1.201
- 所有原有配置已保留
- 向后兼容之前的使用方式
- 建议重新测试所有脚本功能

---

## [1.0.0] - 2026-01-初期

### 首次发布
- 基础NAS管理功能
- Docker容器管理
- MongoDB连接配置
- DSM API集成
- 虚拟机管理脚本

---

## 版本说明

版本号格式: MAJOR.MINOR.PATCH

- **MAJOR**: 重大架构变更或不兼容更新
- **MINOR**: 新功能添加
- **PATCH**: Bug修复和小优化
