"use client"

import React, { type ErrorInfo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 max-w-md mx-auto mt-8">
          <h2 className="text-2xl font-bold mb-4 text-red-600">出错了</h2>
          <p className="text-gray-600 mb-4">抱歉，应用程序遇到了一个错误。</p>
          <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false })}>重试</Button>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
