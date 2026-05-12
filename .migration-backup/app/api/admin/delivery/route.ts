import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse, isValidUUID } from "@/lib/security"

const ALLOWED_TYPES = new Set(["delivery", "pickup"])
const ALLOWED_REGIONS = new Set(["nairobi", "outside_nairobi"])

function normaliseType(value: unknown): "delivery" | "pickup" {
  const v = String(value || "delivery").toLowerCase()
  return ALLOWED_TYPES.has(v) ? (v as "delivery" | "pickup") : "delivery"
}

function normaliseRegion(value: unknown): "nairobi" | "outside_nairobi" {
  const v = String(value || "nairobi").toLowerCase()
  return ALLOWED_REGIONS.has(v) ? (v as "nairobi" | "outside_nairobi") : "nairobi"
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("delivery_locations")
    .select("*")
    .order("region", { ascending: true })
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("fee", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const locations = (data || []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    fee: Number(loc.fee),
    estimatedDays: loc.estimated_days || "",
    type: (loc.type as "delivery" | "pickup") || "delivery",
    region: (loc.region as "nairobi" | "outside_nairobi") || "nairobi",
    city: (loc.city as string) || "",
    description: (loc.description as string) || "",
    isActive: loc.is_active,
    sortOrder: (loc.sort_order as number) || 0,
  }))

  return NextResponse.json(locations)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  const payload = {
    name: String(body.name || "").trim(),
    fee: Number(body.fee) || 0,
    estimated_days: String(body.estimatedDays || "").trim(),
    type: normaliseType(body.type),
    region: normaliseRegion(body.region),
    city: body.city ? String(body.city).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    is_active: body.isActive ?? true,
    sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 50,
  }

  // Try richer insert first; if the extra columns are missing on this
  // deployment (migration 024 not run yet) fall back to the legacy shape
  // so the admin panel still works.
  const tryInsert = (p: Record<string, unknown>) =>
    supabase.from("delivery_locations").insert(p).select().single()

  let { data, error } = await tryInsert(payload)
  if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message || ""))) {
    const res = await tryInsert({
      name: payload.name,
      fee: payload.fee,
      estimated_days: payload.estimated_days,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    })
    data = res.data
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  if (!body.id || typeof body.id !== "string" || !isValidUUID(body.id)) {
    return NextResponse.json({ error: "Missing or invalid ID" }, { status: 400 })
  }

  const payload = {
    name: String(body.name || "").trim(),
    fee: Number(body.fee) || 0,
    estimated_days: String(body.estimatedDays || "").trim(),
    type: normaliseType(body.type),
    region: normaliseRegion(body.region),
    city: body.city ? String(body.city).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    is_active: body.isActive ?? true,
    sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 50,
  }

  const tryUpdate = (p: Record<string, unknown>) =>
    supabase.from("delivery_locations").update(p).eq("id", body.id)

  let { error } = await tryUpdate(payload)
  if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message || ""))) {
    const res = await tryUpdate({
      name: payload.name,
      fee: payload.fee,
      estimated_days: payload.estimated_days,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    })
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id || !isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

  const { error } = await supabase.from("delivery_locations").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
