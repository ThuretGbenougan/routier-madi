import { describe, expect, it } from "vitest";
import { contractors } from "../src/mocks/contractors";
import { assignSchema, requestListSchema } from "../src/server/validation/request-schemas.server";

describe("contractor identifiers", () => {
  it("accepts every seeded contractor for assignment and filtering", () => {
    for (const { id } of contractors) {
      expect(assignSchema.parse({ contractorId: id }).contractorId).toBe(id);
      expect(requestListSchema.parse({ contractorId: id }).contractorId).toBe(id);
    }
  });
  it("continues to accept generated contractor identifiers", () => {
    const id = "cmul7d9jo000304kxa53t8w2t";
    expect(assignSchema.parse({ contractorId: id }).contractorId).toBe(id);
  });
  it.each(["", "   ", "a".repeat(129), "../c1"])("rejects invalid identifier %s", (id) => {
    expect(assignSchema.safeParse({ contractorId: id }).success).toBe(false);
  });
});
