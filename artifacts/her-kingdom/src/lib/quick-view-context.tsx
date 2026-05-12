"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

type QuickViewContextValue = {
  openSlug: string | null
  openQuickView: (slug: string) => void
  closeQuickView: () => void
}

const QuickViewContext = createContext<QuickViewContextValue | null>(null)

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  const openQuickView = useCallback((slug: string) => {
    setOpenSlug(slug)
  }, [])

  const closeQuickView = useCallback(() => {
    setOpenSlug(null)
  }, [])

  return (
    <QuickViewContext.Provider value={{ openSlug, openQuickView, closeQuickView }}>
      {children}
    </QuickViewContext.Provider>
  )
}

const NOOP_QUICK_VIEW: QuickViewContextValue = {
  openSlug: null,
  openQuickView: () => {},
  closeQuickView: () => {},
}

export function useQuickView() {
  const ctx = useContext(QuickViewContext)
  return ctx ?? NOOP_QUICK_VIEW
}
