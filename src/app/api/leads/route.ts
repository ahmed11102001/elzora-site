import { NextResponse } from "next/server";
import {
  MAX_BODY_BYTES,
  clientIp,
  isSameOrigin,
  noStore,
  rateLimitKey,
  submitDeps,
  submitLead,
} from "@/lib/leads/server";

// POST /api/leads: the trip planner's only write endpoint. All logic lives in src/lib/leads/submit.ts.
export async function POST(request: Request) {
  const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
    NextResponse.json(body, { status, headers: { ...noStore, ...headers } });

  if (!isSameOrigin(request)) return json({ ok: false, error: "rejected" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return json({ ok: false, error: "invalid_payload" }, 415);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: "invalid_payload" }, 413);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: "invalid_payload" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const ip = clientIp(request.headers);
  const result = await submitLead(
    { body, rateLimitKey: rateLimitKey("leads", ip), remoteIp: ip },
    submitDeps(),
  );

  const headers: Record<string, string> = {};
  if (result.status === 429) headers["Retry-After"] = String(result.body.retryAfterSeconds);
  return json(result.body, result.status, headers);
}
