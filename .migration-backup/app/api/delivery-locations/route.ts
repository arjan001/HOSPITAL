import { getDeliveryLocations } from "@/lib/supabase-data"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const locations = await getDeliveryLocations()
    return NextResponse.json(locations)
  } catch (error) {
    console.error("Failed to fetch delivery locations:", error)
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
  }
}
