"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X, CheckCircle, Eye } from "lucide-react"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const buyers = [
  { name: "Amina", location: "Nairobi" },
  { name: "Grace", location: "Mombasa" },
  { name: "Joy", location: "Kisumu" },
  { name: "Sarah", location: "Nakuru" },
  { name: "Wanjiku", location: "Kiambu" },
]

export function RecentPurchase() {
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(data)
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (products.length === 0) return
    const showTimer = setTimeout(() => setVisible(true), 8000)
    return () => clearTimeout(showTimer)
  }, [products.length])

  useEffect(() => {
    if (!visible || products.length === 0) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % buyers.length)
        setVisible(true)
      }, 500)
    }, 12000)
    return () => clearInterval(interval)
  }, [visible, products.length])

  if (!visible || products.length === 0) return null

  const buyer = buyers[current]
  const product = products[current % products.length]
  if (!product) return null
  const productImage = Array.isArray(product.images) ? product.images[0] : undefined
  const hoursAgo = Math.floor(Math.random() * 12) + 1

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-in-right">
      <div className="bg-background border border-border shadow-lg rounded-sm p-3 max-w-xs flex gap-3">
        <div className="relative w-14 h-16 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
          <Image
            src={productImage || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {buyer.name} ({buyer.location}) <span className="text-foreground">purchased</span>
          </p>
          <p className="text-xs font-medium mt-0.5 line-clamp-1">
            {product.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">{hoursAgo}h ago</span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              Verified
            </span>
            <Eye className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="self-start"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}
