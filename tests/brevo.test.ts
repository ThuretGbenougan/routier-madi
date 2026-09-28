import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const environment = vi.hoisted(() => ({
  BREVO_API_KEY: "test-key",
  BREVO_SENDER_NAME: "Test",
  BREVO_SENDER_EMAIL: "sender@test.invalid",
  PUBLIC_APP_URL: "https://app.test.invalid",
}));
vi.mock("../src/server/env.server", () => ({ getServerEnv: () => environment }));
import {
  invitationEmail,
  sendInvitationEmail,
  invitationsConfigured,
  requireInvitationConfig,
} from "../src/server/integrations/brevo.server";
import {
  contractorSchema,
  activationSchema,
} from "../src/server/validation/contractor-schemas.server";

describe("invitation mail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    environment.BREVO_SENDER_EMAIL = "sender@test.invalid";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("disables invitations for a missing or invalid sender", () => {
    expect(invitationsConfigured()).toBe(true);
    environment.BREVO_SENDER_EMAIL = "";
    expect(invitationsConfigured()).toBe(false);
    environment.BREVO_SENDER_EMAIL = "not-an-email";
    expect(invitationsConfigured()).toBe(false);
    expect(requireInvitationConfig).toThrow("Les invitations ne sont pas encore configurées.");
  });
  it("escapes user content and provides localized text and html", () => {
    const email = invitationEmail(
      '<img src=x onerror="bad">',
      "https://app.test/#token=a&lang=fr",
      "fr",
    );
    expect(email.htmlContent).not.toContain("<img");
    expect(email.htmlContent).toContain("&lt;img");
    expect(email.htmlContent).toContain("&amp;lang=fr");
    expect(email.textContent).toContain("48 heures");
    expect(invitationEmail("Test", "https://app.test", "ru").textContent).toContain("48 часов");
  });
  it("sends the token only in the activation link fragment", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ messageId: "mail-1" }), { status: 201 }),
    );
    expect(
      await sendInvitationEmail({
        email: "user@test.invalid",
        name: "Test",
        token: "secret-token",
        language: "ru",
      }),
    ).toBe("mail-1");
    const [url, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options?.headers).toHaveProperty("api-key", "test-key");
    const body = JSON.parse(String(options?.body));
    expect(body.textContent).toContain("/contractor/activate#token=secret-token&lang=ru");
    expect(body.to[0].email).toBe("user@test.invalid");
  });
  it("sends admin invitations to the shared activation page", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ messageId: "admin-mail" }), { status: 201 }),
    );
    await sendInvitationEmail({
      email: "admin@test.invalid",
      name: "Admin",
      token: "secret-token",
      language: "fr",
      role: "ADMIN",
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]?.body));
    expect(body.textContent).toContain("/activate#token=secret-token&lang=fr");
    expect(body.textContent).toContain("administrateur");
    expect(body.textContent).not.toContain("/contractor/activate");
  });
  it.each([400, 401, 429, 500])("rejects Brevo HTTP %s", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("failure", { status }));
    await expect(
      sendInvitationEmail({
        email: "user@test.invalid",
        name: "Test",
        token: "token",
        language: "fr",
      }),
    ).rejects.toThrow("brevo_delivery_failed");
  });
  it("rejects transport and ambiguous response failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("timeout"));
    await expect(
      sendInvitationEmail({
        email: "user@test.invalid",
        name: "Test",
        token: "token",
        language: "fr",
      }),
    ).rejects.toThrow();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 201 }));
    await expect(
      sendInvitationEmail({
        email: "user@test.invalid",
        name: "Test",
        token: "token",
        language: "fr",
      }),
    ).rejects.toThrow("brevo_response_invalid");
  });
  it("normalizes email and enforces password and token bounds", () => {
    expect(
      contractorSchema.parse({
        name: " Test ",
        specialty: "Road",
        contact: "Test",
        phone: "000",
        email: " TEST@example.com ",
        language: "fr",
      }).email,
    ).toBe("test@example.com");
    expect(activationSchema.safeParse({ token: "a".repeat(43), password: "short" }).success).toBe(
      false,
    );
    expect(
      activationSchema.safeParse({ token: "a".repeat(43), password: "p".repeat(129) }).success,
    ).toBe(false);
    expect(activationSchema.safeParse({ token: "bad", password: "password123456" }).success).toBe(
      false,
    );
  });
});
