/**
 * Shared partner profile / KYC helpers for partner_directory rows.
 */
export type PartnerType = "supplier" | "clinic" | "logistics"

export function extractKycFromPayload(
  partnerType: PartnerType,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (partnerType === "logistics") {
    return {
      hasInsurance: Boolean(payload.hasInsurance),
      hasRegistration: Boolean(payload.hasRegistration),
      hasDriverLicenses: Boolean(payload.hasDriverLicenses),
      hasSafetyTraining: Boolean(payload.hasSafetyTraining),
      hasVehicleInsurance: Boolean(payload.hasVehicleInsurance),
      hasDriverInsurance: Boolean(payload.hasDriverInsurance),
      hasGoodsInTransitCover: Boolean(payload.hasGoodsInTransitCover),
      hasCommercialVehicleCover: Boolean(payload.hasCommercialVehicleCover),
      vehicleInsuranceExpiry: String(payload.vehicleInsuranceExpiry ?? ""),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  if (partnerType === "supplier") {
    return {
      hasLicense: Boolean(payload.hasLicense),
      hasFdaCert: Boolean(payload.hasFdaCert),
      hasInsurance: Boolean(payload.hasInsurance),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  if (partnerType === "clinic") {
    return {
      hasLicense: Boolean(payload.hasLicense),
      hasNhifCert: Boolean(payload.hasNhifCert),
      hasPinCert: Boolean(payload.hasPinCert),
      hasDirectorId: Boolean(payload.hasDirectorId),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  return {}
}

export function indexPartnerPayload(partnerType: PartnerType, payload: Record<string, unknown>) {
  const email = String(payload.email ?? "").trim().toLowerCase()
  const displayName =
    String(
      payload.companyName ??
        payload.clinicName ??
        payload.name ??
        payload.tradingName ??
        email,
    ).trim() || email
  const status = String(payload.status ?? "pending")
  const portalCode = String(payload.portalCode ?? "").trim()
  const kyc = extractKycFromPayload(partnerType, payload)
  return { email, displayName, status, portalCode, kyc }
}
