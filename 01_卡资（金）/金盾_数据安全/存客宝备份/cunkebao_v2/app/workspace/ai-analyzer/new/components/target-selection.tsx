"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Tag, MapPin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { DeviceSelector } from "@/app/components/DeviceSelector"

interface TargetSelectionProps {
  formData: {
    targetType: string
    selectedDevices: string[]
    selectedTrafficPool: string
    tags: string[]
    regions: string[]
    keywords: string[]
  }
  updateFormData: (
    data: Partial<{
      targetType: string
      selectedDevices: string[]
      selectedTrafficPool: string
      tags: string[]
      regions: string[]
      keywords: string[]
    }>,
  ) => void
  onSubmit: () => void
  onBack: () => void
}

interface TrafficUser {
  id: string
  avatar: string
  nickname: string
  wechatId: string
  phone: string
  region: string
  tags: string[]
  addTime: string
  source: string
}

export function TargetSelection({ formData, updateFormData, onSubmit, onBack }: TargetSelectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [trafficUsers, setTrafficUsers] = useState<TrafficUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [errors, setErrors] = useState<{ selection?: string }>({})

  // 模拟加载流量池用户数据
  useEffect(() => {
    const fetchTrafficUsers = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const mockUsers: TrafficUser[] = [
        {
          id: "user-1",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "张小明",
          wechatId: "zhangxm123",
          phone: "138****1234",
          region: "北京",
          tags: ["新用户", "低活跃度"],
          addTime: "2023-10-15",
          source: "朋友圈",
        },
        {
          id: "user-2",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "李华",
          wechatId: "lihua456",
          phone: "139****5678",
          region: "上海",
          tags: ["高消费", "高活跃度"],
          addTime: "2023-09-20",
          source: "群聊",
        },
        {
          id: "user-3",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "王芳",
          wechatId: "wangfang789",
          phone: "137****9012",
          region: "广州",
          tags: ["潜在客户", "有购买意向"],
          addTime: "2023-11-05",
          source: "搜索",
        },
        {
          id: "user-4",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "赵明",
          wechatId: "zhaoming321",
          phone: "136****3456",
          region: "深圳",
          tags: ["网购达人", "中高消费"],
          addTime: "2023-10-28",
          source: "附近的人",
        },
        {
          id: "user-5",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "刘洋",
          wechatId: "liuyang654",
          phone: "135****7890",
          region: "杭州",
          tags: ["90后", "学生"],
          addTime: "2023-11-10",
          source: "名片",
        },
        {
          id: "user-6",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "陈静",
          wechatId: "chenjing987",
          phone: "134****1234",
          region: "成都",
          tags: ["00后", "学生"],
          addTime: "2023-11-15",
          source: "朋友推荐",
        },
        {
          id: "user-7",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "林小红",
          wechatId: "linxh123",
          phone: "133****5678",
          region: "南京",
          tags: ["潜在客户", "华东地区"],
          addTime: "2023-10-05",
          source: "扫码",
        },
        {
          id: "user-8",
          avatar: "/placeholder.svg?height=40&width=40",
          nickname: "黄强",
          wechatId: "huangq456",
          phone: "132****9012",
          region: "武汉",
          tags: ["高消费", "有购买意向"],
          addTime: "2023-09-15",
          source: "朋友圈",
        },
      ]

      setTrafficUsers(mockUsers)
      setIsLoading(false)
    }

    fetchTrafficUsers()
  }, [])

  const allTags = Array.from(new Set(trafficUsers.flatMap((user) => user.tags)))
  const allRegions = Array.from(new Set(trafficUsers.map((user) => user.region)))

  const filteredUsers = trafficUsers.filter((user) => {
    const matchesSearch =
      user.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.wechatId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => user.tags.includes(tag))

    const matchesRegions = selectedRegions.length === 0 || selectedRegions.includes(user.region)

    return matchesSearch && matchesTags && matchesRegions
  })

  const handleDeviceSelect = (deviceIds: string[]) => {
    updateFormData({ selectedDevices: deviceIds })
  }

  const handleUserSelect = (userId: string) => {
    updateFormData({
      selectedTrafficPool: userId === formData.selectedTrafficPool ? "" : userId,
    })
  }

  const handleTagSelect = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleRegionSelect = (region: string) => {
    setSelectedRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]))
  }

  const validateForm = () => {
    const newErrors: { selection?: string } = {}

    if (formData.targetType === "device" && formData.selectedDevices.length === 0) {
      newErrors.selection = "请至少选择一个设备"
    } else if (formData.targetType === "trafficPool" && !formData.selectedTrafficPool) {
      newErrors.selection = "请选择一个流量池"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">选择分析对象</h2>
        <p className="text-gray-500 mb-6">选择要分析的设备或流量池</p>
      </div>

      <Tabs
        defaultValue="device"
        onValueChange={(value) => updateFormData({ targetType: value })}
        value={formData.targetType}
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="device">设备列表</TabsTrigger>
          <TabsTrigger value="trafficPool">流量池</TabsTrigger>
        </TabsList>

        <TabsContent value="device" className="space-y-4">
          <DeviceSelector
            onSelect={handleDeviceSelect}
            initialSelectedDevices={formData.selectedDevices}
            excludeUsedDevices={false}
          />

          {errors.selection && formData.targetType === "device" && (
            <p className="text-red-500 text-sm">{errors.selection}</p>
          )}
        </TabsContent>

        <TabsContent value="trafficPool" className="space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索标签、地区、昵称信息"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Label className="flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                <span>标签筛选:</span>
              </Label>
              <div className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagSelect(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Label className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>地区筛选:</span>
              </Label>
              <div className="flex flex-wrap gap-1">
                {allRegions.map((region) => (
                  <Badge
                    key={region}
                    variant={selectedRegions.includes(region) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleRegionSelect(region)}
                  >
                    {region}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">微信号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">地区</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">标签</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">来源</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">添加时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-t hover:bg-gray-50 cursor-pointer ${
                        formData.selectedTrafficPool === user.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleUserSelect(user.id)}
                    >
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden mr-3">
                            <img
                              src={user.avatar || "/placeholder.svg"}
                              alt={user.nickname}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{user.nickname}</div>
                            <div className="text-gray-500 text-xs">{user.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.wechatId}</td>
                      <td className="px-4 py-3 text-sm">{user.region}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {user.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.source}</td>
                      <td className="px-4 py-3 text-sm">{user.addTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border">
              <p className="text-gray-500">没有找到符合条件的微信用户</p>
            </div>
          )}

          {errors.selection && formData.targetType === "trafficPool" && (
            <p className="text-red-500 text-sm">{errors.selection}</p>
          )}
        </TabsContent>
      </Tabs>

      {formData.targetType === "device" && formData.selectedDevices.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            已选择 {formData.selectedDevices.length} 个设备进行分析
          </AlertDescription>
        </Alert>
      )}

      {formData.targetType === "trafficPool" && formData.selectedTrafficPool && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            已选择用户: {trafficUsers.find((u) => u.id === formData.selectedTrafficPool)?.nickname}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button onClick={handleSubmit}>提交</Button>
      </div>
    </div>
  )
}
