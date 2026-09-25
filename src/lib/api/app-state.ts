import { useSyncExternalStore } from "react";
import { authApi } from "./auth-api";
import { requestsApi } from "./requests-api";
import type { Contractor, RepairRequest, Session } from "@/types";

export interface ApiAppState {
  requests: RepairRequest[];
  contractors: Contractor[];
  session: Session | null;
  loading: boolean;
}

const emptyState: ApiAppState = { requests: [], contractors: [], session: null, loading: true };
let state = emptyState;
const serverState = emptyState;
let initialized = false;
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: ApiAppState) {
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApiState() {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export function useApiInitialized() {
  return useSyncExternalStore(subscribe, () => initialized, () => false);
}

export function getApiState() {
  return state;
}

export async function refreshApiState(session = state.session) {
  if (!session) {
    setState({ requests: [], contractors: [], session: null, loading: false });
    return;
  }
  setState({ ...state, session, loading: true });
  try {
    if (session.role === "ADMIN") {
      const result = await requestsApi.adminBootstrap();
      setState({ session, requests: result.requests, contractors: result.contractors, loading: false });
    } else {
      const result = await requestsApi.contractorBootstrap();
      setState({ session, requests: result.requests, contractors: [], loading: false });
    }
  } catch {
    setState({ requests: [], contractors: [], session: null, loading: false });
  }
}

export async function hydrateApiState() {
  if (initialized) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      await refreshApiState(await authApi.me());
    } catch {
      setState({ requests: [], contractors: [], session: null, loading: false });
    } finally {
      initialized = true;
      emit();
    }
  })();
  return hydrationPromise;
}

export async function establishApiSession(session: Session) {
  await refreshApiState(session);
}

export async function logoutApiSession() {
  try {
    await authApi.logout();
  } finally {
    setState({ requests: [], contractors: [], session: null, loading: false });
  }
}
