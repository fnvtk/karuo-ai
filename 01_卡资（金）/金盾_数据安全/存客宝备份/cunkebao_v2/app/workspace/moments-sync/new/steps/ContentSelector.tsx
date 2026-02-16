"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

// 定义类型，避免导入错误
interface ContentLibrary {
  id: string
  name: string
  source: string
  creator: string
  contentCount: number
  lastUpdated: string
  type: string
  status: string
}

interface ContentLibraryResponse {
  code: number
  message: string
  data: {
    libraries: ContentLibrary[]
    total: number
  }
}

interface ContentLibrarySelectResponse {
  code: number
  message: string
  data: {
    success: boolean
    libraryId: string
    name: string
  }
}

interface ContentSelectorProps {
  formData: any
  onChange: (data: any) => void
  onNext: () => void
  onPrev: () => void
}

export function ContentSelector({ formData, onChange, onNext, onPrev }: ContentSelectorProps) {
  const [libraries, setLibraries] = useState<ContentLibrary[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchContentLibraries()
  }, [])

  const fetchContentLibraries = async () => {
    setLoading(true)
    try {
      // 实际项目中这里应该调用API获取所有内容库
      const response: ContentLibraryResponse = {
        code: 0,
        message: "success",
        data: {
          libraries: [
            {
              id: "1",
              name: "微信好友广告",
              source: "微信",
              creator: "海尼",
              contentCount: 12,
              lastUpdated: "2024-02-09 12:30",
              type: "moments",
              status: "active",
            },
            {
              id: "2",
              name: "开发群",
              source: "微信",
              creator: "karuo",
              contentCount: 8,
              lastUpdated: "2024-02-09 12:30",
              type: "group",
              status: "inactive",
            },
            {
              id: "3",
              name: "产品更新",
              source: "微信",
              creator: "张三",
              contentCount: 15,
              lastUpdated: "2024-02-10 09:45",
              type: "moments",
              status: "active",
            },
            {
              id: "4",
              name: "市场活动",
              source: "微信",
              creator: "李四",
              contentCount: 20,
              lastUpdated: "2024-02-11 14:20",
              type: "moments",
              status: "active",
            },
            {
              id: "5",
              name: "技术交流",
              source: "微信",
              creator: "王五",
              contentCount: 10,
              lastUpdated: "2024-02-12 16:35",
              type: "group",
              status: "active",
            },
          ],
          total: 5,
        },
      }

      if (response.code === 0) {
        setLibraries(response.data.libraries)
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      toast({
        title: "获取失败",
        description: "无法获取内容库列表",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchContentLibraries()
    toast({
      title: "刷新成功",
      description: "内容库列表已更新",
    })
  }

  const filteredLibraries = libraries.filter((library) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "friends" && library.type === "moments") ||
      (activeTab === "groups" && library.type === "group")
    const matchesSearch = library.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const handleSelectLibrary = async (library: ContentLibrary) => {
    try {
      // 实际项目中这里应该调用API
      const response: ContentLibrarySelectResponse = {
        code: 0,
        message: "success",
        data: {
          success: true,
          libraryId: library.id,
          name: library.name,
        },
      }

      if (response.code === 0 && response.data.success) {
        onChange({
          ...formData,
          selectedLibrary: library.id,
          contentFormat: library.type,
        })
        toast({
          title: "选择成功",
          description: `已选择内容库：${library.name}`,
        })
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      toast({
        title: "选择失败",
        description: "无法选择内容库",
        variant: "destructive",
      })
    }
  }

  const handleFinish = async () => {
    try {
      // 实际项目中这里应该调用API创建计划
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "创建成功",
        description: "新计划已创建",
      })
      onNext()
    } catch (error) {
      toast({
        title: "创建失败",
        description: "无法创建新计划",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索内容库名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="friends">微信好友</TabsTrigger>
            <TabsTrigger value="groups">聊天群</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          {filteredLibraries.map((library) => (
            <div
              key={library.id}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                formData.selectedLibrary === library.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-500"
              }`}
              onClick={() => handleSelectLibrary(library)}
            >
              <div className="flex-1">
                <div className="font-medium">{library.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  <div className="flex items-center space-x-2">
                    <span>来源：{library.source}</span>
                    <span>•</span>
                    <span>创建人：{library.creator}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">内容数量：{library.contentCount}</Badge>
                    <Badge variant="outline">更新时间：{new Date(library.lastUpdated).toLocaleString()}</Badge>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className={library.status === "inactive" ? "bg-gray-100" : ""}>
                {library.status === "active" ? "启用" : "已停用"}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
          <Button onClick={handleFinish} disabled={!formData.selectedLibrary}>
            完成
          </Button>
        </div>
      </div>
    </Card>
  )
}
