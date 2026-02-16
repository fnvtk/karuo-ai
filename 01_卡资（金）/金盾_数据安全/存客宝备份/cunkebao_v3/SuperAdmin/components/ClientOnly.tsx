"use client"

import { useState, useEffect, type ReactNode } from 'react'

/**
 * ClientOnly组件
 * 该组件专门用于包装那些只能在客户端渲染的内容，避免水合不匹配错误
 * 例如：使用了Date.now()或window对象的组件
 */
export default function ClientOnly({ children, fallback = null }: { children: ReactNode, fallback?: ReactNode }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient ? <>{children}</> : <>{fallback}</>
} 