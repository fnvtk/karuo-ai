"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent } from "@/app/components/ui/card"
import { Progress } from "@/app/components/ui/progress"
import { Badge } from "@/app/components/ui/badge"
import { Upload, X, File, ImageIcon, Video, FileText, Download, Eye } from "lucide-react"
import { cn } from "@/app/lib/utils"

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  progress?: number
  status: "uploading" | "success" | "error"
  error?: string
}

export interface FileUploaderProps {
  /** 允许的文件类型 */
  accept?: string
  /** 是否支持多文件上传 */
  multiple?: boolean
  /** 最大文件大小（字节） */
  maxSize?: number
  /** 最大文件数量 */
  maxFiles?: number
  /** 已上传的文件列表 */
  files?: UploadedFile[]
  /** 文件变更回调 */
  onFilesChange?: (files: UploadedFile[]) => void
  /** 文件上传处理函数 */
  onUpload?: (file: File) => Promise<{ url: string; id: string }>
  /** 文件删除回调 */
  onDelete?: (fileId: string) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 上传区域提示文本 */
  placeholder?: string
  /** 是否显示预览 */
  showPreview?: boolean
}

/**
 * 统一的文件上传组件
 * 支持拖拽上传、多文件上传、进度显示、预览等功能
 */
export function FileUploader({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  files = [],
  onFilesChange,
  onUpload,
  onDelete,
  disabled = false,
  className,
  placeholder = "点击或拖拽文件到此处上传",
  showPreview = true,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取文件图标
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-blue-500" />
    if (type.startsWith("video/")) return <Video className="h-8 w-8 text-purple-500" />
    if (type.includes("pdf") || type.includes("document")) return <FileText className="h-8 w-8 text-red-500" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 验证文件
  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `文件大小不能超过 ${formatFileSize(maxSize)}`
    }

    if (accept) {
      const acceptedTypes = accept.split(",").map((type) => type.trim())
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type.match(type.replace("*", ".*"))
      })

      if (!isAccepted) {
        return `不支持的文件类型: ${file.type}`
      }
    }

    if (files.length + uploadingFiles.length >= maxFiles) {
      return `最多只能上传 ${maxFiles} 个文件`
    }

    return null
  }

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (disabled || !onUpload) return

      const filesToUpload = Array.from(fileList)
      const newUploadingFiles: UploadedFile[] = []

      for (const file of filesToUpload) {
        const error = validateFile(file)
        if (error) {
          // 显示错误通知
          console.error(error)
          continue
        }

        const uploadFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "uploading",
        }

        newUploadingFiles.push(uploadFile)
      }

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

      // 逐个上传文件
      for (let i = 0; i < newUploadingFiles.length; i++) {
        const uploadFile = newUploadingFiles[i]
        const file = filesToUpload[i]

        try {
          // 模拟上传进度
          const progressInterval = setInterval(() => {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) } : f)),
            )
          }, 200)

          const result = await onUpload(file)

          clearInterval(progressInterval)

          // 上传成功
          const successFile: UploadedFile = {
            ...uploadFile,
            url: result.url,
            id: result.id,
            progress: 100,
            status: "success",
          }

          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadFile.id))

          if (onFilesChange) {
            onFilesChange([...files, successFile])
          }
        } catch (error) {
          // 上传失败
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error", error: error instanceof Error ? error.message : "上传失败" }
                : f,
            ),
          )
        }
      }
    },
    [disabled, onUpload, files, onFilesChange, maxSize, maxFiles, accept, uploadingFiles.length],
  )

  // 处理拖拽
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        handleFileUpload(droppedFiles)
      }
    },
    [disabled, handleFileUpload],
  )

  // 处理文件选择
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        handleFileUpload(selectedFiles)
      }
      // 清空input值，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [handleFileUpload],
  )

  // 删除文件
  const handleDeleteFile = (fileId: string) => {
    if (onDelete) {
      onDelete(fileId)
    }
    if (onFilesChange) {
      onFilesChange(files.filter((file) => file.id !== fileId))
    }
  }

  // 删除上传中的文件
  const handleDeleteUploadingFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  // 重试上传
  const handleRetryUpload = (fileId: string) => {
    const failedFile = uploadingFiles.find((f) => f.id === fileId)
    if (failedFile) {
      // 这里需要重新获取原始文件，实际实现中可能需要保存原始文件引用
      console.log("重试上传:", failedFile.name)
    }
  }

  const allFiles = [...files, ...uploadingFiles]

  return (
    <div className={cn("space-y-4", className)}>
      {/* 上传区域 */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">{placeholder}</p>
          <p className="text-sm text-gray-500 mb-4">
            {accept && `支持格式: ${accept}`}
            {maxSize && ` • 最大 ${formatFileSize(maxSize)}`}
            {multiple && ` • 最多 ${maxFiles} 个文件`}
          </p>
          <Button variant="outline" disabled={disabled}>
            选择文件
          </Button>
        </CardContent>
      </Card>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 文件列表 */}
      {allFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">已上传文件 ({allFiles.length})</h4>
          <div className="space-y-2">
            {allFiles.map((file) => (
              <Card key={file.id} className="p-3">
                <div className="flex items-center space-x-3">
                  {showPreview && getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            file.status === "success"
                              ? "success"
                              : file.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {file.status === "success" ? "已上传" : file.status === "error" ? "失败" : "上传中"}
                        </Badge>
                        <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                      </div>
                    </div>

                    {file.status === "uploading" && <Progress value={file.progress || 0} className="mt-2" />}

                    {file.status === "error" && file.error && <p className="text-sm text-red-500 mt-1">{file.error}</p>}
                  </div>

                  <div className="flex items-center space-x-1">
                    {file.status === "success" && file.url && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => window.open(file.url, "_blank")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.open(file.url, "_blank")}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {file.status === "error" && (
                      <Button variant="ghost" size="sm" onClick={() => handleRetryUpload(file.id)}>
                        重试
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        file.status === "success" ? handleDeleteFile(file.id) : handleDeleteUploadingFile(file.id)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
