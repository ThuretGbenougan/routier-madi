import { createHmac, randomBytes } from "node:crypto";
import { HistoryActorRole, NoteVisibility, RequestStatus, UserRole } from "../../generated/prisma/client";
import type { AuthPrincipal } from "../auth/session.server";
import { requireAdmin, requireRequestAccess } from "../authorization/guards.server";
import { db } from "../db.server";
import { ConflictError, NotFoundError, ValidationError } from "../errors/app-error.server";
import { getServerEnv } from "../env.server";
import { toAdminRepairRequestDto, toContractorDto, toContractorRepairRequestDto, toPublicRepairRequestDto } from "../mappers/repair-request-mappers.server";
import { findRequestById, findRequestByReference, listContractors, listRequests } from "../repositories/request-repository.server";
import type { createRequestSchema, noteSchema, requestListSchema } from "../validation/request-schemas.server";
import type { z } from "zod";

type CreateRequestInput = z.infer<typeof createRequestSchema>;
type NoteInput = z.infer<typeof noteSchema>;
type RequestListInput = z.infer<typeof requestListSchema>;

function tokenHash(token: string) {
  return createHmac("sha256", getServerEnv().SESSION_SECRET).update(token).digest("hex");
}

function newTrackingToken() {
  return randomBytes(24).toString("base64url");
}

function actorRole(role: UserRole) {
  return role === UserRole.ADMIN ? HistoryActorRole.ADMIN : HistoryActorRole.CONTRACTOR;
}

export async function createPublicRequest(input: CreateRequestInput) {
  const trackingToken = newTrackingToken();
  const created = await db.$transaction(async (tx) => {
    const request = await tx.repairRequest.create({
      data: {
        problemType: input.problemType,
        address: input.address,
        district: input.district,
        description: input.description,
        citizenName: input.citizenName ?? null,
        citizenEmail: input.citizenEmail ?? null,
        latitude: input.lat,
        longitude: input.lng,
        trackingTokenHash: tokenHash(trackingToken),
        history: {
          create: {
            fromStatus: null,
            toStatus: RequestStatus.CREATED,
            actorLabel: "Citoyen",
            actorRole: HistoryActorRole.CITIZEN,
            comment: "Demande creee.",
          },
        },
      },
    });
    const reference = `RR-${request.createdAt.getUTCFullYear()}-${request.serial.toString().padStart(4, "0")}`;
    return tx.repairRequest.update({ where: { id: request.id }, data: { reference } });
  });
  const record = await findRequestById(db, created.id);
  if (!record) throw new NotFoundError();
  return { request: toPublicRepairRequestDto(record), trackingToken };
}

export async function getRequestForPrincipal(id: string, principal: AuthPrincipal) {
  const request = await findRequestById(db, id);
  if (!request) throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
  if (principal.role === UserRole.CONTRACTOR) {
    requireRequestAccess(principal, request.contractorId);
    return toContractorRepairRequestDto(request);
  }
  requireAdmin(principal);
  return toAdminRepairRequestDto(request);
}

export async function getPublicRequest(reference: string, trackingToken: string) {
  const request = await findRequestByReference(db, reference);
  if (!request || request.trackingTokenHash !== tokenHash(trackingToken)) {
    throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
  }
  return toPublicRepairRequestDto(request);
}

export async function verifyPublicRequestAccess(id: string, trackingToken: string) {
  const request = await findRequestById(db, id);
  if (!request || request.trackingTokenHash !== tokenHash(trackingToken)) {
    throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
  }
  return request;
}

export async function getBootstrap(principal: AuthPrincipal) {
  if (principal.role === UserRole.ADMIN) {
    const [requests, contractors] = await Promise.all([listRequests(db, {}), listContractors(db)]);
    return { requests: requests.map(toAdminRepairRequestDto), contractors: contractors.map(toContractorDto) };
  }
  if (!principal.contractorId) throw new ConflictError("CONTRACTOR_ACCESS_DENIED", "Compte entreprise non configure.");
  const requests = await listRequests(db, { contractorId: principal.contractorId });
  return { requests: requests.map(toContractorRepairRequestDto) };
}

export async function listRequestsForPrincipal(principal: AuthPrincipal, filters: RequestListInput) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.query ? { OR: [{ reference: { contains: filters.query, mode: "insensitive" as const } }, { address: { contains: filters.query, mode: "insensitive" as const } }] } : {}),
    ...(principal.role === UserRole.CONTRACTOR ? { contractorId: principal.contractorId ?? "__none__" } : filters.contractorId ? { contractorId: filters.contractorId } : {}),
  };
  const rows = await listRequests(db, where);
  return rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize).map((row) =>
    principal.role === UserRole.ADMIN ? toAdminRepairRequestDto(row) : toContractorRepairRequestDto(row),
  );
}

export async function assignRequest(input: { requestId: string; contractorId: string; comment?: string | undefined; actor: AuthPrincipal }) {
  requireAdmin(input.actor);
  await db.$transaction(async (tx) => {
    const request = await findRequestById(tx, input.requestId);
    if (!request) throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
    if (request.status !== RequestStatus.VERIFIED || request.contractorId) {
      throw new ConflictError("REQUEST_ALREADY_ASSIGNED", "La demande ne peut pas etre attribuee.");
    }
    const contractor = await tx.contractor.findFirst({ where: { id: input.contractorId, active: true } });
    if (!contractor) throw new ValidationError([{ path: "contractorId", message: "Entreprise introuvable ou inactive.", code: "CONTRACTOR_NOT_FOUND" }]);
    const updated = await tx.repairRequest.updateMany({
      where: { id: request.id, status: RequestStatus.VERIFIED, contractorId: null },
      data: { contractorId: contractor.id, status: RequestStatus.ASSIGNED },
    });
    if (updated.count !== 1) throw new ConflictError("REQUEST_CONCURRENT_UPDATE", "La demande a ete modifiee. Rechargez les donnees.");
    await tx.requestHistory.create({
      data: {
        requestId: request.id,
        fromStatus: RequestStatus.VERIFIED,
        toStatus: RequestStatus.ASSIGNED,
        actorUserId: input.actor.userId,
        actorLabel: input.actor.name,
        actorRole: HistoryActorRole.ADMIN,
        comment: input.comment ?? `Attribuee a ${contractor.name}.`,
      },
    });
  });
  return getRequestForPrincipal(input.requestId, input.actor);
}

export async function addNote(input: { requestId: string; note: NoteInput; actor: AuthPrincipal }) {
  await db.$transaction(async (tx) => {
    const request = await findRequestById(tx, input.requestId);
    if (!request) throw new NotFoundError("REQUEST_NOT_FOUND", "Demande introuvable.");
    if (input.actor.role === UserRole.CONTRACTOR) requireRequestAccess(input.actor, request.contractorId);
    await tx.note.create({
      data: {
        requestId: request.id,
        authorId: input.actor.userId,
        visibility: input.actor.role === UserRole.ADMIN ? NoteVisibility.INTERNAL : NoteVisibility.CONTRACTOR,
        body: input.note.body,
      },
    });
    await tx.requestHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        toStatus: request.status,
        actorUserId: input.actor.userId,
        actorLabel: input.actor.name,
        actorRole: actorRole(input.actor.role),
        comment: "Note ajoutee.",
      },
    });
  });
  return getRequestForPrincipal(input.requestId, input.actor);
}
