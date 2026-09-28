import { ApiError } from "@/lib/api/client";
import type { TranslationKey } from ".";

export function invitationErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return "invite.error";
  switch (error.code) {
    case "INVITATIONS_NOT_CONFIGURED":
      return "invite.unconfigured";
    case "CONTRACTOR_EMAIL_EXISTS":
      return "invite.duplicate";
    case "CONTRACTOR_ACCOUNT_EXISTS":
      return "invite.exists";
    case "INVITATION_INVALID":
      return "activate.invalid";
    case "RATE_LIMIT_EXCEEDED":
      return "activate.rate";
    case "VALIDATION_ERROR":
      return "invite.validation";
    default:
      return "invite.error";
  }
}
