"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { X, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPrice } from "@/lib/format"
import type {
  GiftItem,
  GiftItemCategory,
  GiftSelection,
  GiftSelectionAddon,
  GiftSelectionCard,
  GiftSelectionWrap,
} from "@/lib/types"

const TABS: { key: GiftItemCategory | "message"; label: string }[] = [
  { key: "addon", label: "Add Ons" },
  { key: "gift_wrap", label: "Gift Wrapping" },
  { key: "greeting_card", label: "Greeting Cards" },
  { key: "message", label: "Message" },
]

interface GiftOptionsModalProps {
  open: boolean
  onClose: () => void
  selection: GiftSelection
  onChange: (selection: GiftSelection) => void
  /**
   * Footer mode:
   *  - "next"  -> shows a Next button that advances through tabs (storefront flow)
   *  - "save"  -> shows a single Save Gifting Options button that closes the modal
   */
  mode?: "next" | "save"
}

export function GiftOptionsModal({ open, onClose, selection, onChange, mode = "next" }: GiftOptionsModalProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("addon")
  const [items, setItems] = useState<GiftItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    fetch("/api/gift-items")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [open])

  // Prevent background scrolling while the modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const addons = useMemo(() => items.filter((i) => i.category === "addon"), [items])
  const wraps = useMemo(() => items.filter((i) => i.category === "gift_wrap"), [items])
  const cards = useMemo(() => items.filter((i) => i.category === "greeting_card"), [items])

  if (!open) return null

  const currentIndex = TABS.findIndex((t) => t.key === tab)
  const isLastTab = currentIndex === TABS.length - 1

  const goNext = () => {
    if (isLastTab) {
      onClose()
    } else {
      setTab(TABS[currentIndex + 1].key)
    }
  }

  // Helpers to update the selection
  const updateAddons = (updater: (prev: GiftSelectionAddon[]) => GiftSelectionAddon[]) => {
    onChange({ ...selection, addons: updater(selection.addons) })
  }
  const updateWraps = (updater: (prev: GiftSelectionWrap[]) => GiftSelectionWrap[]) => {
    onChange({ ...selection, wraps: updater(selection.wraps) })
  }
  const updateCards = (updater: (prev: GiftSelectionCard[]) => GiftSelectionCard[]) => {
    onChange({ ...selection, cards: updater(selection.cards) })
  }

  const hasAddon = (id: string) => selection.addons.some((a) => a.id === id)
  const hasWrap = (id: string) => selection.wraps.some((w) => w.id === id)
  const hasCard = (id: string) => selection.cards.some((c) => c.id === id)

  const toggleAddon = (item: GiftItem) => {
    if (hasAddon(item.id)) {
      updateAddons((prev) => prev.filter((a) => a.id !== item.id))
    } else {
      updateAddons((prev) => [
        ...prev,
        { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, quantity: 1 },
      ])
    }
  }

  const toggleWrap = (item: GiftItem) => {
    if (hasWrap(item.id)) {
      updateWraps((prev) => prev.filter((w) => w.id !== item.id))
    } else {
      updateWraps((prev) => [
        ...prev,
        { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl },
      ])
    }
  }

  const toggleCard = (item: GiftItem) => {
    if (hasCard(item.id)) {
      updateCards((prev) => prev.filter((c) => c.id !== item.id))
    } else {
      updateCards((prev) => [
        ...prev,
        { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, message: "" },
      ])
    }
  }

  const updateCardMessage = (id: string, message: string) => {
    updateCards((prev) => prev.map((c) => (c.id === id ? { ...c, message } : c)))
  }

  const renderProductCard = (
    it: GiftItem,
    isSelected: boolean,
    onToggle: () => void,
    extra?: React.ReactNode,
  ) => (
    <div key={it.id} className="border border-border rounded-sm p-3 flex flex-col bg-background">
      <div className="flex gap-3">
        <div className="relative w-24 h-24 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
          {it.imageUrl ? (
            <Image src={it.imageUrl} alt={it.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-3">{it.name}</p>
          <p className="text-sm font-semibold mt-1">{formatPrice(it.price)}</p>
          {it.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description}</p>
          )}
          <div className="mt-2">
            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={onToggle}
              className={
                isSelected
                  ? "bg-[#B4336A] text-white hover:bg-[#9E2D5E] border-[#B4336A] h-8 px-4 text-xs"
                  : "bg-transparent h-8 px-6 text-xs"
              }
            >
              {isSelected ? "Remove" : "Add"}
            </Button>
          </div>
        </div>
      </div>
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  )

  const renderGreetingCardTile = (
    it: GiftItem,
    isSelected: boolean,
    onToggle: () => void,
    extra?: React.ReactNode,
  ) => (
    <div
      key={it.id}
      className={`border rounded-sm p-3 flex flex-col bg-background transition-colors ${
        isSelected ? "border-[#B4336A]" : "border-border"
      }`}
    >
      <div className="relative w-full aspect-[4/5] bg-secondary rounded-sm overflow-hidden">
        {it.imageUrl ? (
          <Image
            src={it.imageUrl}
            alt={it.name}
            fill
            sizes="(min-width: 640px) 33vw, 50vw"
            className="object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="mt-3 flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{it.name}</p>
        <p className="text-sm font-semibold mt-1">{formatPrice(it.price)}</p>
      </div>
      <Button
        type="button"
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        className={
          isSelected
            ? "mt-3 w-full bg-[#B4336A] text-white hover:bg-[#9E2D5E] border-[#B4336A] h-9 text-xs"
            : "mt-3 w-full bg-transparent h-9 text-xs"
        }
      >
        {isSelected ? "Remove" : "Add to Cart"}
      </Button>
      {extra && <div className="mt-3">{extra}</div>}
    </div>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gift options"
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-6 bg-foreground/60"
    >
      <div className="relative bg-background w-full max-w-3xl max-h-[92vh] rounded-sm shadow-xl flex flex-col overflow-hidden">
        {/* Close X - intentionally the ONLY way to dismiss the modal */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gift options"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full border border-border bg-background hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Tabs header */}
        <div className="border-b border-border pt-4 px-2 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TABS.map((t) => {
              const active = t.key === tab
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`relative whitespace-nowrap py-3 px-2 sm:px-3 text-sm transition-colors ${
                    active
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading gifting options...
            </div>
          ) : tab === "addon" ? (
            addons.length === 0 ? (
              <EmptyState label="No add-ons available" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addons.map((it) =>
                  renderProductCard(it, hasAddon(it.id), () => toggleAddon(it)),
                )}
              </div>
            )
          ) : tab === "gift_wrap" ? (
            wraps.length === 0 ? (
              <EmptyState label="No gift wrapping options available" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wraps.map((it) =>
                  renderProductCard(it, hasWrap(it.id), () => toggleWrap(it)),
                )}
              </div>
            )
          ) : tab === "greeting_card" ? (
            cards.length === 0 ? (
              <EmptyState label="No greeting cards available" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cards.map((it) => {
                  const chosen = selection.cards.find((c) => c.id === it.id)
                  const selected = !!chosen
                  return renderGreetingCardTile(
                    it,
                    selected,
                    () => toggleCard(it),
                    selected ? (
                      <Textarea
                        value={chosen?.message || ""}
                        onChange={(e) => updateCardMessage(it.id, e.target.value)}
                        placeholder="Enter Card Message"
                        rows={3}
                        className="ring-2 ring-[#B4336A]/40 focus-visible:ring-[#B4336A]"
                      />
                    ) : undefined,
                  )
                })}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium">Add Card Message to be placed in your card</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="From"
                  value={selection.messageFrom || ""}
                  onChange={(e) => onChange({ ...selection, messageFrom: e.target.value })}
                />
                <Input
                  placeholder="To"
                  value={selection.messageTo || ""}
                  onChange={(e) => onChange({ ...selection, messageTo: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Enter your note here..."
                value={selection.messageNote || ""}
                onChange={(e) => onChange({ ...selection, messageNote: e.target.value })}
                rows={6}
              />
            </div>
          )}
        </div>

        {/* Footer action */}
        <div className="border-t border-border p-4">
          <Button
            type="button"
            onClick={mode === "save" ? onClose : goNext}
            className="w-full h-12 bg-[#B4336A] text-white hover:bg-[#9E2D5E] font-semibold text-sm"
          >
            {mode === "save" ? "Save Gifting Options" : isLastTab ? "Save Gifting Options" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-border rounded-sm py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

export function createEmptyGiftSelection(): GiftSelection {
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

export function giftSelectionTotal(selection: GiftSelection): number {
  const addonsTotal = selection.addons.reduce((s, a) => s + a.price * (a.quantity || 1), 0)
  const wrapsTotal = selection.wraps.reduce((s, w) => s + w.price, 0)
  const cardsTotal = selection.cards.reduce((s, c) => s + c.price, 0)
  return addonsTotal + wrapsTotal + cardsTotal
}

export function giftSelectionSummary(selection: GiftSelection): string {
  const parts: string[] = []
  if (selection.addons.length > 0) {
    parts.push(
      `Add-ons: ${selection.addons
        .map((a) => `${a.name}${a.quantity > 1 ? ` x${a.quantity}` : ""}`)
        .join(", ")}`,
    )
  }
  if (selection.wraps.length > 0) {
    parts.push(`Gift wrap: ${selection.wraps.map((w) => w.name).join(", ")}`)
  }
  if (selection.cards.length > 0) {
    parts.push(
      `Greeting cards: ${selection.cards
        .map((c) => `${c.name}${c.message ? ` — \u201C${c.message}\u201D` : ""}`)
        .join(", ")}`,
    )
  }
  const meta: string[] = []
  if (selection.messageFrom) meta.push(`From: ${selection.messageFrom}`)
  if (selection.messageTo) meta.push(`To: ${selection.messageTo}`)
  if (selection.messageNote) meta.push(`Note: ${selection.messageNote}`)
  if (meta.length > 0) parts.push(meta.join(" | "))
  return parts.join(" || ")
}
