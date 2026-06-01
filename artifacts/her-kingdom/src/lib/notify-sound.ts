"use client"

/**
 * Lightweight chat notification sounds.
 *
 * Uses the WebAudio API so we don't ship any audio asset. A short, pleasant
 * two-tone chime for incoming messages and a brighter three-tone alert when a
 * new patient starts a chat. All calls are best-effort: if the browser blocks
 * audio (autoplay policy before any gesture) we silently no-op.
 */

let _ctx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!_ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      _ctx = new AC()
    }
    return _ctx
  } catch {
    return null
  }
}

const STORAGE_KEY = "shaniidrx.chat.sound"

/** Whether chat sounds are enabled (default on). Persisted per browser. */
export function isChatSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
  }
}

/** Persist the user's chat-sound preference. */
export function setChatSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off")
  } catch {
    /* ignore */
  }
}

export type ChimeVariant = "message" | "newchat"

/**
 * Play a short notification chime. `message` = a new chat message arrived;
 * `newchat` = a new patient just started a conversation (brighter, longer).
 */
export function playChime(variant: ChimeVariant = "message"): void {
  if (!isChatSoundEnabled()) return
  const ac = ctx()
  if (!ac) return
  try {
    if (ac.state === "suspended") ac.resume().catch(() => {})
    const now = ac.currentTime
    const notes = variant === "newchat" ? [660, 880, 1180] : [880, 1320]
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const t0 = now + i * 0.12
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t0)
      osc.stop(t0 + 0.2)
    })
  } catch {
    /* best-effort */
  }
}
