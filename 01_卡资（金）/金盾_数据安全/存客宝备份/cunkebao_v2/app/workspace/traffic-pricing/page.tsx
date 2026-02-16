"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Share2 } from "lucide-react"
import Link from "next/link"
import { TrafficTeamSettings } from "@/app/components/TrafficTeamSettings"

export default function TrafficPricingPage() {
  const [activeTab, setActiveTab] = useState("pricing")

  return (
    <div className="flex-1 p-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">流量分发与定价</h1>
          <Button asChild variant="outline">
            <Link href="/workspace/traffic-distribution/new">
              <Share2 className="mr-2 h-4 w-4" />
              创建分发计划
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="pricing" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-3">
            <TabsTrigger value="pricing">价格设置</TabsTrigger>
            <TabsTrigger value="distribution">分发设置</TabsTrigger>
            <TabsTrigger value="teams">团队设置</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>基础价格设置</CardTitle>
                <CardDescription>设置不同渠道的基础价格，这将影响所有分发计划</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="douyin-price">抖音获客价格 (元/位)</Label>
                    <Input id="douyin-price" type="number" defaultValue="2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wechat-price">微信获客价格 (元/位)</Label>
                    <Input id="wechat-price" type="number" defaultValue="3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xiaohongshu-price">小红书获客价格 (元/位)</Label>
                    <Input id="xiaohongshu-price" type="number" defaultValue="4" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-price">电话获客价格 (元/位)</Label>
                    <Input id="phone-price" type="number" defaultValue="5" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>保存设置</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>溢价规则设置</CardTitle>
                <CardDescription>根据不同的客户特征设置溢价规则</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age-pricing">年龄溢价</Label>
                    <Select defaultValue="1.2">
                      <SelectTrigger id="age-pricing">
                        <SelectValue placeholder="选择溢价系数" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.0">无溢价 (1.0倍)</SelectItem>
                        <SelectItem value="1.2">轻度溢价 (1.2倍)</SelectItem>
                        <SelectItem value="1.5">中度溢价 (1.5倍)</SelectItem>
                        <SelectItem value="2.0">高度溢价 (2.0倍)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender-pricing">性别溢价</Label>
                    <Select defaultValue="1.0">
                      <SelectTrigger id="gender-pricing">
                        <SelectValue placeholder="选择溢价系数" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.0">无溢价 (1.0倍)</SelectItem>
                        <SelectItem value="1.2">轻度溢价 (1.2倍)</SelectItem>
                        <SelectItem value="1.5">中度溢价 (1.5倍)</SelectItem>
                        <SelectItem value="2.0">高度溢价 (2.0倍)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>保存设置</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>分发规则设置</CardTitle>
                <CardDescription>设置默认的分发规则和优先级</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">优先分发高价值流量</Label>
                      <p className="text-sm text-gray-500">优先分发价格更高的流量</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">智能匹配客户与团队</Label>
                      <p className="text-sm text-gray-500">根据团队特性自动匹配合适的客户</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">均衡分发</Label>
                      <p className="text-sm text-gray-500">尽量均衡地向各团队分发流量</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>保存设置</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>团队设置</CardTitle>
                <CardDescription>配置流量分发的团队设置</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficTeamSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
