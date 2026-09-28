import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { photosApi } from "@/lib/api/photos-api";
import { requestsApi } from "@/lib/api/requests-api";
import { ApiError } from "@/lib/api/client";
import { YandexLocationPicker } from "@/components/YandexLocationPicker";
import type { ProblemType } from "@/types";
import { useI18n } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Déposer un signalement — Voirie Connect" },
      {
        name: "description",
        content:
          "Décrivez le problème de voirie, placez un repère sur la carte et obtenez un numéro de suivi.",
      },
      { property: "og:title", content: "Déposer un signalement — Voirie Connect" },
      {
        property: "og:description",
        content: "Formulaire de signalement d'un problème de voirie de la Ville de Valmont.",
      },
    ],
  }),
  component: ReportPage,
});

const districts = ["Centre", "Nord", "Sud", "Est", "Ouest"];
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
type FormErrors = {
  problemType?: string;
  address?: string;
  district?: string;
  description?: string;
  email?: string;
  location?: string;
};
type SelectedPhoto = { file: File; url: string };
type FailedPhoto = SelectedPhoto & { errorMessage: string };
type Confirmation = {
  requestId: string;
  reference: string;
  trackingToken: string;
  failedPhotos: FailedPhoto[];
};

function ReportPage() {
  const { t, problemLabel } = useI18n();
  const navigate = useNavigate();
  const [problemType, setProblemType] = useState<ProblemType | "">("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const photoUrls = useRef(new Set<string>());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const problemTypes: ProblemType[] = [
    "POTHOLE",
    "PAVEMENT",
    "CRACK",
    "SIDEWALK",
    "DRAINAGE",
    "MARKING",
    "OTHER",
  ];

  useEffect(
    () => () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrls.current.clear();
    },
    [],
  );

  function releasePhoto(photo: SelectedPhoto) {
    URL.revokeObjectURL(photo.url);
    photoUrls.current.delete(photo.url);
  }

  function apiMessage(error: unknown) {
    const apiError = error instanceof ApiError ? error : null;
    const detailCode = apiError?.details.find((detail) => detail.code?.startsWith("PHOTO_"))?.code;
    const code = detailCode ?? apiError?.code ?? "NETWORK_ERROR";
    const messages: Record<string, string> = {
      VALIDATION_ERROR: "report.api.VALIDATION_ERROR",
      PHOTO_REQUIRED: "report.api.PHOTO_REQUIRED",
      PHOTO_INVALID_TYPE: "report.api.PHOTO_INVALID_TYPE",
      PHOTO_TOO_LARGE: "report.api.PHOTO_TOO_LARGE",
      PHOTO_INVALID_IMAGE: "report.api.PHOTO_INVALID_IMAGE",
      STORAGE_SERVICE_UNAVAILABLE: "report.api.STORAGE_SERVICE_UNAVAILABLE",
      RATE_LIMIT_EXCEEDED: "report.api.RATE_LIMIT_EXCEEDED",
      REQUEST_TIMEOUT: "report.api.REQUEST_TIMEOUT",
      NETWORK_ERROR: "report.api.NETWORK_ERROR",
    };
    return t((messages[code] ?? "report.api.UNKNOWN_ERROR") as never);
  }

  function validate() {
    const next: FormErrors = {};
    if (!problemType) next.problemType = t("report.error.problemType");
    if (address.trim() && address.trim().length < 5) next.address = t("report.error.address");
    if (description.trim().length < 15) next.description = t("report.error.description");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = t("report.error.email");
    if (!location) next.location = t("report.error.location");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function showCreateError(error: unknown) {
    if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
      const fieldErrors: FormErrors = {};
      for (const detail of error.details) {
        if (detail.path === "problemType") fieldErrors.problemType = t("report.error.problemType");
        if (detail.path === "address") fieldErrors.address = t("report.error.address");
        if (detail.path === "district") fieldErrors.district = t("report.error.district");
        if (detail.path === "description") fieldErrors.description = t("report.error.description");
        if (detail.path === "citizenEmail") fieldErrors.email = t("report.error.email");
        if (detail.path === "lat" || detail.path === "lng")
          fieldErrors.location = t("report.error.location");
      }
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        return;
      }
    }
    toast.error(apiMessage(error));
  }

  async function uploadPhotos(
    requestId: string,
    trackingToken: string,
    selectedPhotos: SelectedPhoto[],
  ) {
    if (!selectedPhotos.length) return;
    setUploading(true);
    const results = await Promise.all(
      selectedPhotos.map(async (photo) => {
        try {
          await photosApi.upload(requestId, photo.file, "citizen", trackingToken, (percent) =>
            setProgress((current) => ({ ...current, [photo.url]: percent })),
          );
          return { photo, ok: true as const };
        } catch (error) {
          return { photo, ok: false as const, error };
        }
      }),
    );
    const failed: FailedPhoto[] = [];
    for (const result of results) {
      if (!result.ok) failed.push({ ...result.photo, errorMessage: apiMessage(result.error) });
    }
    results.filter((result) => result.ok).forEach((result) => releasePhoto(result.photo));
    setPhotos(failed);
    setConfirmation((current) => (current ? { ...current, failedPhotos: failed } : current));
    setUploading(false);
    if (failed.length) toast.warning(t("report.photos.partialUpload"));
  }

  function addPhotos(files: File[]) {
    const rejected = files.find(
      (file) => !acceptedPhotoTypes.has(file.type) || file.size <= 0 || file.size > MAX_PHOTO_BYTES,
    );
    if (rejected)
      toast.error(
        !acceptedPhotoTypes.has(rejected.type)
          ? t("report.api.PHOTO_INVALID_TYPE")
          : t("report.api.PHOTO_TOO_LARGE"),
      );
    const valid = files.filter(
      (file) => acceptedPhotoTypes.has(file.type) && file.size > 0 && file.size <= MAX_PHOTO_BYTES,
    );
    const available = MAX_PHOTOS - photos.length;
    if (valid.length > available) toast.error(t("report.photos.limit"));
    const added = valid.slice(0, Math.max(available, 0)).map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.add(url);
      return { file, url };
    });
    setPhotos((current) => [...current, ...added]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate() || !location) return;
    setSubmitting(true);
    try {
      const created = await requestsApi.create({
        problemType: problemType as ProblemType,
        description: description.trim(),
        lat: location.lat,
        lng: location.lng,
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(district ? { district } : {}),
        ...(name.trim() ? { citizenName: name.trim() } : {}),
        ...(email.trim() ? { citizenEmail: email.trim() } : {}),
      });
      const selectedPhotos = photos;
      setConfirmation({
        requestId: created.request.id,
        reference: created.request.reference,
        trackingToken: created.trackingToken,
        failedPhotos: [],
      });
      setSubmitting(false);
      void uploadPhotos(created.request.id, created.trackingToken, selectedPhotos);
    } catch (error) {
      setSubmitting(false);
      showCreateError(error);
    }
  }

  if (confirmation)
    return (
      <PublicLayout>
        <div className="mx-auto w-full max-w-xl px-4 py-14">
          <div className="surface-card p-6 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-7" aria-hidden />
            </span>
            <h1 className="mt-4 text-xl font-semibold">{t("report.success.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("report.success.text")}</p>
            <p className="mt-5 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-4 text-2xl font-semibold tracking-wider text-primary">
              {confirmation.reference}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{t("report.success.trackingCode")}</p>
            <p className="mt-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-3 font-mono text-sm text-primary">
              {confirmation.trackingToken}
            </p>
            {uploading && (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("report.photos.uploading")}{" "}
                {Math.round(
                  Object.values(progress).reduce((sum, value) => sum + value, 0) /
                    Math.max(photos.length, 1),
                )}
                %
              </p>
            )}
            {confirmation.failedPhotos.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm">
                <p>{t("report.photos.partialUpload")}</p>
                <ul className="mt-2 list-disc pl-5">
                  {confirmation.failedPhotos.map((photo) => (
                    <li key={photo.url}>
                      {photo.file.name} — {photo.errorMessage}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() =>
                    void uploadPhotos(
                      confirmation.requestId,
                      confirmation.trackingToken,
                      confirmation.failedPhotos,
                    )
                  }
                >
                  {t("report.photos.retry")}
                </Button>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() =>
                  navigate({
                    to: "/track/$reference",
                    params: { reference: confirmation.reference },
                    search: { code: confirmation.trackingToken },
                  })
                }
              >
                {t("report.success.track")}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">{t("report.success.home")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("report.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("report.subtitle")}</p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
          <section className="surface-card space-y-4 p-5">
            <h2 className="text-sm font-semibold">{t("report.section.problem")}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="problemType">{t("report.field.problemType")}</Label>
              <Select
                value={problemType}
                onValueChange={(value) => setProblemType(value as ProblemType)}
              >
                <SelectTrigger id="problemType" className="w-full">
                  <SelectValue placeholder={t("report.field.problemType.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {problemTypes.map((value) => (
                    <SelectItem key={value} value={value}>
                      {problemLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.problemType && (
                <p className="text-xs text-destructive">{errors.problemType}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address">{t("report.field.address")}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={t("report.field.address.placeholder")}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">{t("report.field.district")}</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger id="district" className="w-full">
                    <SelectValue placeholder={t("report.field.district.placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district && <p className="text-xs text-destructive">{errors.district}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t("report.field.description")}</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("report.field.description.placeholder")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </section>
          <section className="surface-card space-y-3 p-5">
            <h2 className="text-sm font-semibold">{t("report.section.photos")}</h2>
            <p className="text-xs text-muted-foreground">{t("report.photos.hint")}</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/50 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted">
              <ImagePlus className="size-4" aria-hidden />
              {t("report.photos.add")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addPhotos(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <li
                    key={photo.url}
                    className="relative overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img
                      src={photo.url}
                      alt={photo.file.name}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      aria-label={t("report.photos.remove", { name: photo.file.name })}
                      onClick={() => {
                        releasePhoto(photo);
                        setPhotos((current) => current.filter((item) => item.url !== photo.url));
                      }}
                      className="absolute top-2 right-2 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                    <p className="truncate px-2 py-1.5 text-xs">{photo.file.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface-card space-y-3 p-5">
            <h2 className="text-sm font-semibold">{t("report.section.location")}</h2>
            <YandexLocationPicker value={location} onChange={setLocation} />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </section>
          <section className="surface-card space-y-4 p-5">
            <h2 className="text-sm font-semibold">{t("report.section.contact")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("report.field.name")}</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("report.field.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>
          </section>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg" disabled={submitting} className="sm:w-auto">
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {t("report.submit")}
            </Button>
            <Button type="button" variant="ghost" size="lg" asChild>
              <Link to="/">{t("report.cancel")}</Link>
            </Button>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
