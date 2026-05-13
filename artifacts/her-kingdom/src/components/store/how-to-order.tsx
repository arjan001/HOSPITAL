import { Link } from "wouter"
import { ArrowRight } from "lucide-react"

const TEAL = "#16a3a3"
const TEAL_DARK = "#0e7e7e"

const DOCTOR_MAIN = "https://images.pexels.com/photos/31141459/pexels-photo-31141459/free-photo-of-young-hijabi-doctor-in-syrian-hospital.jpeg?auto=compress&cs=tinysrgb&w=900"
const CONSULT = "https://images.pexels.com/photos/10705020/pexels-photo-10705020.jpeg?auto=compress&cs=tinysrgb&w=600"
const PATIENT_SMALL = "https://images.pexels.com/photos/8367241/pexels-photo-8367241.jpeg?auto=compress&cs=tinysrgb&w=500"

const STEPS = [
  { n: 1, label: "Upload valid Prescription", color: "#16a3a3" },
  { n: 2, label: "Receive a confirmation call", color: "#d896c8" },
  { n: 3, label: "Delivery at your door step", color: "#f0894d" },
]

export function HowToOrder() {
  return (
    <section className="bg-[#f4f6f7] py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Image collage */}
          <div className="relative h-[420px] sm:h-[500px] lg:h-[560px]">
            {/* Decorative shapes */}
            <div
              aria-hidden
              className="absolute"
              style={{
                left: "20%",
                top: "0%",
                width: "120px",
                height: "120px",
                background: "#2bb3b3",
                borderRadius: "60% 0 60% 0",
              }}
            />
            <div
              aria-hidden
              className="absolute"
              style={{
                right: "5%",
                top: "38%",
                width: "100px",
                height: "100px",
                background: "#f5b842",
                borderRadius: "0 60% 0 60%",
              }}
            />

            {/* Family/consultation image (top-left, medium) */}
            <div
              className="absolute overflow-hidden shadow-md"
              style={{
                left: "0%",
                top: "12%",
                width: "44%",
                height: "42%",
                borderRadius: "28px",
              }}
            >
              <img
                src={CONSULT}
                alt="Pharmacist consulting with patient"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Main doctor portrait (right, large) */}
            <div
              className="absolute overflow-hidden shadow-lg"
              style={{
                right: "12%",
                top: "4%",
                width: "56%",
                height: "70%",
                borderRadius: "40px",
              }}
            >
              <img
                src={DOCTOR_MAIN}
                alt="Licensed pharmacist in hijab"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Patient w/ mask (bottom small) */}
            <div
              className="absolute overflow-hidden shadow-md"
              style={{
                left: "38%",
                bottom: "0%",
                width: "26%",
                height: "30%",
                borderRadius: "24px",
              }}
            >
              <img
                src={PATIENT_SMALL}
                alt="Patient with face mask"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Copy + Steps */}
          <div>
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-[42px] leading-tight text-neutral-900 font-semibold"
              style={{ letterSpacing: "-0.01em" }}
            >
              How to order medicines on Shaniid&nbsp;RX? It’s Simple.
            </h2>

            <ol className="mt-8 space-y-5">
              {STEPS.map((s) => (
                <li key={s.n} className="flex items-center gap-4">
                  <span
                    className="flex-shrink-0 grid place-items-center w-10 h-10 rounded-full border-2 text-sm font-semibold"
                    style={{ borderColor: s.color, color: s.color }}
                  >
                    {s.n}
                  </span>
                  <span className="text-[17px] text-neutral-800">{s.label}</span>
                </li>
              ))}
            </ol>

            <p
              className="mt-8 text-[20px] font-semibold"
              style={{ color: TEAL }}
            >
              Don’t have a prescription? Don’t worry!
            </p>
            <p className="mt-2 text-[15px] text-neutral-600 leading-relaxed max-w-md">
              Simply search &amp; add the medicines OR get a consultation from a Shaniid&nbsp;RX doctor.
            </p>

            <div className="mt-8">
              <Link
                href="/about"
                className="inline-flex items-center gap-3 group"
              >
                <span
                  className="grid place-items-center w-12 h-12 rounded-full text-white transition-colors"
                  style={{ background: TEAL }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = TEAL_DARK)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = TEAL)}
                >
                  <ArrowRight className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-900">
                  About&nbsp;us
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
