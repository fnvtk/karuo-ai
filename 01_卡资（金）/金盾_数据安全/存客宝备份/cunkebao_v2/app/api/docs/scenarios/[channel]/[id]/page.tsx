"use client"

import { useState } from "react"
import { ChevronLeft, Copy, Check, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getApiGuideForScenario } from "@/docs/api-guide"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function ApiDocPage({ params }: { params: { channel: string; id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [copiedExample, setCopiedExample] = useState<string | null>(null)

  const apiGuide = getApiGuideForScenario(params.id, params.channel)

  const copyToClipboard = (text: string, exampleId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedExample(exampleId)

    toast({
      title: "已复制代码",
      description: "代码示例已复制到剪贴板",
    })

    setTimeout(() => {
      setCopiedExample(null)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{apiGuide.title}</h1>
              <p className="text-sm text-gray-500 mt-1">API接口文档</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`${window.location.origin}/scenarios/${params.channel}`, "_self")}
            >
              返回计划列表
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-6 max-w-5xl">
        {/* API密钥卡片 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">API密钥</CardTitle>
                <CardDescription>用于身份验证，请妥善保管，不要在客户端代码中暴露它</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-gray-800">api_1_xqbint74</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard("api_1_xqbint74", "api-key")}>
                    {copiedExample === "api-key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">安全提示</p>
                    <p className="text-sm text-amber-700">
                      请妥善保管您的API密钥，不要在客户端代码中暴露它。建议在服务器端使用该接口。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 接口地址卡片 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">接口地址</CardTitle>
            <CardDescription>使用此接口直接导入客户资料到该获客计划，支持多种编程语言</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">POST 请求地址</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        "https://kzminfd0rplrm7owmj4b.lite.vusercontent.net/api/scenarios/post",
                        "api-url",
                      )
                    }
                  >
                    {copiedExample === "api-url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <code className="text-xs font-mono text-gray-800 break-all">
                  https://kzminfd0rplrm7owmj4b.lite.vusercontent.net/api/scenarios/post
                </code>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">必要参数</h4>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      name (姓名)
                    </Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      phone (电话)
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">可选参数</h4>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                      source (来源)
                    </Badge>
                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                      remark (备注)
                    </Badge>
                    <Badge variant="outline" className="text-gray-600 border-gray-200">
                      tags (标签)
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 接口文档卡片 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">接口文档</CardTitle>
            <CardDescription>详细的API规范和集成指南</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1 h-12 bg-transparent">
                <div className="text-center">
                  <div className="font-medium">查看代码示例</div>
                  <div className="text-xs text-gray-500">多种语言示例</div>
                </div>
              </Button>
              <Button variant="outline" className="flex-1 h-12 bg-transparent">
                <div className="text-center">
                  <div className="font-medium">查看集成指南</div>
                  <div className="text-xs text-gray-500">详细集成步骤</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 快速测试卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快速测试</CardTitle>
            <CardDescription>使用以下URL可以快速测试接口是否正常工作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">测试URL</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      "https://kzminfd0rplrm7owmj4b.lite.vusercontent.net/api/scenarios/poster/1/webhook?name=测试客户&phone=13800138000",
                      "test-url",
                    )
                  }
                >
                  {copiedExample === "test-url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="text-xs font-mono text-gray-800 break-all">
                https://kzminfd0rplrm7owmj4b.lite.vusercontent.net/api/scenarios/poster/1/webhook?name=测试客户&phone=13800138000
              </code>
            </div>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">💡 点击上方链接或复制到浏览器中访问，即可快速测试接口连通性</p>
            </div>
          </CardContent>
        </Card>

        {/* 详细文档手风琴 */}
        <div className="mt-8">
          <Accordion type="single" collapsible className="space-y-4">
            {apiGuide.endpoints.map((endpoint, index) => (
              <AccordionItem key={index} value={`endpoint-${index}`} className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-green-100 text-green-800 border-green-200">{endpoint.method}</Badge>
                    <span className="font-mono text-sm text-gray-700">{endpoint.url}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    <p className="text-sm text-gray-700">{endpoint.description}</p>

                    <div>
                      <h4 className="text-sm font-medium mb-3 text-gray-900">请求头</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {endpoint.headers.map((header, i) => (
                          <div key={i} className="flex items-start space-x-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {header.required ? "*" : ""}
                              {header.name}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{header.value}</p>
                              <p className="text-xs text-gray-500 mt-1">{header.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 text-gray-900">请求参数</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {endpoint.parameters.map((param, i) => (
                          <div key={i} className="flex items-start space-x-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {param.required ? "*" : ""}
                              {param.name}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="text-gray-500 font-mono text-xs">{param.type}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3 text-gray-900">响应示例</h4>
                      <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto border">
                        {JSON.stringify(endpoint.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* 代码示例 */}
        <Card className="mt-8" id="examples">
          <CardHeader>
            <CardTitle className="text-lg">代码示例</CardTitle>
            <CardDescription>以下是不同编程语言的接口调用示例</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={apiGuide.examples[0].language}>
              <TabsList className="mb-6">
                {apiGuide.examples.map((example) => (
                  <TabsTrigger key={example.language} value={example.language}>
                    {example.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {apiGuide.examples.map((example) => (
                <TabsContent key={example.language} value={example.language}>
                  <div className="relative">
                    <pre className="bg-gray-50 p-6 rounded-lg overflow-auto text-sm border">{example.code}</pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-3 right-3 bg-transparent"
                      onClick={() => copyToClipboard(example.code, example.language)}
                    >
                      {copiedExample === example.language ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* 集成指南 */}
        <div className="mt-8 space-y-6" id="integration">
          <h3 className="text-xl font-semibold text-gray-900">集成指南</h3>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">集简云平台集成</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm">
                <li>登录集简云平台</li>
                <li>导航至"应用集成" &gt; "外部接口"</li>
                <li>选择"添加新接口"，输入存客宝接口信息</li>
                <li>配置回调参数，将"X-API-KEY"设置为您的API密钥</li>
                <li>
                  设置接口URL为：
                  <code className="bg-gray-100 px-2 py-1 rounded ml-2 text-xs">{apiGuide.endpoints[0].url}</code>
                </li>
                <li>映射必要字段（name, phone等）</li>
                <li>保存并启用集成</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">问题排查</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-900">接口认证失败</h4>
                <p className="text-sm text-gray-700">
                  请确保X-API-KEY正确无误，此密钥区分大小写。如需重置密钥，请联系管理员。
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-900">数据格式错误</h4>
                <p className="text-sm text-gray-700">
                  确保所有必填字段已提供，并且字段类型正确。特别是电话号码格式需符合标准。
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-900">请求频率限制</h4>
                <p className="text-sm text-gray-700">
                  单个API密钥每分钟最多可发送30个请求，超过限制将被暂时限制。对于大批量数据，请使用批量接口。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
