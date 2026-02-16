"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, User, MessageCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import type { ContentLibraryFormData } from "../page"

interface SourceSelectionProps {
  formData: ContentLibraryFormData
  updateFormData: (field: string, value: any) => void
  onNext: () => void
  onPrevious: () => void
}

// 模拟数据
const mockFriends = [
  { id: "f1", name: "张三", type: "friend", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "f2", name: "李四", type: "friend", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "f3", name: "王五", type: "friend", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "f4", name: "赵六", type: "friend", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "f5", name: "钱七", type: "friend", avatar: "/placeholder.svg?height=40&width=40" },
]

const mockGroups = [
  { id: "g1", name: "产品讨论群", type: "group", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "g2", name: "市场营销群", type: "group", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "g3", name: "技术交流群", type: "group", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "g4", name: "客户服务群", type: "group", avatar: "/placeholder.svg?height=40&width=40" },
]

const mockOfficialAccounts = [
  { id: "o1", name: "科技前沿", type: "official", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "o2", name: "营销之道", type: "official", avatar: "/placeholder.svg?height=40&width=40" },
  { id: "o3", name: "数据分析", type: "official", avatar: "/placeholder.svg?height=40&width=40" },
]

export function SourceSelection({ formData, updateFormData, onNext, onPrevious }: SourceSelectionProps) {
  const [activeTab, setActiveTab] = useState<string>(
    formData.type === "friends" ? "friends" : formData.type === "groups" ? "groups" : "all",
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSources, setSelectedSources] = useState<
    {
      id: string
      name: string
      type: string
      avatar?: string
    }[]
  >(formData.sources)

  // 根据内容库类型和当前标签过滤可选来源
  const getFilteredSources = () => {
    let sources = []

    if (activeTab === "friends" || activeTab === "all") {
      sources = [...sources, ...mockFriends]
    }

    if (activeTab === "groups" || activeTab === "all") {
      sources = [...sources, ...mockGroups]
    }

    if (activeTab === "official" || activeTab === "all") {
      sources = [...sources, ...mockOfficialAccounts]
    }

    // 应用搜索过滤
    if (searchQuery) {
      sources = sources.filter((source) => source.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    return sources
  }

  const handleSourceToggle = (source: any) => {
    const isSelected = selectedSources.some((s) => s.id === source.id)

    if (isSelected) {
      setSelectedSources(selectedSources.filter((s) => s.id !== source.id))
    } else {
      setSelectedSources([...selectedSources, source])
    }
  }

  const handleNext = () => {
    updateFormData("sources", selectedSources)
    onNext()
  }

  const filteredSources = getFilteredSources()
  const isFormValid = selectedSources.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium">来源选择</h2>
              <p className="text-sm text-gray-500 mt-1">选择内容库的来源，可以是微信好友、微信群或公众号</p>
            </div>

            {formData.type !== "mixed" && (
              <Alert variant="info" className="bg-blue-50 text-blue-700 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {formData.type === "friends"
                    ? "您已选择微信好友类型的内容库，请选择需要收集内容的微信好友。"
                    : formData.type === "groups"
                      ? "您已选择微信群类型的内容库，请选择需要收集内容的微信群。"
                      : "您已选择朋友圈类型的内容库，请选择需要收集内容的来源。"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索来源..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="friends" disabled={formData.type === "groups"}>
                    <User className="h-4 w-4 mr-1" />
                    好友
                  </TabsTrigger>
                  <TabsTrigger value="groups" disabled={formData.type === "friends"}>
                    <Users className="h-4 w-4 mr-1" />
                    群组
                  </TabsTrigger>
                  <TabsTrigger value="official">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    公众号
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 border rounded-md">
                  <div className="p-3 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">可选来源</span>
                      <span className="text-xs text-gray-500">已选择 {selectedSources.length} 个来源</span>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px]">
                    <div className="p-3 space-y-2">
                      {filteredSources.length > 0 ? (
                        filteredSources.map((source) => {
                          const isSelected = selectedSources.some((s) => s.id === source.id)
                          return (
                            <div
                              key={source.id}
                              className={`flex items-center justify-between p-2 border rounded-md ${
                                isSelected ? "bg-blue-50 border-blue-200" : "bg-white"
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  id={`source-${source.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() => handleSourceToggle(source)}
                                />
                                <div className="flex items-center space-x-2">
                                  <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                    <Image
                                      src={source.avatar || "/placeholder.svg"}
                                      alt={source.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{source.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {source.type === "friend"
                                        ? "微信好友"
                                        : source.type === "group"
                                          ? "微信群"
                                          : "公众号"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                          <p>未找到匹配的来源</p>
                          <p className="text-sm mt-1">请尝试其他搜索关键词</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>

              {selectedSources.length > 0 && (
                <div className="mt-4">
                  <Label className="text-base mb-2 block">已选择的来源</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-1"
                      >
                        <div className="relative w-5 h-5 rounded-full overflow-hidden">
                          <Image
                            src={source.avatar || "/placeholder.svg"}
                            alt={source.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm">{source.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 rounded-full"
                          onClick={() => handleSourceToggle(source)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          上一步
        </Button>
        <Button onClick={handleNext} disabled={!isFormValid}>
          下一步
        </Button>
      </div>
    </div>
  )
}
