"use client"

import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import { useDoctorMe, useDoctorPatients } from "@/lib/doctors-client"
import { Users, NotebookPen, Loader2, ChevronRight } from "lucide-react"

const WINE = "#3D0814"

export default function DoctorPatientsPage() {
  const { data: me } = useDoctorMe(true)
  const { data: patients, isLoading, error } = useDoctorPatients(!!me?.doctor)

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFBF5]">
      <Seo title="My Patients" description="Patients you have consulted on Shaniid RX." canonicalPath="/doctor/patients" noindex />
      <TopBar />
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <Link href="/doctor" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            ← Doctor panel
          </Link>
          <h1 className="mt-2 text-2xl font-bold flex items-center gap-2" style={{ color: WINE }}>
            <Users className="h-6 w-6" /> My patients
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Patients from consultations assigned to you. Open a profile to view shared sticky notes.
          </p>
        </div>

        {!me?.doctor ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
            <p>Sign in at the <Link href="/doctor/login" className="underline font-semibold">doctor portal</Link> to see your patients.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            Could not load patients. Complete a consultation while signed in as a doctor to populate this list.
          </div>
        ) : !patients?.length ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-semibold" style={{ color: WINE }}>No patients yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Patients appear here after you are assigned to their consultations (via Speak to a Doctor bookings or admin chat).
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-white shadow-sm overflow-hidden">
            {patients.map((p) => (
              <li key={p.patientId}>
                <Link
                  href={`/admin/patients/${encodeURIComponent(p.patientId)}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full grid place-items-center text-white text-sm font-bold" style={{ background: WINE }}>
                    {(p.patientName || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: WINE }}>{p.patientName || "Patient"}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.patientPhone || p.patientId}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.consultationCount} consultation{p.consultationCount === 1 ? "" : "s"} · last {new Date(p.lastSeen).toLocaleDateString()}
                    </p>
                  </div>
                  <NotebookPen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
