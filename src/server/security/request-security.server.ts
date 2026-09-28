import { AuthorizationError, RateLimitError } from "../errors/app-error.server";
import { isTauriRequest } from "../auth/session.server";

import { db } from "../db.server";
import { createHash } from "node:crypto";

/** Fixed-window counters shared by every server instance. */
export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const start = Math.floor(Date.now() / windowMs) * windowMs;
  const bucketKey = `${createHash("sha256").update(key).digest("hex")}:${start}`;
  const bucket = await db.rateBucket.upsert({
    where: { key: bucketKey },
    create: { key: bucketKey, count: 1, expiresAt: new Date(start + windowMs) },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > limit)
    throw new RateLimitError(Math.max(1, Math.ceil((start + windowMs - Date.now()) / 1000)));
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function allowedOrigins() {
  const configured = [process.env["PUBLIC_APP_URL"], process.env["TAURI_DEV_ORIGIN"]]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ""));
  return new Set([
    "https://routier-madi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8081",
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
    ...configured,
  ]);
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().has(origin)) return new Headers({ vary: "origin" });
  return new Headers({
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type, x-client-platform, x-request-id",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "600",
    vary: "origin",
  });
}

export function preflightResponse(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Cookie-authenticated mutations must come from the configured application. */
export function requireTrustedMutationOrigin(request: Request) {
  if (isTauriRequest(request) || request.headers.get("authorization")?.startsWith("Bearer "))
    return;
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().has(origin)) {
    throw new AuthorizationError("CSRF_ORIGIN_REJECTED", "Origine de requete non autorisee.");
  }
}
