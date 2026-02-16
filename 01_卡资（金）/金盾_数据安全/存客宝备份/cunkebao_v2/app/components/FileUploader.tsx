"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface FileUploaderProps {
  onFileUploaded: (file: File) => void
  acceptedTypes?: string
  maxSize?: number // in MB
}

export function FileUploader({
  onFileUploaded,
  acceptedTypes = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSize = 10, // 10MB default
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (file: File): boolean => {
    // 检查文件类型
    const fileType = file.name.split(".").pop()?.toLowerCase() || ""
    const isValidType = acceptedTypes.includes(fileType)

    // 检查文件大小
    const isValidSize = file.size <= maxSize * 1024 * 1024

    if (!isValidType) {
      setError(`不支持的文件类型。请上传 ${acceptedTypes} 格式的文件。`)
      return false
    }

    if (!isValidSize) {
      setError(`文件过大。最大支持 ${maxSize}MB。`)
      return false
    }

    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    setError(null)

    if (validateFile(file)) {
      setSelectedFile(file)
      simulateUpload(file)
    }
  }

  const simulateUpload = (file: File) => {
    // 模拟上传进度
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          onFileUploaded(file)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setError(null)
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={handleChange} accept={acceptedTypes} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">拖拽文件到此处，或</p>
          <Button variant="outline" onClick={handleButtonClick} className="mt-2">
            选择文件
          </Button>
          <p className="mt-1 text-xs text-gray-500">
            支持 {acceptedTypes.replace(/\./g, "")} 格式，最大 {maxSize}MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium truncate">{selectedFile.name}</div>
            <Button variant="ghost" size="icon" onClick={cancelUpload} className="h-6 w-6 min-w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <div className="text-xs text-right mt-1 text-gray-500">{uploadProgress}%</div>
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  )
}
