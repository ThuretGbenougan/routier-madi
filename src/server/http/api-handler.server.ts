import { ZodError } from "zod";
import { AppError, ValidationError } from "../errors/app-error.server";
import { errorResponse } from "./api-response.server";
import { corsHeaders } from "../security/request-security.server";

type ApiContext = {
  request: Request;
  requestId: string;
};

function requestIdFrom(request: Request) {
  const provided = request.headers.get("x-request-id");
  return provided && /^[A-Za-z0-9_-]{8,128}$/.test(provided) ? provided : crypto.randomUUID();
}

function zodToValidationError(error: ZodError) {
  return new ValidationError(
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    })),
  );
}

export async function handleApiRoute(
  request: Request,
  handler: (context: ApiContext) => Promise<Response>,
) {
  const requestId = requestIdFrom(request);
  try {
    const response = await handler({ request, requestId });
    response.headers.set("x-request-id", requestId);
    for (const [key, value] of corsHeaders(request)) response.headers.set(key, value);
    return response;
  } catch (error) {
    const appError = error instanceof ZodError ? zodToValidationError(error) : error;
    if (appError instanceof AppError) {
      const response = errorResponse(appError, requestId);
      for (const [key, value] of corsHeaders(request)) response.headers.set(key, value);
      return response;
    }

    console.error(
      JSON.stringify({
        level: "error",
        event: "api_unhandled_error",
        requestId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    const response = errorResponse(
      new AppError("INTERNAL_ERROR", 500, "Une erreur interne est survenue."),
      requestId,
    );
    for (const [key, value] of corsHeaders(request)) response.headers.set(key, value);
    return response;
  }
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ValidationError([
      { path: "body", message: "Le corps JSON est requis.", code: "INVALID_CONTENT_TYPE" },
    ]);
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError([
      { path: "body", message: "Le JSON est invalide.", code: "INVALID_JSON" },
    ]);
  }
}
