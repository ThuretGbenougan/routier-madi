import { test, expect } from "@playwright/test";

test("loads a request directly and sends a negative control to rework", async ({ page }) => {
  let state = "COMPLETED";
  const request = () => ({
    id: "request-1",
    reference: "RR-2026-0001",
    problemType: "POTHOLE",
    description: "Road repair test",
    lat: 55,
    lng: 37,
    status: state,
    contractorId: "contractor-1",
    interventionCycle: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    photos: [],
    history: [],
    dispatcherNotes: [],
    contractorNotes: [],
    controls: [],
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const session = {
      userId: "admin-1",
      name: "Admin",
      email: "admin@test.invalid",
      role: "ADMIN",
    };
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { session } });
    if (path.endsWith("/admin/bootstrap"))
      return route.fulfill({ json: { requests: [], contractors: [] } });
    if (path.endsWith("/transition")) {
      const body = route.request().postDataJSON();
      expect(body.to).toBe("IN_PROGRESS");
      expect(body.controlPassed).toBe(false);
      expect(body.comment).toBe("Travaux incomplets");
      state = "IN_PROGRESS";
      return route.fulfill({ json: { request: request() } });
    }
    if (path.endsWith("/requests/request-1"))
      return route.fulfill({ json: { request: request() } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/admin/requests/request-1");
  await expect(page.getByRole("heading", { name: "RR-2026-0001", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Demander une reprise" })).toBeDisabled();
  await page.locator("#control").fill("Travaux incomplets");
  await page.getByRole("button", { name: "Demander une reprise" }).click();
  await expect(page.getByRole("button", { name: "Demander une reprise" })).toHaveCount(0);
});

test("login does not advertise demo credentials", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: { session: null } }));
  await page.goto("/admin/login");
  await expect(page.getByText("demo123")).toHaveCount(0);
  await expect(page.locator("#password")).toBeVisible();
});
