import { test, expect } from "@playwright/test";

test("lists filters paginates and creates administrators", async ({ page }) => {
  let created = false;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          session: { userId: "admin", name: "Admin", email: "admin@test.invalid", role: "ADMIN" },
        },
      });
    if (url.pathname.endsWith("/admin/bootstrap"))
      return route.fulfill({ json: { requests: [], contractors: [] } });
    if (url.pathname.endsWith("/users")) {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toEqual({
          name: "New Admin",
          email: "new@test.invalid",
          language: "ru",
        });
        created = true;
        return route.fulfill({ json: { userId: "new", delivery: "FAILED" } });
      }
      const filtered = url.searchParams.get("role") || url.searchParams.get("search");
      return route.fulfill({
        json: {
          invitationsEnabled: true,
          total: filtered ? 1 : 26,
          users: [
            {
              id: "1",
              name: url.searchParams.get("page") === "2" ? "Second page" : "First Admin",
              emailNormalized: "first@test.invalid",
              role: "ADMIN",
              active: true,
              accountActivated: false,
              contractor: null,
              invitation: {
                status: "PENDING",
                delivery: "ACCEPTED",
                language: "fr",
                expiresAt: new Date().toISOString(),
              },
            },
          ],
        },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Utilisateurs" })).toBeVisible();
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.getByText("Second page")).toBeVisible();
  await page.locator("#users-search").fill("First");
  await expect(page.getByText("First Admin")).toBeVisible();
  await expect(page.getByRole("button", { name: "Suivant", exact: true })).toBeDisabled();
  await page.locator("#users-role").selectOption("ADMIN");
  await page.getByRole("button", { name: "Créer un administrateur", exact: true }).click();
  await page.locator("#user-name").fill("New Admin");
  await page.locator("#user-email").fill("new@test.invalid");
  await page.locator("#invitation-language").selectOption("ru");
  await page.getByRole("button", { name: "Créer et inviter" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(created).toBe(true);
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Пользователи");
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10000 });
  await page.screenshot({ path: "test-results/users-ru.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: "test-results/users-mobile.png", fullPage: true });
});

test("keeps listing available when invitations are not configured", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          session: { userId: "admin", role: "ADMIN", name: "Admin", email: "admin@test.invalid" },
        },
      });
    if (path.endsWith("/users"))
      return route.fulfill({ json: { users: [], total: 0, invitationsEnabled: false } });
    return route.fulfill({ json: { requests: [], contractors: [] } });
  });
  await page.goto("/admin/users");
  await expect(
    page.getByRole("button", { name: "Créer un administrateur", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Aucun compte trouvé.")).toBeVisible();
});

for (const role of ["ADMIN", "CONTRACTOR"] as const) {
  test(`activates ${role} through compatible entry and redirects to correct login`, async ({
    page,
  }) => {
    await page.route("**/api/v1/**", (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/auth/activate")) {
        expect(route.request().postDataJSON().token).toBe("a".repeat(43));
        return route.fulfill({ json: { activated: true, role } });
      }
      return route.fulfill({ json: { session: null } });
    });
    await page.goto(
      `${role === "ADMIN" ? "/activate" : "/contractor/activate"}#token=${"a".repeat(43)}&lang=fr`,
    );
    await page.locator("#password").fill("New-password-123");
    await page.locator("#confirmation").fill("New-password-123");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}/login$`));
  });
}
