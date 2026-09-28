import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { db } from "../db.server";
import { requireAdmin } from "../authorization/guards.server";
import type { AuthPrincipal } from "../auth/session.server";
import { hashPassword } from "../auth/auth-service.server";
import { ConflictError, RateLimitError } from "../errors/app-error.server";
import { invitationsConfigured, requireInvitationConfig } from "../integrations/brevo.server";
import { enforceRateLimit } from "../security/request-security.server";
import type { userSchema, usersQuerySchema } from "../validation/user-schemas.server";
import { newInvitation, deliver, duplicate } from "./user-invitation-service.server";

export async function listUsers(input: z.infer<typeof usersQuerySchema>, actor: AuthPrincipal) {
  requireAdmin(actor);
  const where = {
    ...(input.role ? { role: input.role } : {}),
    OR: [
      { name: { contains: input.search, mode: "insensitive" as const } },
      { emailNormalized: { contains: input.search, mode: "insensitive" as const } },
    ],
  };
  const [total, users] = await db.$transaction([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip: (input.page - 1) * 25,
      take: 25,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        emailNormalized: true,
        role: true,
        active: true,
        accountActivated: true,
        contractor: { select: { id: true, name: true } },
        invitation: {
          select: { expiresAt: true, consumedAt: true, delivery: true, language: true },
        },
      },
    }),
  ]);
  return {
    users: users.map(({ invitation, ...user }) => ({
      ...user,
      invitation: invitation
        ? {
            ...invitation,
            status: invitation.consumedAt
              ? "CONSUMED"
              : invitation.expiresAt <= new Date()
                ? "EXPIRED"
                : "PENDING",
          }
        : null,
    })),
    total,
    page: input.page,
    pageSize: 25,
    invitationsEnabled: invitationsConfigured(),
  };
}

export async function createAdmin(input: z.infer<typeof userSchema>, actor: AuthPrincipal) {
  requireAdmin(actor);
  requireInvitationConfig();
  const invitation = newInvitation(input.language);
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  const user = await db
    .$transaction(async (tx) =>
      tx.user.create({
        data: {
          name: input.name,
          emailNormalized: input.email,
          passwordHash,
          role: "ADMIN",
          contractorId: null,
          accountActivated: false,
          invitation: { create: invitation.data },
        },
      }),
    )
    .catch(duplicate);
  return { userId: user.id, ...(await deliver(user, invitation)) };
}

export async function inviteAdmin(id: string, language: "fr" | "ru", actor: AuthPrincipal) {
  requireAdmin(actor);
  requireInvitationConfig();
  await enforceRateLimit(`user-invitation:${id}`, 5, 60 * 60_000);
  const invitation = newInvitation(language);
  const user = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id }, include: { invitation: true } });
    if (
      !current ||
      !current.active ||
      current.accountActivated ||
      current.role !== "ADMIN" ||
      current.contractorId
    )
      throw new ConflictError("USER_NOT_INVITABLE", "Ce compte ne peut pas être invité.");
    if (current.invitation && current.invitation.issuedAt.getTime() > Date.now() - 60_000)
      throw new RateLimitError(
        Math.ceil((current.invitation.issuedAt.getTime() + 60_000 - Date.now()) / 1000),
      );
    await tx.userInvitation.upsert({
      where: { userId: id },
      create: { userId: id, ...invitation.data },
      update: invitation.data,
    });
    return current;
  });
  return deliver(user, invitation);
}
