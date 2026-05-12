"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"

type ProductImageProps = Omit<ImageProps, "onLoad" | "onError"> & {
  loaderSize?: "sm" | "md" | "lg"
}

const loaderSizeClasses: Record<NonNullable<ProductImageProps["loaderSize"]>, string> = {
  sm: "w-full h-full max-w-[120px] max-h-[120px]",
  md: "w-full h-full",
  lg: "w-full h-full",
}

export function ProductImage({ className, alt, loaderSize = "md", ...props }: ProductImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-secondary z-10 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/loading.gif"
            alt=""
            className={`${loaderSizeClasses[loaderSize]} object-contain opacity-90`}
          />
        </div>
      )}
      <Image
        {...props}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={className}
      />
    </>
  )
}
