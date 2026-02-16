// 集成检查器 - 检查GitHub项目与当前项目的集成状态

import fs from "fs"
import path from "path"

export interface IntegrationStatus {
  overall: "success" | "warning" | "error"
  score: number
  checks: IntegrationCheck[]
  recommendations: string[]
}

export interface IntegrationCheck {
  name: string
  status: "pass" | "warning" | "fail"
  message: string
  details?: string
}

export class IntegrationChecker {
  private sourceDir: string
  private targetDir: string

  constructor(sourceDir = "cunkebao_v3_source", targetDir = ".") {
    this.sourceDir = sourceDir
    this.targetDir = targetDir
  }

  /**
   * 执行完整的集成检查
   */
  async checkIntegration(): Promise<IntegrationStatus> {
    const checks: IntegrationCheck[] = []

    // 检查源项目存在性
    checks.push(await this.checkSourceProject())

    // 检查API兼容性
    checks.push(await this.checkApiCompatibility())

    // 检查依赖兼容性
    checks.push(await this.checkDependencyCompatibility())

    // 检查文件结构
    checks.push(await this.checkFileStructure())

    // 检查配置文件
    checks.push(await this.checkConfigFiles())

    // 检查环境变量
    checks.push(await this.checkEnvironmentVariables())

    // 计算总体状态和分数
    const passCount = checks.filter((c) => c.status === "pass").length
    const warningCount = checks.filter((c) => c.status === "warning").length
    const failCount = checks.filter((c) => c.status === "fail").length

    const score = Math.round((passCount / checks.length) * 100)

    let overall: "success" | "warning" | "error"
    if (failCount > 0) {
      overall = "error"
    } else if (warningCount > 0) {
      overall = "warning"
    } else {
      overall = "success"
    }

    // 生成建议
    const recommendations = this.generateRecommendations(checks)

    return {
      overall,
      score,
      checks,
      recommendations,
    }
  }

  /**
   * 检查源项目是否存在
   */
  private async checkSourceProject(): Promise<IntegrationCheck> {
    const sourceExists = fs.existsSync(this.sourceDir)
    const cunkebaoExists = fs.existsSync(path.join(this.sourceDir, "Cunkebao"))

    if (!sourceExists) {
      return {
        name: "源项目检查",
        status: "fail",
        message: "未找到GitHub源项目",
        details: `请确保已克隆项目到 ${this.sourceDir} 目录`,
      }
    }

    if (!cunkebaoExists) {
      return {
        name: "源项目检查",
        status: "warning",
        message: "源项目结构不完整",
        details: "未找到Cunkebao前端目录",
      }
    }

    return {
      name: "源项目检查",
      status: "pass",
      message: "源项目结构正常",
    }
  }

  /**
   * 检查API兼容性
   */
  private async checkApiCompatibility(): Promise<IntegrationCheck> {
    const currentApiDir = path.join(this.targetDir, "lib/api")
    const sourceApiDir = path.join(this.sourceDir, "Cunkebao/src/api")

    if (!fs.existsSync(currentApiDir)) {
      return {
        name: "API兼容性检查",
        status: "fail",
        message: "当前项目缺少API目录",
      }
    }

    if (!fs.existsSync(sourceApiDir)) {
      return {
        name: "API兼容性检查",
        status: "warning",
        message: "源项目API目录不存在",
        details: "可能需要手动创建API适配层",
      }
    }

    // 检查关键API文件
    const keyApiFiles = ["scenarios.ts", "devices.ts", "wechat.ts"]
    const missingFiles = keyApiFiles.filter((file) => !fs.existsSync(path.join(currentApiDir, file)))

    if (missingFiles.length > 0) {
      return {
        name: "API兼容性检查",
        status: "warning",
        message: `缺少关键API文件: ${missingFiles.join(", ")}`,
      }
    }

    return {
      name: "API兼容性检查",
      status: "pass",
      message: "API结构兼容",
    }
  }

  /**
   * 检查依赖兼容性
   */
  private async checkDependencyCompatibility(): Promise<IntegrationCheck> {
    const currentPackageJson = path.join(this.targetDir, "package.json")
    const sourcePackageJson = path.join(this.sourceDir, "Cunkebao/package.json")

    if (!fs.existsSync(currentPackageJson)) {
      return {
        name: "依赖兼容性检查",
        status: "fail",
        message: "当前项目缺少package.json",
      }
    }

    if (!fs.existsSync(sourcePackageJson)) {
      return {
        name: "依赖兼容性检查",
        status: "warning",
        message: "源项目package.json不存在",
      }
    }

    try {
      const currentPkg = JSON.parse(fs.readFileSync(currentPackageJson, "utf8"))
      const sourcePkg = JSON.parse(fs.readFileSync(sourcePackageJson, "utf8"))

      // 检查关键依赖
      const keyDependencies = ["axios", "lodash", "dayjs"]
      const missingDeps = keyDependencies.filter(
        (dep) => !currentPkg.dependencies?.[dep] && !currentPkg.devDependencies?.[dep],
      )

      if (missingDeps.length > 0) {
        return {
          name: "依赖兼容性检查",
          status: "warning",
          message: `建议添加依赖: ${missingDeps.join(", ")}`,
        }
      }

      return {
        name: "依赖兼容性检查",
        status: "pass",
        message: "依赖配置兼容",
      }
    } catch (error) {
      return {
        name: "依赖兼容性检查",
        status: "fail",
        message: "无法解析package.json文件",
      }
    }
  }

  /**
   * 检查文件结构
   */
  private async checkFileStructure(): Promise<IntegrationCheck> {
    const requiredDirs = ["app", "lib", "components", "public"]

    const missingDirs = requiredDirs.filter((dir) => !fs.existsSync(path.join(this.targetDir, dir)))

    if (missingDirs.length > 0) {
      return {
        name: "文件结构检查",
        status: "fail",
        message: `缺少必要目录: ${missingDirs.join(", ")}`,
      }
    }

    // 检查关键文件
    const requiredFiles = ["next.config.mjs", "tailwind.config.ts", "tsconfig.json"]

    const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(this.targetDir, file)))

    if (missingFiles.length > 0) {
      return {
        name: "文件结构检查",
        status: "warning",
        message: `缺少配置文件: ${missingFiles.join(", ")}`,
      }
    }

    return {
      name: "文件结构检查",
      status: "pass",
      message: "文件结构完整",
    }
  }

  /**
   * 检查配置文件
   */
  private async checkConfigFiles(): Promise<IntegrationCheck> {
    const configFiles = [
      { file: "next.config.mjs", required: true },
      { file: "tailwind.config.ts", required: true },
      { file: "tsconfig.json", required: true },
      { file: ".env.local", required: false },
      { file: "migration-config.json", required: false },
    ]

    const issues: string[] = []

    for (const config of configFiles) {
      const filePath = path.join(this.targetDir, config.file)
      const exists = fs.existsSync(filePath)

      if (config.required && !exists) {
        issues.push(`缺少必需配置文件: ${config.file}`)
      }
    }

    if (issues.length > 0) {
      return {
        name: "配置文件检查",
        status: "fail",
        message: issues.join("; "),
      }
    }

    return {
      name: "配置文件检查",
      status: "pass",
      message: "配置文件完整",
    }
  }

  /**
   * 检查环境变量
   */
  private async checkEnvironmentVariables(): Promise<IntegrationCheck> {
    const requiredEnvVars = ["NEXT_PUBLIC_API_BASE_URL"]

    const missingVars: string[] = []

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar)
      }
    }

    if (missingVars.length > 0) {
      return {
        name: "环境变量检查",
        status: "warning",
        message: `缺少环境变量: ${missingVars.join(", ")}`,
        details: "请在.env.local文件中配置这些变量",
      }
    }

    return {
      name: "环境变量检查",
      status: "pass",
      message: "环境变量配置正确",
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(checks: IntegrationCheck[]): string[] {
    const recommendations: string[] = []

    const failedChecks = checks.filter((c) => c.status === "fail")
    const warningChecks = checks.filter((c) => c.status === "warning")

    if (failedChecks.length > 0) {
      recommendations.push("🚨 请先解决失败的检查项，这些是阻塞性问题")
      failedChecks.forEach((check) => {
        recommendations.push(`   - ${check.name}: ${check.message}`)
      })
    }

    if (warningChecks.length > 0) {
      recommendations.push("⚠️ 建议解决警告项以获得更好的集成效果")
      warningChecks.forEach((check) => {
        recommendations.push(`   - ${check.name}: ${check.message}`)
      })
    }

    if (failedChecks.length === 0 && warningChecks.length === 0) {
      recommendations.push("✅ 集成检查全部通过，可以开始迁移工作")
      recommendations.push("📝 建议按照迁移指南逐步进行")
      recommendations.push("🧪 每个阶段完成后进行测试")
    }

    return recommendations
  }
}

// 导出便捷函数
export async function checkIntegration(): Promise<IntegrationStatus> {
  const checker = new IntegrationChecker()
  return await checker.checkIntegration()
}
