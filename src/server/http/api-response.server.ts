import { AppError, type ErrorDetail } from "../errors/app-error.server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
    requestId: string;
  };
};

export function jsonResponse(body: unknown, requestId: string, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("x-request-id", requestId);
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function errorResponse(error: AppError, requestId: string) {
  const headers = new Headers();
  if (error.status === 429) {
    const retryAfter = error.details.find((detail) => detail.code === "RETRY_AFTER")?.message;
    if (retryAfter) headers.set("retry-after", retryAfter);
  }
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId,
    },
  };
  return jsonResponse(body, requestId, error.status, headers);
}
