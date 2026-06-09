"use client"

import { useState } from "react"
import { Link } from "wouter"
import { useAuth } from "@clerk/react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  partnerClerkSession,
  refreshPartnerMe,
  type PartnerType,
} from "@/lib/partners-client"

type Props = {
  type: PartnerType
  redirectPath: string
  onError: (message: string) => void
}

/** Exchange a Clerk session JWT for the partner portal HttpOnly cookie. */
export function PartnerClerkSignIn({ type, redirectPath, onError }: Props) {
  const { isSignedIn, getToken } = useAuth()
  const [loading, setLoading] = useState(false)

  const continueWithClerk = async () => {
    setLoading(true)
    onError("")
    try {
      const token = await getToken()
      if (!token) throw new Error("Could not read Clerk session. Sign in again.")
      await partnerClerkSession(type, token)
      await refreshPartnerMe()
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
          Sign in with Clerk
        </Button>
      </Link>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={() => void continueWithClerk()}
      className="w-full h-11 font-semibold border-gray-200"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        "Continue with your Clerk account"
      )}
    </Button>
  )
}

export function PartnerClerkDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-[#faf9f8] px-2 text-gray-400">or</span>
      </div>
    </div>
  )
}
