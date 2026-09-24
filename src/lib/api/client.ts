import { isTauri } from "@tauri-apps/api/core";

const configuredApiUrl = import.meta.env["VITE_API_URL"]?.trim();

export const apiBaseUrl = configuredApiUrl?.replace(/\/$/, "") ?? "";

/**
 * Builds a URL for the centralized HTTP API.
 *
 * An empty VITE_API_URL deliberately uses a same-origin relative URL for the
 * web application. The Tauri distribution must set VITE_API_URL because it
 * has no embedded application backend.
 */
export function apiUrl(path: `/${string}`): string {
  return `${apiBaseUrl}${path}`;
}

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: Array<{ path?: string; message: string; code?: string }>;
    requestId: string;
  };
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorBody["error"]["details"];
  readonly requestId?: string;
  readonly retryAfter: number | undefined;

  constructor(status: number, body: ApiErrorBody, retryAfter?: number) {
    super(body.error.message);
    this.name = "ApiError";
    this.code = body.error.code;
    this.status = status;
    this.details = body.error.details ?? [];
    this.requestId = body.error.requestId;
    this.retryAfter = retryAfter;
  }
}

let tauriAccessToken: string | null = null;

/** Tauri keeps its opaque access token only in memory. */
export function setTauriAccessToken(token: string | null) {
  tauriAccessToken = token;
}

export function getTauriAccessToken() {
  return tauriAccessToken;
}

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
};

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

function normalizeError(status: number, body: unknown, response: Response) {
  if (body && typeof body === "object" && "error" in body) {
    return new ApiError(
      status,
      body as ApiErrorBody,
      Number(response.headers.get("retry-after") ?? undefined) || undefined,
    );
  }
  return new ApiError(status, {
    error: {
      code: status === 401 ? "AUTH_SESSION_EXPIRED" : status === 429 ? "RATE_LIMIT_EXCEEDED" : "NETWORK_ERROR",
      message: "La requete n'a pas pu etre traitee.",
      details: [],
      requestId: response.headers.get("x-request-id") ?? "unknown",
    },
  });
}

/**
 * Unique transport HTTP for browser and Tauri. Feature clients must use this
 * function instead of invoking fetch directly.
 */
export async function apiRequest<T>(path: `/${string}`, options: ApiRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15_000;
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  const tauri = typeof window !== "undefined" && isTauri();
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  headers.set("x-request-id", requestId());
  if (tauri) headers.set("x-client-platform", "tauri");
  if (tauri && tauriAccessToken) headers.set("authorization", `Bearer ${tauriAccessToken}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData || options.body instanceof Blob || typeof options.body === "string") {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }

  try {
    const { timeoutMs: _timeoutMs, body: _body, headers: _headers, ...requestOptions } = options;
    const response = await fetch(apiUrl(path), {
      ...requestOptions,
      ...(body ? { body } : {}),
      headers,
      signal: controller.signal,
      credentials: tauri ? "omit" : "include",
    });
    const payload = isJsonResponse(response) ? await response.json() : undefined;
    if (!response.ok) throw normalizeError(response.status, payload, response);
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && tauri) setTauriAccessToken(null);
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, {
        error: { code: "REQUEST_TIMEOUT", message: "La requete a expire.", details: [], requestId: "client" },
      });
    }
    throw new ApiError(0, {
      error: { code: "NETWORK_ERROR", message: "Le serveur est inaccessible.", details: [], requestId: "client" },
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
