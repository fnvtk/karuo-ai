"use client"

import { useState, useEffect } from "react"
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart, Legend } from "recharts"

interface AcquisitionPlanChartProps {
  data: { date: string; customers: number }[]
}

export function AcquisitionPlanChart({ data }: AcquisitionPlanChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  // 生成更真实的数据
  useEffect(() => {
    if (!data || data.length === 0) return

    // 使用获客计划中的获客数和添加数作为指标，模拟近7天数据
    const enhancedData = data.map((item) => {
      // 添加数通常是获客数的一定比例，这里使用70%-90%的随机比例
      const addRate = 0.7 + Math.random() * 0.2
      const addedCount = Math.round(item.customers * addRate)

      return {
        date: item.date,
        获客数: item.customers,
        添加数: addedCount,
      }
    })

    setChartData(enhancedData)
  }, [data])

  // 如果没有数据，显示空状态
  if (!data || data.length === 0 || chartData.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-gray-400">暂无数据</div>
  }

  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} width={30} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "none",
              padding: "8px",
            }}
            labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: "#6b7280", fontSize: "12px" }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="获客数"
            name="获客数"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorCustomers)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="添加数"
            name="添加数"
            stroke="#8b5cf6"
            fillOpacity={0.5}
            fill="url(#colorAdded)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
