import { Camera, ImageOff } from "lucide-react";
import type { Photo } from "@/types";

const kindLabels = {
  citizen: "Photo citoyen",
  before: "Avant travaux",
  after: "Après travaux",
} as const;

function hue(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function PhotoTile({ photo }: { photo: Photo }) {
  const h = hue(photo.seed);
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-muted">
      <div
        className="flex aspect-4/3 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, oklch(0.78 0.04 ${h}), oklch(0.62 0.05 ${(h + 40) % 360}))`,
        }}
      >
        <Camera className="size-7 text-white/85" aria-hidden />
      </div>
      <figcaption className="px-2.5 py-2 text-xs text-muted-foreground">
        <span className="block font-medium text-foreground">{photo.label}</span>
        {kindLabels[photo.kind]}
      </figcaption>
    </figure>
  );
}

export function PhotoGrid({ photos, empty }: { photos: Photo[]; empty?: string }) {
  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImageOff className="size-4" aria-hidden />
        {empty ?? "Aucune photo disponible."}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => (
        <PhotoTile key={p.id} photo={p} />
      ))}
    </div>
  );
}
