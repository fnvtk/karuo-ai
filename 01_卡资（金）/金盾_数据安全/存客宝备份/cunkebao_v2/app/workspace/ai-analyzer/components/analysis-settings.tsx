"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AnalysisSettingsProps {
  formData: any
  updateFormData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export function AnalysisSettings({ formData, updateFormData, onNext, onBack }: AnalysisSettingsProps) {
  const [analysisType, setAnalysisType] = useState<string>(formData.analysisType || "both")
  const [keyword, setKeyword] = useState("")
  const [promptWord, setPromptWord] = useState("")
  const [keywords, setKeywords] = useState<string[]>(formData.keywords || [])
  const [promptWords, setPromptWords] = useState<string[]>(formData.promptWords || [])
  const [activeTab, setActiveTab] = useState("friends")

  const handleAddKeyword = () => {
    if (keyword.trim() && !keywords.includes(keyword.trim())) {
      const newKeywords = [...keywords, keyword.trim()]
      setKeywords(newKeywords)
      updateFormData({ keywords: newKeywords })
      setKeyword("")
    }
  }

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index)
    setKeywords(newKeywords)
    updateFormData({ keywords: newKeywords })
  }

  const handleAddPromptWord = () => {
    if (promptWord.trim() && !promptWords.includes(promptWord.trim())) {
      const newPromptWords = [...promptWords, promptWord.trim()]
      setPromptWords(newPromptWords)
      updateFormData({ promptWords: newPromptWords })
      setPromptWord("")
    }
  }

  const handleRemovePromptWord = (index: number) => {
    const newPromptWords = promptWords.filter((_, i) => i !== index)
    setPromptWords(newPromptWords)
    updateFormData({ promptWords: newPromptWords })
  }

  const handleTypeChange = (value: string) => {
    setAnalysisType(value)
    updateFormData({ analysisType: value })
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: "keyword" | "prompt") => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (type === "keyword") {
        handleAddKeyword()
      } else {
        handleAddPromptWord()
      }
    }
  }

  const handleContinue = () => {
    updateFormData({
      analysisType,
      keywords,
      promptWords,
    })
    onNext()
  }

  const suggestedKeywords = ["美妆", "护肤", "彩妆", "健身", "教育", "培训", "金融", "投资", "旅游", "美食"]
  const suggestedPrompts = ["人群属性", "喜好分析", "消费能力", "兴趣爱好", "活跃度", "社交特征"]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">设置分析内容</h2>
        <p className="text-gray-500 text-sm">选择分析类型并设置关键词和提示词</p>
      </div>

      <div>
        <Label className="text-base font-medium">分析类型</Label>
        <RadioGroup value={analysisType} onValueChange={handleTypeChange} className="mt-2 space-y-3">
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="friends" id="friends" />
            <div className="grid gap-1.5">
              <Label htmlFor="friends" className="font-medium">
                好友信息分析
              </Label>
              <p className="text-sm text-gray-500">分析微信号下所有好友的昵称及微信信息，基于指定用户词进行筛选分析</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="moments" id="moments" />
            <div className="grid gap-1.5">
              <Label htmlFor="moments" className="font-medium">
                朋友圈内容分析
              </Label>
              <p className="text-sm text-gray-500">
                运用AI技术对所有用户朋友圈内容进行分析，通过提示词辅助深入剖析用户类型
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="both" id="both" />
            <div className="grid gap-1.5">
              <Label htmlFor="both" className="font-medium">
                综合分析（推荐）
              </Label>
              <p className="text-sm text-gray-500">同时分析好友信息和朋友圈内容，获得更全面的数据洞察</p>
            </div>
          </div>
        </RadioGroup>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends">好友分析设置</TabsTrigger>
          <TabsTrigger value="moments">朋友圈分析设置</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="keywords" className="text-base font-medium">
              用户关键词
            </Label>
            <p className="text-sm text-gray-500 mt-1 mb-2">
              设置用于筛选好友的关键词，例如"美妆"将筛选出昵称或微信信息中与美妆相关的好友
            </p>

            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "keyword")}
                placeholder="输入关键词并回车"
                className="flex-1"
              />
              <Button type="button" onClick={handleAddKeyword} disabled={!keyword.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {keywords.map((kw, index) => (
                  <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-2">推荐关键词：</p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (!keywords.includes(kw)) {
                        const newKeywords = [...keywords, kw]
                        setKeywords(newKeywords)
                        updateFormData({ keywords: newKeywords })
                      }
                    }}
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="moments" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="promptWords" className="text-base font-medium">
              分析提示词
            </Label>
            <p className="text-sm text-gray-500 mt-1 mb-2">
              设置辅助AI分析的提示词，如"人群属性"、"喜好分析"等，帮助深入剖析用户类型
            </p>

            <div className="flex gap-2">
              <Input
                id="promptWords"
                value={promptWord}
                onChange={(e) => setPromptWord(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "prompt")}
                placeholder="输入提示词并回车"
                className="flex-1"
              />
              <Button type="button" onClick={handleAddPromptWord} disabled={!promptWord.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {promptWords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {promptWords.map((pw, index) => (
                  <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                    {pw}
                    <button
                      type="button"
                      onClick={() => handleRemovePromptWord(index)}
                      className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-3">
              <p className="text-sm text-gray-500 mb-2">推荐提示词：</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((pw) => (
                  <Badge
                    key={pw}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      if (!promptWords.includes(pw)) {
                        const newPromptWords = [...promptWords, pw]
                        setPromptWords(newPromptWords)
                        updateFormData({ promptWords: newPromptWords })
                      }
                    }}
                  >
                    {pw}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          返回
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            ((analysisType === "friends" || analysisType === "both") && keywords.length === 0) ||
            ((analysisType === "moments" || analysisType === "both") && promptWords.length === 0)
          }
        >
          继续
        </Button>
      </div>
    </div>
  )
}
