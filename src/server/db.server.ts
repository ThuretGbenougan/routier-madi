import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";
import { getServerEnv } from "./env.server";

const globalForPrisma = globalThis as unknown as {
  db?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: getServerEnv().DATABASE_URL }) });
}

export const db = globalForPrisma.db ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") globalForPrisma.db = db;
