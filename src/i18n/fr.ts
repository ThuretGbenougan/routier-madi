import type { ProblemType, RequestStatus } from "@/types";

export const statusLabels: Record<RequestStatus, string> = {
  CREATED: "Créée",
  VERIFIED: "Vérifiée",
  ASSIGNED: "Attribuée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Travaux terminés",
  CONTROLLED: "Contrôlée",
  CLOSED: "Clôturée",
  REJECTED: "Rejetée",
};

export const statusOrder: RequestStatus[] = [
  "CREATED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONTROLLED",
  "CLOSED",
];

export const problemLabels: Record<ProblemType, string> = {
  POTHOLE: "Nid-de-poule",
  PAVEMENT: "Chaussée dégradée",
  CRACK: "Fissure de voirie",
  SIDEWALK: "Trottoir endommagé",
  DRAINAGE: "Problème d'écoulement",
  MARKING: "Marquage au sol",
  OTHER: "Autre",
};

export const roleLabels = {
  CITIZEN: "Citoyen",
  ADMIN: "Service voirie",
  CONTRACTOR: "Entreprise",
};

export const appName = "Voirie Connect";
export const cityName = "Ville de Valmont";
