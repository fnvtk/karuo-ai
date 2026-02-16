"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

// 模拟数据
const mockDistributionRule = {
  id: "1",
  name: "抖音直播引流计划",
  description: "从抖音直播间获取的潜在客户流量分发",
  status: "active",
  dailyDistributionLimit: 85,
  deviceIds: ["dev1", "dev2", "dev3"],
  trafficPoolIds: ["pool1", "pool2"],
  distributionStrategy: "even",
  autoAdjust: true,
}

export default function EditTrafficDistributionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false)
  const [isPoolDialogOpen, setIsPoolDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    status: "active",
    dailyDistributionLimit: 100,
    deviceIds: [] as string[],
    trafficPoolIds: [] as string[],
    distributionStrategy: "even", // even, weighted, priority
    autoAdjust: true,
  })

  useEffect(() => {
    // 模拟API请求获取计划详情
    const fetchData = async () => {
      try {
        // 实际项目中应从API获取数据
        // const response = await fetch(`/api/traffic-distribution/${params.id}`)
        // const data = await response.json()
        // setFormData(data)

        // 使用模拟数据
        setTimeout(() => {
          setFormData({
            ...mockDistributionRule,
            id: params.id,
          })
          setLoading(false)
        }, 500)
      } catch (error) {
        console.error("获取分发规则失败:", error)
        toast({
          title: "加载失败",
          description: "无法加载分发规则详情",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDeviceSelection = (selectedDevices: string[]) => {
    setFormData((prev) => ({ ...prev,\
