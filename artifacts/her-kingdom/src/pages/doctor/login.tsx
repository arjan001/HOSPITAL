"use client"

import { useState } from "react"
import { Link, useLocation } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import { doctorLogin } from "@/lib/doctors-client"
import { Stethoscope, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"

export default function DoctorLoginPage() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    try {
      await doctorLogin(email.trim(), password)
      setLocation("/doctor")
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo title="Doctor sign in — Shaniid RX" description="Clinician portal access." noindex />
      <TopBar /><Navbar />
      <div className="min-h-[70vh] flex items-center justify-center p-6" style={{ background: "#FFFBF5" }}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6" style={{ color: WINE }}>
            <Stethoscope className="h-6 w-6" />
            <h1 className="text-xl font-bold">Doctor portal</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with the email and password your admin sent after onboarding.
          </p>
          {err && (
            <div className="mb-4 flex gap-2 items-center text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {err}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 border border-border rounded-lg text-sm"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPwd((v) => !v)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #B91C1C)` }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            First time? Open the invite link from your welcome email to set a password.
          </p>
          <p className="mt-2 text-xs text-center">
            <Link href="/" className="font-semibold" style={{ color: ACCENT }}>Back to storefront</Link>
          </p>
        </div>
      </div>
      <Footer />
    </>
  )
}
