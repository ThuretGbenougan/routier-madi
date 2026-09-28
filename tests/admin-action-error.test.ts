import { describe, expect, it } from "vitest";
import { adminActionErrorKey } from "../src/i18n/admin-action-error";
import { dictionaries, translate } from "../src/i18n";

describe("localized admin action errors", () => {
  it("translates assignment conflicts into the selected language", () => {
    const error = { code: "REQUEST_ALREADY_ASSIGNED", message: "French server message" };
    const key = adminActionErrorKey(error);
    expect(translate("ru", key)).toBe(
      "Это обращение больше недоступно для назначения подрядчика. Обновите страницу.",
    );
    expect(translate("fr", key)).toContain("attribution");
    expect(translate("ru", key)).not.toContain(error.message);
  });
  it("handles nested contractor validation codes", () => {
    expect(
      adminActionErrorKey({
        code: "VALIDATION_ERROR",
        details: [{ code: "CONTRACTOR_NOT_FOUND" }],
      }),
    ).toBe("admin.action.contractorUnavailable");
  });
  it.each(["INTERNAL_ERROR", "NETWORK_ERROR", "NEW_SERVER_CODE", "VALIDATION_ERROR"])(
    "uses a localized fallback for %s",
    (code) => {
      const key = adminActionErrorKey({ code });
      expect(key).toBe("work.actionError");
      expect(translate("ru", key)).toBe(dictionaries.ru["work.actionError"]);
    },
  );
  it.each([
    "REQUEST_INVALID_TRANSITION",
    "REQUEST_ALREADY_ASSIGNED",
    "REQUEST_CONCURRENT_UPDATE",
    "AUTH_SESSION_EXPIRED",
    "AUTH_INVALID_CREDENTIALS",
    "AUTH_FORBIDDEN",
    "CSRF_ORIGIN_REJECTED",
    "RATE_LIMIT_EXCEEDED",
  ])("has both translations for %s", (code) => {
    const key = adminActionErrorKey({ code });
    expect(dictionaries.fr[key]).toBeTruthy();
    expect(dictionaries.ru[key]).toBeTruthy();
    expect(dictionaries.ru[key]).not.toBe(dictionaries.fr[key]);
  });
});
