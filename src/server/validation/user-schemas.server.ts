import { z } from "zod";
import { contractorSchema, invitationSchema } from "./contractor-schemas.server";

export const userSchema = invitationSchema
  .extend({
    name: z.string().trim().min(1).max(100),
    email: contractorSchema.shape.email,
  })
  .strict();
export const usersQuerySchema = z.object({
  search: z.string().trim().max(254).default(""),
  role: z.enum(["ADMIN", "CONTRACTOR"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
