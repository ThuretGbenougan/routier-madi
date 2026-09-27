import type { Prisma } from "../../generated/prisma/client";
import type { Contractor, Photo, RepairRequest } from "@/types";

export const repairRequestInclude = {
  contractor: true,
  photos: {
    orderBy: { createdAt: "asc" },
    include: { analysis: { include: { detections: true } } },
  },
  history: { orderBy: { createdAt: "asc" }, include: { actorUser: true } },
  notes: { orderBy: { createdAt: "asc" }, include: { author: true } },
  controls: { include: { inspector: true }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.RepairRequestInclude;

export type RepairRequestRecord = Prisma.RepairRequestGetPayload<{
  include: typeof repairRequestInclude;
}>;

export function toContractorDto(record: {
  id: string;
  name: string;
  specialty: string;
  contact: string;
  phone: string;
  email: string;
}): Contractor {
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
    cycle: photo.cycle,
    ...(photo.analysis
      ? {
          analysis: {
            id: photo.analysis.id,
            status: photo.analysis.status,
            attempts: photo.analysis.attempts,
            failureCode: photo.analysis.failureCode,
            modelVersion: photo.analysis.modelVersion,
            durationMs: photo.analysis.durationMs,
            width: photo.analysis.imageWidth,
            height: photo.analysis.imageHeight,
            detections: photo.analysis.detections.map((d) => ({
              label: d.label,
              confidence: d.confidence,
              box: [d.x1, d.y1, d.x2, d.y2],
            })),
          },
        }
      : {}),
    ...(photo.deliveryUrl ? { url: photo.deliveryUrl } : {}),
  };
}

function toBaseDto(record: RepairRequestRecord): RepairRequest {
  if (!record.reference) throw new Error("Request reference is missing");
  const controlResult = record.controls.at(-1);
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
    interventionCycle: record.interventionCycle,
    controls: record.controls.map((control) => ({
      at: control.createdAt.toISOString(),
      actor: control.inspector.name,
      passed: control.passed,
      comment: control.comment,
      cycle: control.cycle,
    })),
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
    ...(controlResult
      ? {
          controlResult: {
            at: controlResult.createdAt.toISOString(),
            actor: controlResult.inspector.name,
            passed: controlResult.passed,
            comment: controlResult.comment,
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
    photos: dto.photos.map(({ analysis: _analysis, ...photo }) => photo),
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
    photos: dto.photos.map(({ analysis: _analysis, ...photo }) => photo),
    citizenName: undefined,
    citizenEmail: undefined,
    dispatcherNotes: [],
    contractorNotes: [],
    controls: (dto.controls ?? []).map((control) => ({
      ...control,
      actor: "Service voirie",
      comment: "Contrôle réalisé.",
    })),
    controlResult: dto.controlResult
      ? { ...dto.controlResult, actor: "Service voirie", comment: "Contrôle réalisé." }
      : undefined,
    history: dto.history.map((entry) => ({
      ...entry,
      comment: undefined,
      actor:
        entry.role === "ADMIN"
          ? "Service voirie"
          : entry.role === "CONTRACTOR"
            ? "Entreprise"
            : "Citoyen",
    })),
  } satisfies RepairRequest;
}
