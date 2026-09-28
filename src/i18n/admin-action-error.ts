import type { TranslationKey } from "./index";

export function adminActionErrorKey(error: {
  code: string;
  details?: Array<{ code?: string }>;
}): TranslationKey {
  switch (error.code) {
    case "REQUEST_INVALID_TRANSITION":
      return "admin.detail.actionForbidden";
    case "REQUEST_ALREADY_ASSIGNED":
      return "admin.action.assignmentUnavailable";
    case "REQUEST_CONCURRENT_UPDATE":
      return "admin.action.concurrentUpdate";
    case "AUTH_SESSION_EXPIRED":
    case "AUTH_INVALID_CREDENTIALS":
      return "admin.action.sessionExpired";
    case "AUTH_FORBIDDEN":
    case "CSRF_ORIGIN_REJECTED":
      return "admin.action.accessDenied";
    case "RATE_LIMIT_EXCEEDED":
      return "admin.action.rateLimited";
    case "VALIDATION_ERROR":
      return error.details?.some((detail) => detail.code === "CONTRACTOR_NOT_FOUND")
        ? "admin.action.contractorUnavailable"
        : "work.actionError";
    default:
      return "work.actionError";
  }
}
