"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Settings,
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  QrCode,
  Scan,
  UserPlus,
  X,
  MessageCircle,
  UserCheck,
  Reply,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import BottomNav from "@/app/components/BottomNav"

// ========== 步骤定义 ==========
const steps = [
  { id: 1, title: "步骤 1", subtitle: "基础设置" },
  { id: 2, title: "步骤 2", subtitle: "收益配置" },
  { id: 3, title: "步骤 3", subtitle: "渠道成员" },
]

const scenarioPlans = [
  { id: "plan-1", name: "海报获客-春季招聘计划", scenario: "海报", icon: "🎨", status: "active" },
  { id: "plan-2", name: "抖音获客-直播引流", scenario: "抖音", icon: "🎵", status: "active" },
  { id: "plan-3", name: "抖音获客-年货节活动", scenario: "抖音", icon: "🎵", status: "active" },
  { id: "plan-4", name: "小红书获客-种草推广", scenario: "小红书", icon: "📖", status: "active" },
  { id: "plan-5", name: "电话获客-客户回访", scenario: "电话", icon: "📞", status: "paused" },
  { id: "plan-6", name: "微信群获客-社群裂变", scenario: "微信群", icon: "💬", status: "active" },
  { id: "plan-7", name: "公众号获客-内容引流", scenario: "公众号", icon: "💚", status: "active" },
  { id: "plan-8", name: "付款码获客-门店推广", scenario: "付款码", icon: "💳", status: "active" },
]

// ========== 模拟指定渠道成员列表 ==========
const designatedMembers = [
  { id: "1", name: "苏志钦", phone: "13800138001", wechat: "szq2024" },
  { id: "2", name: "王龙兰", phone: "13800138002", wechat: "wll2024" },
  { id: "3", name: "小清", phone: "13800138003", wechat: "xq2024" },
  { id: "4", name: "梁玉娟", phone: "13800138004", wechat: "lyj2024" },
  { id: "5", name: "谢金板", phone: "13800138005", wechat: "xjb2024" },
  { id: "6", name: "李翊瑶", phone: "13800138006", wechat: "lyy2024" },
  { id: "7", name: "陈泊锋", phone: "13800138007", wechat: "cbf2024" },
  { id: "8", name: "方滢铭", phone: "13800138008", wechat: "fym2024" },
]

// ========== 步骤指示器组件 ==========
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

        {steps.map((step) => (
          <div key={step.id} className="relative flex flex-col items-center z-10">
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

// ========== 主页面组件 ==========
export default function NewChannelPlanPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState({
    // 步骤1: 基础设置 - 选择场景获客计划（而非场景本身）
    planName: "",
    selectedPlanIds: [] as string[],

    // 步骤2: 收益配置 - 三种收益类型
    friendPassReward: 2.0, // 好友通过收益
    replyRateReward: 3.0, // 回复率收益
    passReplyRateReward: 3.0, // 通过后回复率收益

    // 步骤3: 渠道成员
    selectedMemberIds: [] as string[],
  })

  // 生成的计划ID
  const [generatedPlanId] = useState(() => Math.floor(Math.random() * 1000) + 100)
  const webUrl = `https://h5.ckb.quwanzhi.com/#/pages/form/input?id=${generatedPlanId}`
  const miniappPath = `pages/form/input?id=${generatedPlanId}`

  // 新增成员弹窗
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [addMemberType, setAddMemberType] = useState<"scan" | "manual">("scan")
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    wechat: "",
    remark: "",
  })

  // 更新表单数据
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const togglePlanSelection = (planId: string) => {
    const newPlans = formData.selectedPlanIds.includes(planId)
      ? formData.selectedPlanIds.filter((id) => id !== planId)
      : [...formData.selectedPlanIds, planId]
    updateFormData("selectedPlanIds", newPlans)
  }

  // 增加/减少收益金额
  const adjustReward = (field: string, delta: number) => {
    const currentValue = formData[field as keyof typeof formData] as number
    const newAmount = Math.max(0, currentValue + delta)
    updateFormData(field, Number.parseFloat(newAmount.toFixed(2)))
  }

  // 切换成员选择
  const toggleMember = (memberId: string) => {
    const newMembers = formData.selectedMemberIds.includes(memberId)
      ? formData.selectedMemberIds.filter((id) => id !== memberId)
      : [...formData.selectedMemberIds, memberId]
    updateFormData("selectedMemberIds", newMembers)
  }

  // 全选/清空成员
  const selectAllMembers = () => {
    updateFormData(
      "selectedMemberIds",
      designatedMembers.map((m) => m.id),
    )
  }
  const clearAllMembers = () => {
    updateFormData("selectedMemberIds", [])
  }

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "复制成功", description: "链接已复制到剪贴板" })
  }

  // 添加新成员
  const handleAddMember = () => {
    if (addMemberType === "manual") {
      if (!newMember.name.trim()) {
        toast({ title: "请输入渠道名称", variant: "destructive" })
        return
      }
    }
    // 模拟添加成员
    const newId = `new-${Date.now()}`
    designatedMembers.push({
      id: newId,
      name: newMember.name || `扫码成员${designatedMembers.length + 1}`,
      phone: newMember.phone || "待完善",
      wechat: newMember.wechat || "待完善",
    })
    updateFormData("selectedMemberIds", [...formData.selectedMemberIds, newId])
    setNewMember({ name: "", phone: "", wechat: "", remark: "" })
    setShowAddMemberDialog(false)
    toast({ title: "添加成功", description: "渠道成员已添加" })
  }

  // 下一步
  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.planName.trim()) {
        toast({ title: "请填写计划名称", variant: "destructive" })
        return
      }
      if (formData.selectedPlanIds.length === 0) {
        toast({ title: "请至少选择一个场景获客计划", variant: "destructive" })
        return
      }
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "创建成功",
        description: `渠道获客计划"${formData.planName}"已创建`,
      })
      router.push("/scenarios")
    } catch (error) {
      toast({
        title: "创建失败",
        description: "请重试",
        variant: "destructive",
      })
    }
  }

  // 获取选中计划名称
  const getSelectedPlanNames = () => {
    return formData.selectedPlanIds
      .map((id) => scenarioPlans.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join("、")
  }

  // ========== 渲染步骤内容 ==========
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
                placeholder="请输入渠道获客计划名称"
                value={formData.planName}
                onChange={(e) => updateFormData("planName", e.target.value)}
                className="h-12 rounded-xl border-gray-200 focus-visible:ring-2 focus-visible:ring-green-500/30"
              />
              <p className="text-xs text-gray-500">为您的分销计划起一个清晰易懂的名称</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  获客场景计划 <span className="text-red-500">*</span>
                </Label>
                <span className="text-xs text-gray-500">已选 {formData.selectedPlanIds.length} 个</span>
              </div>
              <p className="text-xs text-gray-500 -mt-1">选择要关联的场景获客计划，支持多选</p>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {scenarioPlans.map((plan) => {
                  const isSelected = formData.selectedPlanIds.includes(plan.id)
                  return (
                    <div
                      key={plan.id}
                      className={`flex items-center space-x-3 p-3 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? "bg-green-50 border-2 border-green-300"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                      }`}
                      onClick={() => togglePlanSelection(plan.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePlanSelection(plan.id)}
                        className="border-gray-300"
                      />
                      <div className="text-2xl">{plan.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{plan.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{plan.scenario}获客</span>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${
                              plan.status === "active"
                                ? "bg-green-100 text-green-700 border-0"
                                : "bg-gray-100 text-gray-500 border-0"
                            }`}
                          >
                            {plan.status === "active" ? "进行中" : "已暂停"}
                          </Badge>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 已选计划预览 */}
            {formData.selectedPlanIds.length > 0 && (
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-0 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      已选择 {formData.selectedPlanIds.length} 个场景计划
                    </div>
                    <div className="text-xs text-green-600 mt-0.5 truncate">{getSelectedPlanNames()}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">收益配置</Label>
              <p className="text-xs text-gray-500">设置渠道成员在不同情况下的收益金额</p>
            </div>

            {/* 好友通过收益 */}
            <div className="p-4 bg-blue-50/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">好友通过</div>
                    <div className="text-xs text-gray-500">添加好友成功时结算</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("friendPassReward", -0.5)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    value={formData.friendPassReward.toFixed(2)}
                    onChange={(e) => updateFormData("friendPassReward", Number.parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl text-center text-lg font-bold border-0 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("friendPassReward", 0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-600 w-8">元</span>
              </div>
            </div>

            {/* 回复率收益 */}
            <div className="p-4 bg-green-50/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">回复率</div>
                    <div className="text-xs text-gray-500">客户有回复时结算</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("replyRateReward", -0.5)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    value={formData.replyRateReward.toFixed(2)}
                    onChange={(e) => updateFormData("replyRateReward", Number.parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl text-center text-lg font-bold border-0 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("replyRateReward", 0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-600 w-8">元</span>
              </div>
            </div>

            {/* 通过后回复率收益 */}
            <div className="p-4 bg-purple-50/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Reply className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">通过后回复率</div>
                    <div className="text-xs text-gray-500">好友通过后有回复时结算</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("passReplyRateReward", -0.5)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    value={formData.passReplyRateReward.toFixed(2)}
                    onChange={(e) => updateFormData("passReplyRateReward", Number.parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl text-center text-lg font-bold border-0 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-white"
                  onClick={() => adjustReward("passReplyRateReward", 0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-600 w-8">元</span>
              </div>
            </div>

            {/* 收益预览卡片 */}
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-0 rounded-2xl">
              <div className="text-sm text-gray-600 mb-3">收益配置预览</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-white/80 rounded-xl">
                  <div className="text-xs text-gray-500">好友通过</div>
                  <div className="text-lg font-bold text-blue-600">¥{formData.friendPassReward.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-white/80 rounded-xl">
                  <div className="text-xs text-gray-500">回复率</div>
                  <div className="text-lg font-bold text-green-600">¥{formData.replyRateReward.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-white/80 rounded-xl">
                  <div className="text-xs text-gray-500">通过后回复</div>
                  <div className="text-lg font-bold text-purple-600">¥{formData.passReplyRateReward.toFixed(2)}</div>
                </div>
              </div>
            </Card>

            {/* 结算说明 */}
            <div className="bg-blue-50/80 rounded-2xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">结算说明</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 好友通过：客户添加微信好友并通过验证时计算收益</li>
                <li>• 回复率：客户主动回复消息时计算收益</li>
                <li>• 通过后回复率：好友通过后客户有回复时计算收益</li>
                <li>• 提现需满足最低提现金额要求（默认10元）</li>
              </ul>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {/* 渠道成员选择 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">指定渠道成员</Label>
                <div className="flex items-center space-x-2">
                  {formData.selectedMemberIds.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={clearAllMembers}>
                      清空
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl text-xs bg-transparent"
                    onClick={selectAllMembers}
                  >
                    全选
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 rounded-xl text-xs bg-green-500 hover:bg-green-600"
                    onClick={() => setShowAddMemberDialog(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    新增
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-1">选择参与此分销计划的渠道成员</p>

              {/* 已选择的成员标签 */}
              {formData.selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-green-50/80 rounded-xl">
                  {formData.selectedMemberIds.map((memberId) => {
                    const member = designatedMembers.find((m) => m.id === memberId)
                    return member ? (
                      <Badge
                        key={memberId}
                        className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer rounded-full px-3 py-1 flex items-center gap-1"
                        onClick={() => toggleMember(memberId)}
                      >
                        {member.name}
                        <X className="h-3 w-3" />
                      </Badge>
                    ) : null
                  })}
                </div>
              )}

              {/* 成员列表 */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {designatedMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center space-x-3 p-3 rounded-xl transition-colors cursor-pointer ${
                      formData.selectedMemberIds.includes(member.id)
                        ? "bg-green-50 border border-green-200"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    onClick={() => toggleMember(member.id)}
                  >
                    <Checkbox
                      checked={formData.selectedMemberIds.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                      className="border-gray-300"
                    />
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Web入口链接</Label>
              <p className="text-xs text-gray-500 -mt-1">此渠道获客计划的专属入口链接</p>
              <div className="flex items-center space-x-2">
                <Input value={webUrl} readOnly className="h-11 rounded-xl bg-gray-50 border-gray-200 text-sm" />
                <Button
                  variant="outline"
                  className="h-11 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white border-0"
                  onClick={() => copyLink(webUrl)}
                >
                  复制
                </Button>
              </div>
            </div>

            {/* 小程序入口 */}
            <div className="space-y-2">
              <Label className="text-base font-medium">小程序入口</Label>
              <p className="text-xs text-gray-500 -mt-1">扫码进入小程序获客页面</p>
              <div className="flex items-center justify-center p-6 bg-white rounded-2xl border border-gray-200">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">扫码进入小程序</p>
                  <p className="text-[10px] text-gray-400 mt-1">{miniappPath}</p>
                </div>
              </div>
            </div>

            {/* 完成提示 */}
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-green-50 border-0 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">配置完成</div>
                  <p className="text-sm text-gray-600 mt-1">
                    已选择 {formData.selectedMemberIds.length} 个渠道成员，关联 {formData.selectedPlanIds.length}{" "}
                    个场景计划，点击"完成"创建渠道获客计划
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

      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 backdrop-blur-2xl bg-white/70 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/scenarios")}
              className="rounded-2xl hover:bg-white/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">新建渠道获客计划</h1>
              <p className="text-xs text-gray-500">创建分销计划并配置收益</p>
            </div>
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

      {/* 底部操作按钮 */}
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

      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="rounded-3xl max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>新增渠道成员</DialogTitle>
            <DialogDescription>选择创建方式：扫码获取微信信息或手动填写</DialogDescription>
          </DialogHeader>

          {/* 创建方式切换 - 扫码在前 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                addMemberType === "scan" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setAddMemberType("scan")}
            >
              <Scan className="h-4 w-4" />
              扫码创建
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                addMemberType === "manual" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setAddMemberType("manual")}
            >
              <UserPlus className="h-4 w-4" />
              手动创建
            </button>
          </div>

          {addMemberType === "scan" ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden">
                <QrCode className="h-24 w-24 text-gray-400" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent flex items-end justify-center pb-4">
                  <span className="text-xs text-gray-500">点击生成二维码</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center mb-2">扫描微信二维码自动获取渠道信息</p>
              <p className="text-xs text-gray-400 text-center">渠道成员扫码后自动录入系统</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  渠道名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入渠道名称"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  placeholder="请输入11位手机号"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>微信号</Label>
                <Input
                  placeholder="请输入微信号"
                  value={newMember.wechat}
                  onChange={(e) => setNewMember({ ...newMember, wechat: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  placeholder="请输入备注信息"
                  value={newMember.remark}
                  onChange={(e) => setNewMember({ ...newMember, remark: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={3}
                />
                <div className="text-xs text-gray-400 text-right">{newMember.remark.length}/200</div>
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl bg-transparent"
              onClick={() => setShowAddMemberDialog(false)}
            >
              取消
            </Button>
            <Button className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600" onClick={handleAddMember}>
              {addMemberType === "scan" ? "生成二维码" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
