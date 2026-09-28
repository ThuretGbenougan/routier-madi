import { createHash, randomBytes } from "node:crypto";
import type { z } from "zod";
import { db } from "../db.server";
import { requireAdmin } from "../authorization/guards.server";
import type { AuthPrincipal } from "../auth/session.server";
import { hashPassword } from "../auth/auth-service.server";
import { AppError, ConflictError, NotFoundError, RateLimitError } from "../errors/app-error.server";
import { requireInvitationConfig, sendInvitationEmail } from "../integrations/brevo.server";
import { enforceRateLimit } from "../security/request-security.server";
import type { contractorSchema } from "../validation/contractor-schemas.server";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function newInvitation(language: "fr" | "ru") {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    data: {
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 48 * 60 * 60_000),
      issuedAt: new Date(),
      language,
      consumedAt: null,
      delivery: "PENDING",
      messageId: null,
    },
  };
}
function duplicate(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002")
    throw new ConflictError("CONTRACTOR_EMAIL_EXISTS", "Cette adresse e-mail est déjà utilisée.");
  throw error;
}
async function deliver(
  user: { id: string; emailNormalized: string; name: string },
  invitation: ReturnType<typeof newInvitation>,
) {
  let delivery = "FAILED";
  let messageId: string | null = null;
  try {
    messageId = await sendInvitationEmail({
      email: user.emailNormalized,
      name: user.name,
      token: invitation.token,
      language: invitation.data.language,
    });
    delivery = "ACCEPTED";
  } catch {
    console.warn(
      JSON.stringify({ event: "contractor_invitation_delivery_failed", userId: user.id }),
    );
  }
  await db.contractorInvitation.updateMany({
    where: { userId: user.id, tokenHash: invitation.data.tokenHash },
    data: { delivery, messageId },
  });
  return { delivery };
}

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
      await tx.contractorInvitation.upsert({
        where: { userId: current.id },
        create: { userId: current.id, ...invitation.data },
        update: invitation.data,
      });
      return current;
    })
    .catch(duplicate);
  return deliver(user, invitation);
}

export async function activateContractor(token: string, password: string) {
  const hash = tokenHash(token);
  const found = await db.contractorInvitation.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  const invalid = () =>
    new AppError(
      "INVITATION_INVALID",
      422,
      "Ce lien est invalide ou a expiré. Demandez une nouvelle invitation.",
    );
  if (!found || found.consumedAt || found.expiresAt <= new Date() || !found.user.contractorId)
    throw invalid();
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contractor" WHERE id = ${found.user.contractorId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: found.userId },
      include: { contractor: true },
    });
    if (
      !user?.active ||
      user.accountActivated ||
      user.role !== "CONTRACTOR" ||
      !user.contractor?.active
    )
      throw invalid();
    const consumed = await tx.contractorInvitation.updateMany({
      where: { id: found.id, tokenHash: hash, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw invalid();
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, accountActivated: true },
    });
  });
}
