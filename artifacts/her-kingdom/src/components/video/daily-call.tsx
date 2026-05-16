import { useEffect, useRef, useState, useCallback } from "react"
import DailyIframe, { type DailyCall, type DailyEventObjectParticipant } from "@daily-co/daily-js"
import {
  Mic, MicOff, Video as VideoOn, VideoOff, MonitorUp, MessageSquare, X,
  Settings, Users, Loader2, AlertTriangle,
} from "lucide-react"
import { SessionTimer } from "@/components/consultation/session-timer"
import {
  useConsultationSettings,
  formatOverageLabel,
  logOverageCharge,
  type ConsultationKind,
} from "@/lib/consultation-settings"
import { useCmsDoc } from "@/lib/cms-store"
import { INTEGRATIONS_DEFAULTS } from "@/components/admin/integrations"

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
  /** "video" (default) or "voice" — selects the duration window from
   *  the global Consultation settings. Pass `null` to disable the timer
   *  (e.g. internal staff-to-staff calls). */
  consultationKind?: ConsultationKind | null
  /** Patient display name (for admin live monitor). Defaults to userName. */
  patientName?: string
  /** Doctor display name (for admin live monitor). */
  doctorName?: string
  /** Short consultation topic (for admin live monitor). */
  topic?: string
}

type ConfigState = "checking" | "ready" | "missing" | "error" | "ended"

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
  consultationKind = "video",
  patientName,
  doctorName,
  topic,
}: DailyCallProps) {
  const [consultSettings] = useConsultationSettings()
  // Recording is gated by the admin Integrations → Video toggle. Default off so
  // accounts on Daily's free / starter plans don't 400 on room creation.
  const [integrations] = useCmsDoc("integrations", INTEGRATIONS_DEFAULTS)
  const recordingEnabled = !!integrations?.video?.recordingEnabled
  // Free window for this call kind, plus any overage extensions the user opts into.
  const baseDurationSec =
    consultationKind === "voice"
      ? consultSettings.videoDurationMin * 60
      : consultationKind === "video"
        ? consultSettings.videoDurationMin * 60
        : 0
  const [extensionsSec, setExtensionsSec] = useState(0)
  const effectiveMaxSec = baseDurationSec + extensionsSec
  const timerEnabled = !!consultationKind && baseDurationSec > 0
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
          "/video/room",
          {
            name: roomName,
            enableRecording: recordingEnabled,
            patientName: patientName || (isOwner ? undefined : userName),
            doctorName: doctorName || (isOwner ? userName : undefined),
            topic: topic || subtitle || title,
            mode: consultationKind === "voice" ? "voice" : "video",
          },
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
          // Daily expects `theme` shaped as { colors } OR { light, dark } —
          // a one-sided { dark } is rejected at runtime with
          // "property 'theme': unsupported theme configuration".
          // Our UI is dark-only, so we hand the same palette to both modes.
          theme: (() => {
            const colors = {
              accent: ACCENT_ORG,
              accentText: "#FFFFFF",
              background: "#0b0b0e",
              backgroundAccent: "#171924",
              baseText: "#FFFFFF",
              border: "#FFFFFF1F",
              mainAreaBg: "#0b0b0e",
              mainAreaBgAccent: "#171924",
              mainAreaText: "#FFFFFF",
              supportiveText: "#FFFFFFA6",
            }
            return { light: { colors }, dark: { colors } }
          })(),
        })

        call
          .on("joined-meeting", () => {
            setJoined(true)
            // Owners (e.g. doctor / pharmacist) auto-start cloud recording so
            // consultations are reviewable later — but ONLY when the admin
            // has turned recording on in Integrations → Video (their Daily
            // plan must support it). Failures are swallowed.
            if (isOwner && recordingEnabled) {
              try {
                ;(call as unknown as { startRecording?: () => Promise<unknown> }).startRecording?.()
                  ?.catch?.(() => {})
              } catch { /* noop */ }
            }
          })
          // DO NOT auto-navigate away on left-meeting — Daily fires this for
          // many reasons (user clicked the prejoin "Leave", connection dropped,
          // camera permission denied in iframe, etc.) and yanking the patient
          // off the page surprises them and loses the call context. Instead,
          // show an "ended" overlay so they explicitly tap Close.
          .on("left-meeting", () => {
            console.info("[daily] left-meeting")
            setJoined(false)
            setConfig("ended")
            if (!errMsg) setErrMsg("The call ended.")
          })
          .on("error", (e) => {
            const detail = (e as { errorMsg?: string; error?: { msg?: string } })
            const msg = detail?.errorMsg ?? detail?.error?.msg ?? "Call error"
            console.warn("[daily] error", e)
            setErrMsg(String(msg))
            setConfig("error")
          })
          // Friendly diagnostics for the two most common dev/iframe pitfalls:
          // camera/mic permission denied, or the meeting iframe was blocked.
          .on("camera-error" as never, (e: unknown) => {
            console.warn("[daily] camera-error", e)
            const msg = (e as { errorMsg?: string })?.errorMsg
              || "Camera or microphone access was blocked. Please allow access in your browser, then rejoin."
            setErrMsg(msg)
            setConfig("error")
          })
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

  // Billable timer: only runs once a SECOND participant is in the room —
  // i.e. the doctor has actually picked up. The patient sees "Waiting for
  // doctor…" until then and is not charged for connection time. Owners
  // (doctor side) see the timer immediately, since their join is "pickup".
  const doctorPresent = isOwner || participants > 1
  useEffect(() => {
    if (!joined || !doctorPresent) return
    const startMs = Date.now() - elapsed * 1000
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, doctorPresent])

  // Heartbeat so the admin live-monitor knows this room is still active.
  // Also flags `isOwner` so the server can mark the doctor as "joined" for
  // patients that haven't yet seen the participant-joined event.
  useEffect(() => {
    if (!joined) return
    const ping = () => {
      void fetch(`${apiBase}/api/video/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName, isOwner }),
        credentials: "include",
        keepalive: true,
      }).catch(() => {})
    }
    ping()
    const t = window.setInterval(ping, 20_000)
    return () => window.clearInterval(t)
  }, [joined, roomName, isOwner])

  // On unmount, tell the server to drop the session so the admin monitor
  // clears instead of waiting 90s for staleness. Use sendBeacon when the
  // page is unloading; fall back to keepalive fetch otherwise.
  useEffect(() => {
    return () => {
      const url = `${apiBase}/api/video/end`
      const payload = JSON.stringify({ name: roomName })
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }))
        } else {
          void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            credentials: "include",
            keepalive: true,
          }).catch(() => {})
        }
      } catch { /* noop */ }
    }
  }, [roomName])

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
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                joined && doctorPresent ? "bg-green-500" : joined ? "bg-amber-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {!joined
              ? "Connecting…"
              : !doctorPresent
                ? "Waiting for doctor to join…"
                : subtitle || `Connected · ${participants} in call`}
          </p>
        </div>
        {joined && doctorPresent && (
          <div className="rounded-xl bg-white/95 backdrop-blur px-4 py-2 shadow-lg pointer-events-auto flex items-center gap-2.5" style={{ color: WINE }}>
            <span className="font-bold text-sm tabular-nums">{fmt(elapsed)}</span>
            {timerEnabled && (
              <>
                <span className="w-px h-4 bg-black/10" />
                <SessionTimer
                  maxDurationSec={effectiveMaxSec}
                  elapsedSec={elapsed}
                  warnAtSecondsLeft={consultSettings.warnSecondsLeft}
                  overageLabel={formatOverageLabel(consultSettings)}
                  overageBlockMin={consultSettings.overageBlockMin}
                  onConfirmOverage={() => {
                    const extra = consultSettings.overageBlockMin * 60
                    setExtensionsSec((e) => e + extra)
                    logOverageCharge({
                      kind: consultationKind || "video",
                      roomOrThread: roomName,
                      blockMin: consultSettings.overageBlockMin,
                      amountKes: consultSettings.overageRateKes,
                      patient: userName,
                    })
                  }}
                  onEnd={() => { void handleLeave() }}
                  compact
                />
              </>
            )}
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
                <p className="text-[11px] text-gray-500 mt-2">
                  Tip: video needs camera and microphone permission. In the workspace preview,
                  open this page in a new tab to grant access.
                </p>
                <button
                  onClick={onLeave}
                  className="mt-4 h-9 px-4 rounded-full text-xs font-semibold text-white"
                  style={{ background: ACCENT_RED }}
                >
                  Close
                </button>
              </>
            ) : config === "ended" ? (
              <>
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ background: "rgba(61,8,20,0.08)", color: WINE }}
                >
                  <X className="h-5 w-5" />
                </div>
                <p className="font-bold text-sm" style={{ color: WINE }}>Call ended</p>
                <p className="text-xs text-gray-600 mt-1.5">{errMsg || "The call has ended."}</p>
                <button
                  onClick={onLeave}
                  className="mt-4 h-9 px-4 rounded-full text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})` }}
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
