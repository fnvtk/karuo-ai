"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Users, Smartphone, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { DeviceSelectionDialog } from "@/app/components/device-selection-dialog"
import { TrafficPoolSelector } from "@/app/components/traffic-pool-selector"

interface UserTag {
  id: string
  name: string
  color: string
}

interface TrafficUser {
  id: string
  avatar: string
  nickname: string
  wechatId: string
  phone: string
  region: string
  note: string
  status: "pending" | "added" | "failed"
  addTime: string
  source: string
  assignedTo: string
  category: "potential" | "customer" | "lost"
  tags: UserTag[]
}

type DeviceSelectionType = "all" | "new" | "specific"

// 模拟规则数据
const mockRuleData = [
  {
    id: "1",
    name: "新用户流量分发",
    selectedUsers: [
      {
        id: "user-1",
        avatar: "/placeholder.svg?height=40&width=40",
        nickname: "用户1",
        wechatId: "wxid_abc123",
        phone: "13800138000",
        region: "北京",
        note: "",
        status: "added" as const,
        addTime: "2023-05-15T08:30:00.000Z",
        source: "抖音直播",
        assignedTo: "销售1",
        category: "potential" as const,
        tags: [
          { id: "tag1", name: "潜在客户", color: "bg-blue-100 text-blue-800" },
          { id: "tag4", name: "需跟进", color: "bg-yellow-100 text-yellow-800" },
        ],
      },
      {
        id: "user-2",
        avatar: "/placeholder.svg?height=40&width=40",
        nickname: "用户2",
        wechatId: "wxid_def456",
        phone: "13900139000",
        region: "上海",
        note: "这是用户2的备注",
        status: "pending" as const,
        addTime: "2023-05-16T10:15:00.000Z",
        source: "小红书",
        assignedTo: "销售2",
        category: "potential" as const,
        tags: [{ id: "tag1", name: "潜在客户", color: "bg-blue-100 text-blue-800" }],
      },
    ],
    deviceSelectionType: "all",
    selectedDevices: [],
    priority: "high",
    createAsPackage: false,
    price: "",
    autoDistribute: true,
  },
  {
    id: "2",
    name: "高端用户流量包",
    selectedUsers: [
      {
        id: "user-3",
        avatar: "/placeholder.svg?height=40&width=40",
        nickname: "用户3",
        wechatId: "wxid_ghi789",
        phone: "13700137000",
        region: "广州",
        note: "",
        status: "added" as const,
        addTime: "2023-05-14T14:20:00.000Z",
        source: "微信朋友圈",
        assignedTo: "销售3",
        category: "customer" as const,
        tags: [
          { id: "tag2", name: "高意向", color: "bg-green-100 text-green-800" },
          { id: "tag7", name: "企业客户", color: "bg-red-100 text-red-800" },
        ],
      },
    ],
    deviceSelectionType: "specific",
    selectedDevices: ["device-1", "device-4", "device-5"],
    priority: "low",
    createAsPackage: true,
    price: "2.5",
    autoDistribute: false,
  },
]

export default function EditRulePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [currentStep, setCurrentStep] = useState(1)
  const [name, setName] = useState("")

  // 流量池相关状态
  const [selectedUsers, setSelectedUsers] = useState<TrafficUser[]>([])
  const [trafficPoolDialogOpen, setTrafficPoolDialogOpen] = useState(false)

  // 设备选择相关状态
  const [deviceSelectionType, setDeviceSelectionType] = useState<DeviceSelectionType>("all")
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)

  // 规则设定相关状态
  const [priority, setPriority] = useState("high")
  const [createAsPackage, setCreateAsPackage] = useState(false)
  const [price, setPrice] = useState("")
  const [autoDistribute, setAutoDistribute] = useState(true)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 在实际应用中，这里会从API获取数据
    // 这里使用模拟数据
    const ruleItem = mockRuleData.find((item) => item.id === id)

    if (ruleItem) {
      setName(ruleItem.name)
      setSelectedUsers(ruleItem.selectedUsers)
      setDeviceSelectionType(ruleItem.deviceSelectionType as DeviceSelectionType)
      setSelectedDevices(ruleItem.selectedDevices)
      setPriority(ruleItem.priority)
      setCreateAsPackage(ruleItem.createAsPackage)
      setPrice(ruleItem.price)
      setAutoDistribute(ruleItem.autoDistribute)
    } else {
      // 如果找不到数据，返回列表页
      router.push("/workspace/pricing")
    }

    setLoading(false)
  }, [id, router])

  const handleDeviceSelect = (deviceIds: string[]) => {
    setSelectedDevices(deviceIds)
  }

  const handleUserSelect = (users: TrafficUser[]) => {
    setSelectedUsers(users)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (name.trim() && selectedUsers.length > 0) {
        setCurrentStep(2)
      } else {
        alert("请填写任务名称并选择流量池")
      }
    } else if (currentStep === 2) {
      if (deviceSelectionType === "specific" && selectedDevices.length === 0) {
        alert("请选择至少一个设备")
      } else {
        setCurrentStep(3)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    }
  }

  const handleSubmit = () => {
    // 在实际应用中，这里会发送API请求更新数据
    console.log({
      id,
      name,
      selectedUsers: selectedUsers.map((user) => user.id),
      deviceSelectionType,
      selectedDevices: deviceSelectionType === "specific" ? selectedDevices : [],
      priority,
      createAsPackage,
      price: createAsPackage ? price : "",
      autoDistribute,
    })

    // 返回到列表页
    router.push("/workspace/pricing")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 顶部栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workspace/pricing")} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-medium">编辑规则</h1>
          <div className="w-10"></div> {/* 占位，保持标题居中 */}
        </div>
      </header>

      {/* 进度条 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="flex items-center">
                <div
                  className={`rounded-full h-10 w-10 flex items-center justify-center ${
                    currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <Users className="h-5 w-5" />
                </div>
                <div className={`h-1 flex-1 mx-2 ${currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                <div
                  className={`rounded-full h-10 w-10 flex items-center justify-center ${
                    currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className={`h-1 flex-1 mx-2 ${currentStep >= 3 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                <div
                  className={`rounded-full h-10 w-10 flex items-center justify-center ${
                    currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <Settings className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex mt-2">
            <div className="flex-1 text-center text-sm font-medium">选择流量池</div>
            <div className="flex-1 text-center text-sm font-medium">选择设备</div>
            <div className="flex-1 text-center text-sm font-medium">规则设定</div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentStep === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">任务名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入任务名称"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">选择流量池</h2>
                <Button variant="outline" onClick={() => setTrafficPoolDialogOpen(true)}>
                  {selectedUsers.length > 0 ? "修改选择" : "选择流量池"}
                </Button>
              </div>

              {selectedUsers.length > 0 ? (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">已选择的流量池</h3>
                    <Badge>{selectedUsers.length} 个用户</Badge>
                  </div>

                  <div className="space-y-2">
                    {/* 显示选中用户的标签统计 */}
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(selectedUsers.flatMap((user) => user.tags.map((tag) => JSON.stringify(tag)))),
                      ).map((tagJson) => {
                        const tag = JSON.parse(tagJson) as UserTag
                        const count = selectedUsers.filter((user) => user.tags.some((t) => t.id === tag.id)).length

                        return (
                          <Badge key={tag.id} className={tag.color}>
                            {tag.name} ({count})
                          </Badge>
                        )
                      })}
                    </div>

                    {/* 显示选中用户的来源统计 */}
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">来源分布</div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(selectedUsers.map((user) => user.source))).map((source) => {
                          const count = selectedUsers.filter((user) => user.source === source).length

                          return (
                            <Badge key={source} variant="outline">
                              {source} ({count})
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 flex flex-col items-center justify-center text-center text-gray-500">
                  <Users className="h-12 w-12 mb-4 text-gray-400" />
                  <p>请选择流量池用户</p>
                  <p className="text-sm mt-1">您可以从流量池中选择特定标签的用户</p>
                </Card>
              )}

              <TrafficPoolSelector
                open={trafficPoolDialogOpen}
                onOpenChange={setTrafficPoolDialogOpen}
                selectedUsers={selectedUsers}
                onSelect={handleUserSelect}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={handleNext} disabled={name.trim() === "" || selectedUsers.length === 0}>
                下一步
              </Button>
            </div>
          </div>
        ) : currentStep === 2 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-medium">设备选择</h2>

              <RadioGroup
                value={deviceSelectionType}
                onValueChange={(value) => setDeviceSelectionType(value as DeviceSelectionType)}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all-devices" />
                  <Label htmlFor="all-devices" className="cursor-pointer">
                    所有设备
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-devices" />
                  <Label htmlFor="new-devices" className="cursor-pointer">
                    新添加设备
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific-devices" />
                  <Label htmlFor="specific-devices" className="cursor-pointer">
                    指定设备
                  </Label>
                </div>
              </RadioGroup>

              {deviceSelectionType === "specific" && (
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setDeviceDialogOpen(true)} className="w-full">
                    {selectedDevices.length > 0 ? `已选择 ${selectedDevices.length} 个设备` : "选择设备"}
                  </Button>

                  {selectedDevices.length > 0 && (
                    <Card className="mt-4 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">已选择的设备</h3>
                        <Badge>{selectedDevices.length} 个设备</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        您已选择 {selectedDevices.length} 个设备用于流量分发。 点击上方按钮可以修改选择。
                      </p>
                    </Card>
                  )}

                  <DeviceSelectionDialog
                    open={deviceDialogOpen}
                    onOpenChange={setDeviceDialogOpen}
                    selectedDevices={selectedDevices}
                    onSelect={handleDeviceSelect}
                  />
                </div>
              )}

              {deviceSelectionType === "all" && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-700">
                    您选择了使用所有可用设备进行流量分发。系统将自动分配流量到所有在线设备。
                  </p>
                </Card>
              )}

              {deviceSelectionType === "new" && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-sm text-green-700">
                    您选择了使用新添加的设备进行流量分发。系统将自动将流量分配到新接入的设备。
                  </p>
                </Card>
              )}
            </div>

            {/* 按钮组 */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handlePrevious}>
                上一步
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={deviceSelectionType === "specific" && selectedDevices.length === 0}
              >
                下一步
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-4">规则设定</h2>

              {/* 优先级选择 */}
              <div className="space-y-4 mb-6">
                <h3 className="font-medium">优先级</h3>
                <RadioGroup value={priority} onValueChange={setPriority} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high-priority" />
                    <Label htmlFor="high-priority" className="cursor-pointer">
                      高优先
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low-priority" />
                    <Label htmlFor="low-priority" className="cursor-pointer">
                      低优先
                    </Label>
                  </div>
                </RadioGroup>

                <Card className="p-3 bg-gray-50 border-gray-200">
                  <p className="text-sm text-gray-600">
                    高优先级规则将优先于低优先级规则执行。当多个规则匹配同一流量时，系统将按优先级顺序分配。
                  </p>
                </Card>
              </div>

              {/* 自动分发设置 */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-distribute">自动分发</Label>
                  <Switch id="auto-distribute" checked={autoDistribute} onCheckedChange={setAutoDistribute} />
                </div>
                <p className="text-sm text-gray-500">开启后，系统将自动按照规则分发流量。关闭后，需要手动触发分发。</p>
              </div>

              {/* 创建为流量包 */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-package">创建为流量包</Label>
                  <Switch id="create-package" checked={createAsPackage} onCheckedChange={setCreateAsPackage} />
                </div>
                <p className="text-sm text-gray-500">开启后，将创建为可售卖的流量包，可设置价格。</p>

                {createAsPackage && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="price">价格（元/流量包）</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2">¥</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 按钮组 */}
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handlePrevious}>
                上一步
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={createAsPackage && !price}>
                确认
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
