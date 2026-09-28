import { describe, it, expect } from "vitest";
import { assertPhotoAllowed, isMlEligible } from "../src/server/services/photo-policy";
import { assertCompletion, assertControl } from "../src/server/services/workflow-policy";
import { mlResponseSchema } from "../src/server/integrations/ml-client.server";

describe("workflow invariants", () => {
  it("requires both report and after evidence", () => {
    expect(() => assertCompletion("done", true)).toThrow();
    expect(() => assertCompletion("Road repaired", false)).toThrow();
    expect(() => assertCompletion("Road repaired", true)).not.toThrow();
  });
  it("rejects negative and stale controls", () => {
    expect(() => assertControl("CONTROLLED", false)).toThrow();
    expect(() => assertControl("CLOSED", undefined, { passed: true, cycle: 1 }, 2)).toThrow();
    expect(() => assertControl("CLOSED", undefined, { passed: true, cycle: 2 }, 2)).not.toThrow();
  });
  it("enforces photo roles and terminal states", () => {
    expect(() => assertPhotoAllowed("CLOSED", "citizen", null)).toThrow();
    expect(() => assertPhotoAllowed("CREATED", "after", null)).toThrow();
    expect(() => assertPhotoAllowed("IN_PROGRESS", "citizen", "CONTRACTOR")).toThrow();
    expect(() => assertPhotoAllowed("IN_PROGRESS", "after", "CONTRACTOR")).not.toThrow();
  });
  it("limits ML to real citizen pothole images", () => {
    expect(isMlEligible("POTHOLE", "CITIZEN", "cloudinary")).toBe(true);
    expect(isMlEligible("POTHOLE", "AFTER", "cloudinary")).toBe(false);
    expect(isMlEligible("CRACK", "CITIZEN", "cloudinary")).toBe(false);
    expect(isMlEligible("POTHOLE", "CITIZEN", "demo")).toBe(false);
  });
});

describe("ML response contract", () => {
  const base = {
    duration_ms: 12,
    model_version: "test",
    image_width: 100,
    image_height: 50,
    coordinates: "xyxy_pixels",
  };
  it("accepts zero detections as success", () => {
    expect(mlResponseSchema.parse({ ...base, detections: [] }).detections).toEqual([]);
  });
  it("rejects invalid bounding boxes", () => {
    for (const box of [
      [-1, 0, 20, 20],
      [0, 0, 101, 20],
      [20, 0, 10, 20],
      [0, 0, 20, 51],
    ]) {
      expect(
        mlResponseSchema.safeParse({
          ...base,
          detections: [{ label: "pothole", confidence: 0.8, box }],
        }).success,
      ).toBe(false);
    }
  });
});
