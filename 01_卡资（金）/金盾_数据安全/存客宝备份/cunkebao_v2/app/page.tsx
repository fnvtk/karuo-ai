"use client"

import { Card } from "@/components/ui/card"
import { Smartphone, Users, Activity, MessageSquare, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

// 导入Chart.js
import { Chart, registerables } from "chart.js"
Chart.register(...registerables)

// 模拟统一的数据 - 与整个项目保持一致
const mockStats = {
  totalDevices: 8,
  onlineDevices: 7,
  totalWechatAccounts: 17,
  onlineWechatAccounts: 15,
}

export default function Home() {
  const router = useRouter()
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const [isLoading, setIsLoading] = useState(false)

  // 使用Chart.js创建图表
  useEffect(() => {
    if (chartRef.current && !isLoading) {
      // 如果已经有图表实例，先销毁它
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      const ctx = chartRef.current.getContext("2d")

      // 创建新的图表实例 - 使用与项目一致的数据
      chartInstance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
          datasets: [
            {
              label: "获客数量",
              data: [156, 196, 89, 45, 234, 145, 78], // 使用与其他页面一致的数据
              backgroundColor: "rgba(59, 130, 246, 0.2)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: "rgba(59, 130, 246, 1)",
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              titleColor: "#333",
              bodyColor: "#666",
              borderColor: "#ddd",
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => `获客数量: ${context.parsed.y}`,
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
            },
          },
        },
      })
    }

    // 组件卸载时清理图表实例
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [isLoading])

  const handleDevicesClick = () => {
    router.push("/profile/devices")
  }

  const handleWechatClick = () => {
    router.push("/wechat-accounts")
  }

  // 场景获客数据 - 与其他页面保持一致
  const scenarioFeatures = [
    {
      id: "douyin",
      name: "抖音获客",
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-QR8ManuDplYTySUJsY4mymiZkDYnQ9.png",
      color: "bg-blue-100 text-blue-600",
      value: 196, // 与抖音页面数据一致
      growth: 12,
    },
    {
      id: "xiaohongshu",
      name: "小红书获客",
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-yvnMxpoBUzcvEkr8DfvHgPHEo1kmQ3.png",
      color: "bg-red-100 text-red-600",
      value: 89, // 与其他页面数据一致
      growth: 8,
    },
    {
      id: "weixinqun",
      name: "微信群获客",
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Gsg0CMf5tsZb41mioszdjqU1WmsRxW.png",
      color: "bg-green-100 text-green-600",
      value: 680, // 与微信群页面数据一致
      growth: 15,
    },
    {
      id: "payment",
      name: "付款码获客",
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-x92XJgXy4MI7moNYlA1EAes2FqDxMH.png",
      color: "bg-orange-100 text-orange-600",
      value: 156, // 与付款码页面数据一致
      growth: 10,
    },
  ]

  // 今日数据统计 - 与其他页面保持一致
  const todayStats = [
    {
      title: "朋友圈同步",
      value: "12",
      icon: <MessageSquare className="h-4 w-4" />,
      color: "text-purple-600",
      path: "/workspace/moments-sync",
    },
    {
      title: "群发任务",
      value: "8",
      icon: <Users className="h-4 w-4" />,
      color: "text-orange-600",
      path: "/workspace/group-push",
    },
    {
      title: "获客转化",
      value: "85%",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-600",
      path: "/scenarios",
    },
    {
      title: "系统活跃度",
      value: "98%",
      icon: <Activity className="h-4 w-4" />,
      color: "text-blue-600",
      path: "/workspace",
    },
  ]

  return (
    <div className="flex-1 pb-16 bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="flex justify-between items-center p-4">
          <h1 className="text-xl font-semibold text-blue-600">存客宝</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-white hover:shadow-md transition-all cursor-pointer" onClick={handleDevicesClick}>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">设备数量</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">{mockStats.totalDevices}</span>
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-white hover:shadow-md transition-all cursor-pointer" onClick={handleWechatClick}>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">微信号数量</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">{mockStats.totalWechatAccounts}</span>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-white">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">在线微信号</span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-bold text-blue-600">{mockStats.onlineWechatAccounts}</span>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <Progress
                value={
                  mockStats.totalWechatAccounts > 0
                    ? (mockStats.onlineWechatAccounts / mockStats.totalWechatAccounts) * 100
                    : 0
                }
                className="h-1"
              />
            </div>
          </Card>
        </div>

        {/* 场景获客统计 */}
        <Card className="p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">场景获客统计</h2>
          </div>
          <div className="flex justify-between">
            {scenarioFeatures
              .sort((a, b) => b.value - a.value)
              .slice(0, 4) // 只显示前4个
              .map((scenario) => (
                <Link href={`/scenarios/${scenario.id}`} key={scenario.id} className="block flex-1">
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className={`w-10 h-10 rounded-full ${scenario.color} flex items-center justify-center`}>
                      <img src={scenario.icon || "/placeholder.svg"} alt={scenario.name} className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium">{scenario.value}</div>
                    <div className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis w-full">
                      {scenario.name}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </Card>

        {/* 今日数据统计 */}
        <Card className="p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">今日数据</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {todayStats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => stat.path && router.push(stat.path)}
              >
                <div className={`p-2 rounded-full bg-white ${stat.color}`}>{stat.icon}</div>
                <div>
                  <div className="text-lg font-semibold">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.title}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 每日获客趋势 */}
        <Card className="p-4 bg-white">
          <h2 className="text-base font-semibold mb-3">每日获客趋势</h2>
          <div className="w-full h-48 relative">
            <canvas ref={chartRef} />
          </div>
        </Card>
      </div>
    </div>
  )
}
