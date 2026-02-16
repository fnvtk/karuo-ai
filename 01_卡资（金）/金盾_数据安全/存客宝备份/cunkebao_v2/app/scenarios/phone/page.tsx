"use client"

import { useState } from "react"
import { ChevronLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { ExpandableAcquisitionCard } from "@/components/acquisition/ExpandableAcquisitionCard"
import Link from "next/link"
import { DeviceTreeChart } from "@/app/components/acquisition/DeviceTreeChart"

interface Task {
  id: string
  name: string
  status: "running" | "paused" | "completed"
  stats: {
    devices: number
    acquired: number
    added: number
  }
  lastUpdated: string
  executionTime: string
  nextExecutionTime: string
  trend: { date: string; customers: number }[]
  dailyData: { date: string; acquired: number; added: number }[]
}

export default function PhoneAcquisitionPage() {
  const router = useRouter()
  const channel = "phone"

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      name: "电话招商获客计划",
      status: "running",
      stats: {
        devices: 5,
        acquired: 38,
        added: 31,
      },
      lastUpdated: "2024-03-18 15:30",
      executionTime: "2024-03-18 15:30",
      nextExecutionTime: "预计30分钟后",
      trend: Array.from({ length: 7 }, (_, i) => ({
        date: `3月${String(i + 12)}日`,
        customers: Math.floor(Math.random() * 10) + 5,
      })),
      dailyData: [
        { date: "3/12", acquired: 12, added: 8 },
        { date: "3/13", acquired: 15, added: 10 },
        { date: "3/14", acquired: 8, added: 6 },
        { date: "3/15", acquired: 10, added: 7 },
        { date: "3/16", acquired: 14, added: 11 },
        { date: "3/17", acquired: 9, added: 7 },
        { date: "3/18", acquired: 11, added: 9 },
      ],
    },
  ])

  const handleCopyPlan = (taskId: string) => {
    const taskToCopy = tasks.find((task) => task.id === taskId)
    if (taskToCopy) {
      const newTask = {
        ...taskToCopy,
        id: `${Date.now()}`,
        name: `${taskToCopy.name} (副本)`,
        status: "paused" as const,
      }
      setTasks([...tasks, newTask])
      toast({
        title: "计划已复制",
        description: `已成功复制"${taskToCopy.name}"`,
      })
    }
  }

  const handleDeletePlan = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId)
    if (taskToDelete) {
      setTasks(tasks.filter((t) => t.id !== taskId))
      toast({
        title: "计划已删除",
        description: `已成功删除"${taskToDelete.name}"`,
      })
    }
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center p-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-blue-600">电话获客</h1>
          </div>
          <Link href="/scenarios/phone/new" className="ml-auto">
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              新建计划
            </Button>
          </Link>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto">
        {tasks.map((task) => (
          <ExpandableAcquisitionCard
            key={task.id}
            task={task}
            channel={channel}
            onCopy={handleCopyPlan}
            onDelete={handleDeletePlan}
          />
        ))}
        <DeviceTreeChart />
      </div>
    </div>
  )
}
