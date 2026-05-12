import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"

export default function EmailVerifiedPage() {
  const { whatsappHref } = useStoreContact()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main
        className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.09) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        {/* Card */}
        <div
          className="relative w-full max-w-lg rounded-3xl p-10 lg:p-14 text-center z-10"
          style={{
            background: "rgba(255,251,245,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${PEACH_BORDER}`,
            boxShadow: "0 40px 80px -24px rgba(61,8,20,0.18), 0 8px 24px -8px rgba(61,8,20,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          {/* Mail icon circle — matching brand with peach gradient ring */}
          <div className="flex items-center justify-center mb-7">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "white",
                boxShadow: `0 0 0 6px rgba(249,115,22,0.18), 0 0 0 12px rgba(249,115,22,0.07)`,
                border: `2px solid ${ACCENT_ORANGE}`,
              }}
            >
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke={ACCENT_RED}
                strokeWidth={1.6}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1
            className="text-2xl lg:text-3xl font-extrabold mb-3 leading-tight"
            style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
          >
            Thanking you for email verification.
          </h1>

          <p className="text-sm lg:text-base leading-relaxed mb-8" style={{ color: WINE_SOFT }}>
            Your email has been successfully verified, and you're now logged in.{" "}
            <Link
              href="/shop"
              className="font-bold hover:underline transition-colors"
              style={{ color: ACCENT_RED }}
            >
              Start shopping
            </Link>{" "}
            and enjoy your experience!
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-full font-bold text-white text-sm transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                boxShadow: "0 14px 30px -10px rgba(185,28,28,0.5)",
              }}
            >
              Browse Medicines →
            </Link>
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-7 h-12 rounded-full font-semibold text-sm transition-all hover:bg-[#FFF1E2]"
              style={{
                background: "white",
                border: `1.5px solid ${PEACH_BORDER}`,
                color: WINE,
              }}
            >
              My Account
            </Link>
          </div>
        </div>

        {/* Floating Need Help chip */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 h-12 px-5 rounded-full font-bold text-sm text-white shadow-xl z-50 transition-transform hover:scale-[1.04]"
          style={{ background: "#25D366" }}
        >
          Need Help?
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
        </a>
      </main>

      <Footer />
    </div>
  )
}
