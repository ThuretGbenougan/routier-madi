import type { User } from "@/types";

export const users: User[] = [
  {
    id: "u1",
    email: "admin@city.demo",
    password: "demo123",
    name: "Claire Fontaine",
    role: "ADMIN",
  },
  {
    id: "u2",
    email: "dispatch@city.demo",
    password: "demo123",
    name: "Julien Marchand",
    role: "ADMIN",
  },
  {
    id: "u3",
    email: "contractor@city.demo",
    password: "demo123",
    name: "Marc Delaunay",
    role: "CONTRACTOR",
    contractorId: "c1",
  },
  {
    id: "u4",
    email: "urbasol@city.demo",
    password: "demo123",
    name: "Karim Benali",
    role: "CONTRACTOR",
    contractorId: "c3",
  },
];
