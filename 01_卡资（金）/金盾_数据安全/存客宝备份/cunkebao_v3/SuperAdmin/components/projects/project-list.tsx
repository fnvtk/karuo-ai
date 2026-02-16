"use client"

import { useState, useEffect } from "react"
import { apiRequest } from '@/lib/api-utils'
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface Project {
  id: number
  name: string
  account: string
  phone: string
  status: number
  createTime: string
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.append('page', '1')
      params.append('limit', '10')
      
      const result = await apiRequest(`/company/list?${params.toString()}`)
      if (result.code === 200 && result.data) {
        setProjects(result.data)
      } else {
        toast.error(result.msg || "获取项目列表失败")
      }
    } catch (error) {
      console.error("获取项目列表失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsLoading(true)
      const result = await apiRequest('/company/delete', 'POST', { id })
      if (result.code === 200) {
        toast.success("删除成功")
        fetchProjects()
      } else {
        toast.error(result.msg || "删除失败")
      }
    } catch (error) {
      console.error("删除项目失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">项目列表</h2>
        <Button onClick={() => router.push('/dashboard/projects/create')}>
          新建项目
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>项目名称</TableHead>
              <TableHead>账号</TableHead>
              <TableHead>手机号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>{project.name}</TableCell>
                <TableCell>{project.account}</TableCell>
                <TableCell>{project.phone || '-'}</TableCell>
                <TableCell>
                  <Badge variant={project.status === 1 ? "success" : "destructive"}>
                    {project.status === 1 ? "正常" : "禁用"}
                  </Badge>
                </TableCell>
                <TableCell>{project.createTime}</TableCell>
                <TableCell>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    >
                      详情
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                    >
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 