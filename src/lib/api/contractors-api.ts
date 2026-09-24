import type { Contractor } from "@/types";
import { apiRequest } from "./client";

export const contractorsApi = {
  list: () => apiRequest<{ contractors: Contractor[] }>("/api/v1/contractors"),
};
