import { NextResponse } from "next/server"
import type { TrafficUser } from "@/types/traffic"

// 中文名字生成器数据
const familyNames = [
  "张",
  "王",
  "李",
  "赵",
  "陈",
  "刘",
  "杨",
  "黄",
  "周",
  "吴",
  "朱",
  "孙",
  "马",
  "胡",
  "郭",
  "林",
  "何",
  "高",
  "梁",
  "郑",
  "罗",
  "宋",
  "谢",
  "唐",
  "韩",
  "曹",
  "许",
  "邓",
  "萧",
  "冯",
]
const givenNames1 = [
  "志",
  "建",
  "文",
  "明",
  "永",
  "春",
  "秀",
  "金",
  "水",
  "玉",
  "国",
  "立",
  "德",
  "海",
  "和",
  "荣",
  "伟",
  "新",
  "英",
  "佳",
]
const givenNames2 = [
  "华",
  "平",
  "军",
  "强",
  "辉",
  "敏",
  "峰",
  "磊",
  "超",
  "艳",
  "娜",
  "霞",
  "燕",
  "娟",
  "静",
  "丽",
  "涛",
  "洋",
  "勇",
  "龙",
]

// 生成固定的用户数据池
const userPool: TrafficUser[] = Array.from({ length: 1610 }, (_, i) => {
  const familyName = familyNames[Math.floor(Math.random() * familyNames.length)]
  const givenName1 = givenNames1[Math.floor(Math.random() * givenNames1.length)]
  const givenName2 = givenNames2[Math.floor(Math.random() * givenNames2.length)]
  const fullName = Math.random() > 0.5 ? familyName + givenName1 + givenName2 : familyName + givenName1

  // 生成随机时间（在过去7天内）
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * 7))

  return {
    id: `${Date.now()}-${i}`,
    avatar: `/placeholder.svg?height=40&width=40&text=${fullName[0]}`,
    nickname: fullName,
    wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
    phone: `1${["3", "5", "7", "8", "9"][Math.floor(Math.random() * 5)]}${Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("")}`,
    region: [
      "广东深圳",
      "浙江杭州",
      "江苏苏州",
      "北京",
      "上海",
      "四川成都",
      "湖北武汉",
      "福建厦门",
      "山东青岛",
      "河南郑州",
    ][Math.floor(Math.random() * 10)],
    note: [
      "咨询产品价格",
      "对产品很感兴趣",
      "准备购买",
      "需要更多信息",
      "想了解优惠活动",
      "询问产品规格",
      "要求产品demo",
      "索要产品目录",
      "询问售后服务",
      "要求上门演示",
    ][Math.floor(Math.random() * 10)],
    status: ["pending", "added", "failed"][Math.floor(Math.random() * 3)] as TrafficUser["status"],
    addTime: date.toISOString(),
    source: ["抖音直播", "小红书", "微信朋友圈", "视频号", "公众号", "个人主页"][Math.floor(Math.random() * 6)],
    assignedTo: "",
    category: ["potential", "customer", "lost"][Math.floor(Math.random() * 3)] as TrafficUser["category"],
    tags: [],
  }
})

// 计算今日新增数量
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)
const todayUsers = userPool.filter((user) => new Date(user.addTime) >= todayStart)

// 生成微信好友数据池
const generateWechatFriends = (wechatId: string, count: number) => {
  return Array.from({ length: count }, (_, i) => {
    const familyName = familyNames[Math.floor(Math.random() * familyNames.length)]
    const givenName1 = givenNames1[Math.floor(Math.random() * givenNames1.length)]
    const givenName2 = givenNames2[Math.floor(Math.random() * givenNames2.length)]
    const fullName = Math.random() > 0.5 ? familyName + givenName1 + givenName2 : familyName + givenName1

    // 生成随机时间（在过去30天内）
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    return {
      id: `wechat-${wechatId}-${i}`,
      avatar: `/placeholder.svg?height=40&width=40&text=${fullName[0]}`,
      nickname: fullName,
      wechatId: `wxid_${Math.random().toString(36).substr(2, 8)}`,
      phone: `1${["3", "5", "7", "8", "9"][Math.floor(Math.random() * 5)]}${Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("")}`,
      region: [
        "广东深圳",
        "浙江杭州",
        "江苏苏州",
        "北京",
        "上海",
        "四川成都",
        "湖北武汉",
        "福建厦门",
        "山东青岛",
        "河南郑州",
      ][Math.floor(Math.random() * 10)],
      note: [
        "咨询产品价格",
        "对产品很感兴趣",
        "准备购买",
        "需要更多信息",
        "想了解优惠活动",
        "询问产品规格",
        "要求产品demo",
        "索要产品目录",
        "询问售后服务",
        "要求上门演示",
      ][Math.floor(Math.random() * 10)],
      status: ["pending", "added", "failed"][Math.floor(Math.random() * 3)] as TrafficUser["status"],
      addTime: date.toISOString(),
      source: ["抖音直播", "小红书", "微信朋友圈", "视频号", "公众号", "个人主页", "微信好友"][
        Math.floor(Math.random() * 7)
      ],
      assignedTo: "",
      category: ["potential", "customer", "lost"][Math.floor(Math.random() * 3)] as TrafficUser["category"],
      tags: [],
    }
  })
}

// 微信好友数据缓存
const wechatFriendsCache = new Map<string, TrafficUser[]>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || "all"
  const source = searchParams.get("source") || "all"
  const status = searchParams.get("status") || "all"
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const wechatSource = searchParams.get("wechatSource") || ""

  let filteredUsers = [...userPool]

  // 如果有微信来源参数，生成或获取微信好友数据
  if (wechatSource) {
    if (!wechatFriendsCache.has(wechatSource)) {
      // 生成150-300个随机好友
      const friendCount = Math.floor(Math.random() * (300 - 150)) + 150
      wechatFriendsCache.set(wechatSource, generateWechatFriends(wechatSource, friendCount))
    }
    filteredUsers = wechatFriendsCache.get(wechatSource) || []
  }

  // 应用过滤条件
  filteredUsers = filteredUsers.filter((user) => {
    const matchesSearch = search
      ? user.nickname.toLowerCase().includes(search.toLowerCase()) ||
        user.wechatId.toLowerCase().includes(search.toLowerCase()) ||
        user.phone.includes(search)
      : true

    const matchesCategory = category === "all" ? true : user.category === category
    const matchesSource = source === "all" ? true : user.source === source
    const matchesStatus = status === "all" ? true : user.status === status

    const matchesDate =
      startDate && endDate
        ? new Date(user.addTime) >= new Date(startDate) && new Date(user.addTime) <= new Date(endDate)
        : true

    return matchesSearch && matchesCategory && matchesSource && matchesStatus && matchesDate
  })

  // 按添加时间倒序排序
  filteredUsers.sort((a, b) => new Date(b.addTime).getTime() - new Date(a.addTime).getTime())

  // 计算分页
  const total = filteredUsers.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const users = filteredUsers.slice(start, end)

  // 计算分类统计
  const categoryStats = {
    potential: userPool.filter((user) => user.category === "potential").length,
    customer: userPool.filter((user) => user.category === "customer").length,
    lost: userPool.filter((user) => user.category === "lost").length,
  }

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json({
    users,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      pageSize,
    },
    stats: {
      total: wechatSource ? filteredUsers.length : userPool.length,
      todayNew: wechatSource ? Math.floor(filteredUsers.length * 0.1) : todayUsers.length,
      categoryStats,
    },
  })
}
