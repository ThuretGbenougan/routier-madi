import argon2 from "argon2";
import { SessionClient, UserRole } from "../../generated/prisma/client";
import { AuthenticationError } from "../errors/app-error.server";
import { createSession, isTauriRequest } from "./session.server";
import { db } from "../db.server";

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function login(input: { email: string; password: string; role?: "ADMIN" | "CONTRACTOR" | undefined }, request: Request) {
  const user = await db.user.findUnique({ where: { emailNormalized: input.email } });
  const valid = Boolean(user?.active) && Boolean(user && (await argon2.verify(user.passwordHash, input.password)));
  if (!user || !valid || (input.role && user.role !== input.role)) {
    throw new AuthenticationError();
  }

  return createSession(user, isTauriRequest(request) ? SessionClient.TAURI : SessionClient.WEB);
}

export function canUseRole(userRole: UserRole, expectedRole?: "ADMIN" | "CONTRACTOR") {
  return !expectedRole || userRole === expectedRole;
}
