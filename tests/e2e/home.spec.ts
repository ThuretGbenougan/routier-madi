import { test, expect } from "@playwright/test";

const copy = {
  fr: {
    title: "Un problème dans votre rue ? Signalez-le.",
    loading: "Chargement des statistiques…",
    unavailable: "Pas encore disponible",
    error: "Les statistiques ne sont pas disponibles pour le moment.",
    retry: "Réessayer",
    short: "Moins de 24 h",
    days: "2,5 jours",
    track: "Suivre mon signalement",
  },
  ru: {
    title: "Проблема на вашей улице? Сообщите нам.",
    loading: "Загрузка статистики…",
    unavailable: "Пока нет данных",
    error: "Статистика сейчас недоступна.",
    retry: "Повторить",
    short: "Менее 24 ч",
    days: "2,5 дн.",
    track: "Проверить мою заявку",
  },
};

for (const lang of ["fr", "ru"] as const) {
  test(`home statistics distinguish loading empty failure and real duration in ${lang}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (language) => localStorage.setItem("voirie-connect-lang", language),
      lang,
    );
    await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: { session: null } }));
    let state: "empty" | "error" | "short" | "days" = "empty";
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/public/stats", async (route) => {
      await pending;
      if (state === "error")
        return route.fulfill({
          status: 500,
          json: { error: { code: "INTERNAL_ERROR", message: "Test failure" } },
        });
      return route.fulfill({
        json: {
          total: state === "empty" ? 0 : 4,
          inProgress: 0,
          closed: state === "empty" ? 0 : 4,
          averageDurationDays: state === "days" ? 2.5 : state === "short" ? 0.5 : 0,
        },
      });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy[lang].title);
    await expect(page.getByRole("status")).toHaveText(copy[lang].loading);
    await expect(page.locator("dl dd")).toHaveText(["—", "—", "—", "—"]);
    release();
    await expect(page.locator("dl dd")).toHaveText(["0", "0", "0", copy[lang].unavailable]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({ path: `test-results/home-${lang}-empty.png`, fullPage: true });

    state = "error";
    await page.reload();
    await expect(page.getByRole("alert")).toContainText(copy[lang].error, { timeout: 15000 });
    await expect(page.locator("dl dd")).toHaveText(["—", "—", "—", "—"]);
    state = "short";
    await page.getByRole("button", { name: copy[lang].retry, exact: true }).click();
    await expect(page.locator("dl dd")).toHaveText(["4", "0", "4", copy[lang].short]);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.screenshot({ path: `test-results/home-${lang}-short.png`, fullPage: true });

    state = "days";
    await page.reload();
    await expect(page.locator("dl dd").last()).toHaveText(copy[lang].days);
    await expect(page.getByRole("link", { name: copy[lang].track, exact: true })).toHaveCount(2);
    await expect(
      page.getByRole("link", { name: copy[lang].track, exact: true }).first(),
    ).toHaveAttribute("href", "/track");
  });
}
