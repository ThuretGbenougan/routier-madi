import type { Session } from "@/types";
import { apiRequest, setTauriAccessToken } from "./client";

type LoginInput = { email: string; password: string; role?: "ADMIN" | "CONTRACTOR" };
type LoginResponse = { session: Session; accessToken?: string };

export const authApi = {
  activate: (token: string, password: string) =>
    apiRequest<{ activated: true; role: "ADMIN" | "CONTRACTOR" }>("/api/v1/auth/activate", {
      method: "POST",
      body: { token, password },
    }),
  async login(input: LoginInput) {
    const result = await apiRequest<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: input,
    });
    setTauriAccessToken(result.accessToken ?? null);
    return result.session;
  },
  async logout() {
    await apiRequest<{ ok: true }>("/api/v1/auth/logout", { method: "POST" });
    setTauriAccessToken(null);
  },
  async me() {
    return apiRequest<{ session: Session }>("/api/v1/auth/me").then((result) => result.session);
  },
};
