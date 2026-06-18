"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { PartnerType } from "@/lib/partners-client"
import {
  PARTNER_ONBOARDING,
  buildOnboardingProfile,
  emptyOnboardingForm,
} from "@/lib/partner-onboarding-config"

const WINE = "#3D0814"

type Props = {
  open: boolean
  type: PartnerType
  defaultEmail?: string
  defaultOrgName?: string
  loading?: boolean
  onClose: () => void
  onSubmit: (orgName: string, profile: Record<string, unknown>) => void | Promise<void>
}

export function PartnerOnboardingModal({
  open,
  type,
  defaultEmail = "",
  defaultOrgName = "",
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const cfg = PARTNER_ONBOARDING[type]
  const [form, setForm] = useState(() => emptyOnboardingForm(type))
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    const next = emptyOnboardingForm(type)
    if (defaultEmail) next.email = defaultEmail
    if (defaultOrgName) next[cfg.orgKey] = defaultOrgName
    setForm(next)
    setError("")
  }, [open, type, defaultEmail, defaultOrgName, cfg.orgKey])

  if (!open || typeof document === "undefined") return null

  const set = (key: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const orgName = String(form[cfg.orgKey] ?? "").trim()
    const email = String(form.email ?? "").trim()
    const contact = String(form.contactPerson ?? "").trim()
    if (!orgName) {
      setError(`${cfg.orgLabel} is required.`)
      return
    }
    if (!email) {
      setError("Business email is required.")
      return
    }
    if (!contact) {
      setError(`${cfg.contactLabel} is required.`)
      return
    }
    const profile = buildOnboardingProfile(type, form)
    await onSubmit(orgName, profile)
  }

  const portalLabel =
    type === "supplier" ? "Supplier" : type === "clinic" ? "Clinic" : "Logistics"

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-onboarding-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-gray-100">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h2 id="partner-onboarding-title" className="text-lg font-bold text-gray-900">
              Complete {portalLabel} registration
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Submit your company details for Shaniid RX admin review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <Label htmlFor="partner-org">{cfg.orgLabel} *</Label>
            <Input
              id="partner-org"
              value={String(form[cfg.orgKey] ?? "")}
              onChange={(e) => set(cfg.orgKey, e.target.value)}
              className="mt-1 h-10"
              placeholder={
                type === "clinic" ? "Nairobi Women's Hospital" : "SwiftMed Logistics Ltd"
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="partner-contact">{cfg.contactLabel} *</Label>
              <Input
                id="partner-contact"
                value={String(form.contactPerson ?? "")}
                onChange={(e) => set("contactPerson", e.target.value)}
                className="mt-1 h-10"
              />
            </div>
            <div>
              <Label htmlFor="partner-phone">Phone</Label>
              <Input
                id="partner-phone"
                type="tel"
                value={String(form.phone ?? "")}
                onChange={(e) => set("phone", e.target.value)}
                className="mt-1 h-10"
                placeholder="+254..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="partner-email">Business email *</Label>
            <Input
              id="partner-email"
              type="email"
              value={String(form.email ?? "")}
              onChange={(e) => set("email", e.target.value)}
              className="mt-1 h-10"
            />
          </div>

          <div>
            <Label htmlFor="partner-county">County / region</Label>
            <Input
              id="partner-county"
              value={String(form.county ?? "")}
              onChange={(e) => set("county", e.target.value)}
              className="mt-1 h-10"
              placeholder="Nairobi"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-900">KYC checklist</p>
            <p className="text-[11px] text-amber-800">
              Tick what you can confirm now. An administrator will verify documents before
              activating your portal.
            </p>
            {cfg.kycFields.map((f) => (
              <label key={f.key} className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  checked={Boolean(form[f.key])}
                  onCheckedChange={(v) => set(f.key, v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">{f.label}</span>
              </label>
            ))}
          </div>

          <div>
            <Label htmlFor="partner-kyc-notes">Additional notes</Label>
            <Textarea
              id="partner-kyc-notes"
              value={String(form.kycNotes ?? "")}
              onChange={(e) => set("kycNotes", e.target.value)}
              className="mt-1 min-h-[72px]"
              placeholder="License numbers, registration refs, or anything our team should know."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 text-white font-semibold"
              style={{ background: WINE }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Submit for approval"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
