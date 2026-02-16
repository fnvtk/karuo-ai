"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { checkLoginStatus, getCurrentUser, getToken, clearAuthData } from "@/lib/api/auth"

interface User {
  id: string
  username: string
  phone: string
  avatar?: string
  role: string
  nickname?: string
  email?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  login: (token: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
  children: ReactNode
}

// 不需要认证的页面路径
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"]

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 初始化认证状态
    const initAuth = () => {
      console.log("初始化认证状态...")

      const isLoggedIn = checkLoginStatus()
      const currentUser = getCurrentUser()
      const currentToken = getToken()

      console.log("认证检查结果:", { isLoggedIn, hasUser: !!currentUser, hasToken: !!currentToken })

      if (isLoggedIn && currentUser && currentToken) {
        setToken(currentToken)
        setUser(currentUser)
        setIsAuthenticated(true)
        console.log("用户已登录:", currentUser)
      } else {
        setToken(null)
        setUser(null)
        setIsAuthenticated(false)
        console.log("用户未登录")

        // 如果当前页面需要认证且用户未登录，跳转到登录页
        if (!PUBLIC_PATHS.includes(pathname)) {
          console.log("重定向到登录页")
          router.push("/login")
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [pathname, router])

  // 监听认证错误事件
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      if (event.detail === "UNAUTHORIZED") {
        console.log("收到未授权事件，清除认证状态")
        logout()
      }
    }

    window.addEventListener("auth-error", handleAuthError as EventListener)

    return () => {
      window.removeEventListener("auth-error", handleAuthError as EventListener)
    }
  }, [])

  const login = (newToken: string) => {
    const currentUser = getCurrentUser()
    console.log("更新认证状态:", { token: newToken.substring(0, 10) + "...", user: currentUser })

    setToken(newToken)
    setUser(currentUser)
    setIsAuthenticated(true)
  }

  const logout = () => {
    console.log("执行登出操作")
    clearAuthData()
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    router.push("/login")
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
