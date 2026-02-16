"use client"

import React, { type ErrorInfo } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新state使下一次渲染可以显示错误界面
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error("错误边界捕获到错误:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} onReset={() => this.setState({ hasError: false })} />
    }

    return this.props.children
  }
}

// 错误显示界面
function ErrorScreen({ error, onReset }: { error?: Error; onReset: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  
  // 导航到主页
  const goHome = () => {
    router.push("/dashboard")
    onReset()
  }
  
  // 刷新当前页面
  const refreshPage = () => {
    if (typeof window !== "undefined") {
      toast({
        title: "正在刷新页面",
        description: "正在重新加载页面内容...",
        variant: "default",
      })
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  return (
    <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 text-red-600 p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-2">页面出错了</h2>
              <p className="text-sm text-red-700 mb-4">
                很抱歉，页面加载过程中遇到了问题。
              </p>
              {error && (
                <div className="bg-white/50 p-2 rounded text-xs font-mono overflow-auto max-h-24">
                  {error.message}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              您可以尝试刷新页面或返回首页。如果问题持续存在，请联系系统管理员。
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={goHome}>
            返回首页
          </Button>
          <Button onClick={refreshPage}>刷新页面</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ErrorBoundary 