import { useSyncExternalStore } from "react";
import type {
  Contractor,
  HistoryEntry,
  Note,
  Photo,
  ProblemType,
  RepairRequest,
  RequestStatus,
  Role,
  Session,
} from "@/types";
import { contractors as seedContractors } from "@/mocks/contractors";
import { users } from "@/mocks/users";
import { buildRequests } from "@/mocks/requests";
import { canTransition } from "./workflow";

const STORAGE_KEY = "voirie-connect-demo-v1";

export interface DemoState {
  requests: RepairRequest[];
  contractors: Contractor[];
  session: Session | null;
}

function contractorNames(list: Contractor[]): Record<string, string> {
  return Object.fromEntries(list.map((c) => [c.id, c.name]));
}

export function createInitialState(): DemoState {
  return {
    requests: buildRequests(contractorNames(seedContractors)),
    contractors: seedContractors,
    session: null,
  };
}

let state: DemoState = createInitialState();
const serverState: DemoState = state;
let listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota ignored in demo */
  }
}

function setState(next: DemoState, save = true) {
  state = next;
  if (save) persist();
  emit();
}

let hydrated = false;

export function hydrateFromStorage() {
  if (typeof window === "undefined" || hydrated) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed?.requests?.length) state = parsed;
    }
  } catch {
    /* ignore corrupted demo data */
  }
  hydrated = true;
  emit();
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function resetDemoData() {
  setState(createInitialState());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDemoState(): DemoState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export function getState(): DemoState {
  return state;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function updateRequest(id: string, updater: (r: RepairRequest) => RepairRequest) {
  setState({
    ...state,
    requests: state.requests.map((r) => (r.id === id ? updater(r) : r)),
  });
}

/* ---------------- authentication (mocked) ---------------- */

export function login(email: string, password: string, role: Role): Session | null {
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
  );
  if (!user || user.role !== role) return null;
  const session: Session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    contractorId: user.contractorId,
  };
  setState({ ...state, session });
  return session;
}

export function logout() {
  setState({ ...state, session: null });
}

/* ---------------- citizen ---------------- */

export interface NewRequestInput {
  problemType: ProblemType;
  address: string;
  district: string;
  description: string;
  citizenName?: string;
  citizenEmail?: string;
  photoNames: string[];
}

export function createRequest(input: NewRequestInput): RepairRequest {
  const now = new Date().toISOString();
  const nextNumber =
    state.requests.reduce((max, r) => {
      const n = Number(r.reference.split("-")[2]);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0) + 1;

  const photos: Photo[] = input.photoNames.map((name, i) => ({
    id: `p-${uid()}`,
    label: name || `Photo citoyen ${i + 1}`,
    kind: "citizen",
    seed: uid(),
  }));

  const request: RepairRequest = {
    id: `r-${uid()}`,
    reference: `RR-${new Date().getFullYear()}-${String(nextNumber).padStart(4, "0")}`,
    problemType: input.problemType,
    address: input.address,
    district: input.district,
    description: input.description,
    lat: 48.85 + Math.random() * 0.05,
    lng: 2.34 + Math.random() * 0.05,
    citizenName: input.citizenName || undefined,
    citizenEmail: input.citizenEmail || undefined,
    status: "CREATED",
    contractorId: null,
    createdAt: now,
    updatedAt: now,
    photos,
    history: [
      {
        id: `h-${uid()}`,
        status: "CREATED",
        at: now,
        actor: input.citizenName || "Citoyen anonyme",
        role: "CITIZEN",
        comment: "Demande déposée via le portail citoyen.",
      },
    ],
    dispatcherNotes: [],
    contractorNotes: [],
  };

  setState({ ...state, requests: [request, ...state.requests] });
  return request;
}

export function findByReference(reference: string): RepairRequest | undefined {
  const needle = reference.trim().toUpperCase();
  return state.requests.find((r) => r.reference.toUpperCase() === needle);
}

/* ---------------- workflow ---------------- */

export interface TransitionOptions {
  comment?: string;
  actor: string;
  role: Role;
  contractorId?: string | null;
  controlPassed?: boolean;
  photoLabels?: { before?: string; after?: string };
}

export function transitionRequest(
  id: string,
  to: RequestStatus,
  options: TransitionOptions,
): boolean {
  const request = state.requests.find((r) => r.id === id);
  if (!request || !canTransition(request.status, to, options.role)) return false;

  const now = new Date().toISOString();
  const entry: HistoryEntry = {
    id: `h-${uid()}`,
    status: to,
    at: now,
    actor: options.actor,
    role: options.role,
    comment: options.comment,
  };

  updateRequest(id, (r) => {
    const photos = [...r.photos];
    if (options.photoLabels?.before) {
      photos.push({
        id: `p-${uid()}`,
        label: options.photoLabels.before,
        kind: "before",
        seed: uid(),
      });
    }
    if (options.photoLabels?.after) {
      photos.push({
        id: `p-${uid()}`,
        label: options.photoLabels.after,
        kind: "after",
        seed: uid(),
      });
    }

    return {
      ...r,
      status: to,
      updatedAt: now,
      closedAt: to === "CLOSED" ? now : r.closedAt,
      contractorId:
        options.contractorId !== undefined ? options.contractorId : r.contractorId,
      photos,
      history: [...r.history, entry],
      contractorNotes:
        options.role === "CONTRACTOR" && options.comment
          ? [
              ...r.contractorNotes,
              {
                id: `n-${uid()}`,
                at: now,
                actor: options.actor,
                role: "CONTRACTOR" as const,
                text: options.comment,
              },
            ]
          : r.contractorNotes,
      controlResult:
        to === "CONTROLLED"
          ? {
              at: now,
              actor: options.actor,
              passed: options.controlPassed ?? true,
              comment: options.comment || "Contrôle qualité réalisé.",
            }
          : r.controlResult,
    };
  });
  return true;
}

export function assignContractor(id: string, contractorId: string, actor: string): boolean {
  const contractor = state.contractors.find((c) => c.id === contractorId);
  if (!contractor) return false;
  return transitionRequest(id, "ASSIGNED", {
    actor,
    role: "ADMIN",
    contractorId,
    comment: `Intervention confiée à ${contractor.name}.`,
  });
}

export function addNote(id: string, text: string, actor: string, role: Role) {
  const note: Note = { id: `n-${uid()}`, at: new Date().toISOString(), actor, role, text };
  updateRequest(id, (r) => ({
    ...r,
    updatedAt: note.at,
    dispatcherNotes: role === "ADMIN" ? [...r.dispatcherNotes, note] : r.dispatcherNotes,
    contractorNotes: role === "CONTRACTOR" ? [...r.contractorNotes, note] : r.contractorNotes,
  }));
}
