import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 添加 toast 函数
type ToastType = {
  title: string
  description: string
  variant?: "default" | "destructive" | "secondary"
}

export const toast = ({ title, description, variant = "default" }: ToastType) => {
  console.log(`[${variant.toUpperCase()}] ${title}: ${description}`)
  // 这里可以实现实际的 toast 逻辑
  // 如果有全局的 toast 组件，可以在这里调用
}
