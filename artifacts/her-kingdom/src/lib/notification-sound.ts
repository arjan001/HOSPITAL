/**
 * notification-sound.ts
 * Web-Audio-API bell tones for admin notifications.
 * No external files needed — tones are synthesised at runtime.
 *
 * Usage:
 *   import { NotificationSound } from "@/lib/notification-sound"
 *   NotificationSound.play("order")
 */

export type NotificationModule = "order" | "prescription" | "chat" | "consultation" | "general"

/** Per-module tone configuration */
const TONE_CONFIG: Record<NotificationModule, { freq: number; duration: number; type: OscillatorType }> = {
  order:        { freq: 880,  duration: 0.35, type: "sine" },
  prescription: { freq: 660,  duration: 0.40, type: "sine" },
  chat:         { freq: 1047, duration: 0.25, type: "sine" },
  consultation: { freq: 784,  duration: 0.45, type: "sine" },
  general:      { freq: 523,  duration: 0.30, type: "sine" },
}

/** Per-module badge colour */
export const MODULE_BADGE_COLOR: Record<NotificationModule, string> = {
  order:        "#F97316",
  prescription: "#B91C1C",
  chat:         "#10B981",
  consultation: "#6366F1",
  general:      "#6B7280",
}

let ctx: AudioContext | null = null
let muted = false
let lastPlayed: Record<string, number> = {}
const DEBOUNCE_MS = 3000

function getCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext()
  }
  return ctx
}

function chime(freq: number, duration: number, type: OscillatorType = "sine") {
  try {
    const ac = getCtx()
    if (ac.state === "suspended") {
      void ac.resume()
    }
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ac.currentTime)
    // Fade in then out for a bell-like envelope
    gain.gain.setValueAtTime(0, ac.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ac.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
    osc.start(ac.currentTime)
    osc.stop(ac.currentTime + duration)
  } catch {
    // AudioContext not available (SSR or blocked)
  }
}

export const NotificationSound = {
  /**
   * Play a notification tone for a given module.
   * Debounces per module to avoid rapid-fire sounds.
   */
  play(module: NotificationModule = "general"): void {
    if (muted) return
    const now = Date.now()
    if ((lastPlayed[module] ?? 0) + DEBOUNCE_MS > now) return
    lastPlayed[module] = now
    const cfg = TONE_CONFIG[module]
    chime(cfg.freq, cfg.duration, cfg.type)
    // Double chime for important alerts
    if (module === "order" || module === "consultation") {
      setTimeout(() => chime(cfg.freq * 1.25, cfg.duration * 0.8, cfg.type), 200)
    }
  },

  mute(): void { muted = true },
  unmute(): void { muted = false },
  isMuted(): boolean { return muted },
  toggleMute(): void { muted = !muted },
}

/**
 * React hook — plays a sound whenever `count` increases from the previous
 * render value.
 */
import { useEffect, useRef } from "react"
export function useNotificationSound(count: number, module: NotificationModule = "general") {
  const prev = useRef(count)
  useEffect(() => {
    if (count > prev.current) {
      NotificationSound.play(module)
    }
    prev.current = count
  }, [count, module])
}
