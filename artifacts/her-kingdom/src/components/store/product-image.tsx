"use client"

import { useState } from "react"

type ProductImageProps = {
  src?: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  loaderSize?: "sm" | "md" | "lg"
  priority?: boolean
  unoptimized?: boolean
  style?: React.CSSProperties
  sizes?: string
  quality?: number
}

const loaderSizeClasses: Record<NonNullable<ProductImageProps["loaderSize"]>, string> = {
  sm: "w-full h-full max-w-[120px] max-h-[120px]",
  md: "w-full h-full",
  lg: "w-full h-full",
}

export function ProductImage({ className, alt, loaderSize = "md", src, fill, style, width, height }: ProductImageProps) {
  const [loaded, setLoaded] = useState(false)

  const imgStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style || {}

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-secondary z-10 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/loading-rx.svg"
            alt=""
            className={`${loaderSizeClasses[loaderSize]} object-contain opacity-90`}
          />
        </div>
      )}
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={className}
        style={imgStyle}
        {...(width ? { width } : {})}
        {...(height ? { height } : {})}
      />
    </>
  )
}
