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
import { problemLabels, statusLabels } from "@/i18n/fr";
import { formatDate } from "@/lib/format";
import { useDemoState } from "@/lib/store";
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
  const { requests, contractors } = useDemoState();
  const [status, setStatus] = useState<string>("ALL");
  const [contractorId, setContractorId] = useState<string>("ALL");
  const [query, setQuery] = useState("");

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
          ? [r.reference, r.address, r.description, r.district]
              .join(" ")
              .toLowerCase()
              .includes(q)
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
      title="Demandes"
      description={`${filtered.length} demande${filtered.length > 1 ? "s" : ""} affichée${filtered.length > 1 ? "s" : ""} sur ${requests.length}`}
    >
      <section className="surface-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtres
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="search">Recherche</Label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="search"
                className="pl-9"
                placeholder="Référence, adresse ou description"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractor">Entreprise</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger id="contractor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les entreprises</SelectItem>
                <SelectItem value="NONE">Non attribuée</SelectItem>
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
          Réinitialiser les filtres
        </Button>
      </section>

      <section className="surface-card mt-4 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Création</TableHead>
                <TableHead>Mise à jour</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.reference}</TableCell>
                  <TableCell className="max-w-56 truncate">{r.address}</TableCell>
                  <TableCell>{problemLabels[r.problemType]}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contractors.find((c) => c.id === r.contractorId)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/requests/$id" params={{ id: r.id }}>
                        Ouvrir
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
                  <p className="truncate text-sm text-muted-foreground">{r.address}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {problemLabels[r.problemType]} · {formatDate(r.createdAt)}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/admin/requests/$id" params={{ id: r.id }}>
                  Ouvrir la demande
                </Link>
              </Button>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm font-medium">Aucune demande ne correspond aux filtres</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez la recherche ou réinitialisez les filtres.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
