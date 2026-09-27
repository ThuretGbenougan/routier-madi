import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n/LanguageProvider";
import { formatDate } from "@/lib/format";
import { useApiState } from "@/lib/api/app-state";
import type { RequestStatus } from "@/types";

export const Route = createFileRoute("/admin/requests/")({
  head: () => ({
    meta: [
      { title: "Demandes de réparation — Administration Voirie Connect" },
      {
        name: "description",
        content: "Liste filtrable de toutes les demandes de réparation de voirie de la ville.",
      },
      { property: "og:title", content: "Demandes de réparation — Administration" },
      { property: "og:description", content: "Recherche et filtrage des demandes de voirie." },
    ],
  }),
  component: RequestsList,
});

const allStatuses: RequestStatus[] = [
  "CREATED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONTROLLED",
  "CLOSED",
  "REJECTED",
];

function RequestsList() {
  const { requests, contractors } = useApiState();
  const { t, lang, statusLabel, problemLabel } = useI18n();
  const [status, setStatus] = useState<string>("ALL");
  const [contractorId, setContractorId] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const locationText = (request: { address?: string | undefined }) =>
    request.address ?? t("location.mapOnly");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests
      .filter((r) => (status === "ALL" ? true : r.status === status))
      .filter((r) =>
        contractorId === "ALL"
          ? true
          : contractorId === "NONE"
            ? r.contractorId === null
            : r.contractorId === contractorId,
      )
      .filter((r) =>
        q
          ? [r.reference, r.address, r.description, r.district].join(" ").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, status, contractorId, query]);

  const reset = () => {
    setStatus("ALL");
    setContractorId("ALL");
    setQuery("");
  };

  return (
    <AdminShell
      title={t("admin.requests.title")}
      description={t("admin.requests.description", {
        filtered: filtered.length,
        total: requests.length,
      })}
    >
      <section className="surface-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("admin.requests.filters")}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="search">{t("admin.requests.search")}</Label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="search"
                className="pl-9"
                placeholder={t("admin.requests.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">{t("admin.requests.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("admin.requests.allStatuses")}</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractor">{t("admin.requests.contractor")}</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger id="contractor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("admin.requests.allContractors")}</SelectItem>
                <SelectItem value="NONE">{t("admin.requests.noContractor")}</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>
          {t("admin.requests.resetFilters")}
        </Button>
      </section>

      <section className="surface-card mt-4 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.requests.col.reference")}</TableHead>
                <TableHead>{t("admin.requests.col.address")}</TableHead>
                <TableHead>{t("admin.requests.col.type")}</TableHead>
                <TableHead>{t("admin.requests.col.status")}</TableHead>
                <TableHead>{t("admin.requests.col.contractor")}</TableHead>
                <TableHead>{t("admin.requests.col.created")}</TableHead>
                <TableHead>{t("admin.requests.col.updated")}</TableHead>
                <TableHead className="text-right">{t("admin.requests.col.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.reference}</TableCell>
                  <TableCell className="max-w-56 truncate">{locationText(r)}</TableCell>
                  <TableCell>{problemLabel(r.problemType)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contractors.find((c) => c.id === r.contractorId)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.createdAt, lang)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.updatedAt, lang)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/requests/$id" params={{ id: r.id }}>
                        {t("admin.requests.open")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ul className="divide-y divide-border md:hidden">
          {filtered.map((r) => (
            <li key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.reference}</p>
                  <p className="truncate text-sm text-muted-foreground">{locationText(r)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {problemLabel(r.problemType)} · {formatDate(r.createdAt, lang)}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/admin/requests/$id" params={{ id: r.id }}>
                  {t("admin.requests.openRequest")}
                </Link>
              </Button>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-medium">{t("admin.requests.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.requests.emptyDescription")}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
              {t("admin.requests.resetFilters")}
            </Button>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
