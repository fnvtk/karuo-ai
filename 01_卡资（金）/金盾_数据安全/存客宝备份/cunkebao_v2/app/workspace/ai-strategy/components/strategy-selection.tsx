"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ShoppingBag, Database, BarChart, Settings } from "lucide-react"

interface StrategySelectionProps {
  formData: any
  updateFormData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export function StrategySelection({ formData, updateFormData, onNext, onBack }: StrategySelectionProps) {
  const [strategyType, setStrategyType] = useState<string>(formData.strategyType || "")
  const [jdConfig, setJdConfig] = useState({
    username: formData.strategyConfig?.username || "",
    password: formData.strategyConfig?.password || "",
    memberLevel: formData.strategyConfig?.memberLevel || "all",
  })
  const [yisiConfig, setYisiConfig] = useState({
    apiKey: formData.strategyConfig?.apiKey || "",
    apiEndpoint: formData.strategyConfig?.apiEndpoint || "https://api.yisi.com/user-profile",
    analysisDepth: formData.strategyConfig?.analysisDepth || "basic",
  })
  const [dbConfig, setDbConfig] = useState({
    connectionString: formData.strategyConfig?.connectionString || "",
    tableName: formData.strategyConfig?.tableName || "",
    matchFields: formData.strategyConfig?.matchFields || "phone,wechatId",
  })
  const [customConfig, setCustomConfig] = useState({
    name: formData.strategyConfig?.name || "",
    description: formData.strategyConfig?.description || "",
  })

  const getStrategyName = () => {
    switch (strategyType) {
      case "jd":
        return "京东会员识别"
      case "yisi":
        return "易思用户画像"
      case "database":
        return "数据库客户匹配"
      case "custom":
        return customConfig.name || "自定义策略"
      default:
        return ""
    }
  }

  const getStrategyConfig = () => {
    switch (strategyType) {
      case "jd":
        return jdConfig
      case "yisi":
        return yisiConfig
      case "database":
        return dbConfig
      case "custom":
        return customConfig
      default:
        return {}
    }
  }

  const handleContinue = () => {
    updateFormData({
      strategyType,
      strategyName: getStrategyName(),
      strategyConfig: getStrategyConfig(),
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">选择优化策略</h2>
        <p className="text-gray-500 text-sm">选择用于流量池优化的策略插件</p>
      </div>

      <RadioGroup
        value={strategyType}
        onValueChange={setStrategyType}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <RadioGroupItem value="jd" id="jd" className="peer sr-only" />
          <Label
            htmlFor="jd"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500 cursor-pointer"
          >
            <ShoppingBag className="mb-3 h-6 w-6 text-orange-500" />
            <div className="text-center">
              <p className="font-medium">京东会员识别</p>
              <p className="text-sm text-gray-500">识别流量池中的京东会员用户</p>
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="yisi" id="yisi" className="peer sr-only" />
          <Label
            htmlFor="yisi"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500 cursor-pointer"
          >
            <BarChart className="mb-3 h-6 w-6 text-blue-500" />
            <div className="text-center">
              <p className="font-medium">易思接口</p>
              <p className="text-sm text-gray-500">通过易思API分析用户画像</p>
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="database" id="database" className="peer sr-only" />
          <Label
            htmlFor="database"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500 cursor-pointer"
          >
            <Database className="mb-3 h-6 w-6 text-green-500" />
            <div className="text-center">
              <p className="font-medium">数据库匹配</p>
              <p className="text-sm text-gray-500">与现有客户数据库进行匹配</p>
            </div>
          </Label>
        </div>

        <div>
          <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
          <Label
            htmlFor="custom"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500 cursor-pointer"
          >
            <Settings className="mb-3 h-6 w-6 text-purple-500" />
            <div className="text-center">
              <p className="font-medium">自定义策略</p>
              <p className="text-sm text-gray-500">创建自定义的优化策略</p>
            </div>
          </Label>
        </div>
      </RadioGroup>

      {strategyType === "jd" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">京东会员识别配置</h3>

            <div className="space-y-2">
              <Label htmlFor="jd-username">京东账号</Label>
              <Input
                id="jd-username"
                value={jdConfig.username}
                onChange={(e) => setJdConfig({ ...jdConfig, username: e.target.value })}
                placeholder="输入京东账号"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jd-password">京东密码</Label>
              <Input
                id="jd-password"
                type="password"
                value={jdConfig.password}
                onChange={(e) => setJdConfig({ ...jdConfig, password: e.target.value })}
                placeholder="输入京东密码"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jd-level">会员等级筛选</Label>
              <select
                id="jd-level"
                value={jdConfig.memberLevel}
                onChange={(e) => setJdConfig({ ...jdConfig, memberLevel: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="all">所有会员</option>
                <option value="plus">PLUS会员</option>
                <option value="vip">VIP会员</option>
                <option value="regular">普通会员</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {strategyType === "yisi" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">易思接口配置</h3>

            <div className="space-y-2">
              <Label htmlFor="yisi-apikey">API密钥</Label>
              <Input
                id="yisi-apikey"
                value={yisiConfig.apiKey}
                onChange={(e) => setYisiConfig({ ...yisiConfig, apiKey: e.target.value })}
                placeholder="输入易思API密钥"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yisi-endpoint">API端点</Label>
              <Input
                id="yisi-endpoint"
                value={yisiConfig.apiEndpoint}
                onChange={(e) => setYisiConfig({ ...yisiConfig, apiEndpoint: e.target.value })}
                placeholder="输入API端点URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yisi-depth">分析深度</Label>
              <select
                id="yisi-depth"
                value={yisiConfig.analysisDepth}
                onChange={(e) => setYisiConfig({ ...yisiConfig, analysisDepth: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="basic">基础分析</option>
                <option value="standard">标准分析</option>
                <option value="deep">深度分析</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {strategyType === "database" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">数据库匹配配置</h3>

            <div className="space-y-2">
              <Label htmlFor="db-connection">连接字符串</Label>
              <Input
                id="db-connection"
                value={dbConfig.connectionString}
                onChange={(e) => setDbConfig({ ...dbConfig, connectionString: e.target.value })}
                placeholder="输入数据库连接字符串"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-table">表名</Label>
              <Input
                id="db-table"
                value={dbConfig.tableName}
                onChange={(e) => setDbConfig({ ...dbConfig, tableName: e.target.value })}
                placeholder="输入表名"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="db-fields">匹配字段</Label>
              <Input
                id="db-fields"
                value={dbConfig.matchFields}
                onChange={(e) => setDbConfig({ ...dbConfig, matchFields: e.target.value })}
                placeholder="输入匹配字段，用逗号分隔"
              />
              <p className="text-xs text-gray-500">多个字段用逗号分隔，如：phone,wechatId</p>
            </div>
          </CardContent>
        </Card>
      )}

      {strategyType === "custom" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium">自定义策略配置</h3>

            <div className="space-y-2">
              <Label htmlFor="custom-name">策略名称</Label>
              <Input
                id="custom-name"
                value={customConfig.name}
                onChange={(e) => setCustomConfig({ ...customConfig, name: e.target.value })}
                placeholder="输入策略名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-desc">策略描述</Label>
              <textarea
                id="custom-desc"
                value={customConfig.description}
                onChange={(e) => setCustomConfig({ ...customConfig, description: e.target.value })}
                placeholder="输入策略描述"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !strategyType ||
            (strategyType === "jd" && (!jdConfig.username || !jdConfig.password)) ||
            (strategyType === "yisi" && !yisiConfig.apiKey) ||
            (strategyType === "database" && (!dbConfig.connectionString || !dbConfig.tableName)) ||
            (strategyType === "custom" && !customConfig.name)
          }
        >
          继续
        </Button>
      </div>
    </div>
  )
}
