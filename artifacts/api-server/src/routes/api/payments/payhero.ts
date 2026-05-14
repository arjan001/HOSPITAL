import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../../../lib/logger.js";

const router: IRouter = Router();

/* ───────────────────────────────────────────────────────────────────
   PayHero STK Push integration (M-Pesa)

   Routes mounted at /api/payments/payhero:
     POST /stk        — initiate STK push for an order
     GET  /status     — poll payment status by orderNumber
     POST /callback   — PayHero webhook (server-to-server)

   Required env (already provisioned):
     PAYHERO_BASIC_AUTH_TOKEN   — full "Basic xxxxx==" header value
     PAYHERO_CHANNEL_ID         — STK channel id (numeric)
     PAYHERO_CALLBACK_URL       — public callback URL

   Storage: in-memory map keyed by external_reference (= orderNumber).
   Swap to Drizzle/Postgres in one place when ready.
─────────────────────────────────────────────────────────────────── */

type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

interface PaymentRecord {
  orderNumber: string;
  status: PaymentStatus;
  amount: number;
  phone: string;
  customerName?: string;
  mpesaReceipt?: string;
  message?: string;
  /** PayHero CheckoutRequestID-equivalent — used to actively poll their API. */
  reference?: string;
  createdAt: number;
  updatedAt: number;
  /** Last time we actively queried PayHero (rate-limit guard). */
  lastQueryAt?: number;
  rawCallback?: unknown;
}

const payments = new Map<string, PaymentRecord>();

const PAYHERO_API_BASE = "https://backend.payhero.co.ke/api/v2";

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

function basicAuthHeader(): string {
  // Prefer the pre-built header, fall back to building from username/password.
  const token = process.env.PAYHERO_BASIC_AUTH_TOKEN;
  if (token) return token.startsWith("Basic ") ? token : `Basic ${token}`;
  const u = process.env.PAYHERO_API_USERNAME;
  const p = process.env.PAYHERO_API_PASSWORD;
  if (!u || !p) {
    throw new Error(
      "PayHero credentials missing — set PAYHERO_BASIC_AUTH_TOKEN or PAYHERO_API_USERNAME/PASSWORD",
    );
  }
  return `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
}

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

/* ── POST /stk ───────────────────────────────────────────────────── */
router.post("/stk", async (req: Request, res: Response) => {
  try {
    const { orderNumber, phone, amount, customerName } = req.body ?? {};
    if (!orderNumber || !phone || !amount) {
      return res
        .status(400)
        .json({ success: false, error: "orderNumber, phone and amount are required" });
    }

    const channelId = Number(envOrThrow("PAYHERO_CHANNEL_ID"));
    const callbackUrl = envOrThrow("PAYHERO_CALLBACK_URL");
    const auth = basicAuthHeader();
    const phoneNorm = normalizePhone(String(phone));
    const amt = Math.max(1, Math.round(Number(amount)));

    const payload = {
      amount: amt,
      phone_number: phoneNorm,
      channel_id: channelId,
      provider: "m-pesa",
      external_reference: String(orderNumber),
      callback_url: callbackUrl,
      ...(customerName ? { customer_name: String(customerName) } : {}),
    };

    const r = await fetch(`${PAYHERO_API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;

    if (!r.ok) {
      logger.warn({ status: r.status, data }, "PayHero STK push rejected");
      return res.status(502).json({
        success: false,
        error: (data.error as string) || (data.message as string) || "PayHero rejected the request",
      });
    }

    const now = Date.now();
    const reference =
      (data.reference as string) ||
      (data.CheckoutRequestID as string) ||
      ((data.data as Record<string, unknown> | undefined)?.reference as string) ||
      undefined;
    payments.set(String(orderNumber), {
      orderNumber: String(orderNumber),
      status: "pending",
      amount: amt,
      phone: phoneNorm,
      customerName: customerName ? String(customerName) : undefined,
      reference,
      createdAt: now,
      updatedAt: now,
    });

    return res.json({ success: true, status: "pending", payhero: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "PayHero STK push failed");
    return res.status(500).json({ success: false, error: message });
  }
});

/* Actively query PayHero for a record we initiated. Used as a fallback
   when their webhook can't reach us (e.g. local dev) so the storefront
   can still detect cancel / no-PIN within seconds. */
async function refreshFromPayHero(rec: PaymentRecord): Promise<PaymentRecord> {
  if (rec.status !== "pending" || !rec.reference) return rec;
  // Rate-limit: don't hit PayHero more than once every 3s per order.
  if (rec.lastQueryAt && Date.now() - rec.lastQueryAt < 3000) return rec;

  try {
    const auth = basicAuthHeader();
    const url = `${PAYHERO_API_BASE}/transaction-status?reference=${encodeURIComponent(rec.reference)}`;
    const r = await fetch(url, { headers: { Authorization: auth } });
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    rec.lastQueryAt = Date.now();
    if (!r.ok) return rec;

    const rawStatus = String(data.status ?? "").toUpperCase();
    const resultCode = Number(data.ResultCode ?? data.result_code ?? -1);
    let status: PaymentStatus = "pending";
    if (rawStatus === "SUCCESS" || resultCode === 0) status = "success";
    else if (
      rawStatus === "CANCELLED" ||
      rawStatus === "CANCELED" ||
      resultCode === 1032
    ) status = "cancelled";
    else if (rawStatus === "FAILED" || (resultCode > 0 && resultCode !== 1037)) status = "failed";
    // 1037 = "DS timeout user cannot be reached" — keep as pending until our own timeout.

    if (status !== "pending") {
      rec.status = status;
      rec.message =
        (data.ResultDesc as string) ||
        (data.message as string) ||
        rec.message;
      rec.mpesaReceipt =
        (data.MpesaReceiptNumber as string) ||
        (data.mpesa_receipt as string) ||
        rec.mpesaReceipt;
      rec.updatedAt = Date.now();
      payments.set(rec.orderNumber, rec);
    }
  } catch (err) {
    logger.warn({ err, orderNumber: rec.orderNumber }, "PayHero status query failed");
  }
  return rec;
}

/* ── GET /status?orderNumber=… ───────────────────────────────────── */
router.get("/status", async (req: Request, res: Response) => {
  const orderNumber = String(req.query.orderNumber || "");
  if (!orderNumber) {
    return res.status(400).json({ status: "unknown", error: "orderNumber required" });
  }
  let rec = payments.get(orderNumber);
  if (!rec) {
    return res.json({ status: "pending" });
  }
  rec = await refreshFromPayHero(rec);
  return res.json({
    status: rec.status,
    mpesaReceipt: rec.mpesaReceipt,
    phone: rec.phone,
    amount: rec.amount,
    message: rec.message,
  });
});

/* ── POST /callback ──────────────────────────────────────────────────
   PayHero callback shape (relevant fields):
   {
     "status": "Success" | "Failed" | "Cancelled",
     "response": {
       "ResultCode": 0,
       "ResultDesc": "...",
       "MpesaReceiptNumber": "...",
       "Phone": "2547...",
       "ExternalReference": "ORDER-123",
       "Amount": 100,
       ...
     }
   }
─────────────────────────────────────────────────────────────────── */
router.post("/callback", (req: Request, res: Response) => {
  try {
    /* ── Authenticity checks ──
       PayHero does not document a stable webhook signature today, so we
       defend with two layers:
         1. Optional shared secret in the callback URL (?t=…) compared
            against PAYHERO_CALLBACK_TOKEN — set this in the PayHero
            dashboard's callback URL when ready.
         2. Only mutate payments we initiated ourselves (an `external_reference`
            we have a pending record for). Unknown orders are logged and
            ignored so a forged payload cannot mark arbitrary orders paid. */
    const expectedToken = process.env.PAYHERO_CALLBACK_TOKEN;
    if (expectedToken) {
      const provided = String(req.query.t ?? req.headers["x-payhero-token"] ?? "");
      if (provided !== expectedToken) {
        logger.warn({ ip: req.ip }, "PayHero callback rejected — bad token");
        return res.status(401).json({ ok: false });
      }
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const response = (body.response ?? body) as Record<string, unknown>;

    const orderNumber = String(
      response.ExternalReference ||
        response.external_reference ||
        body.external_reference ||
        "",
    );
    if (!orderNumber) {
      logger.warn({ body }, "PayHero callback missing external_reference");
      return res.json({ ok: true });
    }

    const existing = payments.get(orderNumber);
    if (!existing) {
      // Refuse to manufacture a record for an order we never initiated —
      // this blocks forged callbacks targeting arbitrary orderNumbers.
      logger.warn(
        { orderNumber, ip: req.ip },
        "PayHero callback for unknown order — ignoring",
      );
      return res.status(202).json({ ok: true, ignored: true });
    }

    const resultCode = Number(response.ResultCode ?? response.result_code ?? -1);
    const rawStatus = String(body.status || response.Status || "").toLowerCase();
    let status: PaymentStatus = "pending";
    if (resultCode === 0 || rawStatus === "success") status = "success";
    else if (rawStatus === "cancelled" || resultCode === 1032) status = "cancelled";
    else status = "failed";

    const now = Date.now();
    payments.set(orderNumber, {
      ...existing,
      status,
      mpesaReceipt: (response.MpesaReceiptNumber as string) || existing?.mpesaReceipt,
      message: (response.ResultDesc as string) || (body.status as string) || existing?.message,
      updatedAt: now,
      rawCallback: body,
    });

    logger.info({ orderNumber, status, resultCode }, "PayHero callback received");
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PayHero callback handler failed");
    return res.status(500).json({ ok: false });
  }
});

export default router;
