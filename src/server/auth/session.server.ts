import { createHmac, randomBytes } from "node:crypto";
import { SessionClient, UserRole } from "../../generated/prisma/client";
import type { Session as SessionDto } from "@/types";
import { db } from "../db.server";
import { AuthenticationError } from "../errors/app-error.server";
import { getServerEnv } from "../env.server";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type AuthPrincipal = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  contractorId: string | null;
  client: SessionClient;
};

function hashToken(token: string) {
  return createHmac("sha256", getServerEnv().SESSION_SECRET).update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1];
}

function serializeCookie(token: string, expiresAt: Date) {
  const secure = getServerEnv().NODE_ENV === "production" ? "; Secure" : "";
  return `vc_session=${token}; Path=/api; HttpOnly; SameSite=Lax${secure}; Expires=${expiresAt.toUTCString()}`;
}

export function clearSessionCookie() {
  const secure = getServerEnv().NODE_ENV === "production" ? "; Secure" : "";
  return `vc_session=; Path=/api; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export function toSessionDto(principal: AuthPrincipal): SessionDto {
  return {
    userId: principal.userId,
    name: principal.name,
    email: principal.email,
    role: principal.role,
    ...(principal.contractorId ? { contractorId: principal.contractorId } : {}),
  };
}

export async function createSession(user: {
  id: string;
  name: string;
  emailNormalized: string;
  role: UserRole;
  contractorId: string | null;
}, client: SessionClient) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await db.session.create({
    data: {
      tokenHash: hashToken(token),
      client,
      userId: user.id,
      expiresAt,
    },
  });
  return {
    token,
    expiresAt,
    principal: {
      sessionId: session.id,
      userId: user.id,
      name: user.name,
      email: user.emailNormalized,
      role: user.role,
      contractorId: user.contractorId,
      client,
    } satisfies AuthPrincipal,
  };
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length).trim();
  return readCookie(request, "vc_session");
}

export async function getOptionalPrincipal(request: Request): Promise<AuthPrincipal | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;

  return {
    sessionId: session.id,
    userId: session.user.id,
    name: session.user.name,
    email: session.user.emailNormalized,
    role: session.user.role,
    contractorId: session.user.contractorId,
    client: session.client,
  };
}

export async function requirePrincipal(request: Request) {
  const principal = await getOptionalPrincipal(request);
  if (!principal) throw new AuthenticationError("AUTH_SESSION_EXPIRED", "Session invalide ou expiree.");
  return principal;
}

export async function revokeSession(request: Request) {
  const token = tokenFromRequest(request);
  if (!token) return;
  await db.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function isTauriRequest(request: Request) {
  return request.headers.get("x-client-platform") === "tauri";
}

export function sessionCookie(token: string, expiresAt: Date) {
  return serializeCookie(token, expiresAt);
}
