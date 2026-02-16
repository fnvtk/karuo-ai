"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, Mail, Share2, Users, MessageCircle, BarChart2, PieChart } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AnalysisReport {
  id: string
  name: string
  wechatId: string
  deviceName: string
  createdAt: string
  completedAt: string
  keywords: string[]
  promptWords: string[]
  type: "friends" | "moments" | "both"
  summary: string
  friendsAnalysis: {
    totalFriends: number
    matchedFriends: number
    categories: {
      name: string
      count: number
      percentage: number
    }[]
    demographics: {
      gender: { male: number; female: number; unknown: number }
      ageGroups: { [key: string]: number }
      regions: { [key: string]: number }
    }
  }
  momentsAnalysis: {
    totalPosts: number
    analyzedPosts: number
    topTopics: { topic: string; count: number }[]
    sentiment: { positive: number; neutral: number; negative: number }
    activityTrend: { month: string; count: number }[]
  }
}

export default function AnalysisReportPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟加载报告数据
    const fetchReport = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockReport: AnalysisReport = {
        id: params.id,
        name: "美妆用户分析",
        wechatId: "wxid_abc123",
        deviceName: "设备1",
        createdAt: "2023-12-15T10:30:00Z",
        completedAt: "2023-12-15T11:45:00Z",
        keywords: ["美妆", "护肤", "彩妆"],
        promptWords: ["人群属性", "喜好分析", "消费能力"],
        type: "both",
        summary:
          "该微信账号的好友中有约32%与美妆相关，主要集中在25-34岁的女性用户，地域分布以一线城市为主。朋友圈内容分析显示，美妆相关话题互动率较高，用户对高端护肤品牌表现出较强的兴趣，消费能力中上。建议针对这部分用户推送高端护肤品和彩妆新品信息，重点关注节假日促销活动的反馈。",
        friendsAnalysis: {
          totalFriends: 287,
          matchedFriends: 92,
          categories: [
            { name: "美妆爱好者", count: 48, percentage: 52 },
            { name: "偶尔关注", count: 31, percentage: 34 },
            { name: "专业人士", count: 13, percentage: 14 },
          ],
          demographics: {
            gender: { male: 12, female: 76, unknown: 4 },
            ageGroups: { "18-24": 15, "25-34": 53, "35-44": 19, "45+": 5 },
            regions: { 北京: 21, 上海: 18, 广州: 14, 深圳: 12, 其他: 27 },
          },
        },
        momentsAnalysis: {
          totalPosts: 1240,
          analyzedPosts: 850,
          topTopics: [
            { topic: "护肤品", count: 127 },
            { topic: "彩妆", count: 98 },
            { topic: "美容仪器", count: 76 },
            { topic: "品牌活动", count: 65 },
            { topic: "新品上市", count: 52 },
          ],
          sentiment: { positive: 68, neutral: 27, negative: 5 },
          activityTrend: [
            { month: "7月", count: 78 },
            { month: "8月", count: 92 },
            { month: "9月", count: 85 },
            { month: "10月", count: 110 },
            { month: "11月", count: 125 },
            { month: "12月", count: 142 },
          ],
        },
      }

      setReport(mockReport)
      setIsLoading(false)
    }

    fetchReport()
  }, [params.id])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "friends":
        return "好友信息分析"
      case "moments":
        return "朋友圈内容分析"
      case "both":
        return "综合分析"
      default:
        return "未知类型"
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">分析报告</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">发送报告</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">下载报告</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">分享</span>
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 overflow-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        ) : report ? (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 报告头部 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-xl">{report.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{new Date(report.completedAt).toLocaleString()} 完成</p>
                  </div>
                  <Badge className="self-start sm:self-auto bg-green-100 text-green-800 border-green-200">
                    {getTypeLabel(report.type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">分析好友</p>
                      <p className="font-semibold">
                        {report.friendsAnalysis.matchedFriends} / {report.friendsAnalysis.totalFriends}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">分析朋友圈</p>
                      <p className="font-semibold">
                        {report.momentsAnalysis.analyzedPosts} / {report.momentsAnalysis.totalPosts}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <BarChart2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">关键词</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {report.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">分析摘要</h3>
                  <p className="text-sm text-gray-700">{report.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* 详细分析 */}
            <Tabs defaultValue="friends" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="friends">好友分析</TabsTrigger>
                <TabsTrigger value="moments">朋友圈分析</TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">好友分类分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-3">好友分类</h3>
                        <div className="space-y-3">
                          {report.friendsAnalysis.categories.map((category, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{category.name}</span>
                                <span className="font-medium">
                                  {category.count} ({category.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">性别分布</h3>
                        <div className="flex items-center h-40 justify-center">
                          <PieChart className="h-32 w-32 text-gray-400" />
                        </div>
                        <div className="grid grid-cols-3 text-center mt-2">
                          <div>
                            <div className="text-sm text-gray-500">女性</div>
                            <div className="font-medium">
                              {report.friendsAnalysis.demographics.gender.female} (
                              {Math.round(
                                (report.friendsAnalysis.demographics.gender.female /
                                  report.friendsAnalysis.matchedFriends) *
                                  100,
                              )}
                              %)
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">男性</div>
                            <div className="font-medium">
                              {report.friendsAnalysis.demographics.gender.male} (
                              {Math.round(
                                (report.friendsAnalysis.demographics.gender.male /
                                  report.friendsAnalysis.matchedFriends) *
                                  100,
                              )}
                              %)
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">未知</div>
                            <div className="font-medium">
                              {report.friendsAnalysis.demographics.gender.unknown} (
                              {Math.round(
                                (report.friendsAnalysis.demographics.gender.unknown /
                                  report.friendsAnalysis.matchedFriends) *
                                  100,
                              )}
                              %)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      <div>
                        <h3 className="font-medium mb-3">年龄分布</h3>
                        <div className="space-y-3">
                          {Object.entries(report.friendsAnalysis.demographics.ageGroups).map(([age, count], index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{age}岁</span>
                                <span className="font-medium">
                                  {count} ({Math.round((count / report.friendsAnalysis.matchedFriends) * 100)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.round((count / report.friendsAnalysis.matchedFriends) * 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">地域分布</h3>
                        <div className="space-y-3">
                          {Object.entries(report.friendsAnalysis.demographics.regions).map(([region, count], index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{region}</span>
                                <span className="font-medium">
                                  {count} ({Math.round((count / report.friendsAnalysis.matchedFriends) * 100)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.round((count / report.friendsAnalysis.matchedFriends) * 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="moments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">朋友圈内容分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-3">热门话题</h3>
                        <div className="space-y-3">
                          {report.momentsAnalysis.topTopics.map((topic, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{topic.topic}</span>
                                <span className="font-medium">{topic.count} 次提及</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{
                                    width: `${Math.round((topic.count / report.momentsAnalysis.topTopics[0].count) * 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">情感分析</h3>
                        <div className="flex items-center h-40 justify-center">
                          <PieChart className="h-32 w-32 text-gray-400" />
                        </div>
                        <div className="grid grid-cols-3 text-center mt-2">
                          <div>
                            <div className="text-sm text-gray-500">积极</div>
                            <div className="font-medium">{report.momentsAnalysis.sentiment.positive}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">中性</div>
                            <div className="font-medium">{report.momentsAnalysis.sentiment.neutral}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">消极</div>
                            <div className="font-medium">{report.momentsAnalysis.sentiment.negative}%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="font-medium mb-3">活跃度趋势</h3>
                      <div className="h-60 flex items-end justify-between">
                        {report.momentsAnalysis.activityTrend.map((item, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div
                              className="w-12 bg-blue-500 rounded-t-md"
                              style={{
                                height: `${Math.round((item.count / Math.max(...report.momentsAnalysis.activityTrend.map((i) => i.count))) * 180)}px`,
                              }}
                            ></div>
                            <div className="text-xs mt-2">{item.month}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI 洞察</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-800 mb-2">用户兴趣洞察</h4>
                        <p className="text-sm text-blue-700">
                          根据朋友圈内容分析，该用户对高端护肤品牌表现出较强的兴趣，尤其关注新品上市和限时促销活动。用户经常分享美容心得和产品使用体验，互动率较高的内容多与护肤品和彩妆相关。
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <h4 className="font-medium text-green-800 mb-2">消费能力分析</h4>
                        <p className="text-sm text-green-700">
                          用户消费能力属于中上水平，对高端美妆品牌有明显偏好。朋友圈中提及的产品价格区间多在300-1000元，节假日期间有较高的购买意愿和分享欲望。
                        </p>
                      </div>

                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <h4 className="font-medium text-purple-800 mb-2">社交特征分析</h4>
                        <p className="text-sm text-purple-700">
                          用户社交活跃度高，朋友圈更新频率平均为每周3-4次。内容多以分享生活、美妆心得为主，互动性强，对评论和点赞有较高的回应率。用户倾向于在晚间19:00-22:00发布内容，周末活跃度高于工作日。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">未找到报告数据</p>
          </div>
        )}
      </div>
    </div>
  )
}
