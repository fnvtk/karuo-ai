"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DailyAcquisitionData {
  date: string
  acquired: number
  added: number
}

interface DailyAcquisitionChartProps {
  data: DailyAcquisitionData[]
  height?: number
}

export function DailyAcquisitionChart({ data, height = 200 }: DailyAcquisitionChartProps) {
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="acquired"
            name="获客数量"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="added"
            name="添加成功"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
