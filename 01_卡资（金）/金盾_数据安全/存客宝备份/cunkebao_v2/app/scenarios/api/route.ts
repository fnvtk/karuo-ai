import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return NextResponse.json({ message: "场景获客API" })
}
