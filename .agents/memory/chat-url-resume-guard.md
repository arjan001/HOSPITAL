---
name: Chat consultation URL resume guard
description: Why /speak-to-a-doctor/:cid resume must be gated on real session state, not the URL alone
---

When a chat/consultation id lives in the URL for reload-resume, do NOT initialize
the chat screen from the URL alone, and do NOT call an `ensure*` (get-or-create)
endpoint on the strength of the URL.

**Why:** the patient chat thread is keyed on the server session, and the
ensure/get endpoints upsert an (empty) thread as a side effect — even GET
`/chat/me/messages` calls `ensureThread`. So trusting the URL would let anyone
deep-link `/speak-to-a-doctor/<anything>` straight into a live chat and message
doctors, skipping the concern/payment funnel.

**How to apply:** on mount with a URL id, first read existing messages; only
resume into chat when the session already has messages (a real prior
consultation). Otherwise strip the id from the URL and send them back through the
funnel. Show a brief "resuming…" state while the check runs so there's no flash
of the chat screen.

Related: the doctor "can't end session without an Rx or documented reason" guard
is intentionally client-side — `close` is shared by the patient (`closeMyThread`)
and the new-consultation reset, so making a reason mandatory server-side would
break those non-doctor flows. It's a trusted-admin business rule, not a security
boundary.
