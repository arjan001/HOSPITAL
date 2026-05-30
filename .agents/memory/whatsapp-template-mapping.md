---
name: WhatsApp Meta template token mapping
description: How proactive patient WhatsApp picks template-vs-text, orders {{token}}→{{1..N}} params, and tracks delivery.
---

# WhatsApp Meta template send (api-nest)

Proactively-initiated patient texts (order/prescription status changes) can land
OUTSIDE Meta's 24h customer-service window, so they must send a Meta-approved
*template*, not free-form text.

## The token→positional-param contract
A Meta template body must mirror the admin template body (in `message-templates`
cmsStore) with each named `{{token}}` replaced by `{{1..N}}` in **left-to-right,
first-appearance order**. The runtime derives that exact order via
`orderedTemplateTokens(body)` (whatsapp.module.ts) and maps `vars[token]` into the
positional `variables` array in the same order.

**Why:** Meta templates only take ordered positional params; there is no reliable
per-template token→param map. First-appearance order is the single deterministic
rule both the registered template and the sender must agree on. If a template is
registered in a different param order, values will be swapped.

## Dispatch decision (pipeline.module.ts `dispatch`)
Sends a template ONLY when: `preferTemplate` is true AND the template has a
`whatsappTemplateName` AND `whatsapp.provider() === "meta"`. Otherwise (Twilio, no
template name, ad-hoc admin send by id) it falls back to a free-form text message
(valid within the 24h window). `PatientNotificationsService` sets
`preferTemplate: true`; the admin manual "send by id" path does not.

## Language
`normalizeLanguageCode` maps human labels + ISO/region codes to en/sw/so/ar
(default en). Per-patient language flows in via `NotifyOptions.language`, falling
back to `WHATSAPP_DEFAULT_LANGUAGE` then "en".

## Delivery visibility
Every real send is appended to the `communications.sent-log` cmsStore key
(capped 500). The public Meta status webhook
(`GET/POST /api/v2/notifications/whatsapp/webhook`, env
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`) folds callbacks into that log via
`applyStatusUpdate`, advancing rows sent→delivered→read/failed by provider
message id. Webhook is intentionally unguarded (Meta authenticates via the
hub.verify_token handshake) and always 200s so Meta won't disable the sub.
