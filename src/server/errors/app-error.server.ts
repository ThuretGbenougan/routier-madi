export type ErrorDetail = {
  path?: string;
  message: string;
  code?: string;
};

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[]) {
    super("VALIDATION_ERROR", 422, "La requete est invalide.", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(code = "AUTH_INVALID_CREDENTIALS", message = "Identifiants invalides.") {
    super(code, 401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(code = "AUTH_FORBIDDEN", message = "Acces non autorise.") {
    super(code, 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = "REQUEST_NOT_FOUND", message = "Ressource introuvable.") {
    super(code, 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, 409, message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super("RATE_LIMIT_EXCEEDED", 429, "Trop de requetes. Reessayez plus tard.", [
      { path: "retryAfter", message: String(retryAfterSeconds), code: "RETRY_AFTER" },
    ]);
  }
}

export class ExternalServiceError extends AppError {
  constructor(code: "ML_SERVICE_UNAVAILABLE" | "STORAGE_SERVICE_UNAVAILABLE", message: string) {
    super(code, 503, message);
  }
}
