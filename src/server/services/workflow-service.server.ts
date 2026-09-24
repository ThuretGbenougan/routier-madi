import { HistoryActorRole, NoteVisibility, RequestStatus, UserRole } from "../../generated/prisma/client";
import type { AuthPrincipal } from "../auth/session.server";
import { ConflictError, NotFoundError, ValidationError } from "../errors/app-error.server";
import { findRequestById } from "../repositories/request-repository.server";
import { db } from "../db.server";

const transitions: Record<RequestStatus, RequestStatus[]> = {
  CREATED: [RequestStatus.VERIFIED, RequestStatus.REJECTED],
  VERIFIED: [RequestStatus.ASSIGNED, RequestStatus.REJECTED],
  ASSIGNED: [RequestStatus.IN_PROGRESS],
  IN_PROGRESS: [RequestStatus.COMPLETED],
  COMPLETED: [RequestStatus.CONTROLLED, RequestStatus.IN_PROGRESS],
  CONTROLLED: [RequestStatus.CLOSED],
  CLOSED: [],
  REJECTED: [],
};

function actorRole(role: UserRole) {
  return role === UserRole.ADMIN ? HistoryActorRole.ADMIN : HistoryActorRole.CONTRACTOR;
}

function assertTransitionAllowed(current: RequestStatus, next: RequestStatus, actor: AuthPrincipal, contractorId: string | null, comment?: string) {
  if (!transitions[current].includes(next)) {
    throw new ConflictError("REQUEST_INVALID_TRANSITION", "La transition demandee n'est pas autorisee.");
  }
  const adminTransitions = new Set([
    `${RequestStatus.CREATED}:${RequestStatus.VERIFIED}`,
    `${RequestStatus.CREATED}:${RequestStatus.REJECTED}`,
    `${RequestStatus.VERIFIED}:${RequestStatus.REJECTED}`,
    `${RequestStatus.COMPLETED}:${RequestStatus.CONTROLLED}`,
    `${RequestStatus.COMPLETED}:${RequestStatus.IN_PROGRESS}`,
    `${RequestStatus.CONTROLLED}:${RequestStatus.CLOSED}`,
  ]);
  const contractorTransitions = new Set([
    `${RequestStatus.ASSIGNED}:${RequestStatus.IN_PROGRESS}`,
    `${RequestStatus.IN_PROGRESS}:${RequestStatus.COMPLETED}`,
  ]);
  const key = `${current}:${next}`;

  if (actor.role === UserRole.ADMIN && adminTransitions.has(key)) {
    if (current === RequestStatus.COMPLETED && next === RequestStatus.IN_PROGRESS && !comment) {
      throw new ValidationError([{ path: "comment", message: "Un commentaire est requis pour une reprise.", code: "REWORK_COMMENT_REQUIRED" }]);
    }
    return;
  }
  if (actor.role === UserRole.CONTRACTOR && contractorTransitions.has(key) && actor.contractorId === contractorId) return;
  throw new ConflictError("REQUEST_INVALID_TRANSITION", "La transition demandee n'est pas autorisee.");
}

export async function transitionRequest(input: { requestId: string; to: RequestStatus; comment?: string | undefined; controlPassed?: boolean | undefined; actor: AuthPrincipal }) {
  return db.$transaction(async (tx) => {
    const request = await findRequestById(tx, input.requestId);
    if (!request) throw new NotFoundError();
    assertTransitionAllowed(request.status, input.to, input.actor, request.contractorId, input.comment);

    if (input.to === RequestStatus.CONTROLLED && typeof input.controlPassed !== "boolean") {
      throw new ValidationError([{ path: "controlPassed", message: "Le resultat du controle est requis.", code: "CONTROL_RESULT_REQUIRED" }]);
    }
    const updateResult = await tx.repairRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: {
        status: input.to,
        ...(input.to === RequestStatus.CLOSED ? { closedAt: new Date() } : {}),
      },
    });
    if (updateResult.count !== 1) {
      throw new ConflictError("REQUEST_CONCURRENT_UPDATE", "La demande a ete modifiee. Rechargez les donnees.");
    }
    await tx.requestHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        toStatus: input.to,
        actorUserId: input.actor.userId,
        actorLabel: input.actor.name,
        actorRole: actorRole(input.actor.role),
        comment: input.comment ?? null,
      },
    });
    if (request.status === RequestStatus.COMPLETED && input.to === RequestStatus.IN_PROGRESS && input.comment) {
      await tx.note.create({
        data: {
          requestId: request.id,
          authorId: input.actor.userId,
          visibility: NoteVisibility.INTERNAL,
          body: input.comment,
        },
      });
    }
    if (input.to === RequestStatus.CONTROLLED && typeof input.controlPassed === "boolean") {
      await tx.controlResult.create({
        data: {
          requestId: request.id,
          inspectorId: input.actor.userId,
          passed: input.controlPassed,
          comment: input.comment ?? "Controle realise.",
        },
      });
    }
    return request.id;
  });
}
