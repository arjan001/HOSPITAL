"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingBag, Trash2, ChevronRight } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { ProductImage } from "./product-image"

export function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist()
  const { addItem } = useCart()

  const handleAddToCart = (product: (typeof items)[0]) => {
    addItem(product)
    removeItem(product.id)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Wishlist</span>
          </nav>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold">Wishlist</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {items.length} {items.length === 1 ? "item" : "items"} saved
              </p>
            </div>
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearWishlist}
                className="text-xs bg-transparent"
              >
                Clear All
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-full bg-pink-100 flex items-center justify-center mb-5">
                <Heart className="h-10 w-10 text-pink-500" />
              </div>
              <h2 className="text-xl font-serif font-bold">Your Wishlist is Empty</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
                Browse our collection and tap the heart icon to save items you love.
              </p>
              <Link href="/shop">
                <Button className="mt-6 bg-foreground text-background hover:bg-foreground/90">
                  Browse Shop
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table view */}
              <div className="hidden md:block border border-border rounded-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left px-5 py-3 font-medium">Product</th>
                      <th className="text-left px-5 py-3 font-medium">Category</th>
                      <th className="text-right px-5 py-3 font-medium">Price</th>
                      <th className="text-center px-5 py-3 font-medium">Stock</th>
                      <th className="text-right px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((product) => (
                      <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-4">
                          <Link href={`/product/${product.slug}`} className="flex items-center gap-4 group">
                            <div className="relative w-16 h-20 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
                              <ProductImage
                                src={product.images[0] || "/placeholder.svg"}
                                alt={product.name}
                                fill
                                loaderSize="sm"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <span className="text-sm font-medium group-hover:underline">{product.name}</span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                            {product.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${product.inStock ? "bg-[#4CAF50]/10 text-[#4CAF50]" : "bg-destructive/10 text-destructive"}`}>
                            {product.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              disabled={!product.inStock}
                              className="bg-pink-200 text-foreground hover:bg-pink-300 text-xs h-9 px-4 disabled:opacity-40"
                            >
                              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                              Add to Cart
                            </Button>
                            <button
                              type="button"
                              onClick={() => removeItem(product.id)}
                              className="p-2 hover:bg-secondary rounded-sm transition-colors"
                              aria-label="Remove from wishlist"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-4">
                {items.map((product) => (
                  <div key={product.id} className="border border-border rounded-sm p-4">
                    <div className="flex gap-4">
                      <Link href={`/product/${product.slug}`} className="flex-shrink-0">
                        <div className="relative w-24 h-28 bg-secondary rounded-sm overflow-hidden">
                          <ProductImage
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            loaderSize="sm"
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${product.slug}`}>
                          <h3 className="text-sm font-medium line-clamp-2">{product.name}</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{product.category}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                          {product.originalPrice && (
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                          )}
                        </div>
                        <span className={`inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${product.inStock ? "bg-[#4CAF50]/10 text-[#4CAF50]" : "bg-destructive/10 text-destructive"}`}>
                          {product.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        className="self-start p-1.5"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.inStock}
                      className="w-full mt-3 bg-foreground text-background hover:bg-foreground/90 text-xs h-10 disabled:opacity-40"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                      Move to Cart
                    </Button>
                  </div>
                ))}
              </div>

              {/* Continue Shopping */}
              <div className="mt-8 text-center">
                <Link href="/shop">
                  <Button variant="outline" className="bg-transparent">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
