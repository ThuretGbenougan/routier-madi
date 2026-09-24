import { z } from "zod";

const requestStatus = z.enum([
  "CREATED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CONTROLLED",
  "CLOSED",
  "REJECTED",
]);

const problemType = z.enum(["POTHOLE", "PAVEMENT", "CRACK", "SIDEWALK", "DRAINAGE", "MARKING", "OTHER"]);

export const createRequestSchema = z.object({
  problemType,
  address: z.string().trim().min(5).max(300),
  district: z.string().trim().min(1).max(100),
  description: z.string().trim().min(15).max(5000),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  citizenName: z.string().trim().min(1).max(120).optional(),
  citizenEmail: z.string().trim().email().max(254).optional(),
});

export const transitionSchema = z.object({
  to: requestStatus,
  comment: z.string().trim().min(1).max(2000).optional(),
  controlPassed: z.boolean().optional(),
});

export const assignSchema = z.object({
  contractorId: z.string().cuid(),
  comment: z.string().trim().min(1).max(2000).optional(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const requestListSchema = z.object({
  status: requestStatus.optional(),
  contractorId: z.string().cuid().optional(),
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
