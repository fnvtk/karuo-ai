"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, RefreshCw } from "lucide-react"
import type { ContentItem } from "@/types/content"

interface ContentViewerProps {
  tagId: string
}

export function ContentViewer({ tagId }: ContentViewerProps) {
  const [contents, setContents] = useState<ContentItem[]>([
    {
      id: "399401",
      title: "一���理想安全驾这件事情，刻在DNA里...",
      type: "text",
      content: "一在理想安全驾这件事情，刻在DNA里...",
      images: [
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/img_v3_02jo_5c61b35b-a919-4520-b653-a5910dea594g.jpg-83VfgjQ3qC7mwDhby6rsZeRwVM6maz.jpeg",
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/img_v3_02jo_5c61b35b-a919-4520-b653-a5910dea594g.jpg-83VfgjQ3qC7mwDhby6rsZeRwVM6maz.jpeg",
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/img_v3_02jo_5c61b35b-a919-4520-b653-a5910dea594g.jpg-83VfgjQ3qC7mwDhby6rsZeRwVM6maz.jpeg",
      ],
      createTime: "2025-02-16 08:50:36",
      publishTime: "2025-02-15 23:37:49",
      status: "published",
    },
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="搜索内容..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>内容类型</TableHead>
            <TableHead>内容</TableHead>
            <TableHead>图片</TableHead>
            <TableHead>视频</TableHead>
            <TableHead>推送时间</TableHead>
            <TableHead>内容发布时间</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contents.map((content) => (
            <TableRow key={content.id}>
              <TableCell>{content.id}</TableCell>
              <TableCell>{content.type === "text" ? "图文" : content.type}</TableCell>
              <TableCell className="max-w-[200px] truncate">{content.content}</TableCell>
              <TableCell>
                {content.images && (
                  <div className="flex space-x-1">
                    {content.images.map((img, index) => (
                      <img
                        key={index}
                        src={img || "/placeholder.svg"}
                        alt={`图片 ${index + 1}`}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>{content.video ? "有" : "-"}</TableCell>
              <TableCell>{content.createTime}</TableCell>
              <TableCell>{content.publishTime}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    content.status === "published"
                      ? "bg-green-100 text-green-800"
                      : content.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {content.status === "published" ? "已发布" : content.status === "failed" ? "失败" : "待发布"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
