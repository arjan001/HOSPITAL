"use client"

import { useState } from "react"
import { Link } from "wouter"
import { useAuth, useOrganization, useOrganizationList } from "@clerk/react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  partnerClerkSession,
  partnerRegisterOrg,
  refreshPartnerMe,
  type PartnerType,
} from "@/lib/partners-client"

type Props = {
  type: PartnerType
  redirectPath: string
  onError: (message: string) => void
}

/**
 * Clerk sign-in for partner portals with Organization tenancy:
 * 1. Sign in / create Clerk account
 * 2. Register company org (first time) or join via invite
 * 3. Exchange Clerk JWT for partner portal session cookie
 */
export function PartnerClerkSignIn({ type, redirectPath, onError }: Props) {
  const { isSignedIn, getToken } = useAuth()
  const { organization } = useOrganization()
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({ userMemberships: true })
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false)

  const portalLabel =
    type === "supplier" ? "Supplier" : type === "clinic" ? "Clinic" : "Logistics"

  const exchangeSession = async (registerName?: string) => {
    const token = await getToken()
    if (!token) throw new Error("Could not read Clerk session. Sign in again.")

    try {
      await partnerClerkSession(type, token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Clerk sign-in failed"
      const needsSetup =
        /organization setup|not registered for this clerk organization/i.test(msg) ||
        /missing partnerType/i.test(msg)
      if (needsSetup && registerName?.trim()) {
        await partnerRegisterOrg(type, token, registerName.trim())
      } else if (needsSetup) {
        setNeedsOrgSetup(true)
        throw new Error(
          `Register your ${portalLabel.toLowerCase()} company to continue.`,
        )
      } else {
        throw err
      }
    }
    await refreshPartnerMe()
  }

  const continueWithClerk = async () => {
    setLoading(true)
    onError("")
    try {
      const name =
        orgName.trim() ||
        organization?.name ||
        userMemberships?.data?.[0]?.organization?.name ||
        ""
      await exchangeSession(name || undefined)
      setNeedsOrgSetup(false)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Clerk sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  if (!isSignedIn) {
    return (
      <Link href={`/account/login?redirect=${encodeURIComponent(redirectPath)}`}>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 font-semibold border-gray-200"
        >
          Sign in with Clerk (organization)
        </Button>
      </Link>
    )
  }

  if (!orgsLoaded) {
    return (
      <Button type="button" variant="outline" disabled className="w-full h-11">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  const activeOrg = organization ?? userMemberships?.data?.[0]?.organization

  return (
    <div className="space-y-3">
      {needsOrgSetup && !activeOrg && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs text-amber-900">
            First time here? Enter your company name to create your {portalLabel.toLowerCase()}{" "}
            organization. Employees join via email invitation after you register.
          </p>
          <div>
            <Label htmlFor="partner-org-name" className="text-xs">
              Company / organization name
            </Label>
            <Input
              id="partner-org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. SwiftMed Logistics Ltd"
              className="mt-1 h-9"
            />
          </div>
        </div>
      )}

      {activeOrg && (
        <p className="text-[11px] text-muted-foreground text-center">
          Active org: <span className="font-semibold">{activeOrg.name}</span>
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={loading || (needsOrgSetup && !orgName.trim() && !activeOrg)}
        onClick={() => void continueWithClerk()}
        className="w-full h-11 font-semibold border-gray-200"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          `Continue with Clerk${activeOrg ? "" : " — register company"}`
        )}
      </Button>
    </div>
  )
}

export function PartnerClerkDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-[#faf9f8] px-2 text-gray-400">or use email & password</span>
      </div>
    </div>
  )
}
