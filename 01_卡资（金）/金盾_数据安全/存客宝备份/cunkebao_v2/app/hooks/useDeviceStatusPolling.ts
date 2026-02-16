"use client"

import { useState, useEffect, useMemo } from "react"
import type { Device } from "@/components/device-grid"
import { deviceApi } from "@/lib/api/devices"
import type { DeviceStatus } from "@/types/device"

export function useDeviceStatusPolling(devices: Device[], interval = 30000) {
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 使用 useMemo 序列化 device IDs，确保依赖项的稳定性
  const deviceIds = useMemo(
    () =>
      devices
        .map((d) => d.id)
        .sort()
        .join(","),
    [devices],
  )

  useEffect(() => {
    if (!deviceIds) {
      setStatuses({})
      return
    }

    let isActive = true // 标记，防止在组件卸载后仍更新状态
    const idArray = deviceIds.split(",")

    const pollStatus = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await deviceApi.checkStatus(idArray)
        if (isActive && response.data) {
          setStatuses((prev) => ({ ...prev, ...response.data }))
        } else if (response.message) {
          throw new Error(response.message)
        }
      } catch (e) {
        if (isActive) {
          setError(e instanceof Error ? e.message : "获取设备状态失败")
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    // 立即执行一次
    pollStatus()

    // 设置定时轮询
    const intervalId = setInterval(pollStatus, interval)

    // 监听页面可见性，实现智能轮询
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId) // 页面隐藏时暂停
      } else {
        pollStatus() // 页面可见时立即更新并重新开始轮询
        setInterval(pollStatus, interval)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // 清理函数
    return () => {
      isActive = false
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [deviceIds, interval]) // 依赖项现在是稳定的字符串

  return { statuses, isLoading, error }
}
