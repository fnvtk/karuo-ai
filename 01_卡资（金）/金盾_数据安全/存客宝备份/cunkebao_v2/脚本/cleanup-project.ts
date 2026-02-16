#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")

// 需要清理的文件和目录
const CLEANUP_PATTERNS = [
  // 重复的组件文件
  "components/ui/button.tsx", // 保留 app/components/ui/button.tsx
  "components/ui/card.tsx",
  "components/ui/input.tsx",
  "components/ui/select.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/pagination.tsx",
  "components/ui/label.tsx",
  "components/ui/badge.tsx",
  "components/ui/textarea.tsx",
  "components/ui/switch.tsx",
  "components/ui/tabs.tsx",
  "components/ui/accordion.tsx",
  "components/ui/scroll-area.tsx",
  "components/ui/calendar.tsx",
  "components/ui/popover.tsx",
  "components/ui/radio-group.tsx",
  "components/ui/toast.ts",
  "components/ui/use-toast.ts",
  "components/ui/dropdown-menu.tsx",
  "components/ui/collapsible.tsx",
  "components/ui/chart.tsx",
  "components/ui/skeleton.tsx",
  "components/ui/steps.tsx",
  "components/ui/date-picker.tsx",
  "components/ui/tooltip.tsx",
  "components/ui/progress.tsx",
  "components/ui/avatar.tsx",
  "components/ui/separator.tsx",
  "components/ui/date-range-picker.tsx",
  "components/ui/slider.tsx",

  // 重复的业务组件
  "components/Charts.tsx", // 保留 app/components/Charts.tsx
  "components/poster-selector.tsx",
  "components/device-grid.tsx",
  "components/BindDouyinQRCode.tsx",
  "components/TrafficTeamSettings.tsx",
  "components/WechatFriendSelector.tsx",
  "components/WechatGroupSelector.tsx",
  "components/VideoTutorialButton.tsx",
  "components/AIAssistant.tsx",
  "components/acquisition/ExpandableAcquisitionCard.tsx",
  "components/common/DeviceSelector.tsx",
  "components/device-table.tsx",
  "components/settings-dropdown.tsx",
  "components/login-form.tsx",

  // 重复的图标组件
  "components/icons/wechat-icon.tsx",
  "components/icons/apple-icon.tsx",

  // 无用的loading页面
  "app/traffic-pool/loading.tsx",
  "app/workspace/traffic-distribution/loading.tsx",
  "app/workspace/traffic-distribution/[id]/loading.tsx",
  "app/workspace/traffic-distribution/new/loading.tsx",
  "app/workspace/group-sync/loading.tsx",
  "app/workspace/traffic-pricing/loading.tsx",
  "app/workspace/group-sync/new/loading.tsx",
  "app/workspace/group-sync/auto-group/loading.tsx",
  "app/scenarios/[channel]/devices/loading.tsx",
  "app/scenarios/[channel]/traffic/loading.tsx",
  "app/workspace/group-push/loading.tsx",
  "app/workspace/group-push/new/loading.tsx",
  "app/workspace/auto-like/loading.tsx",
  "app/workspace/auto-like/new/loading.tsx",
  "app/workspace/auto-group/loading.tsx",
  "app/workspace/auto-group/new/loading.tsx",
  "app/content/loading.tsx",
  "app/devices/loading.tsx",
  "app/wechat-accounts/loading.tsx",
  "app/scenarios/phone/acquired/loading.tsx",
  "app/scenarios/phone/added/loading.tsx",
  "app/scenarios/loading.tsx",
  "app/plans/new/loading.tsx",
  "app/profile/devices/loading.tsx",
  "app/components-demo/loading.tsx",
  "app/components-docs/loading.tsx",
  "app/scenarios/payment/[id]/payments/loading.tsx",

  // 重复的API文件
  "lib/api/index.ts", // 保留主要的API配置
  "lib/api/users.ts",
  "lib/api/dashboard.ts",
  "lib/api/workspace.ts",
  "lib/api/wechat.ts",
  "lib/api/traffic.ts",
  "lib/api/content.ts",
  "lib/api/devices.ts",
  "lib/api/scenarios-mobile.ts",
  "lib/api/github-integration.ts",
  "lib/api/client.ts",
  "lib/api/auth.ts",

  // 重复的类型定义
  "types/tutorial.ts",
  "types/traffic.ts",
  "types/content.ts",
  "types/content-library.ts",
  "types/auto-group.ts",
  "types/scenario.ts",
  "types/acquisition.ts",
  "types/group-sync.ts",
  "types/group-push.ts",
  "types/device.ts",
  "types/common.ts",

  // 无用的工具文件
  "lib/tutorials.ts",
  "lib/migration/github-adapter.ts",
  "lib/migration/migration-guide.ts",
  "lib/migration/integration-checker.ts",
  "lib/actions/auth-actions.ts",
  "lib/date-utils.ts",
  "lib/toast.ts",

  // 重复的hooks
  "hooks/useDeviceStatusPolling.ts",
  "hooks/use-debounce.ts",
  "hooks/use-mobile.tsx",
  "hooks/use-toast.ts", // 保留 app/components/ui/use-toast.ts

  // 无用的客户端布局
  "app/clientLayout.tsx",
  "app/ClientLayout.tsx",

  // 重复的页面文件
  "pages/_app.tsx",

  // 无用的脚本
  "scripts/migration-setup.sh",
  "scripts/api-test.sh",

  // 无用的配置文件
  ".babelrc",

  // 重复的文档
  "docs/api-guide.tsx",
]

// 需要保留的重要文件
const KEEP_FILES = [
  "app/components/ui/", // 保留app下的UI组件
  "app/components/", // 保留app下的业务组件
  "lib/api/config.ts", // 保留API配置
  "lib/api/scenarios.ts", // 保留场景API
  "lib/utils.ts", // 保留工具函数
  "components/ui/table.tsx", // 保留表格组件
  "components/theme-provider.tsx", // 保留主题提供者
  "hooks/use-toast.ts", // 保留toast hook
  "components/ui/toast.tsx", // 保留toast组件
  "components/ui/toaster.tsx", // 保留toaster组件
]

// 检查文件是否应该被保留
function shouldKeepFile(filePath: string): boolean {
  return KEEP_FILES.some((keepPattern) => {
    if (keepPattern.endsWith("/")) {
      return filePath.startsWith(keepPattern)
    }
    return filePath === keepPattern
  })
}

// 删除文件
function deleteFile(filePath: string): boolean {
  const fullPath = path.join(projectRoot, filePath)

  if (!fs.existsSync(fullPath)) {
    return false
  }

  try {
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(fullPath)
    }
    return true
  } catch (error) {
    console.error(`删除文件失败: ${filePath}`, error)
    return false
  }
}

// 主清理函数
function cleanupProject() {
  console.log("🧹 开始清理项目...\n")

  let deletedCount = 0
  let skippedCount = 0
  let notFoundCount = 0

  const results = {
    deleted: [] as string[],
    skipped: [] as string[],
    notFound: [] as string[],
  }

  for (const pattern of CLEANUP_PATTERNS) {
    if (shouldKeepFile(pattern)) {
      console.log(`⚠️  跳过保护文件: ${pattern}`)
      skippedCount++
      results.skipped.push(pattern)
      continue
    }

    const deleted = deleteFile(pattern)
    if (deleted) {
      console.log(`✅ 已删除: ${pattern}`)
      deletedCount++
      results.deleted.push(pattern)
    } else {
      console.log(`❌ 文件不存在: ${pattern}`)
      notFoundCount++
      results.notFound.push(pattern)
    }
  }

  console.log("\n📊 清理统计:")
  console.log(`✅ 已删除: ${deletedCount} 个文件`)
  console.log(`⚠️  已跳过: ${skippedCount} 个文件`)
  console.log(`❌ 未找到: ${notFoundCount} 个文件`)

  // 生成清理报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      deleted: deletedCount,
      skipped: skippedCount,
      notFound: notFoundCount,
      total: CLEANUP_PATTERNS.length,
    },
    details: results,
  }

  const reportPath = path.join(projectRoot, "cleanup-report.json")
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 清理报告已保存到: cleanup-report.json`)

  // 检查项目结构
  console.log("\n🔍 检查项目结构...")
  checkProjectStructure()

  console.log("\n🎉 项目清理完成!")
}

// 检查项目结构
function checkProjectStructure() {
  const importantDirs = [
    "app/components/ui",
    "app/scenarios",
    "app/workspace",
    "app/devices",
    "app/profile",
    "lib/api",
    "components/ui",
    "docs",
  ]

  console.log("\n📁 重要目录检查:")
  for (const dir of importantDirs) {
    const fullPath = path.join(projectRoot, dir)
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath)
      console.log(`✅ ${dir} (${files.length} 个文件)`)
    } else {
      console.log(`❌ ${dir} (目录不存在)`)
    }
  }
}

// 运行清理
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupProject()
}

export { cleanupProject }
