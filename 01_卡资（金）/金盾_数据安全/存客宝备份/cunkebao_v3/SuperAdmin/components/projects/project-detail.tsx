"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from '@/lib/api-utils'

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

interface ProjectDetailProps {
  projectId: string
  onEdit?: (projectId: string) => void
}

export default function ProjectDetail({ projectId, onEdit }: ProjectDetailProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isDevicesLoading, setIsDevicesLoading] = useState(false)
  const [isSubUsersLoading, setIsSubUsersLoading] = useState(false)
  const [profile, setProfile] = useState<ProjectProfile | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [subUsers, setSubUsers] = useState<SubUser[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  const fetchProject = async () => {
    try {
      setIsLoading(true)
      const result = await apiRequest(`/company/profile/${projectId}`)
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

  const fetchDevices = async () => {
    try {
      setIsLoading(true)
      const result = await apiRequest(`/company/devices?companyId=${projectId}`)
      if (result.code === 200 && result.data) {
        setDevices(result.data)
      } else {
        toast.error(result.msg || "获取设备列表失败")
      }
    } catch (error) {
      console.error("获取设备列表失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSubusers = async () => {
    try {
      setIsLoading(true)
      const result = await apiRequest(`/company/subusers?companyId=${projectId}`)
      if (result.code === 200 && result.data) {
        setSubUsers(result.data)
      } else {
        toast.error(result.msg || "获取子用户列表失败")
      }
    } catch (error) {
      console.error("获取子用户列表失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  useEffect(() => {
    fetchDevices()
  }, [activeTab, projectId])

  useEffect(() => {
    fetchSubusers()
  }, [activeTab, projectId])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-64">加载中...</div>
  }

  if (!profile) {
    return <div className="flex items-center justify-center min-h-64">未找到项目信息</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        {onEdit && (
          <Button onClick={() => onEdit(projectId)}>
            <Edit className="mr-2 h-4 w-4" /> 编辑项目
          </Button>
        )}
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
          <Card>
            <CardHeader>
              <CardTitle>关联设备列表</CardTitle>
              <CardDescription>项目关联的所有设备及其微信好友数量</CardDescription>
            </CardHeader>
            <CardContent>
              {isDevicesLoading ? (
                <div className="flex items-center justify-center py-8">加载中...</div>
              ) : devices.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">暂无数据</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>设备名称</TableHead>
                        <TableHead>设备型号</TableHead>
                        <TableHead>品牌</TableHead>
                        <TableHead>IMEI</TableHead>
                        <TableHead>设备状态</TableHead>
                        <TableHead>微信状态</TableHead>
                        <TableHead className="text-right">微信好友数量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.memo}</TableCell>
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
                          <TableCell className="text-right">{device.friendCount || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-sm text-muted-foreground">
                    共 {devices.length} 条数据
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>子账号列表</CardTitle>
              <CardDescription>项目下的所有子账号</CardDescription>
            </CardHeader>
            <CardContent>
              {isSubUsersLoading ? (
                <div className="flex items-center justify-center py-8">加载中...</div>
              ) : subUsers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">暂无数据</div>
              ) : (
                <>
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
                  <div className="mt-4 text-sm text-muted-foreground">
                    共 {subUsers.length} 条数据
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 