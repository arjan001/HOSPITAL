import { useEffect, useRef, useState, useCallback } from "react"
import DailyIframe, { type DailyCall, type DailyEventObjectParticipant } from "@daily-co/daily-js"
import {
  Mic, MicOff, Video as VideoOn, VideoOff, MonitorUp, MessageSquare, X,
  Settings, Users, Loader2, AlertTriangle,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORG = "#F97316"

export type DailyCallProps = {
  /** Room name (slug). Both participants joining the same room name connect to each other. */
  roomName: string
  /** Display name shown to the other participant. */
  userName: string
  /** Mark this participant as the call owner (e.g. doctor in a consultation). */
  isOwner?: boolean
  /** Called when the user clicks Leave / Close. */
  onLeave: () => void
  /** Called when the user toggles to the chat-only view (Switch to chat). */
  onSwitchToChat?: () => void
  /** Optional title shown above the call (e.g. "Dr. Salad Khalif"). */
  title?: string
  /** Optional subtitle (e.g. "General Practice · Online"). */
  subtitle?: string
}

type ConfigState = "checking" | "ready" | "missing" | "error"

const apiBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${apiBase}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  })
  if (!r.ok) {
    const err = await r.text().catch(() => r.statusText)
    throw new Error(err || `Request failed (${r.status})`)
  }
  return (await r.json()) as T
}

export function DailyCall({
  roomName,
  userName,
  isOwner = false,
  onLeave,
  onSwitchToChat,
  title,
  subtitle,
}: DailyCallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const callRef = useRef<DailyCall | null>(null)

  const [config, setConfig] = useState<ConfigState>("checking")
  const [errMsg, setErrMsg] = useState("")
  const [joined, setJoined] = useState(false)
  const [audioOn, setAudioOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [participants, setParticipants] = useState(1)
  const [elapsed, setElapsed] = useState(0)

  const onLeaveRef = useRef(onLeave)
  useEffect(() => { onLeaveRef.current = onLeave }, [onLeave])

  // Boot: mint room + token, attach iframe, join.
  useEffect(() => {
    let cancelled = false
    setConfig("checking")
    setErrMsg("")
    setJoined(false)
    ;(async () => {
      try {
        const room = await postJson<{ url: string; name: string; configured?: boolean }>(
          "/video/room", { name: roomName },
        )
        if (cancelled) return
        if (!room.url) {
          setConfig("missing")
          setErrMsg("Video service is not configured. Please add DAILY_API_KEY.")
          return
        }
        let token = ""
        try {
          const t = await postJson<{ token: string }>(
            "/video/token", { room: room.name, userName, isOwner },
          )
          token = t.token
        } catch { /* token optional for public rooms */ }
        if (cancelled || !containerRef.current) return

        // Reuse a single iframe across re-renders.
        if (callRef.current) {
          try { await callRef.current.destroy() } catch { /* noop */ }
          callRef.current = null
        }
        const call = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: false,   // we render our own
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true,
          iframeStyle: {
            position: "absolute", top: "0", left: "0",
            width: "100%", height: "100%",
            border: "0", borderRadius: "0", background: "#0b0b0e",
          },
          theme: {
            colors: {
              accent: ACCENT_ORG,
              accentText: "#FFFFFF",
              background: "#0b0b0e",
              backgroundAccent: "#171924",
              baseText: "#FFFFFF",
              border: "rgba(255,255,255,0.12)",
              mainAreaBg: "#0b0b0e",
              mainAreaBgAccent: "#171924",
              mainAreaText: "#FFFFFF",
              supportiveText: "rgba(255,255,255,0.65)",
            },
          },
        })

        call
          .on("joined-meeting", () => setJoined(true))
          .on("left-meeting", () => onLeaveRef.current())
          .on("error", (e) => { setErrMsg(String((e as { errorMsg?: string })?.errorMsg ?? "Call error")); setConfig("error") })
          .on("participant-joined", () => setParticipants((p) => p + 1))
          .on("participant-left", () => setParticipants((p) => Math.max(1, p - 1)))
          .on("participant-updated", (e?: DailyEventObjectParticipant) => {
            if (e?.participant?.local) {
              setAudioOn(!!e.participant.audio)
              setVideoOn(!!e.participant.video)
              setSharing(!!e.participant.screen)
            }
          })

        callRef.current = call
        await call.join({ url: room.url, token: token || undefined, userName })
        setConfig("ready")
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : "Could not start the call"
        setErrMsg(msg)
        setConfig(/configured/i.test(msg) ? "missing" : "error")
      }
    })()

    return () => {
      cancelled = true
      const call = callRef.current
      callRef.current = null
      if (call) {
        try { call.leave().catch(() => {}) } catch { /* noop */ }
        try { call.destroy().catch(() => {}) } catch { /* noop */ }
      }
    }
  }, [roomName, userName, isOwner])

  // Call duration timer (starts on join).
  useEffect(() => {
    if (!joined) return
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(t)
  }, [joined])

  const toggleAudio = useCallback(async () => {
    const call = callRef.current
    if (!call) return
    const next = !audioOn
    setAudioOn(next)
    await call.setLocalAudio(next)
  }, [audioOn])

  const toggleVideo = useCallback(async () => {
    const call = callRef.current
    if (!call) return
    const next = !videoOn
    setVideoOn(next)
    await call.setLocalVideo(next)
  }, [videoOn])

  const toggleScreenShare = useCallback(async () => {
    const call = callRef.current
    if (!call) return
    if (sharing) await call.stopScreenShare()
    else await call.startScreenShare()
  }, [sharing])

  const handleLeave = useCallback(async () => {
    const call = callRef.current
    if (call) {
      try { await call.leave() } catch { /* noop */ }
    }
    onLeave()
  }, [onLeave])

  const fmt = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0")
    const s = String(sec % 60).padStart(2, "0")
    return `${m}:${s}`
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top header overlay */}
      <div className="relative z-10 flex items-start justify-between p-4 pointer-events-none">
        <div className="rounded-xl bg-white/95 backdrop-blur px-4 py-2.5 shadow-lg pointer-events-auto">
          <p className="font-bold text-sm" style={{ color: WINE }}>{title || "Live Consultation"}</p>
          <p className="text-xs flex items-center gap-1.5 mt-0.5 text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${joined ? "bg-green-500" : "bg-amber-400"}`} />
            {joined ? subtitle || `Connected · ${participants} in call` : "Connecting…"}
          </p>
        </div>
        {joined && (
          <div className="rounded-xl bg-white/95 backdrop-blur px-4 py-2.5 shadow-lg font-bold text-sm pointer-events-auto" style={{ color: WINE }}>
            {fmt(elapsed)}
          </div>
        )}
      </div>

      {/* Center status while bootstrapping the SDK. Once `config === "ready"`,
          Daily's own prejoin lobby is visible and interactive — don't cover it. */}
      {config !== "ready" && (
        <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur rounded-2xl px-6 py-5 shadow-2xl max-w-sm text-center pointer-events-auto">
            {config === "missing" ? (
              <>
                <AlertTriangle className="h-7 w-7 mx-auto mb-2" style={{ color: ACCENT_RED }} />
                <p className="font-bold text-sm" style={{ color: WINE }}>Video service unavailable</p>
                <p className="text-xs text-gray-600 mt-1.5">{errMsg}</p>
                <button
                  onClick={onLeave}
                  className="mt-4 h-9 px-4 rounded-full text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})` }}
                >
                  Close
                </button>
              </>
            ) : config === "error" ? (
              <>
                <AlertTriangle className="h-7 w-7 mx-auto mb-2" style={{ color: ACCENT_RED }} />
                <p className="font-bold text-sm" style={{ color: WINE }}>Couldn't start the call</p>
                <p className="text-xs text-gray-600 mt-1.5">{errMsg}</p>
                <button
                  onClick={onLeave}
                  className="mt-4 h-9 px-4 rounded-full text-xs font-semibold text-white"
                  style={{ background: ACCENT_RED }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <Loader2 className="h-7 w-7 mx-auto mb-2 animate-spin" style={{ color: ACCENT_ORG }} />
                <p className="font-bold text-sm" style={{ color: WINE }}>Connecting to your doctor…</p>
                <p className="text-xs text-gray-500 mt-1">Setting up secure HD video</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      {joined && (
        <div className="relative z-10 mt-auto pb-6 pt-3 flex items-center justify-center gap-2 sm:gap-3 pointer-events-none">
          <div className="flex items-center gap-2 sm:gap-3 bg-black/55 backdrop-blur-md rounded-full px-3 py-2 pointer-events-auto shadow-2xl border border-white/10">
            <CtrlBtn
              onClick={toggleAudio}
              active={audioOn}
              title={audioOn ? "Mute" : "Unmute"}
            >
              {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </CtrlBtn>
            <CtrlBtn
              onClick={toggleVideo}
              active={videoOn}
              title={videoOn ? "Stop video" : "Start video"}
            >
              {videoOn ? <VideoOn className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </CtrlBtn>
            <CtrlBtn
              onClick={toggleScreenShare}
              active={!sharing}
              highlight={sharing}
              title={sharing ? "Stop sharing" : "Share screen"}
            >
              <MonitorUp className="h-5 w-5" />
            </CtrlBtn>
            {onSwitchToChat && (
              <CtrlBtn onClick={onSwitchToChat} active title="Switch to chat">
                <MessageSquare className="h-5 w-5" />
              </CtrlBtn>
            )}
            <CtrlBtn
              onClick={() => callRef.current?.setShowParticipantsBar(true)}
              active
              title="Participants"
            >
              <Users className="h-5 w-5" />
            </CtrlBtn>
            <CtrlBtn
              onClick={() => {
                const call = callRef.current
                if (!call) return
                // Open Daily's built-in settings tray (devices, network).
                ;(call as unknown as { openDeviceSettings?: () => void }).openDeviceSettings?.()
              }}
              active
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </CtrlBtn>
            <button
              onClick={handleLeave}
              title="Leave call"
              className="h-12 px-5 rounded-full font-bold text-sm text-white inline-flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
              style={{ background: ACCENT_RED }}
            >
              <X className="h-4 w-4" /> End
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CtrlBtn({
  children, onClick, active, highlight, title,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  highlight?: boolean
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      style={{
        background: highlight
          ? `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})`
          : active
          ? "rgba(255,255,255,0.95)"
          : ACCENT_RED,
        color: highlight ? "#fff" : active ? WINE : "#fff",
      }}
    >
      {children}
    </button>
  )
}

export default DailyCall
