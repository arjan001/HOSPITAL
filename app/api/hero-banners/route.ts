import { getHeroBanners } from "@/lib/supabase-data"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const banners = await getHeroBanners()
    return NextResponse.json(banners)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
