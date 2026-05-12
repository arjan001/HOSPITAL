"use client"

import React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle, Lock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RegisterPage() {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/auth/check-setup")
      .then((r) => r.json())
      .then((data) => {
        setHasAdmin(data.hasAdmin)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Password must contain both letters and numbers")
      return
    }
    const hasSymbolOrMixedCase = /[^A-Za-z0-9]/.test(form.password) || (/[a-z]/.test(form.password) && /[A-Z]/.test(form.password))
    if (!hasSymbolOrMixedCase) {
      setError("Password must include a symbol or mix upper & lower case")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/admin`,
        data: {
          display_name: form.displayName,
          role: form.role,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Also create admin_users record
    try {
      const adminRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          role: form.role,
          password: form.password,
        }),
      })
      const adminData = await adminRes.json()
      if (!adminRes.ok) {
        setError(adminData.error || "Failed to create admin record")
        setLoading(false)
        return
      }
    } catch (err) {
      console.error("[v0] Admin record creation failed:", err)
      // Continue even if admin record fails - auth signup succeeded
    }

    setSuccess(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Registration locked -- admin already exists
  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-bold">Registration Closed</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Admin setup is complete. New team members can only be added through the admin dashboard by existing admins.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/auth/login">
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to store
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-foreground mb-4" />
          <h1 className="text-2xl font-serif font-bold">Account Created</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Check your email <span className="font-medium text-foreground">{form.email}</span> to confirm your account, then sign in.
          </p>
          <Link href="/auth/login">
            <Button className="mt-6 bg-foreground text-background hover:bg-foreground/90 font-medium">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <Link href="/" className="font-serif text-3xl font-bold tracking-tight">
              Her Kingdom
            </Link>
          <p className="text-sm text-muted-foreground mt-2">Create the Super Admin account</p>
          <p className="text-xs text-muted-foreground mt-1">This is a one-time setup. You can add more team members later from the admin panel.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="displayName" className="text-sm font-medium mb-1.5 block">Your Name</Label>
            <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Jane Doe" className="h-11" required autoFocus />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@herkingdom.co.ke" className="h-11" required />
            </div>

            {/* Role selector - hidden on first registration */}
            <div className="hidden">
              <Label className="text-sm font-medium mb-1.5 block">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-sm">
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                <span className="font-semibold">First user setup:</span> You'll be assigned as Super Admin with full system access and ability to add team members.
              </p>
            </div>


          <div>
            <Label htmlFor="password" className="text-sm font-medium mb-1.5 block">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, letters + numbers + symbol/mixed case" className="h-11 pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block">Confirm Password</Label>
            <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password" className="h-11" required />
          </div>

          <Button type="submit" disabled={loading || !form.email || !form.password || !form.displayName} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Account...</>) : "Create Super Admin Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/auth/login" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">Sign In</Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to store</Link>
        </div>
      </div>
    </div>
  )
}
