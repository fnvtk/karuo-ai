import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 获取响应对象
  const response = NextResponse.next()

  // 设置CORS头
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Origin', '*') // 在生产环境中应该设置为特定域名
  response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }

  return response
}

// 配置中间件应用的路径
export const config = {
  matcher: [
    // 匹配所有API路由
    '/api/:path*',
    // 匹配需要跨域的特定外部API请求
    '/company/:path*',
    '/v1/api/:path*',
  ],
} 