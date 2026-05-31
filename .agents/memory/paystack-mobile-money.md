---
name: Paystack M-Pesa / mobile-money quirks (KES)
description: Phone-format requirement and error-surfacing rule for the api-nest Paystack charge path.
---

Two hard-won facts about Paystack's KES mobile-money charge API
(`POST https://api.paystack.co/charge` with `mobile_money:{phone,provider}`):

1. **`mobile_money.phone` MUST be E.164 with a leading `+`.** A bare
   `254XXXXXXXXX` (or `07…`/`011…`) is rejected with
   `{"status":false,"message":"Invalid phone number format","type":"validation_error"}`.
   Only `+254XXXXXXXXX` is accepted. Verified empirically: `+254710000000`
   (Paystack's test success number) succeeds; the same digits without `+` fail.
   Store the bare `254…` form internally, but add `+` on the wire to Paystack.

2. **Surface Paystack 4xx as a 4xx, not a 5xx.** `AllExceptionsFilter` masks any
   status ≥500 to a generic "Internal server error". If the Paystack wrapper
   throws `BAD_GATEWAY` (502) for *every* upstream rejection, the real reason
   ("Invalid phone number format", "Declined…") never reaches the storefront —
   the modal just shows "Internal server error". Rule: map Paystack HTTP 4xx →
   `BAD_REQUEST` (400) so the real message passes through; keep genuine 5xx /
   transport (DNS/timeout) failures as 502 (those *should* read as a gateway
   outage). The storefront modal reads `data.error`/`data.hint`.

3. **The actionable decline reason lives in `data.message`, not the top-level
   `message`.** Paystack returns `{status:false, message:"Charge attempted",
   data:{status:"failed", message:"Declined. Please use the test mobile money
   number…"}}`. The top-level `message` is the useless generic "Charge attempted";
   the real reason ("Insufficient funds", "Request cancelled by user", test-mode
   decline) is in `data.message`. Always prefer `data.message || message` when
   surfacing an error, both in the non-2xx throw path and in the success-path
   message when the mapped status is `failed`/`cancelled`.

**Why:** a real customer report of "Internal server error" on M-Pesa checkout was
two stacked bugs — wrong phone format (every charge invalid) + the 502 mask
hiding the cause. In Paystack **test** mode only test numbers approve; a
real number returns "Charge attempted"/declined even with correct format — that
resolves on a live key.

**How to apply:** any new Paystack mobile-money call uses `+`-prefixed phone and
must not blanket-throw 5xx for validation rejections.
