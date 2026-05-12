"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Link } from "wouter"
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
        emailRedirectTo: `${window.location.origin}/admin`,
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
    }

    setSuccess(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  // Registration locked -- admin already exists
  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] px-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-sm border border-[#F2DCC8] px-10 py-12">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-5">
            <Lock className="h-7 w-7 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#3D0814" }}>Registration Closed</h1>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
            Admin setup is complete. New team members can only be added through the admin dashboard by existing admins.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/auth/login">
              <Button className="w-full h-11 font-semibold text-white" style={{ background: "#3D0814" }}>
                Sign In
              </Button>
            </Link>
            <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
              Back to store
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] px-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-sm border border-[#F2DCC8] px-10 py-12">
          <CheckCircle className="h-14 w-14 mx-auto mb-4" style={{ color: "#3D0814" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#3D0814" }}>Account Created</h1>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
            Check your email <span className="font-medium text-neutral-700">{form.email}</span> to confirm your account, then sign in.
          </p>
          <Link href="/auth/login">
            <Button className="mt-8 w-full h-11 font-semibold text-white" style={{ background: "#3D0814" }}>
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-20 w-auto object-contain mx-auto" />
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight" style={{ color: "#3D0814" }}>
            Create Super Admin Account
          </h1>
          <p className="text-sm text-neutral-500 mt-1">One-time setup — you can add more team members later from the admin panel.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#F2DCC8] px-8 py-8">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 text-sm p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="displayName" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Your Name
              </Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Jane Doe"
                className="h-11"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@shaniid.co.ke"
                className="h-11"
                required
              />
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

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">First user setup:</span> You will be assigned as Super Admin with full system access and the ability to add team members.
              </p>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 chars, letters + numbers + symbol"
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

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium mb-1.5 block text-neutral-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
                className="h-11"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !form.email || !form.password || !form.displayName}
              className="w-full h-11 font-semibold text-white"
              style={{ background: "#3D0814" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Super Admin Account"
              )}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-neutral-500">
            Already registered?{" "}
            <Link href="/auth/login" className="font-medium underline underline-offset-4 hover:opacity-80" style={{ color: "#3D0814" }}>
              Sign In
            </Link>
          </p>
          <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors block">
            Back to store
          </Link>
        </div>
      </div>
    </div>
  )
}
