"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Trash2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface KnowledgeFile {
  id: string
  name: string
  type: string
  size: string
  uploadDate: string
}

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("private")
  const [privateFiles, setPrivateFiles] = useState<KnowledgeFile[]>([
    {
      id: "1",
      name: "私域运营手册.pdf",
      type: "PDF",
      size: "2.4 MB",
      uploadDate: "2023-12-10",
    },
    {
      id: "2",
      name: "客户画像分析.docx",
      type: "Word",
      size: "1.8 MB",
      uploadDate: "2023-12-08",
    },
    {
      id: "3",
      name: "获客策略指南.pdf",
      type: "PDF",
      size: "3.2 MB",
      uploadDate: "2023-12-05",
    },
  ])
  const [storeFiles, setStoreFiles] = useState<KnowledgeFile[]>([
    {
      id: "1",
      name: "门店管理规范.pdf",
      type: "PDF",
      size: "1.9 MB",
      uploadDate: "2023-12-09",
    },
    {
      id: "2",
      name: "产品介绍手册.docx",
      type: "Word",
      size: "2.1 MB",
      uploadDate: "2023-12-07",
    },
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewFile, setPreviewFile] = useState<KnowledgeFile | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    // 模拟上传过程
    setTimeout(() => {
      const newFiles = Array.from(files).map((file) => ({
        id: Date.now().toString(),
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() || "未知",
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: new Date().toISOString().split("T")[0],
      }))

      if (activeTab === "private") {
        setPrivateFiles((prev) => [...prev, ...newFiles])
      } else {
        setStoreFiles((prev) => [...prev, ...newFiles])
      }

      setIsUploading(false)
      e.target.value = "" // 重置文件输入
    }, 1500)
  }

  const handleDeleteFile = (id: string) => {
    if (activeTab === "private") {
      setPrivateFiles((prev) => prev.filter((file) => file.id !== id))
    } else {
      setStoreFiles((prev) => prev.filter((file) => file.id !== id))
    }
  }

  const handlePreviewFile = (file: KnowledgeFile) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">知识库管理</h1>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-hidden">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>知识库文件</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="private" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="private">私域操盘手知识库</TabsTrigger>
                <TabsTrigger value="store">门店端知识库</TabsTrigger>
              </TabsList>

              <TabsContent value="private" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">已上传 {privateFiles.length} 个文件</p>
                  <div className="relative">
                    <input
                      type="file"
                      id="private-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      上传文件
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-2">
                    {privateFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {file.type} • {file.size} • 上传于 {file.uploadDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handlePreviewFile(file)}>
                            查看
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {privateFiles.length === 0 && (
                      <div className="text-center py-8 text-gray-500">暂无文件，请上传文件到知识库</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="store" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">已上传 {storeFiles.length} 个文件</p>
                  <div className="relative">
                    <input
                      type="file"
                      id="store-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      上传文件
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-2">
                    {storeFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {file.type} • {file.size} • 上传于 {file.uploadDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handlePreviewFile(file)}>
                            查看
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {storeFiles.length === 0 && (
                      <div className="text-center py-8 text-gray-500">暂无文件，请上传文件到知识库</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 文件预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-gray-50 rounded-md min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">文件预览功能正在开发中</p>
              <p className="text-sm text-gray-400 mt-2">
                文件类型: {previewFile?.type} • 大小: {previewFile?.size}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 上传中提示 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="w-80">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-blue-200 animate-spin mb-4"></div>
                <p className="font-medium">正在上传文件...</p>
                <p className="text-sm text-gray-500 mt-1">请稍候</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
