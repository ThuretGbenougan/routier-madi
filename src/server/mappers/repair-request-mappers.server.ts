import type { Prisma } from "../../generated/prisma/client";
import type { Contractor, Photo, RepairRequest } from "@/types";

export const repairRequestInclude = {
  contractor: true,
  photos: { orderBy: { createdAt: "asc" } },
  history: { orderBy: { createdAt: "asc" }, include: { actorUser: true } },
  notes: { orderBy: { createdAt: "asc" }, include: { author: true } },
  controlResult: { include: { inspector: true } },
} satisfies Prisma.RepairRequestInclude;

export type RepairRequestRecord = Prisma.RepairRequestGetPayload<{
  include: typeof repairRequestInclude;
}>;

export function toContractorDto(record: { id: string; name: string; specialty: string; contact: string; phone: string; email: string }): Contractor {
  return {
    id: record.id,
    name: record.name,
    specialty: record.specialty,
    contact: record.contact,
    phone: record.phone,
    email: record.email,
  };
}

function toPhotoDto(photo: RepairRequestRecord["photos"][number]): Photo {
  return {
    id: photo.id,
    label: photo.label,
    kind: photo.kind.toLowerCase() as Photo["kind"],
    seed: photo.id,
    ...(photo.deliveryUrl ? { url: photo.deliveryUrl } : {}),
  } as Photo;
}

function toBaseDto(record: RepairRequestRecord): RepairRequest {
  if (!record.reference) throw new Error("Request reference is missing");
  const notes = record.notes.map((note) => ({
    id: note.id,
    at: note.createdAt.toISOString(),
    actor: note.author.name,
    role: note.author.role as "ADMIN" | "CONTRACTOR",
    text: note.body,
  }));

  return {
    id: record.id,
    reference: record.reference,
    problemType: record.problemType as RepairRequest["problemType"],
    ...(record.address ? { address: record.address } : {}),
    ...(record.district ? { district: record.district } : {}),
    description: record.description,
    lat: Number(record.latitude),
    lng: Number(record.longitude),
    ...(record.citizenName ? { citizenName: record.citizenName } : {}),
    ...(record.citizenEmail ? { citizenEmail: record.citizenEmail } : {}),
    status: record.status as RepairRequest["status"],
    contractorId: record.contractorId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.closedAt ? { closedAt: record.closedAt.toISOString() } : {}),
    photos: record.photos.map(toPhotoDto),
    history: record.history.map((entry) => ({
      id: entry.id,
      status: entry.toStatus as RepairRequest["status"],
      at: entry.createdAt.toISOString(),
      actor: entry.actorUser?.name ?? entry.actorLabel,
      role: entry.actorRole as "CITIZEN" | "ADMIN" | "CONTRACTOR",
      ...(entry.comment ? { comment: entry.comment } : {}),
    })),
    dispatcherNotes: notes.filter((_, index) => record.notes[index]?.visibility === "INTERNAL"),
    contractorNotes: notes.filter((_, index) => record.notes[index]?.visibility === "CONTRACTOR"),
    ...(record.controlResult
      ? {
          controlResult: {
            at: record.controlResult.createdAt.toISOString(),
            actor: record.controlResult.inspector.name,
            passed: record.controlResult.passed,
            comment: record.controlResult.comment,
          },
        }
      : {}),
  };
}

export function toAdminRepairRequestDto(record: RepairRequestRecord) {
  return toBaseDto(record);
}

export function toContractorRepairRequestDto(record: RepairRequestRecord) {
  const dto = toBaseDto(record);
  return {
    ...dto,
    citizenName: undefined,
    citizenEmail: undefined,
    dispatcherNotes: [],
    contractorNotes: dto.contractorNotes,
  } satisfies RepairRequest;
}

export function toPublicRepairRequestDto(record: RepairRequestRecord) {
  const dto = toBaseDto(record);
  return {
    ...dto,
    citizenName: undefined,
    citizenEmail: undefined,
    dispatcherNotes: [],
    contractorNotes: [],
    history: dto.history.map((entry) => ({
      ...entry,
      actor: entry.role === "ADMIN" ? "Service voirie" : entry.role === "CONTRACTOR" ? "Entreprise" : "Citoyen",
    })),
  } satisfies RepairRequest;
}
