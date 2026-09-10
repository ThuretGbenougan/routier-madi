export type RequestStatus =
  | "CREATED"
  | "VERIFIED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CONTROLLED"
  | "CLOSED"
  | "REJECTED";

export type ProblemType =
  | "POTHOLE"
  | "PAVEMENT"
  | "CRACK"
  | "SIDEWALK"
  | "DRAINAGE"
  | "MARKING"
  | "OTHER";

export type Role = "ADMIN" | "CONTRACTOR";

export interface Photo {
  id: string;
  label: string;
  kind: "citizen" | "before" | "after";
  seed: string;
}

export interface HistoryEntry {
  id: string;
  status: RequestStatus;
  at: string;
  actor: string;
  role: "CITIZEN" | Role;
  comment?: string;
}

export interface Note {
  id: string;
  at: string;
  actor: string;
  role: Role;
  text: string;
}

export interface RepairRequest {
  id: string;
  reference: string;
  problemType: ProblemType;
  address: string;
  district: string;
  description: string;
  lat: number;
  lng: number;
  citizenName?: string;
  citizenEmail?: string;
  status: RequestStatus;
  contractorId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  photos: Photo[];
  history: HistoryEntry[];
  dispatcherNotes: Note[];
  contractorNotes: Note[];
  controlResult?: {
    at: string;
    actor: string;
    passed: boolean;
    comment: string;
  };
}

export interface Contractor {
  id: string;
  name: string;
  specialty: string;
  contact: string;
  phone: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  contractorId?: string;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  contractorId?: string;
}
