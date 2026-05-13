"use client"

import React from "react"

import { useState } from "react"
import { Link } from "wouter"
import { useLocation } from "wouter"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

export default function LoginPage() {
  const [, navigate] = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const cleanEmail = email.trim().toLowerCase()

    // Brute-force guard (per-IP + per-email rate limit)
    try {
      const guard = await fetch("/api/auth/login-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      })
      if (!guard.ok) {
        const data = await guard.json().catch(() => ({}))
        setError(data.error || "Too many attempts. Please wait a few minutes.")
        setLoading(false)
        return
      }
    } catch {
      // Fail-open on network error so the user isn't permanently locked out
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (authError) {
      // Generic message -- do not leak whether account exists
      setError("Invalid email or password.")
      setLoading(false)
      return
    }

    // Update last_login
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("email", user.email)
    }

    navigate("/admin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] px-4 py-12">
      <Seo title="Sign In" description="Sign in to Shaniid RX. Manage your orders, prescriptions and pharmacy account securely." canonicalPath="/auth/login" noindex />
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-20 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight" style={{ color: "#3D0814" }}>
            Admin Sign In
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to the Shaniid RX dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2DCC8] px-8 py-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shaniid.co.ke"
                className="h-11"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-11 font-semibold text-white"
              style={{ background: "#3D0814" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
