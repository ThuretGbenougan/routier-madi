import type { Contractor } from "@/types";
import type { Lang } from "@/i18n";
import { apiRequest } from "./client";

export type ContractorInput = {
  name: string;
  specialty: string;
  contact: string;
  phone: string;
  email: string;
  language: Lang;
};
export const contractorsApi = {
  list: () =>
    apiRequest<{ contractors: Contractor[]; invitationsEnabled: boolean }>("/api/v1/contractors"),
  create: (body: ContractorInput) =>
    apiRequest<{ contractorId: string; delivery: string }>("/api/v1/contractors", {
      method: "POST",
      body,
      timeoutMs: 20_000,
    }),
  invite: (id: string, language: Lang) =>
    apiRequest<{ delivery: string }>(`/api/v1/contractors/${id}/invitations`, {
      method: "POST",
      body: { language },
      timeoutMs: 20_000,
    }),
  activate: (token: string, password: string) =>
    apiRequest<{ activated: true }>("/api/v1/auth/activate", {
      method: "POST",
      body: { token, password },
    }),
};
