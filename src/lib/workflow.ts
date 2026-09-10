import type { RequestStatus, Role } from "@/types";

export const transitions: Record<RequestStatus, RequestStatus[]> = {
  CREATED: ["VERIFIED", "REJECTED"],
  VERIFIED: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["CONTROLLED"],
  CONTROLLED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
};

const rolePermissions: Record<Role, RequestStatus[]> = {
  ADMIN: ["VERIFIED", "ASSIGNED", "CONTROLLED", "CLOSED", "REJECTED"],
  CONTRACTOR: ["IN_PROGRESS", "COMPLETED"],
};

export function canTransition(from: RequestStatus, to: RequestStatus, role: Role): boolean {
  return transitions[from].includes(to) && rolePermissions[role].includes(to);
}

export function nextStatusesFor(from: RequestStatus, role: Role): RequestStatus[] {
  return transitions[from].filter((s) => rolePermissions[role].includes(s));
}

export const activeStatuses: RequestStatus[] = [
  "CREATED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
];
