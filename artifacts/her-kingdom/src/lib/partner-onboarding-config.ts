/**
 * Partner self-onboarding field definitions — mirrors admin manual registration.
 */
import type { PartnerType } from "@/lib/partners-client"

export type PartnerOnboardingField = {
  key: string
  label: string
  type?: "text" | "email" | "tel" | "checkbox"
  required?: boolean
  placeholder?: string
}

export type PartnerOnboardingConfig = {
  orgLabel: string
  orgKey: string
  contactLabel: string
  kycFields: PartnerOnboardingField[]
}

export const PARTNER_ONBOARDING: Record<PartnerType, PartnerOnboardingConfig> = {
  supplier: {
    orgLabel: "Company / supplier name",
    orgKey: "companyName",
    contactLabel: "Primary contact person",
    kycFields: [
      { key: "hasLicense", label: "Pharmacy / wholesale license", type: "checkbox" },
      { key: "hasFdaCert", label: "PPB / regulatory certification", type: "checkbox" },
      { key: "hasInsurance", label: "Product liability insurance", type: "checkbox" },
    ],
  },
  clinic: {
    orgLabel: "Clinic / hospital name",
    orgKey: "clinicName",
    contactLabel: "Facility administrator",
    kycFields: [
      { key: "hasLicense", label: "Facility license", type: "checkbox" },
      { key: "hasNhifCert", label: "NHIF / SHIF certificate", type: "checkbox" },
      { key: "hasPinCert", label: "KRA PIN certificate", type: "checkbox" },
      { key: "hasDirectorId", label: "Director ID verified", type: "checkbox" },
    ],
  },
  logistics: {
    orgLabel: "Logistics company name",
    orgKey: "companyName",
    contactLabel: "Operations contact",
    kycFields: [
      { key: "hasRegistration", label: "Company registration", type: "checkbox" },
      { key: "hasInsurance", label: "Public liability insurance", type: "checkbox" },
      { key: "hasVehicleInsurance", label: "Vehicle / fleet insurance", type: "checkbox" },
      { key: "hasDriverLicenses", label: "Valid driver licences (all drivers)", type: "checkbox" },
      { key: "hasSafetyTraining", label: "Cold-chain / safety training", type: "checkbox" },
    ],
  },
}

export function emptyOnboardingForm(type: PartnerType): Record<string, string | boolean> {
  const cfg = PARTNER_ONBOARDING[type]
  const base: Record<string, string | boolean> = {
    [cfg.orgKey]: "",
    contactPerson: "",
    email: "",
    phone: "",
    county: "",
    kycNotes: "",
  }
  for (const f of cfg.kycFields) {
    base[f.key] = false
  }
  return base
}

export function buildOnboardingProfile(
  type: PartnerType,
  form: Record<string, string | boolean>,
): Record<string, unknown> {
  const cfg = PARTNER_ONBOARDING[type]
  const profile: Record<string, unknown> = {
    contactPerson: String(form.contactPerson ?? "").trim(),
    email: String(form.email ?? "").trim().toLowerCase(),
    phone: String(form.phone ?? "").trim(),
    county: String(form.county ?? "").trim(),
    kycNotes: String(form.kycNotes ?? "").trim(),
    status: "pending",
  }
  profile[cfg.orgKey] = String(form[cfg.orgKey] ?? "").trim()
  for (const f of cfg.kycFields) {
    profile[f.key] = Boolean(form[f.key])
  }
  if (type === "supplier") {
    profile.supplierName = profile.companyName
  }
  if (type === "logistics") {
    profile.name = profile.companyName
    profile.coverageCounties = []
  }
  return profile
}
