"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface LazyLoadProps {
  /** 子组件 */
  children: ReactNode
  /** 占位符 */
  placeholder?: ReactNode
  /** 根边距 */
  rootMargin?: string
  /** 阈值 */
  threshold?: number
  /** 是否只加载一次 */
  once?: boolean
  /** 自定义类名 */
  className?: string
  /** 加载完成回调 */
  onLoad?: () => void
}

/**
 * 懒加载组件
 * 当元素进入视口时才渲染内容
 */
export function LazyLoad({
  children,
  placeholder,
  rootMargin = "50px",
  threshold = 0.1,
  once = true,
  className,
  onLoad,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            setHasLoaded(true)
            observer.unobserve(element)
          }
          if (onLoad) {
            onLoad()
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        rootMargin,
        threshold,
      },
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [rootMargin, threshold, once, onLoad])

  const shouldRender = isVisible || hasLoaded

  return (
    <div ref={elementRef} className={cn(className)}>
      {shouldRender ? children : placeholder}
    </div>
  )
}

// 懒加载图片组件
export interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: ReactNode
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({ src, alt, width, height, className, placeholder, onLoad, onError }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setLoaded(true)
    if (onLoad) onLoad()
  }

  const handleError = () => {
    setError(true)
    if (onError) onError()
  }

  const defaultPlaceholder = (
    <div
      className={cn("bg-gray-200 animate-pulse flex items-center justify-center", className)}
      style={{ width, height }}
    >
      <span className="text-gray-400 text-sm">加载中...</span>
    </div>
  )

  if (error) {
    return (
      <div className={cn("bg-gray-100 flex items-center justify-center", className)} style={{ width, height }}>
        <span className="text-gray-400 text-sm">加载失败</span>
      </div>
    )
  }

  return (
    <LazyLoad placeholder={placeholder || defaultPlaceholder}>
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        width={width}
        height={height}
        className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
        onLoad={handleLoad}
        onError={handleError}
      />
    </LazyLoad>
  )
}
