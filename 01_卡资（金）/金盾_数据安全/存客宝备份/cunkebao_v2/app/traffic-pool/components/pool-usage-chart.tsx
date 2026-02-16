"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface PoolUsageChartProps {
  deviceStats: {
    [key: string]: number
  }
  poolLimit: number
}

export function PoolUsageChart({ deviceStats, poolLimit }: PoolUsageChartProps) {
  return (
    <Card className="p-3">
      <h3 className="text-sm font-medium mb-2">设备流量池使用情况</h3>
      <div className="space-y-3">
        {Object.entries(deviceStats).map(([device, count]) => (
          <div key={device} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>设备{device}</span>
              <span className="text-gray-500">
                {count}/{poolLimit}
              </span>
            </div>
            <Progress value={(count / poolLimit) * 100} />
          </div>
        ))}
      </div>
    </Card>
  )
}
