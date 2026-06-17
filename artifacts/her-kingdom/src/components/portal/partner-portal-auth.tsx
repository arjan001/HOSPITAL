"use client"

import { useEffect, useState } from "react"
import { Link } from "wouter"
import { useAuth, useUser } from "@clerk/react"
import { useSignIn } from "@clerk/react/legacy"
import { AlertTriangle, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  partnerClerkSession,
  partnerRegisterOrg,
  refreshPartnerMe,
  type PartnerType,
} from "@/lib/partners-client"
import { buildRedirectQuery, rememberPartnerPortalRedirect } from "@/lib/auth-redirect"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "")
const WINE = "#3D0814"

type Props = {
  type: PartnerType
  redirectPath: string
  title: string
  subtitle: string
  brandPanel: React.ReactNode
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function PendingBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

/** Clerk-only partner portal sign-in + organization registration. */
export function PartnerPortalAuthScreen({ type, redirectPath, title, subtitle, brandPanel }: Props) {
  const { isSignedIn, getToken, orgId, orgSlug, isLoaded: authLoaded } = useAuth()
  const { user } = useUser()
  const { isLoaded, signIn, setActive } = useSignIn()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [orgLoading, setOrgLoading] = useState(false)
  const [error, setError] = useState("")
  const [pendingMsg, setPendingMsg] = useState("")
  const [orgName, setOrgName] = useState("")
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false)

  const portalLabel =
    type === "supplier" ? "Supplier" : type === "clinic" ? "Clinic" : "Logistics"

  const registerQuery = buildRedirectQuery(redirectPath)
  const loginQuery = buildRedirectQuery(redirectPath)

  useEffect(() => {
    rememberPartnerPortalRedirect(redirectPath)
  }, [redirectPath])

  /** Active Clerk org from session (no useOrganizationList — avoids Clerk “enable Organizations” gate). */
  const activeOrg = orgId ? { id: orgId, name: orgSlug ?? "" } : null
  const showOrgSetup = isSignedIn && !activeOrg

  const clerkToken = async () => {
    if (orgId) {
      return (await getToken({ organizationId: orgId })) ?? (await getToken())
    }
    return getToken()
  }

  const exchangeSession = async (registerName?: string) => {
    const token = await clerkToken()
    if (!token) throw new Error("Could not read Clerk session. Sign in again.")

    try {
      await partnerClerkSession(type, token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Clerk sign-in failed"
      const needsSetup =
        /organization setup|not registered for this clerk organization/i.test(msg) ||
        /missing partnerType/i.test(msg) ||
        /complete organization setup/i.test(msg)
      if (needsSetup && registerName?.trim()) {
        const reg = await partnerRegisterOrg(type, token, registerName.trim())
        if (reg.pendingApproval) {
          setPendingMsg(
            reg.message ??
              "Your organization is pending admin approval. You will receive portal access once approved.",
          )
          setNeedsOrgSetup(false)
          return
        }
      } else if (needsSetup) {
        setNeedsOrgSetup(true)
        throw new Error(`Register your ${portalLabel.toLowerCase()} company to continue.`)
      } else if (/pending approval/i.test(msg)) {
        setPendingMsg(msg)
        return
      } else {
        throw err
      }
    }
    await refreshPartnerMe()
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setError("")
    setPendingMsg("")
    setSigningIn(true)
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password })
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId })
      } else {
        setError("Additional verification required. Check your email or use Google sign-in.")
      }
    } catch (err) {
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]
          ?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Invalid credentials. Please try again."
      setError(msg)
    } finally {
      setSigningIn(false)
    }
  }

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) {
      setError("Sign-in is still loading — please wait and try again.")
      return
    }
    setError("")
    setGoogleLoading(true)
    try {
      rememberPartnerPortalRedirect(redirectPath)
      const oauthCallback = `${BASE_PATH}/account/sso-callback${buildRedirectQuery(redirectPath)}`
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: oauthCallback,
        redirectUrlComplete: `${BASE_PATH}${redirectPath}`,
      })
    } catch (err) {
      setGoogleLoading(false)
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]
          ?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Could not start Google sign-in."
      setError(msg)
    }
  }

  const continueToPortal = async () => {
    setOrgLoading(true)
    setError("")
    setPendingMsg("")
    try {
      const name =
        orgName.trim() ||
        activeOrg?.name ||
        orgSlug ||
        ""
      await exchangeSession(name || undefined)
      setNeedsOrgSetup(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue to portal")
    } finally {
      setOrgLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      {brandPanel}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img
              src="/logo-rx.png"
              alt="Shaniid RX"
              className="h-14 w-auto object-contain"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
          <p className="text-gray-500 text-sm mb-6">{subtitle}</p>

          {error && <ErrorBanner message={error} />}
          {pendingMsg && <PendingBanner message={pendingMsg} />}

          {!isSignedIn ? (
            <div className="space-y-4">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.co.ke"
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your Clerk password"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={signingIn || !isLoaded}
                  className="w-full h-11 text-white font-semibold gap-2"
                  style={{ background: WINE }}
                >
                  {signingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <GoogleSignInButton
                label="Continue with Google"
                onClick={() => void handleGoogle()}
                disabled={!isLoaded}
                loading={googleLoading}
              />

              <p className="text-xs text-gray-500 text-center">
                Don&apos;t have an account?{" "}
                <Link href={`/account/register${registerQuery}`} className="underline" style={{ color: WINE }}>
                  Create one here
                </Link>
                {" · "}
                <Link href={`/account/login${loginQuery}`} className="underline" style={{ color: WINE }}>
                  Sign in
                </Link>
              </p>
            </div>
          ) : showOrgSetup ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Signed in as <span className="font-semibold">{user?.primaryEmailAddress?.emailAddress}</span>
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs text-amber-900">
                  Link your {portalLabel.toLowerCase()} company to Clerk. Shaniid RX will review before
                  granting portal access.
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
              <Button
                type="button"
                disabled={orgLoading || !authLoaded || !orgName.trim()}
                onClick={() => void continueToPortal()}
                className="w-full h-11 text-white font-semibold gap-2"
                style={{ background: WINE }}
              >
                {orgLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Submit for approval <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Signed in as <span className="font-semibold">{user?.primaryEmailAddress?.emailAddress}</span>
              </p>
              {activeOrg && activeOrg.name && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Active org: <span className="font-semibold">{activeOrg.name}</span>
                </p>
              )}
              <Button
                type="button"
                disabled={orgLoading || !authLoaded}
                onClick={() => void continueToPortal()}
                className="w-full h-11 text-white font-semibold gap-2"
                style={{ background: WINE }}
              >
                {orgLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue to portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-300 text-center mt-6">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">
              Admin portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
