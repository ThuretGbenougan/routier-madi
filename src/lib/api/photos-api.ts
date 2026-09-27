import type { Photo } from "@/types";
import { apiRequest } from "./client";

const transferred = new Set<string>();
const keys = new WeakMap<File, Map<string, string>>();
type Reservation = {
  uploadId: string;
  confirmed: boolean;
  url?: string;
  fields?: Record<string, string | number | boolean>;
};

export const photosApi = {
  async upload(
    requestId: string,
    file: File,
    kind: Photo["kind"] = "citizen",
    trackingToken?: string,
    onProgress?: (percent: number) => void,
  ) {
    if (!keys.has(file)) keys.set(file, new Map());
    const scope = `${requestId}:${kind}`;
    const fileKeys = keys.get(file)!;
    if (!fileKeys.has(scope)) fileKeys.set(scope, crypto.randomUUID());
    const reservation = await apiRequest<Reservation>(
      `/api/v1/requests/${requestId}/photo-uploads`,
      {
        method: "POST",
        body: {
          kind,
          label: file.name.slice(0, 160),
          idempotencyKey: fileKeys.get(scope),
          trackingToken,
        },
      },
    );
    if (!reservation.confirmed && !transferred.has(reservation.uploadId)) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", reservation.url!);
        xhr.timeout = 120_000;
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 90));
        };
        xhr.onerror = xhr.ontimeout = () => reject(new Error("PHOTO_TRANSFER_FAILED"));
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("PHOTO_TRANSFER_FAILED"));
        const form = new FormData();
        for (const [key, value] of Object.entries(reservation.fields!))
          form.set(key, String(value));
        form.set("file", file);
        xhr.send(form);
      });
    }
    transferred.add(reservation.uploadId);
    const result = await apiRequest<{ photo: Photo }>(
      `/api/v1/requests/${requestId}/photo-uploads/${reservation.uploadId}/complete`,
      {
        method: "POST",
        body: { trackingToken },
        timeoutMs: 60_000,
      },
    );
    onProgress?.(100);
    return result;
  },
  retry: (photoId: string) =>
    apiRequest(`/api/v1/photos/${photoId}/analysis/retry`, { method: "POST" }),
};
