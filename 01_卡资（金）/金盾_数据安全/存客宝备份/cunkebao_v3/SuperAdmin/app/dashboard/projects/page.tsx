"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { useTabContext } from "@/app/dashboard/layout"
import { apiRequest } from "@/lib/api-utils"

interface Project {
  id: number
  name: string
  status: number
  tenantId: number
  companyId: number
  memo: string | null
  userCount: number
  createTime: string
  deviceCount: number
}

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { addTab } = useTabContext()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"))
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || "10"))
  const [totalItems, setTotalItems] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 从URL更新状态
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1")
    const size = parseInt(searchParams.get("pageSize") || "10")
    setCurrentPage(page)
    setPageSize(size)
  }, [searchParams])

  // 更新URL查询参数
  const updateUrlParams = (page: number, size: number) => {
    const params = new URLSearchParams()
    params.set("page", page.toString())
    params.set("pageSize", size.toString())
    if (searchTerm) {
      params.set("search", searchTerm)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // 获取项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true)
      try {
        const result = await apiRequest(`/company/list?page=${currentPage}&limit=${pageSize}`)
        
        if (result.code === 200) {
          setProjects(result.data.list)
          setTotalItems(result.data.total)
          setTotalPages(Math.ceil(result.data.total / pageSize))
        } else {
          toast.error(result.msg || "获取项目列表失败")
          setProjects([])
          setTotalItems(0)
          setTotalPages(0)
        }
      } catch (error) {
        toast.error("获取项目列表失败")
        setProjects([])
        setTotalItems(0)
        setTotalPages(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
    // 更新URL参数
    updateUrlParams(currentPage, pageSize)
  }, [currentPage, pageSize, pathname])

  // 处理页面大小变化
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
    updateUrlParams(1, newSize)
  }

  // 处理页面变化
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateUrlParams(newPage, pageSize)
  }

  const handleDeleteClick = (projectId: number) => {
    setDeletingProjectId(projectId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingProjectId) return

    setIsDeleting(true)
    try {
      const result = await apiRequest('/company/delete', 'POST', {
        id: deletingProjectId
      })

      if (result.code === 200) {
        toast.success("删除成功")
        
        // Fetch projects again after delete
        const fetchProjects = async () => {
          setIsLoading(true)
          try {
            const result = await apiRequest(`/company/list?page=${currentPage}&limit=${pageSize}`)
            if (result.code === 200) {
              setProjects(result.data.list)
              setTotalItems(result.data.total)
              setTotalPages(Math.ceil(result.data.total / pageSize))
              if (currentPage > Math.ceil(result.data.total / pageSize) && Math.ceil(result.data.total / pageSize) > 0) {
                setCurrentPage(Math.ceil(result.data.total / pageSize));
              }
            } else {
              setProjects([]); setTotalItems(0); setTotalPages(0);
            }
          } catch (error) { setProjects([]); setTotalItems(0); setTotalPages(0); } 
          finally { setIsLoading(false); }
        }
        fetchProjects();
      } else {
        toast.error(result.msg || "删除失败")
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingProjectId(null)
    }
  }

  // 打开项目详情
  const handleViewProject = (project: Project) => {
    addTab({
      label: `项目 #${project.id} - 详情`,
      path: `/dashboard/projects/${project.id}`,
      closable: true
    });
  }

  // 打开编辑项目
  const handleEditProject = (project: Project) => {
    addTab({
      label: `项目 #${project.id} - 编辑`,
      path: `/dashboard/projects/${project.id}/edit`,
      closable: true
    });
  }

  // 打开新建项目
  const handleNewProject = () => {
    addTab({
      label: "新建项目",
      path: "/dashboard/projects/new",
      closable: true
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">项目列表</h1>
        <Button onClick={handleNewProject}>
          <Plus className="mr-2 h-4 w-4" /> 新建项目
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索项目名称..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>项目名称</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>用户数量</TableHead>
              <TableHead>设备数量</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : projects.length > 0 ? (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="text-left">{project.id}</TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === 1 ? "default" : "secondary"}>
                      {project.status === 1 ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell>{project.userCount}</TableCell>
                  <TableCell>{project.deviceCount}</TableCell>
                  <TableCell>{project.createTime}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">打开菜单</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProject(project)}>
                          <Eye className="mr-2 h-4 w-4" /> 查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProject(project)}>
                          <Edit className="mr-2 h-4 w-4" /> 编辑项目
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteClick(project.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" /> 删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  未找到项目
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除项目将会删除本项目关联的所有账号，项目删除后不可恢复，是否确认删除？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

