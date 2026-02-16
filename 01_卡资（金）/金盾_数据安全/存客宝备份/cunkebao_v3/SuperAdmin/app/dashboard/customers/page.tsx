"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, Eye, UserPlus, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getTrafficPoolList } from "@/lib/traffic-pool-api"
import { Customer } from "@/lib/traffic-pool-api"
import { PaginationControls } from "@/components/ui/pagination-controls"

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedGender, setSelectedGender] = useState("")
  const [selectedSource, setSelectedSource] = useState("")
  const [selectedProject, setSelectedProject] = useState("")
  
  // 客户列表状态
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize, setPageSize] = useState(100)

  // 获取客户列表数据
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await getTrafficPoolList(currentPage, pageSize, searchTerm);
        if (response.code === 200 && response.data) {
          setCustomers(response.data.list);
          setTotalItems(response.data.total);
          setTotalPages(Math.ceil(response.data.total / pageSize));
          setError(null);
        } else {
          setError(response.msg || "获取客户列表失败");
          setCustomers([]);
          setTotalItems(0); // Reset totals on error
          setTotalPages(0);
        }
      } catch (err: any) {
        setError(err.message || "获取客户列表失败");
        setCustomers([]);
        setTotalItems(0); // Reset totals on error
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  // 修改后的页面大小处理函数
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">客户池</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> 批量分发
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索客户名称或微信ID..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> 筛选
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <div className="p-2">
                <p className="mb-2 text-sm font-medium">地区</p>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有地区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有地区</SelectItem>
                    {/* 从API获取到的regions数据应在此处映射 */}
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="mb-2 text-sm font-medium">性别</p>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有性别</SelectItem>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="mb-2 text-sm font-medium">来源</p>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有来源" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有来源</SelectItem>
                    {/* 从API获取到的sources数据应在此处映射 */}
                  </SelectContent>
                </Select>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="mb-2 text-sm font-medium">项目</p>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有项目</SelectItem>
                    {/* 从API获取到的projects数据应在此处映射 */}
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>性别</TableHead>
                <TableHead>地区</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>所属项目</TableHead>
                <TableHead>添加时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">加载中...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-red-500">{error}</TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">没有符合条件的客户</TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={customer.avatar || "/placeholder.svg?height=40&width=40"} alt={customer.nickname} />
                          <AvatarFallback>{customer.nickname ? customer.nickname.substring(0, 1) : "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{customer.nickname}</div>
                          <div className="text-sm text-muted-foreground">{customer.wechatId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{customer.gender}</TableCell>
                    <TableCell>{customer.region}</TableCell>
                    <TableCell>{customer.source}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags && customer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{customer.companyName}</TableCell>
                    <TableCell>{customer.createTime}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">打开菜单</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/dashboard/customers/${customer.id}`} className="flex items-center w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>分配客服</DropdownMenuItem>
                          <DropdownMenuItem>添加标签</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页控制 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {totalItems} 条记录，第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center space-x-2">
            <PaginationControls 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSize={pageSize}
              totalItems={totalItems}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

