"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { QrCode, X, ChevronDown, Plus, Maximize2, Upload, Download, Settings, Minus } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

// 调整场景顺序，确保API获客在最后，并且前三个是最常用的场景
const scenarios = [
  { id: "haibao", name: "海报获客", type: "material" },
  { id: "order", name: "订单获客", type: "api" },
  { id: "douyin", name: "抖音获客", type: "social" },
  { id: "xiaohongshu", name: "小红书获客", type: "social" },
  { id: "phone", name: "电话获客", type: "social" },
  { id: "gongzhonghao", name: "公众号获客", type: "social" },
  { id: "weixinqun", name: "微信群获客", type: "social" },
  { id: "payment", name: "付款码获客", type: "material" },
  { id: "api", name: "API获客", type: "api" }, // API获客放在最后
]

const phoneCallTags = [
  { id: "tag-1", name: "咨询", color: "bg-blue-100 text-blue-800" },
  { id: "tag-2", name: "投诉", color: "bg-red-100 text-red-800" },
  { id: "tag-3", name: "合作", color: "bg-green-100 text-green-800" },
  { id: "tag-4", name: "价格", color: "bg-orange-100 text-orange-800" },
  { id: "tag-5", name: "售后", color: "bg-purple-100 text-purple-800" },
  { id: "tag-6", name: "订单", color: "bg-yellow-100 text-yellow-800" },
  { id: "tag-7", name: "物流", color: "bg-teal-100 text-teal-800" },
]

// 不同场景的预设标签
const scenarioTags = {
  haibao: [
    { id: "poster-tag-1", name: "活动推广", color: "bg-blue-100 text-blue-800" },
    { id: "poster-tag-2", name: "产品宣传", color: "bg-green-100 text-green-800" },
    { id: "poster-tag-3", name: "品牌展示", color: "bg-purple-100 text-purple-800" },
    { id: "poster-tag-4", name: "优惠促销", color: "bg-red-100 text-red-800" },
    { id: "poster-tag-5", name: "新品发布", color: "bg-orange-100 text-orange-800" },
  ],
  order: [
    { id: "order-tag-1", name: "新订单", color: "bg-green-100 text-green-800" },
    { id: "order-tag-2", name: "复购客户", color: "bg-blue-100 text-blue-800" },
    { id: "order-tag-3", name: "高价值订单", color: "bg-purple-100 text-purple-800" },
    { id: "order-tag-4", name: "待付款", color: "bg-yellow-100 text-yellow-800" },
    { id: "order-tag-5", name: "已完成", color: "bg-gray-100 text-gray-800" },
  ],
  douyin: [
    { id: "douyin-tag-1", name: "短视频", color: "bg-pink-100 text-pink-800" },
    { id: "douyin-tag-2", name: "直播", color: "bg-red-100 text-red-800" },
    { id: "douyin-tag-3", name: "带货", color: "bg-orange-100 text-orange-800" },
    { id: "douyin-tag-4", name: "粉丝互动", color: "bg-blue-100 text-blue-800" },
    { id: "douyin-tag-5", name: "热门话题", color: "bg-purple-100 text-purple-800" },
  ],
  xiaohongshu: [
    { id: "xhs-tag-1", name: "种草笔记", color: "bg-red-100 text-red-800" },
    { id: "xhs-tag-2", name: "美妆", color: "bg-pink-100 text-pink-800" },
    { id: "xhs-tag-3", name: "穿搭", color: "bg-purple-100 text-purple-800" },
    { id: "xhs-tag-4", name: "生活方式", color: "bg-green-100 text-green-800" },
    { id: "xhs-tag-5", name: "好物推荐", color: "bg-orange-100 text-orange-800" },
  ],
  phone: phoneCallTags,
  gongzhonghao: [
    { id: "gzh-tag-1", name: "文章推送", color: "bg-blue-100 text-blue-800" },
    { id: "gzh-tag-2", name: "活动通知", color: "bg-green-100 text-green-800" },
    { id: "gzh-tag-3", name: "产品介绍", color: "bg-purple-100 text-purple-800" },
    { id: "gzh-tag-4", name: "用户服务", color: "bg-orange-100 text-orange-800" },
    { id: "gzh-tag-5", name: "品牌故事", color: "bg-gray-100 text-gray-800" },
  ],
  weixinqun: [
    { id: "wxq-tag-1", name: "群活动", color: "bg-green-100 text-green-800" },
    { id: "wxq-tag-2", name: "产品分享", color: "bg-blue-100 text-blue-800" },
    { id: "wxq-tag-3", name: "用户交流", color: "bg-purple-100 text-purple-800" },
    { id: "wxq-tag-4", name: "优惠信息", color: "bg-pink-100 text-pink-800" },
    { id: "wxq-tag-5", name: "答疑解惑", color: "bg-orange-100 text-orange-800" },
    { id: "wxq-tag-6", name: "新人欢迎", color: "bg-yellow-100 text-yellow-800" },
    { id: "wxq-tag-7", name: "群规通知", color: "bg-gray-100 text-gray-800" },
    { id: "wxq-tag-8", name: "活跃互动", color: "bg-indigo-100 text-indigo-800" },
  ],
  payment: [
    { id: "pay-tag-1", name: "扫码支付", color: "bg-green-100 text-green-800" },
    { id: "pay-tag-2", name: "线下门店", color: "bg-blue-100 text-blue-800" },
    { id: "pay-tag-3", name: "活动收款", color: "bg-purple-100 text-purple-800" },
    { id: "pay-tag-4", name: "服务费用", color: "bg-orange-100 text-orange-800" },
    { id: "pay-tag-5", name: "会员充值", color: "bg-yellow-100 text-yellow-800" },
  ],
  api: [
    { id: "api-tag-1", name: "系统对接", color: "bg-blue-100 text-blue-800" },
    { id: "api-tag-2", name: "数据同步", color: "bg-green-100 text-green-800" },
    { id: "api-tag-3", name: "自动化", color: "bg-purple-100 text-purple-800" },
    { id: "api-tag-4", name: "第三方平台", color: "bg-orange-100 text-orange-800" },
    { id: "api-tag-5", name: "实时推送", color: "bg-gray-100 text-gray-800" },
  ],
}

interface BasicSettingsProps {
  formData: any
  onChange: (data: any) => void
  onNext?: () => void
}

interface Account {
  id: string
  nickname: string
  avatar: string
}

interface Material {
  id: string
  name: string
  type: string
  preview: string
}

const posterTemplates = [
  {
    id: "poster-1",
    name: "点击领取",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E9%A2%86%E5%8F%961-tipd1HI7da6qooY5NkhxQnXBnT5LGU.gif",
  },
  {
    id: "poster-2",
    name: "点击合作",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%90%88%E4%BD%9C-LPlMdgxtvhqCSr4IM1bZFEFDBF3ztI.gif",
  },
  {
    id: "poster-3",
    name: "点击咨询",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%92%A8%E8%AF%A2-FTiyAMAPop2g9LvjLOLDz0VwPg3KVu.gif",
  },
  {
    id: "poster-4",
    name: "点击签到",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E7%AD%BE%E5%88%B0-94TZIkjLldb4P2jTVlI6MkSDg0NbXi.gif",
  },
  {
    id: "poster-5",
    name: "点击了解",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E4%BA%86%E8%A7%A3-6GCl7mQVdO4WIiykJyweSubLsTwj71.gif",
  },
  {
    id: "poster-6",
    name: "点击报名",
    preview:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E6%8A%A5%E5%90%8D-Mj0nnva0BiASeDAIhNNaRRAbjPgjEj.gif",
  },
]

const generateRandomAccounts = (count: number): Account[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `account-${index + 1}`,
    nickname: `账号-${Math.random().toString(36).substring(2, 7)}`,
    avatar: `/placeholder.svg?height=40&width=40&text=${index + 1}`,
  }))
}

const generatePosterMaterials = (): Material[] => {
  return posterTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    type: "poster",
    preview: template.preview,
  }))
}

export function BasicSettings({ formData, onChange, onNext }: BasicSettingsProps) {
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false)
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPhoneSettingsOpen, setIsPhoneSettingsOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState("")
  const [accounts] = useState<Account[]>(generateRandomAccounts(50))
  const [materials] = useState<Material[]>(generatePosterMaterials())
  const [selectedAccounts, setSelectedAccounts] = useState<Account[]>(
    formData.accounts?.length > 0 ? formData.accounts : [],
  )
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>(
    formData.materials?.length > 0 ? formData.materials : [],
  )
  const [showAllScenarios, setShowAllScenarios] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importedTags, setImportedTags] = useState<
    Array<{
      phone: string
      wechat: string
      source?: string
      orderAmount?: number
      orderDate?: string
    }>
  >(formData.importedTags || [])

  const [selectedScenarioTags, setSelectedScenarioTags] = useState<string[]>(formData.scenarioTags || [])
  const [customTagInput, setCustomTagInput] = useState("")
  const [customTags, setCustomTags] = useState<Array<{ id: string; name: string; color: string }>>(
    formData.customTags || [],
  )

  // 初始化电话获客设置
  const [phoneSettings, setPhoneSettings] = useState({
    autoAdd: formData.phoneSettings?.autoAdd ?? true,
    speechToText: formData.phoneSettings?.speechToText ?? true,
    questionExtraction: formData.phoneSettings?.questionExtraction ?? true,
  })

  const [selectedPhoneTags, setSelectedPhoneTags] = useState<string[]>(formData.phoneTags || [])
  const [phoneCallType, setPhoneCallType] = useState(formData.phoneCallType || "both")

  // 处理标签选择
  const handleTagToggle = (tagId: string) => {
    const newTags = selectedPhoneTags.includes(tagId)
      ? selectedPhoneTags.filter((id) => id !== tagId)
      : [...selectedPhoneTags, tagId]

    setSelectedPhoneTags(newTags)
    onChange({ ...formData, phoneTags: newTags })
  }

  // 处理通话类型选择
  const handleCallTypeChange = (type: string) => {
    setPhoneCallType(type)
    onChange({ ...formData, phoneCallType: type })
  }

  // 初始化时，如果没有选择场景，默认选择海报获客
  useEffect(() => {
    if (!formData.scenario) {
      onChange({ ...formData, scenario: "haibao" })
    }

    if (!formData.planName) {
      if (formData.materials?.length > 0) {
        const today = new Date().toLocaleDateString("zh-CN").replace(/\//g, "")
        onChange({ ...formData, planName: `海报${today}` })
      } else {
        onChange({ ...formData, planName: "场景" })
      }
    }
  }, [formData, onChange])

  const handleScenarioSelect = (scenarioId: string) => {
    // 如果选择了电话获客，更新计划名称
    if (scenarioId === "phone") {
      const today = new Date().toLocaleDateString("zh-CN").replace(/\//g, "")
      onChange({ ...formData, scenario: scenarioId, planName: `电话获客${today}` })
    } else {
      onChange({ ...formData, scenario: scenarioId })
    }
  }

  // 处理场景标签选择
  const handleScenarioTagToggle = (tagId: string) => {
    const newTags = selectedScenarioTags.includes(tagId)
      ? selectedScenarioTags.filter((id) => id !== tagId)
      : [...selectedScenarioTags, tagId]

    setSelectedScenarioTags(newTags)
    onChange({ ...formData, scenarioTags: newTags })
  }

  // 添加自定义标签
  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return

    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-red-100 text-red-800",
      "bg-orange-100 text-orange-800",
      "bg-yellow-100 text-yellow-800",
      "bg-gray-100 text-gray-800",
      "bg-pink-100 text-pink-800",
    ]

    const newTag = {
      id: `custom-${Date.now()}`,
      name: customTagInput.trim(),
      color: colors[Math.floor(Math.random() * colors.length)],
    }

    const updatedCustomTags = [...customTags, newTag]
    setCustomTags(updatedCustomTags)
    setCustomTagInput("")
    onChange({ ...formData, customTags: updatedCustomTags })
  }

  // 删除自定义标签
  const handleRemoveCustomTag = (tagId: string) => {
    const updatedCustomTags = customTags.filter((tag) => tag.id !== tagId)
    setCustomTags(updatedCustomTags)
    onChange({ ...formData, customTags: updatedCustomTags })

    // 同时从选中标签中移除
    const updatedSelectedTags = selectedScenarioTags.filter((id) => id !== tagId)
    setSelectedScenarioTags(updatedSelectedTags)
    onChange({ ...formData, scenarioTags: updatedSelectedTags, customTags: updatedCustomTags })
  }

  const handleAccountSelect = (account: Account) => {
    const updatedAccounts = [...selectedAccounts, account]
    setSelectedAccounts(updatedAccounts)
    onChange({ ...formData, accounts: updatedAccounts })
  }

  const handleMaterialSelect = (material: Material) => {
    const updatedMaterials = [material]
    setSelectedMaterials(updatedMaterials)
    onChange({ ...formData, materials: updatedMaterials })
    setIsMaterialDialogOpen(false)

    // 更新计划名称
    const today = new Date().toLocaleDateString("zh-CN").replace(/\//g, "")
    onChange({ ...formData, planName: `海报${today}`, materials: updatedMaterials })
  }

  const handleRemoveAccount = (accountId: string) => {
    const updatedAccounts = selectedAccounts.filter((a) => a.id !== accountId)
    setSelectedAccounts(updatedAccounts)
    onChange({ ...formData, accounts: updatedAccounts })
  }

  const handleRemoveMaterial = (materialId: string) => {
    const updatedMaterials = selectedMaterials.filter((m) => m.id !== materialId)
    setSelectedMaterials(updatedMaterials)
    onChange({ ...formData, materials: updatedMaterials })
  }

  const handlePreviewImage = (imageUrl: string) => {
    setPreviewImage(imageUrl)
    setIsPreviewOpen(true)
  }

  // 只显示前三个场景，其他的需要点击展开
  const displayedScenarios = showAllScenarios ? scenarios : scenarios.slice(0, 3)

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const rows = content.split("\n").filter((row) => row.trim())
          const tags = rows.slice(1).map((row) => {
            const [phone, wechat, source, orderAmount, orderDate] = row.split(",")
            return {
              phone: phone.trim(),
              wechat: wechat.trim(),
              source: source?.trim(),
              orderAmount: orderAmount ? Number(orderAmount) : undefined,
              orderDate: orderDate?.trim(),
            }
          })
          setImportedTags(tags)
          onChange({ ...formData, importedTags: tags })
        } catch (error) {
          console.error("导入失败:", error)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleDownloadTemplate = () => {
    const template = "电话号码,微信号,来源,订单金额,下单日期\n13800138000,wxid_123,抖音,99.00,2024-03-03"
    const blob = new Blob([template], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "订单导入模板.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // 处理电话获客设置更新
  const handlePhoneSettingsUpdate = () => {
    onChange({ ...formData, phoneSettings })
    setIsPhoneSettingsOpen(false)
  }

  return (
    <TooltipProvider>
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <Label className="text-base mb-4 block">获客场景</Label>
            <div className="grid grid-cols-3 gap-2">
              {displayedScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  className={`p-2 rounded-lg text-center transition-all ${
                    formData.scenario === scenario.id
                      ? "bg-blue-100 text-blue-600 font-medium"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => handleScenarioSelect(scenario.id)}
                >
                  {scenario.name.replace("获客", "")}
                </button>
              ))}
            </div>
            {!showAllScenarios && (
              <Button variant="ghost" className="mt-2 w-full text-blue-600" onClick={() => setShowAllScenarios(true)}>
                展开更多选项 <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor="planName">计划名称</Label>
            <Input
              id="planName"
              value={formData.planName}
              onChange={(e) => onChange({ ...formData, planName: e.target.value })}
              placeholder="请输入计划名称"
              className="mt-2"
            />
          </div>

          {/* 场景标签选择 */}
          {formData.scenario && (
            <div className="mt-6">
              <Label className="text-base mb-3 block">
                {scenarios.find((s) => s.id === formData.scenario)?.name}标签（可多选）
              </Label>

              {/* 预设标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(scenarioTags[formData.scenario as keyof typeof scenarioTags] || []).map((tag) => (
                  <div
                    key={tag.id}
                    className={`px-3 py-2 rounded-full text-sm cursor-pointer transition-all ${
                      selectedScenarioTags.includes(tag.id)
                        ? tag.color + " ring-2 ring-blue-400"
                        : tag.color + " hover:ring-1 hover:ring-gray-300"
                    }`}
                    onClick={() => handleScenarioTagToggle(tag.id)}
                  >
                    {tag.name}
                  </div>
                ))}
              </div>

              {/* 自定义标签 */}
              {customTags.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm text-gray-600 mb-2 block">自定义标签</Label>
                  <div className="flex flex-wrap gap-2">
                    {customTags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`px-3 py-2 rounded-full text-sm cursor-pointer transition-all relative group ${
                          selectedScenarioTags.includes(tag.id)
                            ? tag.color + " ring-2 ring-blue-400"
                            : tag.color + " hover:ring-1 hover:ring-gray-300"
                        }`}
                        onClick={() => handleScenarioTagToggle(tag.id)}
                      >
                        {tag.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveCustomTag(tag.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 添加自定义标签 */}
              <div className="flex gap-2">
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="输入自定义标签名称"
                  className="flex-1"
                  maxLength={8}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddCustomTag()
                    }
                  }}
                />
                <Button
                  onClick={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                  variant="outline"
                  className="px-4"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>

              {selectedScenarioTags.length > 0 && (
                <div className="mt-3 text-sm text-gray-500">已选择 {selectedScenarioTags.length} 个标签</div>
              )}
            </div>
          )}

          {formData.scenario && (
            <>
              {scenarios.find((s) => s.id === formData.scenario)?.type === "social" &&
                formData.scenario !== "phone" && (
                  <div>
                    <Label>绑定账号</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        className="flex-1 justify-start"
                        onClick={() => setIsAccountDialogOpen(true)}
                      >
                        {selectedAccounts.length > 0 ? `已选择 ${selectedAccounts.length} 个账号` : "选择账号"}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setIsQRCodeOpen(true)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    {selectedAccounts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedAccounts.map((account) => (
                          <div key={account.id} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                            <img
                              src={account.avatar || "/placeholder.svg"}
                              alt={account.nickname}
                              className="w-4 h-4 rounded-full mr-2"
                            />
                            <span className="text-sm">{account.nickname}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 p-0"
                              onClick={() => handleRemoveAccount(account.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* 电话获客特殊设置 */}
              {formData.scenario === "phone" && (
                <Card className="p-4 border-blue-100 bg-blue-50/50 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium text-blue-700">电话获客设置</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPhoneSettingsOpen(true)}
                      className="flex items-center gap-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      修改设置
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.autoAdd ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span>自动添加客户</span>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.autoAdd ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {phoneSettings.autoAdd ? "已开启" : "已关闭"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.speechToText ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span>语音转文字</span>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.speechToText ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {phoneSettings.speechToText ? "已开启" : "已关闭"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${phoneSettings.questionExtraction ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span>问题提取</span>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs ${phoneSettings.questionExtraction ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {phoneSettings.questionExtraction ? "已开启" : "已关闭"}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    提示：电话获客功能将自动记录来电信息，并根据设置执行相应操作
                  </p>
                </Card>
              )}

              {formData.scenario === "phone" && (
                <>
                  {/* 添加电话通话类型选择 */}
                  <div className="mt-6">
                    <Label className="text-base mb-2 block">通话类型</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div
                        className={`p-3 border rounded-lg text-center cursor-pointer ${
                          phoneCallType === "outbound" || phoneCallType === "both"
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => handleCallTypeChange(phoneCallType === "inbound" ? "both" : "outbound")}
                      >
                        <div className="font-medium">发起外呼</div>
                        <div className="text-sm text-gray-500">主动向客户发起电话</div>
                      </div>
                      <div
                        className={`p-3 border rounded-lg text-center cursor-pointer ${
                          phoneCallType === "inbound" || phoneCallType === "both"
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => handleCallTypeChange(phoneCallType === "outbound" ? "both" : "inbound")}
                      >
                        <div className="font-medium">接收来电</div>
                        <div className="text-sm text-gray-500">接听客户的来电</div>
                      </div>
                    </div>
                  </div>

                  {/* 添加标签功能 */}
                  <div className="mt-6">
                    <Label className="text-base mb-2 block">通话标签（可多选）</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {phoneCallTags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`px-3 py-1.5 rounded-full text-sm cursor-pointer ${
                            selectedPhoneTags.includes(tag.id)
                              ? tag.color
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          }`}
                          onClick={() => handleTagToggle(tag.id)}
                        >
                          {tag.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {scenarios.find((s) => s.id === formData.scenario)?.type === "material" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>选择海报</Label>
                    <Button variant="outline" onClick={() => setIsMaterialDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 海报展示区域 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className={`relative cursor-pointer rounded-lg overflow-hidden group ${
                          selectedMaterials.find((m) => m.id === material.id)
                            ? "ring-2 ring-blue-600"
                            : "hover:ring-2 hover:ring-blue-600"
                        }`}
                        onClick={() => handleMaterialSelect(material)}
                      >
                        <img
                          src={material.preview || "/placeholder.svg"}
                          alt={material.name}
                          className="w-full aspect-[9/16] object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePreviewImage(material.preview)
                            }}
                          >
                            <Maximize2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white">
                          <div className="text-sm truncate">{material.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedMaterials.length > 0 && (
                    <div className="mt-4">
                      <Label>已选择的海报</Label>
                      <div className="mt-2">
                        <div className="relative w-full max-w-[200px]">
                          <img
                            src={selectedMaterials[0].preview || "/placeholder.svg"}
                            alt={selectedMaterials[0].name}
                            className="w-full aspect-[9/16] object-cover rounded-lg cursor-pointer"
                            onClick={() => handlePreviewImage(selectedMaterials[0].preview)}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveMaterial(selectedMaterials[0].id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scenarios.find((s) => s.id === formData.scenario)?.id === "order" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>订单导入</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        下载模板
                      </Button>
                      <Button onClick={() => setIsImportDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        导入订单
                      </Button>
                    </div>
                  </div>

                  {importedTags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">已导入 {importedTags.length} 条数据</h4>
                      <div className="max-h-[300px] overflow-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>电话号码</TableHead>
                              <TableHead>微信号</TableHead>
                              <TableHead>来源</TableHead>
                              <TableHead>订单金额</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importedTags.slice(0, 5).map((tag, index) => (
                              <TableRow key={index}>
                                <TableCell>{tag.phone}</TableCell>
                                <TableCell>{tag.wechat}</TableCell>
                                <TableCell>{tag.source}</TableCell>
                                <TableCell>{tag.orderAmount}</TableCell>
                              </TableRow>
                            ))}
                            {importedTags.length > 5 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500">
                                  还有 {importedTags.length - 5} 条数据未显示
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {formData.scenario === "weixinqun" && (
                <>
                  <div>
                    <Label>群管理设置</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">自动欢迎新成员</div>
                          <div className="text-sm text-gray-500">新成员入群时自动发送欢迎消息</div>
                        </div>
                        <Switch
                          checked={formData.autoWelcome ?? true}
                          onCheckedChange={(checked) => onChange({ ...formData, autoWelcome: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">群活跃度监控</div>
                          <div className="text-sm text-gray-500">监控群聊活跃度并自动互动</div>
                        </div>
                        <Switch
                          checked={formData.activityMonitor ?? false}
                          onCheckedChange={(checked) => onChange({ ...formData, activityMonitor: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>每日推送数量</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onChange({ ...formData, syncCount: Math.max(1, (formData.syncCount || 3) - 1) })}
                        className="bg-white border-gray-200"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{formData.syncCount || 3}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onChange({ ...formData, syncCount: (formData.syncCount || 3) + 1 })}
                        className="bg-white border-gray-200"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-gray-500">条内容到群</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">建议每日推送3-5条内容，避免过度打扰群成员</div>
                  </div>

                  <div>
                    <Label>推送时间设置</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["上午 9:00-12:00", "下午 14:00-17:00", "晚上 19:00-21:00"].map((time, index) => (
                        <div
                          key={index}
                          className={`p-2 border rounded-lg text-center cursor-pointer text-sm ${
                            (formData.pushTimes || []).includes(index)
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-white hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            const currentTimes = formData.pushTimes || []
                            const newTimes = currentTimes.includes(index)
                              ? currentTimes.filter((t: number) => t !== index)
                              : [...currentTimes, index]
                            onChange({ ...formData, pushTimes: newTimes })
                          }}
                        >
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">是否启用</Label>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => onChange({ ...formData, enabled: checked })}
            />
          </div>

          <Button className="w-full h-12 text-base" onClick={onNext}>
            下一步
          </Button>
        </div>
      </Card>

      {/* 账号选择对话框 */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择账号</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                  onClick={() => handleAccountSelect(account)}
                >
                  <img src={account.avatar || "/placeholder.svg"} alt="" className="w-10 h-10 rounded-full" />
                  <span className="flex-1">{account.nickname}</span>
                  {selectedAccounts.find((a) => a.id === account.id) && (
                    <div className="w-4 h-4 rounded-full bg-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 二维码对话框 */}
      <Dialog open={isQRCodeOpen} onOpenChange={setIsQRCodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>绑定账号</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-6">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <img src="/placeholder.svg?height=256&width=256" alt="二维码" className="w-full h-full" />
            </div>
            <p className="mt-4 text-sm text-gray-600">请用相应的APP扫码</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>海报预览</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            <img src={previewImage || "/placeholder.svg"} alt="预览" className="max-h-[80vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>

      {/* 电话获客设置对话框 */}
      <Dialog open={isPhoneSettingsOpen} onOpenChange={setIsPhoneSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>电话获客设置</DialogTitle>
            <DialogDescription>配置电话获客的自动化功能，提高获客效率</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="auto-add" className="font-medium">
                  自动添加客户
                </Label>
                <p className="text-sm text-gray-500">来电后自动将客户添加为微信好友</p>
                <p className="text-xs text-blue-600">推荐：开启此功能可提高转化率约30%</p>
              </div>
              <Switch
                id="auto-add"
                checked={phoneSettings.autoAdd}
                onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, autoAdd: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="speech-to-text" className="font-medium">
                  语音转文字
                </Label>
                <p className="text-sm text-gray-500">自动将通话内容转换为文字记录</p>
                <p className="text-xs text-blue-600">支持普通话、粤语等多种方言识别</p>
              </div>
              <Switch
                id="speech-to-text"
                checked={phoneSettings.speechToText}
                onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, speechToText: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="question-extraction" className="font-medium">
                  问题提取
                </Label>
                <p className="text-sm text-gray-500">自动从通话中提取客户的首句问题</p>
                <p className="text-xs text-blue-600">AI智能识别客户意图，提高回复精准度</p>
              </div>
              <Switch
                id="question-extraction"
                checked={phoneSettings.questionExtraction}
                onCheckedChange={(checked) => setPhoneSettings({ ...phoneSettings, questionExtraction: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2 pt-2">
            <Button variant="outline" onClick={() => setIsPhoneSettingsOpen(false)} className="flex-1">
              取消
            </Button>
            <Button onClick={handlePhoneSettingsUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700">
              保存设置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 订单导入对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>导入订单标签</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input type="file" accept=".csv" onChange={handleFileImport} className="flex-1" />
            </div>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>电话号码</TableHead>
                    <TableHead>微信号</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>订单金额</TableHead>
                    <TableHead>下单日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedTags.map((tag, index) => (
                    <TableRow key={index}>
                      <TableCell>{tag.phone}</TableCell>
                      <TableCell>{tag.wechat}</TableCell>
                      <TableCell>{tag.source}</TableCell>
                      <TableCell>{tag.orderAmount}</TableCell>
                      <TableCell>{tag.orderDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                onChange({ ...formData, importedTags })
                setIsImportDialogOpen(false)
              }}
            >
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
