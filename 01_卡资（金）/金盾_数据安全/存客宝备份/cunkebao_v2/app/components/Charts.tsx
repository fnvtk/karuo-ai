"use client"

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { BarChart as RechartsBarChart, Bar } from "recharts"

const lineData = [
  { name: "周一", 新增微信号: 12 },
  { name: "周二", 新增微信号: 19 },
  { name: "周三", 新增微信号: 3 },
  { name: "周四", 新增微信号: 5 },
  { name: "周五", 新增微信号: 2 },
  { name: "周六", 新增微信号: 3 },
  { name: "周日", 新增微信号: 10 },
]

const barData = [
  { name: "周一", 新增好友: 120 },
  { name: "周二", 新增好友: 190 },
  { name: "周三", 新增好友: 30 },
  { name: "周四", 新增好友: 50 },
  { name: "周五", 新增好友: 20 },
  { name: "周六", 新增好友: 30 },
  { name: "周日", 新增好友: 100 },
]

export function LineChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsLineChart data={lineData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="新增微信号" stroke="#8884d8" />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

export function BarChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsBarChart data={barData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="新增好友" fill="#82ca9d" />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

export function TrendChart({ data, dataKey = "value", height = 300 }) {
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6" }}
            activeDot={{ r: 6, fill: "#3b82f6" }}
            isAnimationActive={true}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
