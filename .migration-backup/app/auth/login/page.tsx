"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
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

    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl font-bold tracking-tight">
            Her Kingdom
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Sign in to admin dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@herkingdom.co.ke"
              className="h-11"
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">Password</Label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium"
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



        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
