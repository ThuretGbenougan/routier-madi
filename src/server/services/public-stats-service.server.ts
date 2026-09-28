import { db } from "../db.server";

export async function getPublicStats() {
  const [total, inProgress, closed] = await Promise.all([
    db.repairRequest.count(),
    db.repairRequest.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } } }),
    db.repairRequest.findMany({
      where: { status: "CLOSED", closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    }),
  ]);
  const averageDurationDays = closed.length
    ? closed.reduce(
        (sum, item) => sum + (item.closedAt!.getTime() - item.createdAt.getTime()) / 86_400_000,
        0,
      ) / closed.length
    : 0;
  return { total, inProgress, closed: closed.length, averageDurationDays };
}
