"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { GiftSelection } from "./types"

const STORAGE_KEY = "herkingdom-gift-selection"

function defaultSelection(): GiftSelection {
  return {
    isGift: false,
    addons: [],
    wraps: [],
    cards: [],
    messageFrom: "",
    messageTo: "",
    messageNote: "",
  }
}

function loadSelection(): GiftSelection {
  if (typeof window === "undefined") return defaultSelection()
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSelection()
    const parsed = JSON.parse(raw) as GiftSelection
    return { ...defaultSelection(), ...parsed }
  } catch {
    return defaultSelection()
  }
}

interface GiftContextType {
  selection: GiftSelection
  setSelection: (s: GiftSelection) => void
  resetSelection: () => void
}

const GiftContext = createContext<GiftContextType | undefined>(undefined)

export function GiftProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<GiftSelection>(defaultSelection)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSelectionState(loadSelection())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
    } catch {
      // ignore storage errors
    }
  }, [selection, hydrated])

  const setSelection = useCallback((s: GiftSelection) => {
    setSelectionState(s)
  }, [])

  const resetSelection = useCallback(() => {
    setSelectionState(defaultSelection())
  }, [])

  return (
    <GiftContext.Provider value={{ selection, setSelection, resetSelection }}>
      {children}
    </GiftContext.Provider>
  )
}

export function useGiftSelection() {
  const ctx = useContext(GiftContext)
  if (!ctx) throw new Error("useGiftSelection must be used within GiftProvider")
  return ctx
}
