import type { Contractor, RepairRequest, RequestStatus } from "@/types";
import { statusOrder } from "@/i18n/fr";
import { daysBetween } from "./format";

export function countByStatus(requests: RepairRequest[]): Record<RequestStatus, number> {
  const base = {
    CREATED: 0,
    VERIFIED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CONTROLLED: 0,
    CLOSED: 0,
    REJECTED: 0,
  } as Record<RequestStatus, number>;
  for (const r of requests) base[r.status] += 1;
  return base;
}

export function averageProcessingDays(requests: RepairRequest[]): number {
  const closed = requests.filter((r) => r.status === "CLOSED");
  if (closed.length === 0) return 0;
  return (
    closed.reduce((sum, r) => sum + daysBetween(r.createdAt, r.closedAt ?? r.updatedAt), 0) /
    closed.length
  );
}

export function byContractor(requests: RepairRequest[], contractors: Contractor[]) {
  return contractors.map((c) => {
    const list = requests.filter((r) => r.contractorId === c.id);
    return {
      contractor: c,
      total: list.length,
      active: list.filter((r) => ["ASSIGNED", "IN_PROGRESS"].includes(r.status)).length,
      done: list.filter((r) => ["COMPLETED", "CONTROLLED", "CLOSED"].includes(r.status)).length,
    };
  });
}

export function createdOverTime(requests: RepairRequest[]) {
  const buckets = new Map<string, number>();
  for (const r of requests) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      return { label, value };
    });
}

export const chartStatusOrder = statusOrder;
