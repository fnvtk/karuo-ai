import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import AdaptiveLayout from "./components/AdaptiveLayout"
import { NotificationProvider } from "./components/common/NotificationSystem"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "存客宝 - 智能获客管理平台",
  description: "专业的微信获客和流量管理平台",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <NotificationProvider>
            <AdaptiveLayout>{children}</AdaptiveLayout>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
