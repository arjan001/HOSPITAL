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
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-28 h-28",
}

export function ProductImage({
  className,
  alt,
  loaderSize = "md",
  src,
  fill,
  style,
  width,
  height,
}: ProductImageProps) {
  const [loaded, setLoaded] = useState(false)

  const imgStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style || {}

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden"
          style={{ background: "#FFF6EC" }}
          aria-hidden="true"
        >
          <img
            src="/logo-rx.png"
            alt=""
            className={`${loaderSizeClasses[loaderSize]} object-contain rx-loader-pulse`}
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
