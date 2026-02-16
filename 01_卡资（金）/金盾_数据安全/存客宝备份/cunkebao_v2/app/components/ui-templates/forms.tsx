"use client"

/**
 * 表单组件模板
 *
 * 包含项目中常用的各种表单组件
 */

import type React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface FormFieldProps {
  label: string
  htmlFor: string
  required?: boolean
  description?: string
  error?: string
  children: React.ReactNode
}

/**
 * 表单字段容器
 * 用于包装表单控件
 */
export function FormField({ label, htmlFor, required = false, description, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextInputFieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  description?: string
  error?: string
  type?: string
}

/**
 * 文本输入字段
 * 用于文本输入
 */
export function TextInputField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required = false,
  description,
  error,
  type = "text",
}: TextInputFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} description={description} error={error}>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </FormField>
  )
}

interface TextareaFieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  description?: string
  error?: string
}

/**
 * 多行文本输入字段
 * 用于多行文本输入
 */
export function TextareaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required = false,
  description,
  error,
}: TextareaFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} description={description} error={error}>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </FormField>
  )
}

interface SelectFieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  description?: string
  error?: string
}

/**
 * 下拉选择字段
 * 用于从选项中选择
 */
export function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder = "请选择",
  required = false,
  description,
  error,
}: SelectFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} description={description} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

interface RadioFieldProps {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; description?: string }>
  required?: boolean
  description?: string
  error?: string
}

/**
 * 单选按钮组字段
 * 用于从选项中单选
 */
export function RadioField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  description,
  error,
}: RadioFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
            <Label htmlFor={`${name}-${option.value}`} className="cursor-pointer">
              {option.label}
            </Label>
            {option.description && <span className="text-xs text-gray-500 ml-2">({option.description})</span>}
          </div>
        ))}
      </RadioGroup>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SliderFieldProps {
  label: string
  id: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  required?: boolean
  description?: string
  error?: string
}

/**
 * 滑块字段
 * 用于数值范围选择
 */
export function SliderField({
  label,
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  required = false,
  description,
  error,
}: SliderFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <span className="text-sm font-medium">
          {value} {unit}
        </span>
      </div>
      <Slider id={id} min={min} max={max} step={step} value={[value]} onValueChange={(values) => onChange(values[0])} />
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SwitchFieldProps {
  label: string
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  description?: string
  disabled?: boolean
}

/**
 * 开关字段
 * 用于布尔值选择
 */
export function SwitchField({ label, id, checked, onCheckedChange, description, disabled = false }: SwitchFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  )
}
