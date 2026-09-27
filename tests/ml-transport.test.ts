import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/server/env.server", () => ({
  getServerEnv: () => ({
    ML_API_URL: "https://ml.test",
    ML_API_KEY: "test-key",
    PUBLIC_APP_URL: "https://app.test",
    QSTASH_CURRENT_SIGNING_KEY: "current-test",
    QSTASH_NEXT_SIGNING_KEY: "next-test",
  }),
}));
import { analyzeRoadImage } from "../src/server/integrations/ml-client.server";
import { verifyQstash } from "../src/server/integrations/qstash.server";

afterEach(() => vi.unstubAllGlobals());
describe("external transport contracts", () => {
  it("sends the file field with server authentication", async () => {
    const fetcher = vi.fn(async (_url, init) => {
      expect(init.headers["x-api-key"]).toBe("test-key");
      expect(init.body.get("file")).toBeInstanceOf(File);
      expect(init.body.has("image")).toBe(false);
      return Response.json({
        detections: [],
        duration_ms: 1,
        model_version: "test",
        image_width: 10,
        image_height: 10,
        coordinates: "xyxy_pixels",
      });
    });
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await analyzeRoadImage(new File(["test"], "test.png"), "analysis-test")).detections,
    ).toEqual([]);
  });
  it("does not retry invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    await expect(
      analyzeRoadImage(new File(["test"], "test.png"), "analysis-test"),
    ).rejects.toMatchObject({ retryable: false, code: "ML_HTTP_401" });
  });
  it("retries cold-start server failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    await expect(
      analyzeRoadImage(new File(["test"], "test.png"), "analysis-test"),
    ).rejects.toMatchObject({ retryable: true });
  });
  it("rejects unsigned and forged queue deliveries", async () => {
    for (const signature of ["", "invalid-signature"]) {
      await expect(
        verifyQstash(
          new Request("https://app.test/api/internal/ml/process", {
            method: "POST",
            headers: { "upstash-signature": signature },
            body: "{}",
          }),
        ),
      ).rejects.toMatchObject({ status: 401 });
    }
  });
});
