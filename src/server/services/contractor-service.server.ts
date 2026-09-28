import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { db } from "../db.server";
import { requireAdmin } from "../authorization/guards.server";
import type { AuthPrincipal } from "../auth/session.server";
import { hashPassword } from "../auth/auth-service.server";
import { ConflictError, NotFoundError, RateLimitError } from "../errors/app-error.server";
import { requireInvitationConfig } from "../integrations/brevo.server";
import { enforceRateLimit } from "../security/request-security.server";
import type { contractorSchema } from "../validation/contractor-schemas.server";

import { newInvitation, deliver, duplicate } from "./user-invitation-service.server";
export { activateUser as activateContractor } from "./user-invitation-service.server";

export async function createContractor(
  input: z.infer<typeof contractorSchema>,
  actor: AuthPrincipal,
) {
  requireAdmin(actor);
  requireInvitationConfig();
  const invitation = newInvitation(input.language);
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  const result = await db
    .$transaction(async (tx) => {
      const existing = await tx.contractor.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
      });
      if (existing)
        throw new ConflictError(
          "CONTRACTOR_EMAIL_EXISTS",
          "Cette adresse e-mail est déjà utilisée.",
        );
      const { language: _language, ...data } = input;
      const contractor = await tx.contractor.create({ data });
      const user = await tx.user.create({
        data: {
          name: input.contact,
          emailNormalized: input.email,
          passwordHash,
          role: "CONTRACTOR",
          contractorId: contractor.id,
          accountActivated: false,
          invitation: { create: invitation.data },
        },
      });
      return { contractor, user };
    })
    .catch(duplicate);
  return { contractorId: result.contractor.id, ...(await deliver(result.user, invitation)) };
}

export async function inviteContractor(id: string, language: "fr" | "ru", actor: AuthPrincipal) {
  requireAdmin(actor);
  requireInvitationConfig();
  await enforceRateLimit(`contractor-invitation:${id}`, 5, 60 * 60_000);
  const invitation = newInvitation(language);
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  const user = await db
    .$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Contractor" WHERE id = ${id} FOR UPDATE`;
      const contractor = await tx.contractor.findUnique({
        where: { id },
        include: { users: { include: { invitation: true } } },
      });
      if (!contractor || !contractor.active)
        throw new NotFoundError("CONTRACTOR_NOT_FOUND", "Prestataire introuvable.");
      if (
        contractor.users.some(
          (user) => user.accountActivated || !user.active || user.role !== "CONTRACTOR",
        ) ||
        contractor.users.length > 1
      )
        throw new ConflictError(
          "CONTRACTOR_ACCOUNT_EXISTS",
          "Un compte existe déjà pour ce prestataire.",
        );
      let current = contractor.users[0];
      if (current?.invitation && current.invitation.issuedAt.getTime() > Date.now() - 60_000)
        throw new RateLimitError(
          Math.ceil((current.invitation.issuedAt.getTime() + 60_000 - Date.now()) / 1000),
        );
      if (!current) {
        current = await tx.user.create({
          data: {
            name: contractor.contact,
            emailNormalized: contractor.email.trim().toLowerCase(),
            passwordHash,
            role: "CONTRACTOR",
            contractorId: id,
            accountActivated: false,
          },
          include: { invitation: true },
        });
      }
      await tx.userInvitation.upsert({
        where: { userId: current.id },
        create: { userId: current.id, ...invitation.data },
        update: invitation.data,
      });
      return current;
    })
    .catch(duplicate);
  return deliver(user, invitation);
}
