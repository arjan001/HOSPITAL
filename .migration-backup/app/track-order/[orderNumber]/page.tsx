import { Suspense } from "react"
import type { Metadata } from "next"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { TrackOrderForm } from "@/components/store/track-order-form"

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }): Promise<Metadata> {
  const { orderNumber } = await params
  return {
    title: `Track Order ${orderNumber} | Her Kingdom`,
    description: `Track the status of your order ${orderNumber} at Her Kingdom. Real-time delivery updates for your jewelry order across Kenya.`,
    robots: { index: false, follow: false },
  }
}

export default async function TrackOrderByCodePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params

  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-balance">
              Track My Order
            </h1>
            <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto leading-relaxed">
              Showing results for order <span className="font-mono font-semibold text-foreground">{orderNumber}</span>
            </p>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-8">Loading...</div>}>
            <TrackOrderForm initialOrderNumber={orderNumber} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
