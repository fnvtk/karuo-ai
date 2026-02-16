"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Download, Plus, Search, Tag, Trash2, BarChart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Material {
  id: string
  content: string
  tags: string[]
  aiAnalysis?: string
}

export default function MaterialsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [materials, setMaterials] = useState<Material[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  useEffect(() => {
    const fetchMaterials = async () => {
      setIsLoading(true)
      try {
        // 模拟从API获取素材数据
        await new Promise((resolve) => setTimeout(resolve, 500))
        const mockMaterials: Material[] = [
          {
            id: "1",
            content: "今天的阳光真好，适合出去走走",
            tags: ["日常", "心情"],
          },
          {
            id: "2",
            content: "新品上市，限时优惠，快来抢购！",
            tags: ["营销", "促销"],
          },
          {
            id: "3",
            content: "学习新技能的第一天，感觉很充实",
            tags: ["学习", "成长"],
          },
        ]
        setMaterials(mockMaterials)
      } catch (error) {
        console.error("Failed to fetch materials:", error)
        toast({
          title: "错误",
          description: "获取素材数据失败",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  const handleDownload = () => {
    // 实现下载功能
    toast({
      title: "下载开始",
      description: "正在将素材导出为Excel格式",
    })
  }

  const handleNewMaterial = () => {
    // 实现新建素材功能
    router.push(`/content/${params.id}/materials/new`)
  }

  const handleAIAnalysis = async (material: Material) => {
    try {
      // 模拟AI分析过程
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const analysis = "这是一条" + material.tags.join("、") + "相关的内容，情感倾向积极。"
      setMaterials(materials.map((m) => (m.id === material.id ? { ...m, aiAnalysis: analysis } : m)))
      setSelectedMaterial({ ...material, aiAnalysis: analysis })
    } catch (error) {
      console.error("AI analysis failed:", error)
      toast({
        title: "错误",
        description: "AI分析失败",
        variant: "destructive",
      })
    }
  }

  const filteredMaterials = materials.filter(
    (material) =>
      material.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium">已采集素材</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              下载Excel
            </Button>
            <Button onClick={handleNewMaterial}>
              <Plus className="h-4 w-4 mr-2" />
              新建素材
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索素材或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              {filteredMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">{material.content}</p>
                    <div className="flex flex-wrap gap-2">
                      {material.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleAIAnalysis(material)}>
                          <BarChart className="h-4 w-4 mr-1" />
                          AI分析
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>AI 分析结果</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <p>{selectedMaterial?.aiAnalysis || "正在分析中..."}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
