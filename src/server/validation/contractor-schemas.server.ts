import { z } from "zod";

export const invitationSchema = z.object({ language: z.enum(["fr", "ru"]) });
export const contractorSchema = invitationSchema.extend({
  name: z.string().trim().min(1).max(150),
  specialty: z.string().trim().min(1).max(150),
  contact: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(3).max(40),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});
export const activationSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: z.string().min(12).max(128),
});
