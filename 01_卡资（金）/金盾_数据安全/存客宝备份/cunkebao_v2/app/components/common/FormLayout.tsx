"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FormSection {
  title?: string
  description?: string
  children: ReactNode
}

export interface FormLayoutProps {
  /** 表单标题 */
  title?: string
  /** 表单描述 */
  description?: string
  /** 表单部分 */
  sections?: FormSection[]
  /** 表单内容 */
  children?: ReactNode
  /** 提交按钮文本 */
  submitText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 是否显示取消按钮 */
  showCancel?: boolean
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 重置按钮文本 */
  resetText?: string
  /** 提交处理函数 */
  onSubmit?: () => void
  /** 取消处理函数 */
  onCancel?: () => void
  /** 重置处理函数 */
  onReset?: () => void
  /** 是否禁用提交按钮 */
  submitDisabled?: boolean
  /** 是否显示加载状态 */
  loading?: boolean
  /** 自定义底部内容 */
  footer?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 是否使用卡片包装 */
  withCard?: boolean
  /** 表单布局方向 */
  direction?: "vertical" | "horizontal"
  /** 表单标签宽度 (仅在水平布局时有效) */
  labelWidth?: string
}

/**
 * 统一的表单布局组件
 */
export function FormLayout({
  title,
  description,
  sections = [],
  children,
  submitText = "提交",
  cancelText = "取消",
  showCancel = true,
  showReset = false,
  resetText = "重置",
  onSubmit,
  onCancel,
  onReset,
  submitDisabled = false,
  loading = false,
  footer,
  className,
  withCard = true,
  direction = "vertical",
  labelWidth = "120px",
}: FormLayoutProps) {
  const FormContent = () => (
    <>
      {/* 表单内容 */}
      <div className={cn("space-y-6", direction === "horizontal" && "form-horizontal")}>
        {/* 如果有sections，渲染sections */}
        {sections.length > 0
          ? sections.map((section, index) => (
              <div key={index} className="space-y-4">
                {(section.title || section.description) && (
                  <div className="mb-4">
                    {section.title && <h3 className="text-lg font-medium">{section.title}</h3>}
                    {section.description && <p className="text-sm text-gray-500">{section.description}</p>}
                  </div>
                )}
                <div>{section.children}</div>
              </div>
            ))
          : // 否则直接渲染children
            children}
      </div>

      {/* 表单底部 */}
      {(onSubmit || onCancel || onReset || footer) && (
        <div className="flex justify-end space-x-2 pt-6">
          {footer || (
            <>
              {showReset && onReset && (
                <Button type="button" variant="outline" onClick={onReset}>
                  {resetText}
                </Button>
              )}
              {showCancel && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {cancelText}
                </Button>
              )}
              {onSubmit && (
                <Button
                  type="submit"
                  disabled={submitDisabled || loading}
                  onClick={onSubmit}
                  className={loading ? "opacity-70" : ""}
                >
                  {loading ? "处理中..." : submitText}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </>
  )

  // 添加水平布局的样式
  if (direction === "horizontal") {
    const style = document.createElement("style")
    style.textContent = `
      .form-horizontal .form-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .form-horizontal .form-label {
        width: ${labelWidth};
        flex-shrink: 0;
        padding-top: 0.5rem;
      }
      .form-horizontal .form-field {
        flex: 1;
      }
      @media (max-width: 640px) {
        .form-horizontal .form-item {
          flex-direction: column;
          align-items: stretch;
        }
        .form-horizontal .form-label {
          width: 100%;
          margin-bottom: 0.5rem;
          padding-top: 0;
        }
      }
    `
    document.head.appendChild(style)
  }

  // 根据是否需要卡片包装返回不同的渲染结果
  if (withCard) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <FormContent />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      )}
      <FormContent />
    </div>
  )
}

/**
 * 表单项组件 - 用于水平布局
 */
export function FormItem({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="form-item">
      <div className="form-label">
        {required && <span className="text-red-500 mr-1">*</span>}
        <span>{label}:</span>
      </div>
      <div className="form-field">{children}</div>
    </div>
  )
}
