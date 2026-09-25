import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
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
          "Décrivez le problème de voirie, indiquez l'adresse et ajoutez des photos pour obtenir un numéro de suivi.",
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

type FormErrors = {
  problemType?: string;
  address?: string;
  district?: string;
  description?: string;
  email?: string;
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ reference: string; trackingToken: string } | null>(null);

  const problemTypes: ProblemType[] = [
    "POTHOLE",
    "PAVEMENT",
    "CRACK",
    "SIDEWALK",
    "DRAINAGE",
    "MARKING",
    "OTHER",
  ];

  function validate() {
    const next: FormErrors = {};
    if (!problemType) next.problemType = t("report.error.problemType");
    if (address.trim().length < 5) next.address = t("report.error.address");
    if (!district) next.district = t("report.error.district");
    if (description.trim().length < 15) next.description = t("report.error.description");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      next.email = t("report.error.email");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!location) { toast.error("Veuillez confirmer l’emplacement sur la carte."); return; }
    setSubmitting(true);
    try {
      const created = await requestsApi.create({
        problemType: problemType as ProblemType,
        address: address.trim(),
        district,
        description: description.trim(),
        citizenName: name.trim(),
        citizenEmail: email.trim(),
        lat: location.lat,
        lng: location.lng,
      });
      for (const photo of photos) await photosApi.upload(created.request.id, photo, "citizen", created.trackingToken);
      setSubmitting(false);
      setConfirmation({ reference: created.request.reference, trackingToken: created.trackingToken });
      toast.success(t("report.toast.success"), { description: created.request.reference });
    } catch {
      setSubmitting(false);
      toast.error("Le signalement n’a pas pu être envoyé.");
    }
  }

  if (confirmation) {
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
            <p className="mt-4 text-sm text-muted-foreground">Code de suivi à conserver :</p>
            <p className="mt-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 py-3 font-mono text-sm text-primary">{confirmation.trackingToken}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() =>
                  navigate({ to: "/track/$reference", params: { reference: confirmation.reference }, search: { code: confirmation.trackingToken } })
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
  }

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
                onValueChange={(v) => setProblemType(v as ProblemType)}
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
                  onChange={(e) => setAddress(e.target.value)}
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
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
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
                onChange={(e) => setDescription(e.target.value)}
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
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPhotos((p) => [...p, ...files].slice(0, 5));
                  e.target.value = "";
                }}
              />
            </label>
            {photos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <li
                    key={`${p.name}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                  >
                    {p.name}
                    <button
                      type="button"
                      aria-label={t("report.photos.remove", { name: p.name })}
                      onClick={() => setPhotos((list) => list.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
            >
              {t("report.photos.simulate")}
            </Button>
          </section>

          <section className="surface-card space-y-3 p-5">
            <h2 className="text-sm font-semibold">Localisation</h2>
            <YandexLocationPicker value={location} onChange={setLocation} />
          </section>

          <section className="surface-card space-y-4 p-5">
            <h2 className="text-sm font-semibold">{t("report.section.contact")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("report.field.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("report.field.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
