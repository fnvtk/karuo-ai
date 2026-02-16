"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Settings, Check, ArrowRight, ArrowLeft, Plus, Minus, QrCode, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import BottomNav from "@/app/components/BottomNav"

// 步骤定义
const steps = [
  { id: 1, title: "步骤 1", subtitle: "基础设置" },
  { id: 2, title: "步骤 2", subtitle: "收益配置" },
  { id: 3, title: "步骤 3", subtitle: "渠道管理" },
]

// 场景类型
const scenarios = [
  { id: "haibao", name: "海报", color: "bg-blue-100 text-blue-700" },
  { id: "order", name: "订单", color: "bg-green-100 text-green-700" },
  { id: "douyin", name: "抖音", color: "bg-pink-100 text-pink-700" },
  { id: "xiaohongshu", name: "小红书", color: "bg-red-100 text-red-700" },
  { id: "phone", name: "电话", color: "bg-purple-100 text-purple-700" },
  { id: "weixinqun", name: "微信群", color: "bg-emerald-100 text-emerald-700" },
  { id: "payment", name: "付款码", color: "bg-orange-100 text-orange-700" },
  { id: "api", name: "API", color: "bg-gray-100 text-gray-700" },
]

// 收益时机选项
const rewardTimingOptions = [
  { id: "disabled", label: "禁用", description: "不启用分销收益" },
  { id: "form", label: "表单录入时", description: "客户填写表单时结算" },
  { id: "friend", label: "好友通过时", description: "添加好友成功时结算" },
]

// 模拟兼职者列表
const partTimeWorkers = [
  { id: "1", name: "苏志钦", phone: "13800138001" },
  { id: "2", name: "王龙兰", phone: "13800138002" },
  { id: "3", name: "小清", phone: "13800138003" },
  { id: "4", name: "梁玉娟", phone: "13800138004" },
  { id: "5", name: "谢金板", phone: "13800138005" },
  { id: "6", name: "李翊瑶", phone: "13800138006" },
  { id: "7", name: "陈泊锋", phone: "13800138007" },
  { id: "8", name: "方滢铭", phone: "13800138008" },
]

// 步骤指示器组件 - 苹果风格
function StepIndicator({ steps, currentStep }: { steps: typeof steps; currentStep: number }) {
  return (
    <div className="w-full px-4 py-6">
      <div className="relative flex items-center justify-between">
        {/* 进度条背景 */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        {/* 进度条激活 */}
        <div
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => (
          <div key={step.id} className="relative flex flex-col items-center z-10">
            {/* 步骤圆圈 */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-lg ${
                currentStep > step.id
                  ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-500/30"
                  : currentStep === step.id
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-500/30 ring-4 ring-green-500/20"
                    : "bg-white text-gray-400 border-2 border-gray-200"
              }`}
            >
              {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
            </div>

            {/* 步骤文字 */}
            <div className="mt-3 text-center">
              <div className={`text-sm font-semibold ${currentStep >= step.id ? "text-green-600" : "text-gray-400"}`}>
                {step.title}
              </div>
              <div className={`text-xs mt-0.5 ${currentStep >= step.id ? "text-green-600/80" : "text-gray-400"}`}>
                {step.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function NewDistributionPlanPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  // 表单数据
  const [formData, setFormData] = useState({
    // 步骤1: 基础设置
    planName: "",
    scenario: "haibao",
    linkedPlanId: "", // 关联的场景获客计划ID

    // 步骤2: 收益配置
    rewardTiming: "form", // disabled | form | friend
    rewardAmount: 0,

    // 步骤3: 渠道管理
    selectedWorkers: [] as string[],
    webUrl: "https://h5.ckb.quwanzhi.com/#/pages/form/input?id=689",
    miniappPath: "pages/form/input?id=689",
  })

  // 更新表单数据
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // 增加/减少收益金额
  const adjustRewardAmount = (delta: number) => {
    const newAmount = Math.max(0, formData.rewardAmount + delta)
    updateFormData("rewardAmount", Number.parseFloat(newAmount.toFixed(2)))
  }

  // 切换兼职者选择
  const toggleWorker = (workerId: string) => {
    const newWorkers = formData.selectedWorkers.includes(workerId)
      ? formData.selectedWorkers.filter((id) => id !== workerId)
      : [...formData.selectedWorkers, workerId]
    updateFormData("selectedWorkers", newWorkers)
  }

  // 添加全部兼职者
  const addAllWorkers = () => {
    updateFormData(
      "selectedWorkers",
      partTimeWorkers.map((w) => w.id),
    )
  }

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 下一步
  const handleNext = () => {
    if (currentStep === 1 && !formData.planName.trim()) {
      toast({ title: "请填写计划名称", variant: "destructive" })
      return
    }
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleSave()
    }
  }

  // 上一步
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // 保存计划
  const handleSave = async () => {
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "创建成功",
        description: `分销计划"${formData.planName}"已创建`,
      })

      router.push("/workspace/distribution")
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* 计划名称 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                计划名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入分销计划名称"
                value={formData.planName}
                onChange={(e) => updateFormData("planName", e.target.value)}
                className="h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500/30"
              />
            </div>

            {/* 获客场景选择 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">获客场景</Label>
              <div className="grid grid-cols-4 gap-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={`p-3 rounded-xl text-center transition-all ${
                      formData.scenario === scenario.id
                        ? "bg-green-100 text-green-700 font-medium ring-2 ring-green-500"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => updateFormData("scenario", scenario.id)}
                  >
                    <span className="text-sm">{scenario.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 关联场景计划 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">关联场景计划</Label>
              <Select value={formData.linkedPlanId} onValueChange={(value) => updateFormData("linkedPlanId", value)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="选择要关联的场景获客计划" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="plan-1">卡若招聘 - 海报获客计划</SelectItem>
                  <SelectItem value="plan-2">抖音直播 - 直播获客计划</SelectItem>
                  <SelectItem value="plan-3">小红书种草 - 笔记获客计划</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">关联后，该场景的获客数据将自动同步到分销计划</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            {/* 何时收益 */}
            <div className="space-y-3">
              <Label className="text-base font-medium">何时收益</Label>
              <div className="grid grid-cols-3 gap-2">
                {rewardTimingOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`p-4 rounded-xl text-center transition-all ${
                      formData.rewardTiming === option.id
                        ? "bg-green-500 text-white font-medium shadow-lg shadow-green-500/30"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => updateFormData("rewardTiming", option.id)}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 每条收益 - 仅在非禁用时显示 */}
            {formData.rewardTiming !== "disabled" && (
              <div className="space-y-3">
                <Label className="text-base font-medium">每条收益</Label>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl bg-transparent"
                    onClick={() => adjustRewardAmount(-0.5)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      value={formData.rewardAmount.toFixed(2)}
                      onChange={(e) => updateFormData("rewardAmount", Number.parseFloat(e.target.value) || 0)}
                      className="h-12 rounded-xl text-center text-xl font-bold border-gray-200"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl bg-transparent"
                    onClick={() => adjustRewardAmount(0.5)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-medium text-gray-600">元</span>
                </div>
                <p className="text-xs text-gray-500">
                  每成功{formData.rewardTiming === "form" ? "录入一条表单" : "添加一个好友"}，渠道可获得 ¥
                  {formData.rewardAmount.toFixed(2)} 收益
                </p>
              </div>
            )}

            {/* 收益预览卡片 */}
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-0 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">收益设置预览</div>
                  <div className="text-lg font-bold text-green-700 mt-1">
                    {formData.rewardTiming === "disabled"
                      ? "已禁用分销收益"
                      : `¥${formData.rewardAmount.toFixed(2)} / ${formData.rewardTiming === "form" ? "条表单" : "个好友"}`}
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {/* 兼职者选择 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">兼职者</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs bg-transparent"
                  onClick={addAllWorkers}
                >
                  添加全部
                </Button>
              </div>

              {/* 已选择的兼职者 */}
              {formData.selectedWorkers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.selectedWorkers.map((workerId) => {
                    const worker = partTimeWorkers.find((w) => w.id === workerId)
                    return worker ? (
                      <Badge
                        key={workerId}
                        className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer rounded-full px-3 py-1"
                        onClick={() => toggleWorker(workerId)}
                      >
                        {worker.name} ×
                      </Badge>
                    ) : null
                  })}
                </div>
              )}

              {/* 兼职者下拉选择 */}
              <Select onValueChange={toggleWorker}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="请选择兼职者" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-64">
                  {partTimeWorkers
                    .filter((w) => !formData.selectedWorkers.includes(w.id))
                    .map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{worker.name}</span>
                          <span className="text-xs text-gray-400">{worker.phone}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Web入口 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Web入口</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={formData.webUrl}
                  readOnly
                  className="h-12 rounded-xl bg-gray-50 border-gray-200 text-sm"
                />
                <Button
                  variant="outline"
                  className="h-12 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white border-0"
                  onClick={() => copyLink(formData.webUrl)}
                >
                  复制
                </Button>
              </div>
            </div>

            {/* 小程序入口 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">小程序入口</Label>
              <div className="flex items-center justify-center p-6 bg-white rounded-2xl border border-gray-200">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">扫码进入小程序</p>
                </div>
              </div>
            </div>

            {/* 完成提示 */}
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-0 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">配置完成</div>
                  <p className="text-sm text-gray-600 mt-1">
                    已选择 {formData.selectedWorkers.length} 个兼职者，点击"完成"创建分销计划
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex-1 min-h-screen pb-24">
      {/* 毛玻璃背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 -z-10" />

      {/* 顶部导航 - 苹果毛玻璃效果 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workspace/distribution")}
              className="rounded-2xl hover:bg-white/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">新建分销计划</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 步骤指示器 */}
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* 步骤内容 */}
      <div className="px-4 pb-4">
        <Card className="p-6 backdrop-blur-xl bg-white/80 border-0 shadow-xl rounded-3xl">{renderStepContent()}</Card>
      </div>

      {/* 底部操作按钮 - 固定 */}
      <div className="fixed bottom-20 left-0 right-0 p-4 backdrop-blur-xl bg-white/70">
        <div className="max-w-[390px] mx-auto flex space-x-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl border-gray-200 bg-white/80"
              onClick={handlePrev}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              上一步
            </Button>
          )}
          <Button
            className={`flex-1 h-12 rounded-2xl shadow-lg ${
              currentStep === steps.length
                ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30"
                : "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30"
            } text-white border-0`}
            onClick={handleNext}
          >
            {currentStep === steps.length ? "完成创建" : "下一步"}
            {currentStep < steps.length && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// 添加DollarSign图标导入
import { DollarSign } from "lucide-react"
