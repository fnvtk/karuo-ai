import { NextResponse } from "next/server"
import type {
  CreateDeviceParams,
  QueryDeviceParams,
  Device,
  ApiResponse,
  DeviceStatus,
  DeviceType,
} from "@/types/device"

// 设备管理路由处理
export async function POST(request: Request) {
  try {
    const body: CreateDeviceParams = await request.json()

    // TODO: 实现创建设备的具体逻辑
    const device: Device = {
      id: "generated-id",
      ...body,
      status: DeviceStatus.OFFLINE,
      lastOnlineTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const response: ApiResponse<Device> = {
      code: 0,
      message: "创建成功",
      data: device,
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
    const params: QueryDeviceParams = {
      keyword: searchParams.get("keyword") || undefined,
      status: (searchParams.get("status") as DeviceStatus) || undefined,
      type: (searchParams.get("type") as DeviceType) || undefined,
      tags: searchParams.get("tags") ? JSON.parse(searchParams.get("tags")!) : undefined,
      dateRange: searchParams.get("dateRange") ? JSON.parse(searchParams.get("dateRange")!) : undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    }

    // TODO: 实现查询设备列表的具体逻辑

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
