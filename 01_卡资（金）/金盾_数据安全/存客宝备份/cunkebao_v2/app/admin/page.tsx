"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const stats = [
    { title: "总账号数", value: "42" },
    { title: "手机端账号", value: "28" },
    { title: "操盘手账号", value: "14" },
    { title: "今日活跃", value: "18" },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">存客宝管理后台</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>手机端账号管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-4">管理存客宝手机端的用户账号，设置权限和功能。</p>
            <Link href="/admin/accounts/mobile">
              <Button variant="outline" className="w-full">
                查看账号
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操盘手账号管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-4">管理操盘手账号，查看关联设备和微信好友数量。</p>
            <Link href="/admin/accounts/operators">
              <Button variant="outline" className="w-full">
                查看账号
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
