"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StepIndicator } from "../components/step-indicator"
import { BasicSettings } from "../components/basic-settings"
import { GroupSelector } from "../components/group-selector"
import { ContentSelector } from "../components/content-selector"
import type { WechatGroup, ContentLibrary } from "@/types/group-sync"

const steps = [
  { id: 1, title: "步骤 1", subtitle: "基础设置" },
  { id: 2, title: "步骤 2", subtitle: "选择社群" },
  { id: 3, title: "步骤 3", subtitle: "选择内容库" },
  { id: 4, title: "步骤 4", subtitle: "京东联盟" },
]

export default function NewGroupSyncPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    pushTimeStart: "06:00",
    pushTimeEnd: "23:59",
    dailyPushCount: 20,
    pushOrder: "latest" as "earliest" | "latest",
    isLoopPush: false,
    isImmediatePush: false,
    isEnabled: false,
    groups: [] as WechatGroup[],
    contentLibraries: [] as ContentLibrary[],
  })

  const handleBasicSettingsNext = (values: any) => {
    setFormData((prev) => ({ ...prev, ...values }))
    setCurrentStep(2)
  }

  const handleGroupsChange = (groups: WechatGroup[]) => {
    setFormData((prev) => ({ ...prev, groups }))
  }

  const handleLibrariesChange = (contentLibraries: ContentLibrary[]) => {
    setFormData((prev) => ({ ...prev, contentLibraries }))
  }

  const handleSave = () => {
    // 这里可以添加保存逻辑，例如API调用
    console.log("保存表单数据:", formData)
    router.push("/workspace/group-sync")
  }

  const handleCancel = () => {
    router.push("/workspace/group-sync")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/workspace/group-sync")} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">编辑 社群推送任务</h1>
      </div>

      <StepIndicator currentStep={currentStep} steps={steps} />

      <div className="mt-12">
        {currentStep === 1 && (
          <BasicSettings
            defaultValues={{
              name: formData.name,
              pushTimeStart: formData.pushTimeStart,
              pushTimeEnd: formData.pushTimeEnd,
              dailyPushCount: formData.dailyPushCount,
              pushOrder: formData.pushOrder,
              isLoopPush: formData.isLoopPush,
              isImmediatePush: formData.isImmediatePush,
              isEnabled: formData.isEnabled,
            }}
            onNext={handleBasicSettingsNext}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 2 && (
          <GroupSelector
            selectedGroups={formData.groups}
            onGroupsChange={handleGroupsChange}
            onPrevious={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 3 && (
          <ContentSelector
            selectedLibraries={formData.contentLibraries}
            onLibrariesChange={handleLibrariesChange}
            onPrevious={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border rounded-md p-8 text-center text-gray-500">
              京东联盟设置（此步骤为占位，实际功能待开发）
            </div>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                上一步
              </Button>
              <Button type="button" onClick={handleSave}>
                完成
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                取消
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
