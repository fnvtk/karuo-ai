"use client"

import type React from "react"

import { useState, useRef, useMemo, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface VirtualizedListProps<T> {
  /** 数据列表 */
  items: T[]
  /** 每项的高度 */
  itemHeight: number
  /** 容器高度 */
  height: number
  /** 渲染函数 */
  renderItem: (item: T, index: number) => ReactNode
  /** 缓冲区大小（额外渲染的项目数） */
  overscan?: number
  /** 自定义类名 */
  className?: string
  /** 加载更多回调 */
  onLoadMore?: () => void
  /** 是否正在加载 */
  loading?: boolean
  /** 空状态渲染 */
  emptyState?: ReactNode
}

/**
 * 虚拟化列表组件
 * 用于高性能渲染大量数据
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className,
  onLoadMore,
  loading = false,
  emptyState,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const containerHeight = height
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight), items.length - 1)

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
    }
  }, [scrollTop, itemHeight, height, items.length, overscan])

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1)
  }, [items, visibleRange])

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)

    // 检查是否需要加载更多
    if (onLoadMore && !loading) {
      const { scrollHeight, clientHeight } = e.currentTarget
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        onLoadMore()
      }
    }
  }

  // 总高度
  const totalHeight = items.length * itemHeight

  // 偏移量
  const offsetY = visibleRange.start * itemHeight

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        {emptyState || <div className="text-gray-500">暂无数据</div>}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("overflow-auto", className)} style={{ height }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleRange.start + index} style={{ height: itemHeight }} className="flex items-center">
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center p-4">
          <div className="text-sm text-gray-500">加载中...</div>
        </div>
      )}
    </div>
  )
}
