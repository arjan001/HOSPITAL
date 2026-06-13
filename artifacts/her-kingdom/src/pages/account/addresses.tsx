"use client"

import { useState } from "react"
import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import { useAddresses, useMe, apiNest, type AccountAddress } from "@/lib/api-nest"
import { mutate } from "swr"
import {
  MapPin, Plus, Pencil, Trash2, Star, X, Save, Loader2, Home, Building2,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const CREAM = "#FFFBF5"

const EMPTY_FORM: Partial<AccountAddress> = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  isDefault: false,
}

function AddressModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Partial<AccountAddress>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<AccountAddress>>(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const isEdit = !!initial?.id

  function set<K extends keyof AccountAddress>(k: K, v: AccountAddress[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function save() {
    if (!form.fullName?.trim() || !form.phone?.trim() || !form.line1?.trim() || !form.city?.trim()) {
      setErr("Please fill all required fields.")
      return
    }
    setSaving(true)
    setErr("")
    try {
      if (isEdit && initial?.id) {
        await apiNest.updateAddress(initial.id, form)
      } else {
        await apiNest.addAddress(form)
      }
      await mutate("/me/addresses")
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save address")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ border: `1px solid ${PEACH_BORDER}` }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: PEACH_BORDER, background: CREAM }}>
          <h3 className="font-serif text-lg font-bold" style={{ color: WINE }}>
            {isEdit ? "Edit Address" : "Add New Address"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F2DCC8] transition-colors">
            <X className="h-4 w-4" style={{ color: WINE }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Label */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Label
            </label>
            <div className="flex gap-2">
              {["Home", "Work", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set("label", l)}
                  className="flex-1 h-9 rounded-full text-xs font-semibold border transition-colors"
                  style={
                    form.label === l
                      ? { background: WINE, color: "#fff", borderColor: WINE }
                      : { color: WINE, borderColor: PEACH_BORDER, background: "white" }
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Full name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: PEACH_BORDER }}
                value={form.fullName ?? ""}
                onChange={(e) => set("fullName", e.target.value)}
                placeholder="Recipient's full name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: PEACH_BORDER }}
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Address line 1 <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
              style={{ borderColor: PEACH_BORDER }}
              value={form.line1 ?? ""}
              onChange={(e) => set("line1", e.target.value)}
              placeholder="Street, building, estate"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Address line 2 <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
              style={{ borderColor: PEACH_BORDER }}
              value={form.line2 ?? ""}
              onChange={(e) => set("line2", e.target.value)}
              placeholder="Floor, apartment, unit"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                City <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: PEACH_BORDER }}
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Nairobi"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Region / County
              </label>
              <input
                className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: PEACH_BORDER }}
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value)}
                placeholder="Nairobi County"
              />
            </div>
          </div>

          {/* Default */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="w-4 h-4 rounded accent-[#3D0814]"
            />
            <span className="text-sm font-medium" style={{ color: WINE }}>Set as default address</span>
          </label>

          {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: PEACH_BORDER }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full border text-sm font-medium"
            style={{ borderColor: PEACH_BORDER, color: WINE }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 h-10 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${WINE})` }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountAddressesPage() {
  const { data: me } = useMe()
  const { data, isLoading, error } = useAddresses()
  const addresses = data ?? []
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AccountAddress | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const user = {
    name: me?.fullName ?? "You",
    email: me?.email ?? "",
    phone: me?.phone,
    avatarUrl: me?.avatarUrl,
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this address?")) return
    setDeleting(id)
    try {
      await apiNest.removeAddress(id)
      await mutate("/me/addresses")
    } catch {
      alert("Failed to remove address")
    } finally {
      setDeleting(null)
    }
  }

  async function handleSetDefault(addr: AccountAddress) {
    try {
      await apiNest.updateAddress(addr.id, { ...addr, isDefault: true })
      await mutate("/me/addresses")
    } catch {
      alert("Failed to update address")
    }
  }

  return (
    <AccountShell title="Addresses" subtitle="Manage your saved delivery addresses" user={user}>
      <Seo title="My Addresses — Shaniid RX" />

      <div className="space-y-4">
        {/* Add button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${WINE})` }}
          >
            <Plus className="h-4 w-4" /> Add Address
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: WINE }} />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Could not load addresses. Please refresh.
          </div>
        )}

        {!isLoading && addresses.length === 0 && (
          <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-3" style={{ borderColor: PEACH_BORDER }}>
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
              <MapPin className="h-7 w-7" style={{ color: ACCENT }} />
            </div>
            <p className="font-medium text-sm" style={{ color: WINE }}>No saved addresses</p>
            <p className="text-xs text-muted-foreground">Add an address to speed up checkout</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setShowModal(true) }}
              className="mt-1 inline-flex items-center gap-2 h-9 px-5 rounded-full text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${WINE})` }}
            >
              <Plus className="h-4 w-4" /> Add Your First Address
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-2xl border bg-white p-5 relative group transition-shadow hover:shadow-md"
              style={{ borderColor: addr.isDefault ? WINE : PEACH_BORDER }}
            >
              {addr.isDefault && (
                <span
                  className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${WINE}15`, color: WINE }}
                >
                  <Star className="h-2.5 w-2.5 fill-current" /> Default
                </span>
              )}

              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${ACCENT}15` }}
                >
                  {addr.label === "Work" ? (
                    <Building2 className="h-4 w-4" style={{ color: ACCENT }} />
                  ) : (
                    <Home className="h-4 w-4" style={{ color: ACCENT }} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: WINE }}>{addr.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{addr.fullName}</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-0.5 mb-4">
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>{addr.city}{addr.region ? `, ${addr.region}` : ""}</p>
                <p className="font-medium text-foreground mt-1">{addr.phone}</p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: PEACH_BORDER }}>
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors hover:bg-[#FFFBF5]"
                    style={{ color: WINE, borderColor: PEACH_BORDER }}
                  >
                    Set Default
                  </button>
                )}
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setEditing(addr); setShowModal(true) }}
                    className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-[#FFFBF5] transition-colors"
                    style={{ borderColor: PEACH_BORDER }}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" style={{ color: WINE }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(addr.id)}
                    disabled={deleting === addr.id}
                    className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
                    style={{ borderColor: PEACH_BORDER }}
                    title="Delete"
                  >
                    {deleting === addr.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      : <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AddressModal
          initial={editing ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </AccountShell>
  )
}
