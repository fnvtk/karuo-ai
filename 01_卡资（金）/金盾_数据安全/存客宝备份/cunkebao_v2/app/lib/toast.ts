// 简单的 toast 工具函数
export const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
  // 在控制台输出，后续可以替换为真正的 toast 实现
  console.log(`${type.toUpperCase()}: ${message}`)

  // 可以在这里添加浏览器原生通知或其他简单的提示方式
  if (typeof window !== "undefined") {
    // 简单的浏览器 alert 作为临时解决方案
    if (type === "error") {
      alert(`错误: ${message}`)
    } else if (type === "success") {
      alert(`成功: ${message}`)
    }
  }
}

export const toast = {
  success: (message: string) => showToast(message, "success"),
  error: (message: string) => showToast(message, "error"),
  warning: (message: string) => showToast(message, "warning"),
  info: (message: string) => showToast(message, "info"),
}
