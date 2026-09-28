import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "./auth-api";
import { requestsApi } from "./requests-api";
import { getQueryClient } from "./query-client";
import { ApiError, onSessionExpired } from "./client";
import type { Contractor, RepairRequest, Session } from "@/types";

export interface ApiAppState {
  requests: RepairRequest[];
  contractors: Contractor[];
  session: Session | null;
  loading: boolean;
  error?: string | undefined;
}
let session: Session | null = null;
let initialized = false;
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function clearSession() {
  session = null;
  getQueryClient().clear();
  emit();
}
onSessionExpired(clearSession);

export function useApiState(): ApiAppState {
  const current = useSyncExternalStore(
    subscribe,
    () => session,
    () => null,
  );
  const ready = useApiInitialized();
  const query = useQuery({
    queryKey: ["bootstrap", current?.userId],
    enabled: Boolean(current),
    queryFn: async () => {
      if (current?.role === "ADMIN") return requestsApi.adminBootstrap();
      const result = await requestsApi.contractorBootstrap();
      return { ...result, contractors: [] as Contractor[] };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1,
  });
  return {
    session: current,
    requests: query.data?.requests ?? [],
    contractors: query.data?.contractors ?? [],
    loading: !ready || Boolean(current && query.isPending),
    error: query.error?.message,
  };
}
export function useApiInitialized() {
  return useSyncExternalStore(
    subscribe,
    () => initialized,
    () => false,
  );
}
export function getApiState(): ApiAppState {
  return { session, requests: [], contractors: [], loading: !initialized };
}
export async function refreshApiState(next = session) {
  if (next?.userId !== session?.userId) getQueryClient().clear();
  session = next;
  emit();
  await getQueryClient().invalidateQueries();
}
export async function hydrateApiState() {
  if (initialized) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      session = await authApi.me();
    } catch {
      session = null;
    } finally {
      initialized = true;
      emit();
    }
  })();
  return hydrationPromise;
}
export async function establishApiSession(next: Session) {
  getQueryClient().clear();
  session = next;
  initialized = true;
  emit();
}
export async function logoutApiSession() {
  try {
    await authApi.logout();
  } finally {
    clearSession();
  }
}

export function useRequest(id: string) {
  const current = useSyncExternalStore(
    subscribe,
    () => session,
    () => null,
  );
  return useQuery({
    queryKey: ["request", current?.userId, id],
    queryFn: () => requestsApi.get(id),
    enabled: Boolean(current),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.request.photos.some(
        (p) => p.analysis && ["PENDING", "PROCESSING"].includes(p.analysis.status),
      )
        ? 5000
        : 30_000,
    retry: (count, error) =>
      !(error instanceof ApiError && [401, 404].includes(error.status)) && count < 1,
  });
}
