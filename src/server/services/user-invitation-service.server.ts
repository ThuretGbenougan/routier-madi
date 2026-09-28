import { createHash, randomBytes } from "node:crypto";
import { db } from "../db.server";
import { hashPassword } from "../auth/auth-service.server";
import { AppError, ConflictError } from "../errors/app-error.server";
import { sendInvitationEmail } from "../integrations/brevo.server";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function newInvitation(language: "fr" | "ru") {
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
export function duplicate(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002")
    throw new ConflictError("CONTRACTOR_EMAIL_EXISTS", "Cette adresse e-mail est déjà utilisée.");
  throw error;
}
export async function deliver(
  user: { id: string; emailNormalized: string; name: string; role: "ADMIN" | "CONTRACTOR" },
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
      role: user.role,
    });
    delivery = "ACCEPTED";
  } catch {
    console.warn(JSON.stringify({ event: "user_invitation_delivery_failed", userId: user.id }));
  }
  await db.userInvitation.updateMany({
    where: { userId: user.id, tokenHash: invitation.data.tokenHash },
    data: { delivery, messageId },
  });
  return { delivery };
}

export async function activateUser(token: string, password: string) {
  const hash = tokenHash(token);
  const found = await db.userInvitation.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  const invalid = () =>
    new AppError(
      "INVITATION_INVALID",
      422,
      "Ce lien est invalide ou a expiré. Demandez une nouvelle invitation.",
    );
  if (!found || found.consumedAt || found.expiresAt <= new Date()) throw invalid();
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    if (found.user.contractorId)
      await tx.$queryRaw`SELECT id FROM "Contractor" WHERE id = ${found.user.contractorId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${found.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: found.userId },
      include: { contractor: true },
    });
    if (
      !user?.active ||
      user.accountActivated ||
      (user.role === "CONTRACTOR" && !user.contractor?.active) ||
      (user.role === "ADMIN" && user.contractorId !== null)
    )
      throw invalid();
    const consumed = await tx.userInvitation.updateMany({
      where: { id: found.id, tokenHash: hash, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw invalid();
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, accountActivated: true },
    });
    return user.role;
  });
}
