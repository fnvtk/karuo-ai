"use client"

import { useState, useEffect } from "react"

/**
 * 检测是否为移动端设备的Hook
 * @param breakpoint 断点像素值，默认768px
 * @returns boolean 是否为移动端
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    checkIsMobile()

    const handleResize = () => {
      checkIsMobile()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [breakpoint])

  return isMobile
}

// <CHANGE> 添加 useMobile 作为 useIsMobile 的别名导出
export const useMobile = useIsMobile

// 默认导出
export default useIsMobile
