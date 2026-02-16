"use client"

import { useState } from "react"
import { Search, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface KeywordSelectorProps {
  onSelect: (keywords: string[]) => void
  initialSelected?: string[]
}

export default function KeywordSelector({ onSelect, initialSelected = [] }: KeywordSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(initialSelected)
  const [activeCategory, setActiveCategory] = useState("popular")

  // 模拟关键词数据
  const keywordCategories = {
    popular: [
      "电商运营",
      "社交媒体",
      "短视频",
      "直播带货",
      "私域流量",
      "用户增长",
      "品牌营销",
      "内容创作",
      "数据分析",
      "SEO优化",
      "付费推广",
      "用户留存",
      "转化率",
      "客户服务",
      "产品推荐",
    ],
    industry: [
      "美妆护肤",
      "服装穿搭",
      "数码科技",
      "家居生活",
      "母婴育儿",
      "食品饮料",
      "健康养生",
      "教育培训",
      "金融理财",
      "旅游出行",
    ],
    scenario: [
      "节日促销",
      "新品上市",
      "会员活动",
      "限时折扣",
      "满减优惠",
      "秒杀活动",
      "拼团活动",
      "签到奖励",
      "复购激励",
      "用户调研",
    ],
    custom: ["我的标签1", "我的标签2", "我的标签3", "自定义标签", "个性化标签"],
  }

  const filteredKeywords = searchQuery
    ? Object.values(keywordCategories)
        .flat()
        .filter((kw) => kw.includes(searchQuery))
    : keywordCategories[activeCategory as keyof typeof keywordCategories]

  const handleKeywordToggle = (keyword: string) => {
    let newSelected
    if (selectedKeywords.includes(keyword)) {
      newSelected = selectedKeywords.filter((k) => k !== keyword)
    } else {
      newSelected = [...selectedKeywords, keyword]
    }
    setSelectedKeywords(newSelected)
    onSelect(newSelected)
  }

  const handleRemoveKeyword = (keyword: string) => {
    const newSelected = selectedKeywords.filter((k) => k !== keyword)
    setSelectedKeywords(newSelected)
    onSelect(newSelected)
  }

  return (
    <div className="space-y-4">
      {/* 已选关键词展示 */}
      {selectedKeywords.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">已选关键词</div>
          <div className="flex flex-wrap gap-2">
            {selectedKeywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="flex items-center gap-1 py-1">
                {keyword}
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="搜索关键词"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 分类标签页 */}
      <Tabs
        defaultValue="popular"
        value={activeCategory}
        onValueChange={(value) => {
          setActiveCategory(value)
          setSearchQuery("")
        }}
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="popular">热门</TabsTrigger>
          <TabsTrigger value="industry">行业</TabsTrigger>
          <TabsTrigger value="scenario">场景</TabsTrigger>
          <TabsTrigger value="custom">自定义</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 关键词列表 */}
      <ScrollArea className="h-[300px]">
        <div className="grid grid-cols-2 gap-2">
          {filteredKeywords.map((keyword) => (
            <Card
              key={keyword}
              className={`p-3 cursor-pointer hover:shadow-sm transition-shadow ${
                selectedKeywords.includes(keyword) ? "bg-blue-50 border-blue-200" : ""
              }`}
              onClick={() => handleKeywordToggle(keyword)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{keyword}</span>
                {selectedKeywords.includes(keyword) && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* 添加自定义关键词 */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          if (searchQuery && !selectedKeywords.includes(searchQuery)) {
            const newSelected = [...selectedKeywords, searchQuery]
            setSelectedKeywords(newSelected)
            onSelect(newSelected)
            setSearchQuery("")
          }
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        添加自定义关键词
      </Button>
    </div>
  )
}
