"use client"

import { MapPin, Truck, Clock, Package } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import type { DeliveryLocation } from "@/lib/types"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

export function DeliveryPage() {
  const { data: deliveryLocations = [] } = useSWR<DeliveryLocation[]>("/api/delivery-locations", fetcher)

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-serif font-bold text-center">Delivery Locations</h1>
            <p className="text-sm text-muted-foreground text-center mt-2">
              We deliver across Kenya. Free shipping on orders above KSh 5,000.
            </p>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
              <div className="flex flex-col items-center text-center p-6 border border-border rounded-sm">
                <Truck className="h-6 w-6 mb-3" />
                <h3 className="text-sm font-semibold">Fast Delivery</h3>
                <p className="text-xs text-muted-foreground mt-1">Same day in Nairobi CBD</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 border border-border rounded-sm">
                <Clock className="h-6 w-6 mb-3" />
                <h3 className="text-sm font-semibold">Dispatch Days</h3>
                <p className="text-xs text-muted-foreground mt-1">Every Tuesday & Friday</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 border border-border rounded-sm">
                <Package className="h-6 w-6 mb-3" />
                <h3 className="text-sm font-semibold">Free Shipping</h3>
                <p className="text-xs text-muted-foreground mt-1">Orders above KSh 5,000</p>
              </div>
            </div>

            {/* Locations Table */}
            <div className="mt-10 border border-border rounded-sm overflow-hidden">
              <div className="bg-foreground text-background px-6 py-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <h2 className="text-sm font-semibold">Delivery Rates</h2>
              </div>
              <div className="divide-y divide-border">
                {deliveryLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium">{loc.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{loc.estimatedDays}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(loc.fee)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-5 bg-secondary rounded-sm">
              <h3 className="text-sm font-semibold mb-2">Physical Shop</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Philadelphia House, 3rd Floor Wing B Room 9.
                <br />
                Open Monday - Saturday, 9AM - 6PM.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
