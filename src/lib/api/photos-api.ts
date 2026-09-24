import type { Photo } from "@/types";
import { apiRequest } from "./client";

export const photosApi = {
  upload: (requestId: string, file: File, kind: Photo["kind"] = "citizen", trackingToken?: string) => {
    const form = new FormData();
    form.set("image", file);
    form.set("kind", kind);
    if (trackingToken) form.set("trackingToken", trackingToken);
    return apiRequest<{ photo: Photo }>(`/api/v1/requests/${requestId}/photos`, { method: "POST", body: form, timeoutMs: 30_000 });
  },
};
