import { useEffect, useRef, useState } from "react"
import { AlertTriangle } from "lucide-react"

const WINE = "#3D0814"
const RED = "#B91C1C"
const ORANGE = "#F97316"

/**
 * Warns the patient before they navigate away from an ACTIVE consultation
 * (live chat or call). While `active` is true it:
 *  - intercepts in-app link clicks (capture phase) and shows a confirm modal;
 *  - arms `beforeunload` so a tab close / refresh is also guarded.
 *
 * On confirm it runs `onConfirmLeave` (to end the session server-side) and then
 * replays the original navigation by re-clicking the captured anchor, so wouter
 * resolves the base path exactly as it normally would. The capture listeners
 * self-skip during the replay via `bypassRef`.
 */
export function LeaveGuard({
  active,
  title = "End your consultation?",
  message = "You have an active session on this page. If you leave now, your consultation will end. Your conversation is always saved.",
  confirmLabel = "End & leave",
  onConfirmLeave,
}: {
  active: boolean
  title?: string
  message?: string
  confirmLabel?: string
  onConfirmLeave?: () => void
}) {
  const [pending, setPending] = useState<HTMLAnchorElement | null>(null)
  const bypassRef = useRef(false)

  useEffect(() => {
    if (!active) return

    const onClick = (e: MouseEvent) => {
      if (bypassRef.current) return
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute("href")
      if (!href) return
      const target = a.getAttribute("target")
      if (target && target !== "_self") return
      if (a.hasAttribute("download")) return
      // Ignore hashes, mail/tel, and links to other hosts (full external nav).
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return
      if (a.host && a.host !== window.location.host) return
      // Ignore navigations that don't change the page.
      if (a.href === window.location.href) return
      e.preventDefault()
      e.stopPropagation()
      setPending(a)
    }

    const onBefore = (e: BeforeUnloadEvent) => {
      if (bypassRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("beforeunload", onBefore)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("beforeunload", onBefore)
    }
  }, [active])

  if (!pending) return null

  const stay = () => setPending(null)
  const leave = () => {
    const a = pending
    setPending(null)
    onConfirmLeave?.()
    bypassRef.current = true
    a?.click()
    bypassRef.current = false
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) stay() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2.5 text-white" style={{ background: WINE }}>
          <span
            className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(249,115,22,0.18)" }}
          >
            <AlertTriangle className="h-4 w-4" style={{ color: ORANGE }} />
          </span>
          <p className="font-semibold text-sm">{title}</p>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button
            onClick={stay}
            className="text-xs font-semibold px-4 h-9 rounded-md hover:bg-secondary transition-colors"
            style={{ color: WINE }}
          >
            Stay on page
          </button>
          <button
            onClick={leave}
            className="text-xs font-semibold text-white px-4 h-9 rounded-md hover:opacity-90 transition-opacity"
            style={{ background: RED }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
