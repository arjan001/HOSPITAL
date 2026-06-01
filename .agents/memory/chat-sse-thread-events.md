---
name: Chat SSE thread events
description: Why client resets in the patient chat must key on consultationId change, not status==active
---

# Chat SSE `type:"thread"` events

The api-nest chat backend re-broadcasts `type:"thread"` SSE events with
`status:"active"` on routine operations (sendMessage, markRead,
ensureConsultation), not only when a brand-new consultation starts.

**Rule:** Any client-side reset that should happen "when a new consultation
begins" (clearing the ended banner, resetting the session timer, reloading the
message list) MUST be keyed on the thread's `consultationId` actually changing
— not on `status === "active"`.

**Why:** Keying on `status==="active"` fires on every routine active-thread
event, so during a normal live consultation the timer/overage would repeatedly
reset and messages would reload mid-session.

**How to apply:** Track the last seen `consultationId` in a ref (synced via a
useEffect on `thread?.consultationId`) and only run the reset when
`newCid && prevCid && newCid !== prevCid`. The `prevCid` non-null guard avoids
a false reset on first load. The funnel (speak-to-a-doctor) instead clears state
imperatively right after `startNewConsultation` succeeds.
