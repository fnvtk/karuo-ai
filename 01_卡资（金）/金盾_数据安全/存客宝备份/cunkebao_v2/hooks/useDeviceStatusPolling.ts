"use client"

import { useState, useEffect } from "react"
import type { Device } from "@/components/device-grid"

interface DeviceStatus {
  status: "online" | "offline"
  battery: number
}

async function fetchDeviceStatuses(deviceIds: string[]): Promise<Record<string, DeviceStatus>> {
  // 模拟API调用
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return deviceIds.reduce(
    (acc, id) => {
      acc[id] = {
        status: Math.random() > 0.3 ? "online" : "offline",
        battery: Math.floor(Math.random() * 100),
      }
      return acc
    },
    {} as Record<string, DeviceStatus>,
  )
}

export function useDeviceStatusPolling(devices: Device[]) {
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({})

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const newStatuses = await fetchDeviceStatuses(devices.map((d) => d.id))
        setStatuses((prevStatuses) => ({ ...prevStatuses, ...newStatuses }))
      } catch (error) {
        console.error("Failed to fetch device statuses:", error)
      }
    }

    pollStatus() // 立即执行一次
    const intervalId = setInterval(pollStatus, 30000) // 每30秒更新一次

    return () => clearInterval(intervalId)
  }, [devices])

  return statuses
}
