"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { login, getUserInfo } from "@/lib/api/auth"

export function ApiTester() {
  const [testAccount, setTestAccount] = useState("13800138000")
  const [testPassword, setTestPassword] = useState("123456")
  const [testResult, setTestResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testLogin = async () => {
    setIsLoading(true)
    try {
      const result = await login({
        account: testAccount,
        password: testPassword,
        typeid: 1,
      })
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : "测试失败" })
    } finally {
      setIsLoading(false)
    }
  }

  const testUserInfo = async () => {
    setIsLoading(true)
    try {
      const result = await getUserInfo()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: error instanceof Error ? error.message : "测试失败" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          API测试工具
          <Badge variant="outline">开发模式</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input placeholder="测试账号" value={testAccount} onChange={(e) => setTestAccount(e.target.value)} />
          <Input
            placeholder="测试密码"
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={testLogin} disabled={isLoading} size="sm">
            测试登录
          </Button>
          <Button onClick={testUserInfo} disabled={isLoading} size="sm" variant="outline">
            测试用户信息
          </Button>
        </div>

        {testResult && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <pre className="text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
