"use client"

import { useState } from "react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { ChevronLeft, Search, Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

interface ContentLibrary {
  id: string
  name: string
  type: string
  count: number
}

const mockLibraries: ContentLibrary[] = [
  {
    id: "1",
    name: "卡若朋友圈",
    type: "朋友圈",
    count: 307,
  },
  {
    id: "2",
    name: "业务推广内容",
    type: "朋友圈",
    count: 156,
  },
]

export function ContentSelector({ onPrev, onFinish }) {
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([])

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">选择内容库</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          新建内容库
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1">
          <Input placeholder="搜索内容库" className="w-full" prefix={<Search className="w-4 h-4 text-gray-400" />} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">选择</TableHead>
            <TableHead>内容库名称</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>内容数量</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockLibraries.map((library) => (
            <TableRow key={library.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedLibraries.includes(library.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLibraries([...selectedLibraries, library.id])
                    } else {
                      setSelectedLibraries(selectedLibraries.filter((id) => id !== library.id))
                    }
                  }}
                />
              </TableCell>
              <TableCell>{library.name}</TableCell>
              <TableCell>{library.type}</TableCell>
              <TableCell>{library.count}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  预览内容
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          上一步
        </Button>
        <Button
          onClick={onFinish}
          disabled={selectedLibraries.length === 0}
          className="bg-green-500 hover:bg-green-600"
        >
          完成设置
        </Button>
      </div>
    </Card>
  )
}
