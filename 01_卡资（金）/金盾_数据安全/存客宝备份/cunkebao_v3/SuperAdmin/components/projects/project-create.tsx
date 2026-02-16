"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { apiRequest } from '@/lib/api-utils'

const formSchema = z.object({
  name: z.string().min(2, "项目名称至少需要2个字符"),
  account: z.string().min(3, "账号至少需要3个字符"),
  password: z.string().min(6, "密码至少需要6个字符"),
  confirmPassword: z.string().min(6, "确认密码至少需要6个字符"),
  phone: z.string().optional(),
  realname: z.string().optional(),
  nickname: z.string().optional(),
  memo: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

interface ProjectCreateProps {
  onSuccess?: () => void
}

export default function ProjectCreate({ onSuccess }: ProjectCreateProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      account: "",
      password: "",
      confirmPassword: "",
      phone: "",
      realname: "",
      nickname: "",
      memo: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    try {
      // 从localStorage获取token和admin_id
      const token = localStorage.getItem('admin_token')
      const adminId = localStorage.getItem('admin_id')
      
      // 设置cookie
      if (token && adminId) {
        const domain = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || '').hostname
        document.cookie = `admin_token=${token}; path=/; domain=${domain}`
        document.cookie = `admin_id=${adminId}; path=/; domain=${domain}`
      }

      const result = await apiRequest('/company/create', 'POST', {
        name: values.name,
        account: values.account,
        password: values.password,
        phone: values.phone || null,
        realname: values.realname || null,
        nickname: values.nickname || null,
        memo: values.memo || null,
      })

      if (result.code === 200) {
        toast.success("项目创建成功")
        form.reset()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(result.msg || "创建项目失败")
      }
    } catch (error) {
      console.error("创建项目失败:", error)
      toast.error("网络错误，请稍后再试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>新建项目</CardTitle>
        <CardDescription>创建一个新的项目并设置基本信息</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="create-project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入项目名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入账号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入手机号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请输入密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="请再次输入密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="realname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>真实姓名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入真实姓名（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>昵称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入昵称（可选）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="请输入项目描述（可选）" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
        >
          重置
        </Button>
        <Button
          type="submit"
          form="create-project-form"
          disabled={isLoading}
        >
          {isLoading ? "创建中..." : "创建项目"}
        </Button>
      </CardFooter>
    </Card>
  )
} 