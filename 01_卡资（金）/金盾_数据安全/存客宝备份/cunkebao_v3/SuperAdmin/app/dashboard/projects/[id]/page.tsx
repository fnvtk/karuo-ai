"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import { use } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from '@/lib/api-utils'
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProjectProfile {
  id: number
  name: string
  memo: string
  companyId: number
  createTime: string
  account: string
  phone: string | null
  deviceCount: number
  friendCount: number
  userCount: number
}

interface Device {
  id: number
  memo: string
  phone: string
  model: string
  brand: string
  alive: number
  deviceId: number
  wechatId: string
  friendCount: number
  wAlive: number
  imei: string
}

interface SubUser {
  id: number
  account: string
  username: string
  phone: string
  avatar: string
  status: number
  createTime: string
  typeId: number
}

interface ProjectDetailPageProps {
  params: {
    id: string
  }
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isDevicesLoading, setIsDevicesLoading] = useState(false)
  const [isSubUsersLoading, setIsSubUsersLoading] = useState(false)
  const [profile, setProfile] = useState<ProjectProfile | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [subUsers, setSubUsers] = useState<SubUser[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [wechatStatusFilter, setWechatStatusFilter] = useState<'all' | 'loggedIn' | 'loggedOut' | 'notLogged'>('all')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'system' | 'operator' | 'consultant'>('all')
  const [pollingCount, setPollingCount] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const [qrCode, setQrCode] = useState("")
  const [showQrCode, setShowQrCode] = useState(false)
  const maxPollingCount = 60 // 修改为60次

  const fetchProject = async () => {
    try {
      setIsLoading(true)
      const result = await apiRequest(`/company/profile/${id}`)
      if (result.code === 200 && result.data) {
        setProfile(result.data)
      } else {
        toast.error(result.msg || "获取项目信息失败")
      }
    } catch (error) {
      console.error("获取项目信息失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [id])

  const fetchDevices = async () => {
    if (activeTab !== "devices") return

    setIsDevicesLoading(true)
    try {
      const result = await apiRequest(`/company/devices?companyId=${id}`)
      
      if (result.code === 200) {
        let filteredDevices = result.data
        
        // 应用设备状态筛选
        if (deviceStatusFilter !== 'all') {
          filteredDevices = filteredDevices.filter(device => 
            deviceStatusFilter === 'online' ? device.alive === 1 : device.alive !== 1
          )
        }
        
        // 应用微信状态筛选
        if (wechatStatusFilter !== 'all') {
          filteredDevices = filteredDevices.filter(device => {
            if (wechatStatusFilter === 'loggedIn') return device.wAlive === 1
            if (wechatStatusFilter === 'loggedOut') return device.wAlive === 0
            return device.wAlive === -1
          })
        }
        
        // 应用排序
        if (sortOrder) {
          filteredDevices = [...filteredDevices].sort((a, b) => {
            const aCount = a.friendCount || 0
            const bCount = b.friendCount || 0
            return sortOrder === 'asc' ? aCount - bCount : bCount - aCount
          })
        }
        
        setDevices(filteredDevices)
      } else {
        toast.error(result.msg || "获取设备列表失败")
        setDevices([])
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
      setDevices([])
    } finally {
      setIsDevicesLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [activeTab, id, sortOrder, deviceStatusFilter, wechatStatusFilter])

  const fetchSubUsers = async () => {
    if (activeTab !== "accounts") return

    setIsSubUsersLoading(true)
    try {
      const result = await apiRequest(`/company/subusers?companyId=${id}`)
      
      if (result.code === 200) {
        let filteredUsers = result.data
        
        // 应用状态筛选
        if (userStatusFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => 
            userStatusFilter === 'enabled' ? user.status === 1 : user.status !== 1
          )
        }
        
        // 应用账号类型筛选
        if (userTypeFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => {
            if (userTypeFilter === 'system') return user.typeId === -1
            if (userTypeFilter === 'operator') return user.typeId === 1
            return user.typeId === 2
          })
        }
        
        setSubUsers(filteredUsers)
      } else {
        toast.error(result.msg || "获取子账号列表失败")
        setSubUsers([])
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
      setSubUsers([])
    } finally {
      setIsSubUsersLoading(false)
    }
  }

  useEffect(() => {
    fetchSubUsers()
  }, [activeTab, id, userStatusFilter, userTypeFilter])

  const handleSort = () => {
    setSortOrder(prev => {
      if (prev === null) return 'desc'
      if (prev === 'desc') return 'asc'
      return null
    })
  }

  const startPolling = () => {
    setPollingCount(0)
    setIsPolling(true)
    const timer = setInterval(async () => {
      if (pollingCount >= maxPollingCount) {
        clearInterval(timer)
        setIsPolling(false)
        toast.error("轮询超时，请重试")
        return
      }

      try {
        const result = await apiRequest(`/company/device/query?accountId=${profile?.s2_accountId}`)
        if (result.code === 200 && result.data) {
          clearInterval(timer)
          setIsPolling(false)
          setShowQrCode(false)
          toast.success("设备添加成功")
          fetchDevices() // 刷新设备列表
        }
      } catch (error) {
        console.error("轮询失败:", error)
      }

      setPollingCount(prev => prev + 1)
    }, 1000)

    return timer
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">未找到项目信息</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
        </div>
        <Button asChild>
          <Link href={`/dashboard/projects/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> 编辑项目
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">项目概览</TabsTrigger>
          <TabsTrigger value="devices">关联设备</TabsTrigger>
          <TabsTrigger value="accounts">子账号</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">项目名称</dt>
                  <dd className="text-sm">{profile.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">手机号</dt>
                  <dd className="text-sm">{profile.phone || "未设置"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">账号</dt>
                  <dd className="text-sm">{profile.account}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">创建时间</dt>
                  <dd className="text-sm">{profile.createTime}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">项目介绍</dt>
                  <dd className="text-sm">{profile.memo}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">关联设备数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile.deviceCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">子账号数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile.userCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">微信好友总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile.friendCount}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">设备列表</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">设备状态：</span>
                  <Select
                    value={deviceStatusFilter}
                    onValueChange={(value: 'all' | 'online' | 'offline') => setDeviceStatusFilter(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="online">在线</SelectItem>
                      <SelectItem value="offline">离线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">微信状态：</span>
                  <Select
                    value={wechatStatusFilter}
                    onValueChange={(value: 'all' | 'loggedIn' | 'loggedOut' | 'notLogged') => setWechatStatusFilter(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="loggedIn">已登录</SelectItem>
                      <SelectItem value="loggedOut">已登出</SelectItem>
                      <SelectItem value="notLogged">未登录</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSort}
                  className="flex items-center gap-2"
                >
                  <span>微信好友数量</span>
                  {sortOrder === 'asc' && <ArrowUp className="h-4 w-4" />}
                  {sortOrder === 'desc' && <ArrowDown className="h-4 w-4" />}
                  {sortOrder === null && <ArrowUpDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {isDevicesLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : devices.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>设备名称</TableHead>
                      <TableHead>型号</TableHead>
                      <TableHead>品牌</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>设备状态</TableHead>
                      <TableHead>微信状态</TableHead>
                      <TableHead>微信好友数量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.memo}</TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>{device.brand}</TableCell>
                        <TableCell>{device.imei}</TableCell>
                        <TableCell>
                          <Badge variant={device.alive === 1 ? "success" : "destructive"}>
                            {device.alive === 1 ? "在线" : "离线"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              device.wAlive === 1 
                                ? "success" 
                                : device.wAlive === 0 
                                  ? "destructive" 
                                  : "secondary"
                            }
                          >
                            {device.wAlive === 1 ? "已登录" : device.wAlive === 0 ? "已登出" : "未登录微信"}
                          </Badge>
                        </TableCell>
                        <TableCell>{device.friendCount || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无设备数据
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accounts">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">子账号列表</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">状态：</span>
                  <Select
                    value={userStatusFilter}
                    onValueChange={(value: 'all' | 'enabled' | 'disabled') => setUserStatusFilter(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="enabled">启用</SelectItem>
                      <SelectItem value="disabled">禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">账号类型：</span>
                  <Select
                    value={userTypeFilter}
                    onValueChange={(value: 'all' | 'system' | 'operator' | 'consultant') => setUserTypeFilter(value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="system">系统账号</SelectItem>
                      <SelectItem value="operator">操盘手</SelectItem>
                      <SelectItem value="consultant">门店顾问</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {isSubUsersLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : subUsers.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>头像</TableHead>
                      <TableHead>账号ID</TableHead>
                      <TableHead>登录账号</TableHead>
                      <TableHead>昵称</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>账号类型</TableHead>
                      <TableHead className="text-right">创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        </TableCell>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.account}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === 1 ? "success" : "destructive"}>
                            {user.status === 1 ? "启用" : "禁用"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.typeId === -1 
                            ? "系统账号" 
                            : user.typeId === 1 
                              ? "操盘手" 
                              : "门店顾问"}
                        </TableCell>
                        <TableCell className="text-right">{user.createTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无子账号数据
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

