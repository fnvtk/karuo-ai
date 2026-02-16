"use client"

import { useState, useRef, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Image, Video, Link, X } from "lucide-react"

interface MessageEditorProps {
  onMessageChange: (message: {
    text: string
    images: File[]
    video: File | null
    link: string
  }) => void
  defaultValues?: {
    text: string
    images: string[]
    video: string
    link: string
  }
}

export function MessageEditor({ onMessageChange, defaultValues }: MessageEditorProps) {
  const [text, setText] = useState(defaultValues?.text || "")
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>(defaultValues?.images || [])
  const [video, setVideo] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>(defaultValues?.video || "")
  const [link, setLink] = useState(defaultValues?.link || "")

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    if (newText.length <= 800) {
      setText(newText)
      onMessageChange({
        text: newText,
        images,
        video,
        link,
      })
    }
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      // 检查文件大小和数量限制
      const validFiles = files.filter((file) => file.size <= 20 * 1024 * 1024) // 20MB
      const newImages = [...images, ...validFiles].slice(0, 9) // 最多9张图片

      setImages(newImages)

      // 创建临时URL用于预览
      const newImageUrls = newImages.map((file) => URL.createObjectURL(file))
      setImageUrls(newImageUrls)

      onMessageChange({
        text,
        images: newImages,
        video,
        link,
      })
    }
  }

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= 100 * 1024 * 1024) {
      // 100MB
      setVideo(file)
      setVideoUrl(URL.createObjectURL(file))

      onMessageChange({
        text,
        images,
        video: file,
        link,
      })
    }
  }

  const handleLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value
    setLink(newLink)

    onMessageChange({
      text,
      images,
      video,
      link: newLink,
    })
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    setImages(newImages)

    const newImageUrls = [...imageUrls]
    newImageUrls.splice(index, 1)
    setImageUrls(newImageUrls)

    onMessageChange({
      text,
      images: newImages,
      video,
      link,
    })
  }

  const removeVideo = () => {
    setVideo(null)
    setVideoUrl("")

    onMessageChange({
      text,
      images,
      video: null,
      link,
    })
  }

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div>
        <Textarea
          placeholder="请输入消息内容，最多800字"
          value={text}
          onChange={handleTextChange}
          className="min-h-[120px]"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">{text.length}/800</div>
      </div>

      {/* 图片预览区域 */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url || "/placeholder.svg"}
                alt={`上传的图片 ${index + 1}`}
                className="h-24 w-full object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 视频预览区域 */}
      {videoUrl && (
        <div className="relative group">
          <video src={videoUrl} controls className="w-full h-48 object-cover rounded-md" />
          <button
            type="button"
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 链接输入区域 */}
      {link && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
          <Link className="h-4 w-4 text-blue-500" />
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm flex-1 truncate">
            {link}
          </a>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={images.length >= 9}
        >
          <Image className="h-4 w-4 mr-1" />
          图片
        </Button>

        <input type="file" ref={videoInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={!!video}
        >
          <Video className="h-4 w-4 mr-1" />
          视频
        </Button>

        <div className="flex-1">
          <Input type="url" placeholder="输入链接地址" value={link} onChange={handleLinkChange} className="h-9" />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p>图片：最多9张，每张不超过20MB</p>
        <p>视频：最多1个，不超过100MB</p>
      </div>
    </div>
  )
}
