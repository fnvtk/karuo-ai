"use client"

import type React from "react"
import { cn } from "@/app/lib/utils"

interface FormLayoutProps {
  children: React.ReactNode
  className?: string
  layout?: "vertical" | "horizontal" | "responsive"
  labelWidth?: string
  gap?: "none" | "sm" | "md" | "lg"
}

/**
 * 自适应表单布局组件
 * 支持垂直、水平和响应式布局
 */
export function FormLayout({
  children,
  className,
  layout = "responsive",
  labelWidth = "w-32",
  gap = "md",
}: FormLayoutProps) {
  // 根据gap参数设置间距
  const gapClasses = {
    none: "space-y-0",
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  }

  // 根据layout参数设置布局类
  const getLayoutClasses = () => {
    switch (layout) {
      case "horizontal":
        return "form-horizontal"
      case "vertical":
        return "form-vertical"
      case "responsive":
        return "form-vertical md:form-horizontal"
      default:
        return "form-vertical"
    }
  }

  return (
    <div
      className={cn("w-full", getLayoutClasses(), gapClasses[gap], className, {
        [`[--label-width:${labelWidth}]`]: layout !== "vertical",
      })}
    >
      {children}
    </div>
  )
}

export default FormLayout

interface FormItemProps {
  children: React.ReactNode
  label?: React.ReactNode
  className?: string
  required?: boolean
  error?: string
}

/**
 * 表单项组件
 * 配合FormLayout使用
 */
export function FormItem({ children, label, className, required, error }: FormItemProps) {
  return (
    <div className={cn("form-item", className)}>
      {label && (
        <div className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      )}
      <div className="form-control">
        {children}
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
      </div>
    </div>
  )
}
