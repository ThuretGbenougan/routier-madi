import { UserRole } from "../../generated/prisma/client";
import { AuthorizationError, NotFoundError } from "../errors/app-error.server";
import type { AuthPrincipal } from "../auth/session.server";

export function requireAdmin(principal: AuthPrincipal) {
  if (principal.role !== UserRole.ADMIN) throw new AuthorizationError();
  return principal;
}

export function requireContractor(principal: AuthPrincipal) {
  if (principal.role !== UserRole.CONTRACTOR || !principal.contractorId) {
    throw new AuthorizationError("CONTRACTOR_ACCESS_DENIED", "Acces entreprise non autorise.");
  }
  return principal;
}

export function requireRequestAccess(principal: AuthPrincipal, contractorId: string | null) {
  if (principal.role === UserRole.ADMIN) return;
  if (
    principal.role !== UserRole.CONTRACTOR ||
    !principal.contractorId ||
    principal.contractorId !== contractorId
  ) {
    throw new NotFoundError();
  }
}
