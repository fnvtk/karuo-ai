import { NextResponse } from "next/server"
import type { CreateScenarioParams, QueryScenarioParams, ScenarioBase, ApiResponse } from "@/types/scenario"

// 获客场景路由处理
export async function POST(request: Request) {
  try {
    const body: CreateScenarioParams = await request.json()

    // TODO: 实现创建场景的具体逻辑
    const scenario: ScenarioBase = {
      id: "generated-id",
      ...body,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: "current-user-id",
    }

    const response: ApiResponse<ScenarioBase> = {
      code: 0,
      message: "创建成功",
      data: scenario,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        code: 500,
        message: "创建失败",
        data: null,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params: QueryScenarioParams = {
      type: searchParams.get("type") as any,
      status: searchParams.get("status") as any,
      keyword: searchParams.get("keyword") || undefined,
      dateRange: searchParams.get("dateRange") ? JSON.parse(searchParams.get("dateRange")!) : undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    }

    // TODO: 实现查询场景列表的具体逻辑

    return NextResponse.json({
      code: 0,
      message: "查询成功",
      data: {
        items: [],
        total: 0,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        code: 500,
        message: "查询失败",
        data: null,
      },
      { status: 500 },
    )
  }
}
