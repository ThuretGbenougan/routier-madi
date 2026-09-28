import type { Lang } from "@/i18n";
import { apiRequest } from "./client";
export type UserSummary = {
  id: string;
  name: string;
  emailNormalized: string;
  role: "ADMIN" | "CONTRACTOR";
  active: boolean;
  accountActivated: boolean;
  contractor: { id: string; name: string } | null;
  invitation: {
    status: "PENDING" | "EXPIRED" | "CONSUMED";
    delivery: "PENDING" | "ACCEPTED" | "FAILED";
    language: Lang;
    expiresAt: string;
  } | null;
};
export const usersApi = {
  list: (search: string, role: string, page: number) =>
    apiRequest<{ users: UserSummary[]; total: number; invitationsEnabled: boolean }>(
      `/api/v1/users?${new URLSearchParams({ search, ...(role ? { role } : {}), page: String(page) })}`,
    ),
  create: (body: { name: string; email: string; language: Lang }) =>
    apiRequest<{ userId: string; delivery: string }>("/api/v1/users", {
      method: "POST",
      body,
      timeoutMs: 20_000,
    }),
  invite: (id: string, language: Lang) =>
    apiRequest<{ delivery: string }>(`/api/v1/users/${id}/invitations`, {
      method: "POST",
      body: { language },
      timeoutMs: 20_000,
    }),
};
