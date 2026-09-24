import { AuthorizationError, RateLimitError } from "../errors/app-error.server";
import { isTauriRequest } from "../auth/session.server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Process-local limiter for the MVP. It deliberately bounds bursts locally;
 * production must replace it with a shared Vercel/Redis compatible limiter.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
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
  if (isTauriRequest(request) || request.headers.get("authorization")?.startsWith("Bearer ")) return;
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins().has(origin)) {
    throw new AuthorizationError("CSRF_ORIGIN_REJECTED", "Origine de requete non autorisee.");
  }
}
