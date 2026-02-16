"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { getAdminInfo } from "@/lib/utils"

// 全局标签页管理上下文
interface TabData {
  id: string
  label: string
  path: string
  closable: boolean
}

interface TabContextType {
  tabs: TabData[]
  activeTab: string
  addTab: (tab: Omit<TabData, "id">) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  findTabByPath: (path: string) => TabData | undefined
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  // 标签页状态管理
  const [tabs, setTabs] = useState<TabData[]>([
    { id: "dashboard", label: "仪表盘", path: "/dashboard", closable: false }
  ])
  const [activeTab, setActiveTab] = useState("dashboard")

  // 添加标签页
  const addTab = (tabData: Omit<TabData, "id">) => {
    const id = `tab-${Date.now()}`
    const newTab = { id, ...tabData }
    
    // 检查是否已存在类似标签（基于路径）
    const existingTab = findTabByPath(tabData.path)
    
    if (existingTab) {
      // 如果已存在，激活它
      setActiveTab(existingTab.id)
      // 确保导航到该路径（即使路径匹配也强制导航）
      router.push(tabData.path)
      return existingTab.id
    } else {
      // 如果不存在，添加新标签
      setTabs(prev => [...prev, newTab])
      setActiveTab(id)
      // 确保导航到该路径（即使路径匹配也强制导航）
      router.push(tabData.path)
      return id
    }
  }
  
  // 设置激活标签（并导航到对应路径）
  const setActiveTabAndNavigate = (tabId: string) => {
    setActiveTab(tabId)
    // 找到标签对应的路径并导航
    const tab = tabs.find(tab => tab.id === tabId)
    if (tab) {
      router.push(tab.path)
    }
  }
  
  // 关闭标签页
  const closeTab = (tabId: string) => {
    // 找到要关闭的标签的索引
    const tabIndex = tabs.findIndex(tab => tab.id === tabId)
    
    // 如果标签不存在或者是不可关闭的标签，直接返回
    if (tabIndex === -1 || !tabs[tabIndex].closable) return
    
    // 创建新的标签数组，移除要关闭的标签
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    // 如果关闭的是当前活动标签，需要激活另一个标签
    if (activeTab === tabId) {
      // 优先激活关闭标签左侧的标签，如果没有则激活默认的仪表盘标签
      const newActiveTab = newTabs[tabIndex - 1]?.id || "dashboard"
      setActiveTab(newActiveTab)
      
      // 路由跳转到新激活的标签对应的路径
      const newActivePath = newTabs.find(tab => tab.id === newActiveTab)?.path || "/dashboard"
      router.push(newActivePath)
    }
  }
  
  // 根据路径查找标签
  const findTabByPath = (path: string): TabData | undefined => {
    return tabs.find(tab => tab.path === path)
  }
  
  // 监听路径变化，自动添加标签
  useEffect(() => {
    // 不触发/dashboard路径，已有默认标签
    if (pathname === "/dashboard") {
      setActiveTab("dashboard")
      return
    }
    
    // 检查当前路径是否已有对应标签
    const existingTab = findTabByPath(pathname)
    
    if (existingTab) {
      // 如果存在，激活它
      setActiveTab(existingTab.id)
    } else {
      // 如果不存在，添加新标签
      // 生成标签标题
      let label = "新标签"
      
      // 根据路径生成更友好的标签名
      if (pathname.includes("/projects")) {
        if (pathname === "/dashboard/projects") {
          label = "项目列表"
        } else if (pathname.includes("/new")) {
          label = "新建项目"
        } else if (pathname.includes("/edit")) {
          label = "编辑项目"
        } else {
          label = "项目详情"
        }
      } else if (pathname.includes("/admins")) {
        label = "管理员"
      } else if (pathname.includes("/customers")) {
        label = "客户池"
      } else if (pathname.includes("/settings")) {
        label = "系统设置"
      }
      
      addTab({
        label,
        path: pathname,
        closable: true
      })
    }
  }, [pathname])
  
  // 认证检查
  useEffect(() => {
    const checkAuth = () => {
      const adminInfo = getAdminInfo()
      if (!adminInfo) {
        // 未登录时跳转到登录页
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  return (
    <TabContext.Provider value={{ 
      tabs, 
      activeTab, 
      addTab, 
      closeTab, 
      setActiveTab: setActiveTabAndNavigate, 
      findTabByPath 
    }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile sidebar toggle */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Sidebar */}
        <div
          className={`bg-background flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:relative z-40 h-full`}
        >
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          {/* 标签栏 */}
          <div className="border-b border-border">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`flex items-center px-4 py-2 border-r border-border cursor-pointer ${
                    activeTab === tab.id ? "bg-muted font-medium" : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    setActiveTabAndNavigate(tab.id)
                  }}
                >
                  <span className="truncate max-w-[200px]">{tab.label}</span>
                  {tab.closable && (
                    <button
                      className="ml-2 p-1 rounded-full hover:bg-muted-foreground/20"
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* 内容区域 */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </TabContext.Provider>
  )
}

