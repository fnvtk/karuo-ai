"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash, X, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-utils"

// 为React.use添加类型声明
declare module 'react' {
  function use<T>(promise: Promise<T>): T;
  function use<T>(value: T): T;
}

interface Device {
  id: number
  memo: string
  imei: string
  phone: string
  model: string
  brand: string
  alive: number
  createTime: number
}

interface Project {
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
  username: string
  status: number
  s2_accountId?: number
  devices?: Device[]
}

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [qrCodeData, setQrCodeData] = useState("")
  const [isAddingDevice, setIsAddingDevice] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [pollingStatus, setPollingStatus] = useState<"waiting" | "polling" | "success" | "error">("waiting")
  const [addedDevice, setAddedDevice] = useState<Device | null>(null)
  const [isQrCodeBroken, setIsQrCodeBroken] = useState(false)
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollingCountRef = useRef(0)
  const MAX_POLLING_COUNT = 120; // 2分钟 * 60秒 = 120次
  const { id } = React.use(params)

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true)
      try {
        const result = await apiRequest(`/company/detail/${id}`)
        
        if (result.code === 200) {
          setProject(result.data)
        } else {
          toast.error(result.msg || "获取项目信息失败")
        }
      } catch (error) {
        toast.error("网络错误，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await apiRequest('/company/update', 'POST', {
        id: id,
        name: project?.name,
        account: project?.account,
        password: password,
        memo: project?.memo,
        phone: project?.phone,
        username: project?.username,
        status: project?.status.toString(),
      })

      if (result.code === 200) {
        toast.success("项目更新成功")
        router.push("/dashboard/projects")
      } else {
        toast.error(result.msg || "更新失败")
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddDevice = async () => {
    if (!project?.s2_accountId) {
      toast.error("无法添加设备，未找到账号ID")
      return
    }

    setIsAddingDevice(true)
    // 重置轮询状态
    setPollingStatus("waiting")
    setIsPolling(false)
    setAddedDevice(null)
    setIsQrCodeBroken(false)
    pollingCountRef.current = 0;
    
    try {
      const result = await apiRequest('/v1/api/device/add', 'POST', {
        accountId: project.s2_accountId
      })

      if (result.code === 200 && result.data?.qrCode) {
        setQrCodeData(result.data.qrCode)
        setIsModalOpen(true)
        
        // 五秒后开始轮询
        setTimeout(() => {
          startPolling();
        }, 5000);
      } else {
        toast.error(result.msg || "获取设备二维码失败")
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
    } finally {
      setIsAddingDevice(false)
    }
  }
  
  const startPolling = () => {
    setIsPolling(true);
    setPollingStatus("polling");
    
    // 清除可能存在的旧定时器
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    
    // 设置轮询定时器
    pollingTimerRef.current = setInterval(() => {
      pollAddResult();
      pollingCountRef.current += 1;
      
      // 如果达到最大轮询次数，停止轮询
      if (pollingCountRef.current >= MAX_POLLING_COUNT) {
        stopPolling();
      }
    }, 1000);
  }
  
  const pollAddResult = async () => {
    if (!project?.s2_accountId) {
      console.error("未找到账号ID，无法轮询");
      return;
    }
    
    try {
      const result = await apiRequest(`/devices/add-results?accountId=${project.s2_accountId}`)
      
      if (result.code === 200) {
        // 检查是否最后一次轮询且设备未添加
        if (pollingCountRef.current >= MAX_POLLING_COUNT && !result.data.added) {
          setPollingStatus("error");
          setIsQrCodeBroken(true);
          stopPolling();
          return;
        }

        // 检查设备是否已添加成功
        if (result.data.added) {
          setPollingStatus("success");
          setAddedDevice(result.data.device);
          stopPolling();
          
          // 刷新设备列表
          refreshProjectData();
          toast.success("设备添加成功");
        }
      } else {
        // 请求失败但继续轮询
        console.error("轮询请求失败:", result.msg);
      }
    } catch (error) {
      console.error("轮询请求出错:", error);
      // 不要因为单次错误停止轮询
    }
  }
  
  // 刷新项目数据的方法
  const refreshProjectData = async () => {
    try {
      const result = await apiRequest(`/company/detail/${id}`)
      
      if (result.code === 200) {
        setProject(result.data)
      } else {
        toast.error(result.msg || "刷新项目信息失败")
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试")
    }
  }
  
  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPolling(false);
  }

  const closeModal = () => {
    stopPolling();
    setIsModalOpen(false)
    setQrCodeData("")
    setPollingStatus("waiting");
    setAddedDevice(null);
    setIsQrCodeBroken(false);
  }
  
  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-center" />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">编辑项目</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>项目基本信息</CardTitle>
            <CardDescription>编辑项目的名称、手机号等基础信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">项目名称</Label>
              <Input
                id="projectName"
                value={project?.name || ""}
                onChange={(e) => setProject({ ...project, name: e.target.value })}
                placeholder="请输入项目名称"
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account">登录账号</Label>
                <Input
                  id="account"
                  value={project?.account || ""}
                  onChange={(e) => setProject({ ...project, account: e.target.value })}
                  placeholder="请输入登录的账号"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  value={project?.username || ""}
                  onChange={(e) => setProject({ ...project, username: e.target.value })}
                  placeholder="用于账号登录后显示的用户名，可以填真实姓名"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="number"
                  value={project?.phone || ""}
                  onChange={(e) => setProject({ ...project, phone: e.target.value as string })}
                  placeholder="手机号可用于登录"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={project?.status.toString() || "1"}
                  onChange={(e) => setProject({ ...project, status: parseInt(e.target.value) })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="1">启用</option>
                  <option value="0">禁用</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="不修改请留空"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="不修改请留空"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>关联设备</Label>
              <div className="space-y-3">
                {project && project.devices && project.devices.length > 0 && (
                  <div className="border rounded-md">
                    <table className="w-full table-fixed">
                      <thead className="bg-muted" style={{ fontFamily: "'Microsoft YaHei', sans-serif" }}>
                        <tr>
                          <th className="text-left p-2 w-[12%]">设备名称</th>
                          <th className="text-left p-2 w-[22%]">IMEI</th>
                          <th className="text-left p-2 w-[15%]">手机号</th>
                          <th className="text-left p-2 w-[12%]">型号</th>
                          <th className="text-left p-2 w-[10%]">品牌</th>
                          <th className="text-left p-2 w-[8%]">状态</th>
                          <th className="text-left p-2 w-[13%]">添加时间</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm" style={{ fontFamily: "'Microsoft YaHei', sans-serif" }}>
                        {project.devices.map((device) => (
                          <tr key={device.id} className="border-t">
                            <td className="p-2 truncate" title={device.memo}>{device.memo}</td>
                            <td className="p-2" title={device.imei || '-'}>{device.imei || '-'}</td>
                            <td className="p-2 truncate" title={device.phone || '-'}>{device.phone || '-'}</td>
                            <td className="p-2 truncate" title={device.model || '-'}>{device.model || '-'}</td>
                            <td className="p-2 truncate" title={device.brand || '-'}>{device.brand || '-'}</td>
                            <td className="p-2">
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${device.alive === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {device.alive === 1 ? '在线' : '离线'}
                              </span>
                            </td>
                            <td className="p-2 truncate" title={device.createTime || '-'}>{device.createTime || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddDevice} 
                  className="flex items-center gap-1"
                  disabled={isAddingDevice}
                >
                  {isAddingDevice ? "添加中..." : (
                    <>
                      <Plus className="h-4 w-4" /> 添加设备
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">项目介绍</Label>
              <Textarea
                id="description"
                value={project?.memo || ""}
                onChange={(e) => setProject({ ...project, memo: e.target.value })}
                placeholder="请输入项目介绍（选填）"
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/projects">取消</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "提交中..." : "保存修改"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* 使用Dialog组件替代自定义模态框 */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加设备</DialogTitle>
            <DialogDescription>
              请使用新设备进行扫码添加
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            <div className="border p-4 rounded-lg mb-4">
              {qrCodeData ? (
                <div className="relative">
                  <img 
                    src={qrCodeData} 
                    alt="设备二维码" 
                    className={`w-64 h-64 object-contain ${isQrCodeBroken ? 'opacity-30' : ''}`}
                  />
                  {isQrCodeBroken && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-100 p-3 rounded-md border border-red-300">
                        <div className="flex flex-col items-center gap-2 text-red-700">
                          <X className="h-8 w-8" />
                          <p className="font-medium text-center">二维码已失效</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">二维码加载中...</p>
                </div>
              )}
            </div>
            
            {/* 轮询状态显示 */}
            <div className="w-full mt-2">
              {pollingStatus === "waiting" && (
                <p className="text-sm text-center text-muted-foreground">请扫描二维码添加设备，5秒后将开始检测添加结果...</p>
              )}
              
              {pollingStatus === "polling" && (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-sm text-primary">正在检测添加结果...</p>
                </div>
              )}
              
              {pollingStatus === "success" && addedDevice && (
                <div className="bg-green-50 p-3 rounded-md border border-green-200 mt-2">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="font-medium">设备添加成功。关闭后可继续</p>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>设备名称: {addedDevice.memo}</p>
                    <p>IMEI: {addedDevice.imei || '-'}</p>
                  </div>
                </div>
              )}
              
              {pollingStatus === "error" && (
                <p className="text-sm text-center text-red-500">未检测到设备添加，请关闭后重试</p>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={closeModal}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

