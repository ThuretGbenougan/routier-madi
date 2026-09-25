import "dotenv/config";
import { createHmac } from "node:crypto";
import { HistoryActorRole, MlAnalysisStatus, NoteVisibility, PhotoKind, UserRole } from "../src/generated/prisma/client";
import { db } from "../src/server/db.server";
import { hashPassword } from "../src/server/auth/auth-service.server";
import { contractors } from "../src/mocks/contractors";
import { buildRequests } from "../src/mocks/requests";
import { users } from "../src/mocks/users";

const demoPassword = process.env.DEMO_PASSWORD;
if (!demoPassword) throw new Error("DEMO_PASSWORD is required to run the seed.");

function trackingHash(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required to run the seed.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function resetDatabase() {
  await db.$transaction(
    async (tx) => {
      await tx.mlDetection.deleteMany();
      await tx.mlAnalysis.deleteMany();
      await tx.photo.deleteMany();
      await tx.controlResult.deleteMany();
      await tx.note.deleteMany();
      await tx.requestHistory.deleteMany();
      await tx.repairRequest.deleteMany();
      await tx.session.deleteMany();
      await tx.user.deleteMany();
      await tx.contractor.deleteMany();
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );
}

async function main() {
  await resetDatabase();
  const contractorMap = new Map<string, string>();
  for (const contractor of contractors) {
    const created = await db.contractor.create({ data: contractor });
    contractorMap.set(contractor.id, created.id);
  }
  const passwordHash = await hashPassword(demoPassword);
  const userMap = new Map<string, string>();
  for (const user of users) {
    const created = await db.user.create({ data: { emailNormalized: user.email.toLowerCase(), passwordHash, name: user.name, role: user.role as UserRole, contractorId: user.contractorId ? contractorMap.get(user.contractorId) : null } });
    userMap.set(user.id, created.id);
  }
  const contractorNames = Object.fromEntries(contractors.map((contractor) => [contractor.id, contractor.name]));
  for (const item of buildRequests(contractorNames)) {
    await db.repairRequest.create({ data: {
      reference: item.reference, trackingTokenHash: trackingHash(`seed-${item.reference}`), problemType: item.problemType,
      address: item.address, district: item.district, description: item.description, latitude: item.lat, longitude: item.lng,
      citizenName: item.citizenName, citizenEmail: item.citizenEmail, status: item.status,
      contractorId: item.contractorId ? contractorMap.get(item.contractorId) : null,
      createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt), closedAt: item.closedAt ? new Date(item.closedAt) : null,
      photos: { create: item.photos.map((photo) => ({ kind: photo.kind.toUpperCase() as PhotoKind, label: photo.label, storageProvider: "demo", storageKey: `demo/${item.reference}/${photo.id}`, contentType: "image/jpeg", sizeBytes: 0, width: 1, height: 1, sha256: `demo-${photo.id}`.padEnd(64, "0").slice(0, 64), analysis: { create: { status: MlAnalysisStatus.PENDING } } })) },
      history: { create: item.history.map((entry) => ({ fromStatus: null, toStatus: entry.status, actorUserId: entry.role === "ADMIN" ? userMap.get("u1") : entry.role === "CONTRACTOR" ? userMap.get("u3") : null, actorLabel: entry.actor, actorRole: entry.role as HistoryActorRole, comment: entry.comment, createdAt: new Date(entry.at) })) },
      notes: { create: [...item.dispatcherNotes, ...item.contractorNotes].map((note) => ({ authorId: note.role === "ADMIN" ? userMap.get("u1")! : userMap.get("u3")!, visibility: note.role === "ADMIN" ? NoteVisibility.INTERNAL : NoteVisibility.CONTRACTOR, body: note.text, createdAt: new Date(note.at) })) },
      ...(item.controlResult ? { controlResult: { create: { inspectorId: userMap.get("u1")!, passed: item.controlResult.passed, comment: item.controlResult.comment, createdAt: new Date(item.controlResult.at) } } } : {}),
    } });
  }
  console.log("Demo database seeded.");
}

main().finally(async () => db.$disconnect()).catch((error) => { console.error(error instanceof Error ? error.message : "Seed failed"); process.exitCode = 1; });
