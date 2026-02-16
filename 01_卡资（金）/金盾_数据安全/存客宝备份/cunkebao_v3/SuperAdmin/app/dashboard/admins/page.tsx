"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Edit, Trash, UserPlus, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { getAdministrators, deleteAdministrator, Administrator } from "@/lib/admin-api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [administrators, setAdministrators] = useState<Administrator[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const { toast } = useToast()
  
  // 删除对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<Administrator | null>(null)

  // 加载管理员列表
  useEffect(() => {
    fetchAdministrators()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // 获取管理员列表
  const fetchAdministrators = async (keyword: string = searchTerm) => {
    setIsLoading(true)
    try {
      const response = await getAdministrators(currentPage, pageSize, keyword)
      if (response.code === 200 && response.data) {
        setAdministrators(response.data.list)
        setTotalCount(response.data.total)
      } else {
        toast({
          title: "获取管理员列表失败",
          description: response.msg || "请稍后重试",
          variant: "destructive",
        })
        setAdministrators([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error("获取管理员列表出错:", error)
      toast({
        title: "获取管理员列表失败",
        description: "请检查网络连接后重试",
        variant: "destructive",
      })
      setAdministrators([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1) // 重置为第一页
    fetchAdministrators()
  }

  // Enter键搜索
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // 检查是否为超级管理员（id为1）
  const isSuperAdmin = (id: number) => {
    return id === 1
  }
  
  // 打开删除确认对话框
  const openDeleteDialog = (admin: Administrator) => {
    setAdminToDelete(admin)
    setDeleteDialogOpen(true)
  }
  
  // 确认删除管理员
  const confirmDelete = async () => {
    if (!adminToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await deleteAdministrator(adminToDelete.id)
      
      if (response.code === 200) {
        toast({
          title: "删除成功",
          description: `管理员 ${adminToDelete.username} 已成功删除`,
          variant: "success",
        })
        
        // 重新获取管理员列表
        fetchAdministrators()
      } else {
        toast({
          title: "删除失败",
          description: response.msg || "请稍后重试",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("删除管理员出错:", error)
      toast({
        title: "删除失败",
        description: "请检查网络连接后重试",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setAdminToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">管理员列表</h1>
        <Button asChild>
          <Link href="/dashboard/admins/new">
            <UserPlus className="mr-2 h-4 w-4" /> 新增管理员
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索管理员账号、姓名或角色..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账号</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>权限</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>最后登录</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                </TableCell>
              </TableRow>
            ) : administrators.length > 0 ? (
              administrators.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.account}</TableCell>
                  <TableCell>{admin.username}</TableCell>
                  <TableCell>
                    <Badge variant={admin.role === "超级管理员" ? "default" : "outline"}>{admin.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {admin.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{admin.createdAt}</TableCell>
                  <TableCell>{admin.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">打开菜单</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/admins/${admin.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" /> 编辑管理员
                          </Link>
                        </DropdownMenuItem>
                        {!isSuperAdmin(admin.id) && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => openDeleteDialog(admin)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> 删除管理员
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  未找到管理员
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > pageSize && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading}
          >
            上一页
          </Button>
          <span className="py-2 px-4 text-sm">
            第 {currentPage} 页 / 共 {Math.ceil(totalCount / pageSize)} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
          >
            下一页
          </Button>
        </div>
      )}
      
      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除管理员</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除管理员 "{adminToDelete?.username}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

