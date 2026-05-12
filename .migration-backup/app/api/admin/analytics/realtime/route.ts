import { NextResponse } from "next/server"
import { getActiveSessions } from "@/lib/analytics-store"

export async function GET() {
  try {
    const activeUsers = await getActiveSessions(5)

    return NextResponse.json({
      activeUsers,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ activeUsers: 0 }, { status: 500 })
  }
}
