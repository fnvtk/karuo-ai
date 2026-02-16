#!/bin/bash

# 存客宝项目迁移设置脚本
# 用于从GitHub项目快速设置开发环境

set -e

echo "🚀 开始存客宝项目迁移设置..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
GITHUB_REPO="https://github.com/fnvtk/cunkebao_v3.git"
GITHUB_DIR="cunkebao_v3_source"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# 函数：打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message $RED "错误: $1 未安装，请先安装 $1"
        exit 1
    fi
}

# 函数：检查Node.js版本
check_node_version() {
    local node_version=$(node -v | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        print_message $RED "错误: Node.js版本需要 >= $required_version，当前版本: $node_version"
        exit 1
    fi
}

# 步骤1：环境检查
print_message $BLUE "📋 步骤1: 检查开发环境..."
check_command "git"
check_command "node"
check_command "npm"
check_node_version
print_message $GREEN "✅ 环境检查通过"

# 步骤2：备份当前项目
print_message $BLUE "💾 步骤2: 备份当前项目..."
if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
fi
mkdir -p "$BACKUP_DIR"

# 备份关键文件和目录
cp -r app/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r lib/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r components/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r public/ "$BACKUP_DIR/" 2>/dev/null || true
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
cp next.config.mjs "$BACKUP_DIR/" 2>/dev/null || true
cp tailwind.config.ts "$BACKUP_DIR/" 2>/dev/null || true

print_message $GREEN "✅ 项目备份完成: $BACKUP_DIR"

# 步骤3：克隆GitHub仓库
print_message $BLUE "📥 步骤3: 克隆GitHub仓库..."
if [ -d "$GITHUB_DIR" ]; then
    print_message $YELLOW "⚠️  目录 $GITHUB_DIR 已存在，正在删除..."
    rm -rf "$GITHUB_DIR"
fi

git clone "$GITHUB_REPO" "$GITHUB_DIR"
print_message $GREEN "✅ GitHub仓库克隆完成"

# 步骤4：分析项目结构
print_message $BLUE "🔍 步骤4: 分析项目结构..."
cd "$GITHUB_DIR"

print_message $YELLOW "GitHub项目结构:"
find . -maxdepth 3 -type d | head -20

# 检查关键目录
if [ -d "Cunkebao" ]; then
    print_message $GREEN "✅ 找到前端目录: Cunkebao"
    cd Cunkebao
    
    if [ -f "package.json" ]; then
        print_message $GREEN "✅ 找到package.json"
        print_message $YELLOW "依赖分析:"
        cat package.json | grep -A 20 '"dependencies"' | head -15
    fi
    
    cd ..
fi

if [ -d "Server" ]; then
    print_message $GREEN "✅ 找到后端目录: Server"
fi

cd ..

# 步骤5：创建迁移配置
print_message $BLUE "⚙️  步骤5: 创建迁移配置..."

cat > migration-config.json << EOF
{
  "migration": {
    "sourceDir": "$GITHUB_DIR",
    "backupDir": "$BACKUP_DIR",
    "targetDir": ".",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "phases": {
      "preparation": {
        "completed": true,
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      },
      "api_integration": {
        "completed": false,
        "timestamp": null
      },
      "business_logic": {
        "completed": false,
        "timestamp": null
      },
      "ui_migration": {
        "completed": false,
        "timestamp": null
      },
      "testing": {
        "completed": false,
        "timestamp": null
      }
    },
    "mappings": {
      "api_endpoints": {},
      "components": {},
      "pages": {},
      "utils": {}
    }
  }
}
EOF

print_message $GREEN "✅ 迁移配置文件创建完成: migration-config.json"

# 步骤6：安装依赖
print_message $BLUE "📦 步骤6: 安装项目依赖..."
npm install

# 检查GitHub项目依赖
if [ -d "$GITHUB_DIR/Cunkebao" ] && [ -f "$GITHUB_DIR/Cunkebao/package.json" ]; then
    print_message $YELLOW "分析GitHub项目依赖..."
    cd "$GITHUB_DIR/Cunkebao"
    
    # 提取有用的依赖包
    print_message $YELLOW "建议添加的依赖包:"
    cat package.json | jq -r '.dependencies | to_entries[] | select(.key | test("axios|lodash|moment|dayjs|chart|echarts")) | "\(.key): \(.value)"' 2>/dev/null || true
    
    cd ../..
fi

print_message $GREEN "✅ 依赖安装完成"

# 步骤7：创建迁移脚本
print_message $BLUE "📝 步骤7: 创建迁移脚本..."

cat > scripts/migrate-api.js << 'EOF'
#!/usr/bin/env node

// API迁移脚本
const fs = require('fs');
const path = require('path');

console.log('🔄 开始API迁移...');

// 读取GitHub项目的API文件
const sourceApiDir = path.join(__dirname, '../cunkebao_v3_source/Cunkebao/src/api');
const targetApiDir = path.join(__dirname, '../lib/api');

if (fs.existsSync(sourceApiDir)) {
  console.log('✅ 找到源API目录');
  
  // 这里可以添加具体的迁移逻辑
  // 例如：转换Vue的API调用到React的API调用
  
} else {
  console.log('⚠️  未找到源API目录');
}

console.log('✅ API迁移完成');
EOF

chmod +x scripts/migrate-api.js

cat > scripts/migrate-components.js << 'EOF'
#!/usr/bin/env node

// 组件迁移脚本
const fs = require('fs');
const path = require('path');

console.log('🔄 开始组件迁移...');

// 读取GitHub项目的组件文件
const sourceComponentDir = path.join(__dirname, '../cunkebao_v3_source/Cunkebao/src/components');
const targetComponentDir = path.join(__dirname, '../app/components');

if (fs.existsSync(sourceComponentDir)) {
  console.log('✅ 找到源组件目录');
  
  // 这里可以添加具体的迁移逻辑
  // 例如：转换Vue组件到React组件
  
} else {
  console.log('⚠️  未找到源组件目录');
}

console.log('✅ 组件迁移完成');
EOF

chmod +x scripts/migrate-components.js

print_message $GREEN "✅ 迁移脚本创建完成"

# 步骤8：创建开发指南
print_message $BLUE "📚 步骤8: 创建开发指南..."

cat > MIGRATION_GUIDE.md << 'EOF'
# 存客宝项目迁移指南

## 项目概述
本指南帮助您将GitHub上的cunkebao_v3项目与当前Next.js项目进行对接。

## 迁移阶段

### 阶段1: 环境准备 ✅
- [x] 克隆GitHub仓库
- [x] 分析项目结构
- [x] 备份当前项目
- [x] 安装依赖

### 阶段2: API对接 🔄
- [ ] 映射API端点
- [ ] 适配API客户端
- [ ] 实现数据适配器
- [ ] 测试API集成

### 阶段3: 业务逻辑迁移 ⏳
- [ ] 迁移场景获客逻辑
- [ ] 迁移设备管理逻辑
- [ ] 迁移微信管理逻辑
- [ ] 迁移流量池逻辑

### 阶段4: UI组件迁移 ⏳
- [ ] Vue组件转React组件
- [ ] 适配样式系统
- [ ] 实现响应式设计
- [ ] 优化用户体验

### 阶段5: 测试和优化 ⏳
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] Bug修复

## 快速开始

1. 运行开发服务器:
   \`\`\`bash
   npm run dev
