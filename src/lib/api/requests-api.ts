import type { ProblemType, RepairRequest, RequestStatus } from "@/types";
import { apiRequest } from "./client";

export const requestsApi = {
  adminBootstrap: () =>
    apiRequest<{ requests: RepairRequest[]; contractors: import("@/types").Contractor[] }>(
      "/api/v1/admin/bootstrap",
    ),
  contractorBootstrap: () =>
    apiRequest<{ requests: RepairRequest[] }>("/api/v1/contractor/bootstrap"),
  publicStats: () =>
    apiRequest<{ total: number; inProgress: number; closed: number; averageDurationDays: number }>(
      "/api/v1/public/stats",
    ),
  list: (query = "") =>
    apiRequest<{ requests: RepairRequest[] }>(`/api/v1/requests${query}` as `/${string}`),
  get: (id: string) => apiRequest<{ request: RepairRequest }>(`/api/v1/requests/${id}`),
  create: (input: {
    problemType: ProblemType;
    description: string;
    lat: number;
    lng: number;
    address?: string;
    district?: string;
    citizenName?: string;
    citizenEmail?: string;
  }) =>
    apiRequest<{ request: RepairRequest; trackingToken: string }>("/api/v1/requests", {
      method: "POST",
      body: input,
    }),
  transition: (
    id: string,
    input: { to: RequestStatus; comment?: string; controlPassed?: boolean },
  ) =>
    apiRequest<{ request: RepairRequest }>(`/api/v1/requests/${id}/transition`, {
      method: "POST",
      body: input,
    }),
  assign: (id: string, input: { contractorId: string; comment?: string }) =>
    apiRequest<{ request: RepairRequest }>(`/api/v1/requests/${id}/assign`, {
      method: "POST",
      body: input,
    }),
  addNote: (id: string, body: string) =>
    apiRequest<{ request: RepairRequest }>(`/api/v1/requests/${id}/notes`, {
      method: "POST",
      body: { body },
    }),
  publicByReference: (reference: string, trackingToken: string) =>
    apiRequest<{ request: RepairRequest }>(
      `/api/v1/public/requests/${reference}?trackingToken=${encodeURIComponent(trackingToken)}`,
    ),
};
