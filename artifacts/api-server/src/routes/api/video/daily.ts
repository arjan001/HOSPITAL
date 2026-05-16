import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../../../lib/logger.js";

const router: IRouter = Router();

const API_BASE = "https://api.daily.co/v1";
const ONE_HOUR = 60 * 60;

type Cached = { url: string; name: string; expiresAt: number };
const roomCache = new Map<string, Cached>();

function dailyKey(): string | null {
  return process.env.DAILY_API_KEY?.trim() || null;
}

function dailyHeaders() {
  const key = dailyKey();
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function isExpired(c: Cached): boolean {
  return Date.now() / 1000 > c.expiresAt;
}

function safeRoomName(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `room-${Date.now()}`
  );
}

router.post("/room", async (req: Request, res: Response) => {
  const headers = dailyHeaders();
  if (!headers) {
    return res.status(503).json({
      error: "Video service not configured. Add DAILY_API_KEY to enable consultations.",
      configured: false,
    });
  }

  const body = (req.body ?? {}) as {
    name?: string;
    expiresInSeconds?: number;
    enableChat?: boolean;
    enableScreenshare?: boolean;
    enableRecording?: boolean;
  };

  const name = safeRoomName(body.name || `consult-${Date.now()}`);
  const ttl = Math.max(60, Math.min(body.expiresInSeconds ?? 2 * ONE_HOUR, 6 * ONE_HOUR));
  const exp = Math.floor(Date.now() / 1000) + ttl;

  // Reuse a non-expired cached room with the same name.
  const cached = roomCache.get(name);
  if (cached && !isExpired(cached)) {
    return res.json({ name: cached.name, url: cached.url, expiresAt: cached.expiresAt, configured: true });
  }

  try {
    // Try to fetch an existing room first; Daily returns 404 if missing.
    let url: string | null = null;
    const getResp = await fetch(`${API_BASE}/rooms/${encodeURIComponent(name)}`, { headers });
    if (getResp.ok) {
      const data = (await getResp.json()) as { url?: string };
      url = data.url ?? null;
    }

    if (!url) {
      const createResp = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          privacy: "public",
          properties: {
            exp,
            enable_chat: body.enableChat ?? true,
            enable_screenshare: body.enableScreenshare ?? true,
            enable_recording: body.enableRecording ? "cloud" : false,
            start_video_off: false,
            start_audio_off: false,
            enable_prejoin_ui: true,
            enable_network_ui: true,
            enable_people_ui: true,
            enable_pip_ui: true,
            lang: "en",
          },
        }),
      });
      if (!createResp.ok) {
        const errText = await createResp.text();
        logger.error({ status: createResp.status, body: errText }, "daily.create_room_failed");
        return res.status(502).json({ error: "Could not create video room.", detail: errText });
      }
      const created = (await createResp.json()) as { url: string };
      url = created.url;
    }

    roomCache.set(name, { name, url: url!, expiresAt: exp });
    return res.json({ name, url, expiresAt: exp, configured: true });
  } catch (err) {
    logger.error({ err }, "daily.room_unexpected_error");
    return res.status(500).json({ error: "Unexpected error creating video room." });
  }
});

router.post("/token", async (req: Request, res: Response) => {
  const headers = dailyHeaders();
  if (!headers) {
    return res.status(503).json({ error: "Video service not configured.", configured: false });
  }

  const body = (req.body ?? {}) as {
    room: string;
    userName?: string;
    isOwner?: boolean;
    expiresInSeconds?: number;
  };
  if (!body.room) return res.status(400).json({ error: "room is required" });

  try {
    const tokenResp = await fetch(`${API_BASE}/meeting-tokens`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        properties: {
          room_name: safeRoomName(body.room),
          user_name: (body.userName || "Guest").slice(0, 60),
          is_owner: !!body.isOwner,
          exp: Math.floor(Date.now() / 1000) + Math.max(60, Math.min(body.expiresInSeconds ?? 2 * ONE_HOUR, 6 * ONE_HOUR)),
        },
      }),
    });
    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      logger.error({ status: tokenResp.status, body: errText }, "daily.token_failed");
      return res.status(502).json({ error: "Could not mint meeting token.", detail: errText });
    }
    const data = (await tokenResp.json()) as { token: string };
    return res.json({ token: data.token, configured: true });
  } catch (err) {
    logger.error({ err }, "daily.token_unexpected_error");
    return res.status(500).json({ error: "Unexpected error minting token." });
  }
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({ configured: !!dailyKey() });
});

export default router;
