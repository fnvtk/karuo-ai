"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Search,
  Plus,
  Upload,
  MoreVertical,
  FileText,
  Video,
  CheckCircle2,
  FolderOpen,
  File,
  Settings,
  Users,
  MessageSquare,
  Globe,
  Info,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface KnowledgeBase {
  id: string
  name: string
  description: string
  materialCount: number
  tags: string[]
  enabled: boolean
  prompt: string
  callHistory: Array<{
    id: string
    name: string
    avatar: string
    role: string
    lastCallTime: string
    callCount: number
  }>
}

interface Material {
  id: string
  name: string
  size: string
  date: string
  type: "pdf" | "video" | "doc"
  tag?: string
}

export default function AIKnowledgeBasePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const [showCallHistoryDialog, setShowCallHistoryDialog] = useState(false)
  const [showGlobalPromptDialog, setShowGlobalPromptDialog] = useState(false)
  const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null)
  const [activeTab, setActiveTab] = useState("list")
  const [editingPrompt, setEditingPrompt] = useState("")

  // 全局统一提示词
  const [globalPrompt, setGlobalPrompt] = useState(
    "你是存客宝AI知识库助手。请遵循以下基本原则：\n\n1. 专业性：使用专业但易懂的语言回答问题\n2. 准确性：基于知识库内容提供准确的信息\n3. 友好性：保持友好、耐心的服务态度\n4. 简洁性：回答简明扼要，重点突出\n5. 引用性：回答时注明信息来源\n\n在此基础上，结合具体知识库的特定要求进行回答。",
  )
  const [editingGlobalPrompt, setEditingGlobalPrompt] = useState("")
  const [globalPromptEnabled, setGlobalPromptEnabled] = useState(true)

  // 新建内容库表单
  const [newBaseName, setNewBaseName] = useState("")
  const [newBaseDescription, setNewBaseDescription] = useState("")
  const [newBaseTags, setNewBaseTags] = useState("")
  const [newBasePrompt, setNewBasePrompt] = useState("")

  // 模拟数据
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([
    {
      id: "1",
      name: "产品介绍库",
      description: "包含所有产品相关的介绍文档、图片和视频资料",
      materialCount: 126,
      tags: ["产品", "营销"],
      enabled: true,
      prompt:
        "你是一位专业的产品顾问。请基于产品介绍库的内容，用简洁、专业的语言回答客户关于产品的问题。重点突出产品优势和适用场景，避免使用过于技术化的术语。",
      callHistory: [
        {
          id: "1",
          name: "张小明",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "销售顾问",
          lastCallTime: "2024-03-20 14:30",
          callCount: 45,
        },
        {
          id: "2",
          name: "李娜",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "客服专员",
          lastCallTime: "2024-03-20 13:15",
          callCount: 32,
        },
        {
          id: "3",
          name: "王强",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "售前工程师",
          lastCallTime: "2024-03-19 16:45",
          callCount: 28,
        },
      ],
    },
    {
      id: "2",
      name: "客户案例库",
      description: "客户成功案例和使用反馈",
      materialCount: 69,
      tags: ["案例", "客户"],
      enabled: true,
      prompt:
        "你是一位案例分析专家。请根据客户案例库中的真实案例，用故事化的方式向客户介绍类似场景的成功经验。注重数据支撑和效果展示，增强说服力。",
      callHistory: [
        {
          id: "4",
          name: "刘芳",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "客户成功经理",
          lastCallTime: "2024-03-20 11:20",
          callCount: 18,
        },
      ],
    },
    {
      id: "3",
      name: "技术文档库",
      description: "技术规格、API文档等技术资料",
      materialCount: 234,
      tags: ["技术", "文档"],
      enabled: false,
      prompt:
        "你是一位技术支持专家。请基于技术文档库的内容，用准确、详细的语言解答技术问题。可以使用专业术语，但需要配合简单示例帮助理解。",
      callHistory: [
        {
          id: "5",
          name: "陈工",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "技术支持",
          lastCallTime: "2024-03-18 09:30",
          callCount: 56,
        },
      ],
    },
    {
      id: "4",
      name: "培训资料库",
      description: "员工培训和产品培训资料",
      materialCount: 67,
      tags: ["培训", "教育"],
      enabled: true,
      prompt:
        "你是一位培训讲师。请根据培训资料库的内容，用循序渐进、易于理解的方式解答学习问题。注重知识点的系统性和实用性，适当举例说明。",
      callHistory: [],
    },
    {
      id: "5",
      name: "成交转化库",
      description: "包含成交话术、促单技巧、价格策略等转化相关资料",
      materialCount: 89,
      tags: ["成交", "转化", "销售"],
      enabled: true,
      prompt:
        "你是一位资深销售专家。请基于成交转化库的内容，帮助销售人员提升成交率。重点关注客户需求挖掘、异议处理和临门一脚的技巧。回答要具有实战性和可操作性，适时提供话术模板。",
      callHistory: [
        {
          id: "6",
          name: "赵经理",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "销售经理",
          lastCallTime: "2024-03-20 15:10",
          callCount: 67,
        },
        {
          id: "7",
          name: "孙销售",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "高级销售",
          lastCallTime: "2024-03-20 14:50",
          callCount: 54,
        },
        {
          id: "8",
          name: "周顾问",
          avatar: "/placeholder.svg?height=40&width=40",
          role: "销售顾问",
          lastCallTime: "2024-03-20 12:30",
          callCount: 41,
        },
      ],
    },
  ])

  const [materials] = useState<Material[]>([
    { id: "1", name: "产品核心功能介绍.pdf", size: "2.4 MB", date: "2024/3/5", type: "pdf", tag: "核心功能" },
    { id: "2", name: "产品演示视频.mp4", size: "45.2 MB", date: "2024/3/4", type: "video", tag: "演示" },
    { id: "3", name: "产品特色说明.doc", size: "1.8 MB", date: "2024/3/3", type: "doc", tag: "产品" },
  ])

  const handleCreateBase = () => {
    if (!newBaseName) return

    const newBase: KnowledgeBase = {
      id: Date.now().toString(),
      name: newBaseName,
      description: newBaseDescription,
      materialCount: 0,
      tags: newBaseTags.split(/[,，]/).filter((tag) => tag.trim()),
      enabled: true,
      prompt: newBasePrompt || "请基于知识库内容，用专业、友好的语言回答问题。",
      callHistory: [],
    }

    setKnowledgeBases([...knowledgeBases, newBase])
    setSelectedBase(newBase)
    setShowNewDialog(false)
    setActiveTab("detail")

    setNewBaseName("")
    setNewBaseDescription("")
    setNewBaseTags("")
    setNewBasePrompt("")
  }

  const handleToggleBase = (id: string) => {
    setKnowledgeBases(knowledgeBases.map((base) => (base.id === id ? { ...base, enabled: !base.enabled } : base)))
    if (selectedBase?.id === id) {
      setSelectedBase({ ...selectedBase, enabled: !selectedBase.enabled })
    }
  }

  const handleSelectBase = (base: KnowledgeBase) => {
    setSelectedBase(base)
    setActiveTab("detail")
  }

  const handleOpenPromptDialog = () => {
    if (selectedBase) {
      setEditingPrompt(selectedBase.prompt)
      setShowPromptDialog(true)
    }
  }

  const handleSavePrompt = () => {
    if (selectedBase) {
      setKnowledgeBases(
        knowledgeBases.map((base) => (base.id === selectedBase.id ? { ...base, prompt: editingPrompt } : base)),
      )
      setSelectedBase({ ...selectedBase, prompt: editingPrompt })
      setShowPromptDialog(false)
    }
  }

  const handleOpenCallHistory = () => {
    setShowCallHistoryDialog(true)
  }

  const handleOpenGlobalPrompt = () => {
    setEditingGlobalPrompt(globalPrompt)
    setShowGlobalPromptDialog(true)
  }

  const handleSaveGlobalPrompt = () => {
    setGlobalPrompt(editingGlobalPrompt)
    setShowGlobalPromptDialog(false)
  }

  const filteredBases = knowledgeBases.filter(
    (base) =>
      base.name.toLowerCase().includes(searchQuery.toLowerCase()) || base.tags.some((tag) => tag.includes(searchQuery)),
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 固定头部 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">AI知识库</h1>
              <p className="text-xs text-gray-500">管理和配置内容库</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenGlobalPrompt} className="gap-1.5 bg-transparent">
              <Globe className="h-4 w-4" />
              统一提示词
            </Button>
            <Button onClick={() => setShowNewDialog(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              新建
            </Button>
          </div>
        </div>

        {/* 全局提示词状态提示 */}
        {globalPromptEnabled && (
          <div className="px-4 pb-3">
            <Alert className="border-blue-200 bg-blue-50">
              <Globe className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                已启用统一提示词规范 · 点击"统一提示词"可查看和编辑
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 标签导航 */}
        {selectedBase && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-12 rounded-none border-t">
              <TabsTrigger value="list" className="text-sm">
                内容库列表
              </TabsTrigger>
              <TabsTrigger value="detail" className="text-sm">
                {selectedBase.name}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* 内容区域 */}
      <ScrollArea className="flex-1">
        {activeTab === "list" || !selectedBase ? (
          <div className="p-4 space-y-4">
            {/* 搜索栏 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索内容库..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* 统计信息 */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{knowledgeBases.length}</div>
                    <div className="text-xs text-gray-500 mt-1">内容库总数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {knowledgeBases.filter((b) => b.enabled).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">启用中</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 内容库列表 */}
            <div className="space-y-3">
              {filteredBases.map((base) => (
                <Card
                  key={base.id}
                  className="cursor-pointer transition-all active:scale-[0.98]"
                  onClick={() => handleSelectBase(base)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-blue-100 shrink-0">
                        <FolderOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-base truncate">{base.name}</h3>
                          <Switch
                            checked={base.enabled}
                            onCheckedChange={() => handleToggleBase(base.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{base.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {base.materialCount} 个素材
                          </Badge>
                          {base.tags.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {base.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{base.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredBases.length === 0 && (
              <div className="text-center py-12">
                <FolderOpen className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">没有找到相关内容库</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* 内容库头部信息 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{selectedBase.name}</CardTitle>
                </div>
                <p className="text-sm text-gray-600">{selectedBase.description}</p>
              </CardHeader>
            </Card>

            {/* 统计数据卡片 */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{selectedBase.materialCount}</div>
                  <div className="text-xs text-gray-500">素材总数</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{selectedBase.enabled ? "启用" : "禁用"}</div>
                  <div className="text-xs text-gray-500">AI状态</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{selectedBase.tags.length}</div>
                  <div className="text-xs text-gray-500">标签数</div>
                </CardContent>
              </Card>
            </div>

            {/* 内容标签 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">内容标签</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {selectedBase.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI调用配置 */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                    <span>🔗</span>
                    <span>AI调用配置</span>
                  </CardTitle>
                  <Switch checked={selectedBase.enabled} onCheckedChange={() => handleToggleBase(selectedBase.id)} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2.5">
                <div className="flex items-start gap-2 text-sm text-blue-700">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>AI助手可以使用此内容库的素材</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-blue-700">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>支持智能应答和推荐</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-blue-700">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>实时响应用户查询</span>
                </div>
              </CardContent>
            </Card>

            {/* 提示词层级说明 */}
            {globalPromptEnabled && (
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>提示词生效规则</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="text-xs text-orange-800 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold shrink-0">1.</span>
                      <span>先应用统一提示词（全局规范）</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold shrink-0">2.</span>
                      <span>再结合知识库独立提示词（专业指导）</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold shrink-0">3.</span>
                      <span>最终形成针对性的回复风格</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI提示词配置 */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>知识库独立提示词</span>
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={handleOpenPromptDialog}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-purple-800 bg-white/50 p-3 rounded-lg border border-purple-100">
                  <p className="line-clamp-3">{selectedBase.prompt}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPromptDialog}
                  className="w-full mt-3 border-purple-200 hover:bg-purple-50 bg-transparent"
                >
                  编辑独立提示词
                </Button>
              </CardContent>
            </Card>

            {/* 调用客服名单 */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>调用客服名单</span>
                  </CardTitle>
                  <Badge variant="secondary">{selectedBase.callHistory.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedBase.callHistory.length > 0 ? (
                  <>
                    <div className="space-y-2 mb-3">
                      {selectedBase.callHistory.slice(0, 3).map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-white border">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{user.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500">
                              调用 {user.callCount} 次 · {user.lastCallTime}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedBase.callHistory.length > 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenCallHistory}
                        className="w-full border-green-200 hover:bg-green-50 bg-transparent"
                      >
                        查看全部 {selectedBase.callHistory.length} 人
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无调用记录</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 上传按钮 */}
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 gap-2 text-base">
              <Upload className="h-5 w-5" />
              上传素材到此库
            </Button>

            {/* 素材列表 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">库内素材</CardTitle>
                  <Badge variant="secondary">{materials.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  >
                    {material.type === "pdf" && (
                      <div className="p-2 rounded bg-red-100 shrink-0">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    {material.type === "video" && (
                      <div className="p-2 rounded bg-purple-100 shrink-0">
                        <Video className="h-5 w-5 text-purple-600" />
                      </div>
                    )}
                    {material.type === "doc" && (
                      <div className="p-2 rounded bg-blue-100 shrink-0">
                        <File className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1">{material.name}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{material.size}</span>
                        <span>·</span>
                        <span>{material.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {material.tag && (
                        <Badge variant="outline" className="text-xs">
                          {material.tag}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 底部操作按钮 */}
            <div className="grid grid-cols-2 gap-3 pb-4">
              <Button variant="outline" className="h-11 bg-transparent">
                编辑库
              </Button>
              <Button variant="outline" className="h-11 text-red-600 hover:text-red-700 bg-transparent">
                删除库
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* 新建内容库对话框 */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-[92%] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">新建内容库</DialogTitle>
            <p className="text-sm text-gray-500 pt-1">创建一个新的内容库来组织和管理您的素材</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                内容库名称
              </Label>
              <Input
                id="name"
                placeholder="如：产品介绍库"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                描述
              </Label>
              <Textarea
                id="description"
                placeholder="描述这个内容库的用途..."
                value={newBaseDescription}
                onChange={(e) => setNewBaseDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                标签
              </Label>
              <Input
                id="tags"
                placeholder="多个标签用逗号分隔，如：产品,营销,销售"
                value={newBaseTags}
                onChange={(e) => setNewBaseTags(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                独立提示词（可选）
              </Label>
              <Textarea
                id="prompt"
                placeholder="设置此知识库的专业指导，将与统一提示词配合使用..."
                value={newBasePrompt}
                onChange={(e) => setNewBasePrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">💡 此提示词将在统一提示词的基础上生效</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNewDialog(false)} className="flex-1 h-11">
              取消
            </Button>
            <Button onClick={handleCreateBase} disabled={!newBaseName} className="flex-1 h-11">
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑知识库独立提示词对话框 */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-[92%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              编辑知识库独立提示词
            </DialogTitle>
            <p className="text-sm text-gray-500 pt-1">设置此知识库的专业回复指导</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={editingPrompt}
              onChange={(e) => setEditingPrompt(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="请输入独立提示词..."
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡
                提示：独立提示词用于定义此知识库的专业性和回复风格，将与统一提示词配合使用。例如："你是一位专业的产品顾问..."
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPromptDialog(false)} className="flex-1 h-11">
              取消
            </Button>
            <Button onClick={handleSavePrompt} className="flex-1 h-11">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 统一提示词配置对话框 */}
      <Dialog open={showGlobalPromptDialog} onOpenChange={setShowGlobalPromptDialog}>
        <DialogContent className="max-w-[92%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              配置统一提示词
            </DialogTitle>
            <p className="text-sm text-gray-500 pt-1">设置所有知识库的通用回复规范</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">启用统一提示词</span>
              </div>
              <Switch checked={globalPromptEnabled} onCheckedChange={setGlobalPromptEnabled} />
            </div>

            <Textarea
              value={editingGlobalPrompt}
              onChange={(e) => setEditingGlobalPrompt(e.target.value)}
              rows={12}
              className="resize-none"
              placeholder="请输入统一提示词..."
              disabled={!globalPromptEnabled}
            />

            <div className="space-y-2">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <strong>统一提示词的作用：</strong>
                  <br />
                  1. 定义AI的基本行为规范和回复风格
                  <br />
                  2. 确保所有知识库的回复具有一致性
                  <br />
                  3. 与各知识库的独立提示词配合使用
                </AlertDescription>
              </Alert>

              <Alert className="border-orange-200 bg-orange-50">
                <MessageSquare className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-800">
                  <strong>提示词生效逻辑：</strong>
                  <br />
                  统一提示词（全局规范） + 知识库独立提示词（专业指导） = 最终AI回复风格
                </AlertDescription>
              </Alert>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGlobalPromptDialog(false)} className="flex-1 h-11">
              取消
            </Button>
            <Button onClick={handleSaveGlobalPrompt} className="flex-1 h-11">
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 调用客服名单对话框 */}
      <Dialog open={showCallHistoryDialog} onOpenChange={setShowCallHistoryDialog}>
        <DialogContent className="max-w-[92%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              调用客服名单
            </DialogTitle>
            <p className="text-sm text-gray-500 pt-1">查看所有使用此知识库的客服人员</p>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-2">
              {selectedBase?.callHistory.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{user.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">最后调用：{user.lastCallTime}</div>
                    <div className="text-xs text-gray-500">调用次数：{user.callCount} 次</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowCallHistoryDialog(false)} className="w-full h-11">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
