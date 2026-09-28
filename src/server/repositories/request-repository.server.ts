import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  repairRequestInclude,
  type RepairRequestRecord,
} from "../mappers/repair-request-mappers.server";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function findRequestById(
  db: DbClient,
  id: string,
): Promise<RepairRequestRecord | null> {
  return db.repairRequest.findUnique({ where: { id }, include: repairRequestInclude });
}

export async function findRequestByReference(
  db: DbClient,
  reference: string,
): Promise<RepairRequestRecord | null> {
  return db.repairRequest.findUnique({ where: { reference }, include: repairRequestInclude });
}

export async function listRequests(db: DbClient, where: Prisma.RepairRequestWhereInput) {
  return db.repairRequest.findMany({
    where,
    include: repairRequestInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function listContractors(db: DbClient) {
  return db.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}
