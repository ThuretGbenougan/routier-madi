import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { AuthPrincipal } from "../src/server/auth/session.server";
const url = process.env["TEST_DATABASE_URL"];
const suite = url ? describe : describe.skip;
const mail = vi.hoisted(() => ({ send: vi.fn(), configured: true }));
type Handler = (context: { request: Request; params: { id: string } }) => Promise<Response>;
const routes = vi.hoisted(
  () => ({}) as Record<string, { server: { handlers: Record<string, Handler> } }>,
);
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (path: string) => (options: (typeof routes)[string]) => {
    routes[path] = options;
    return options;
  },
}));
vi.mock("../src/server/db.server", async () => {
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  return {
    db: new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env["TEST_DATABASE_URL"] }),
    }),
  };
});
vi.mock("../src/server/integrations/brevo.server", async () => {
  const { AppError } = await import("../src/server/errors/app-error.server");
  return {
    sendInvitationEmail: mail.send,
    invitationsConfigured: () => mail.configured,
    requireInvitationConfig: () => {
      if (!mail.configured) throw new AppError("INVITATIONS_NOT_CONFIGURED", 503, "not configured");
    },
  };
});

suite("contractor invitations database workflow", () => {
  let db: PrismaClient;
  let service: typeof import("../src/server/services/contractor-service.server");
  let auth: typeof import("../src/server/auth/auth-service.server");
  let admin: AuthPrincipal;
  const input = {
    name: "Company",
    specialty: "Road",
    contact: "Worker",
    phone: "000",
    email: "worker@test.invalid",
    language: "fr" as const,
  };
  const password = "New-password-123";
  const token = () => mail.send.mock.calls.at(-1)![0].token as string;
  beforeAll(async () => {
    if (!url || new URL(url).hostname !== "127.0.0.1" || !new URL(url).pathname.endsWith("_test"))
      throw new Error("Dedicated local test database required");
    process.env["DATABASE_URL"] = url;
    process.env["SESSION_SECRET"] = "test-session-secret-at-least-32-characters";
    db = (await import("../src/server/db.server")).db;
    service = await import("../src/server/services/contractor-service.server");
    auth = await import("../src/server/auth/auth-service.server");
  });
  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "RepairRequest", "Contractor", "User", "RateBucket" CASCADE',
    );
    mail.send.mockReset().mockResolvedValue("brevo-message-1");
    mail.configured = true;
    const user = await db.user.create({
      data: {
        name: "Admin",
        emailNormalized: "admin@test.invalid",
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    admin = {
      userId: user.id,
      name: user.name,
      email: user.emailNormalized,
      role: "ADMIN",
      contractorId: null,
      client: "WEB",
      sessionId: "test",
    };
  });
  afterAll(async () => {
    await db?.$disconnect();
  });
  async function ageInvitation() {
    await db.userInvitation.updateMany({ data: { issuedAt: new Date(Date.now() - 61_000) } });
  }

  it("protects user HTTP routes with sessions origins and strict input", async () => {
    await import("../src/routes/api.v1.users");
    await import("../src/routes/api.v1.users.$id.invitations");
    const sessions = await import("../src/server/auth/session.server");
    const current = await db.user.findUniqueOrThrow({ where: { id: admin.userId } });
    const adminSession = await sessions.createSession(current, "WEB");
    const contractor = await db.user.create({
      data: {
        name: "Worker",
        emailNormalized: "other@test.invalid",
        passwordHash: "unused",
        role: "CONTRACTOR",
      },
    });
    const workerSession = await sessions.createSession(contractor, "WEB");
    const call = (
      path: string,
      method: string,
      token?: string,
      body?: object,
      origin = "http://localhost:5173",
    ) =>
      routes[path]!.server.handlers[method]!({
        params: { id: admin.userId },
        request: new Request(`http://localhost:5173${path}`, {
          method,
          headers: {
            origin,
            "content-type": "application/json",
            ...(token ? { cookie: `vc_session=${token}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      });
    for (const [path, method] of [
      ["/api/v1/users", "GET"],
      ["/api/v1/users", "POST"],
      ["/api/v1/users/$id/invitations", "POST"],
    ]) {
      expect((await call(path!, method!)).status).toBe(401);
      expect((await call(path!, method!, workerSession.token)).status).toBe(403);
    }
    expect((await call("/api/v1/users", "GET", adminSession.token)).status).toBe(200);
    const input = { name: "New", email: "new@test.invalid", language: "fr" };
    expect(
      (await call("/api/v1/users", "POST", adminSession.token, input, "https://evil.invalid"))
        .status,
    ).toBe(403);
    expect(
      (
        await call(
          "/api/v1/users/$id/invitations",
          "POST",
          adminSession.token,
          { language: "fr" },
          "https://evil.invalid",
        )
      ).status,
    ).toBe(403);
    expect(
      (await call("/api/v1/users", "POST", adminSession.token, { ...input, role: "CONTRACTOR" }))
        .status,
    ).toBe(422);
    expect((await call("/api/v1/users", "POST", adminSession.token, input)).status).toBe(201);
  });

  it("limits admin resends to five attempts per hour", async () => {
    const users = await import("../src/server/services/user-service.server");
    const created = await users.createAdmin(
      { name: "New", email: "new@test.invalid", language: "fr" },
      admin,
    );
    for (let i = 0; i < 5; i++) {
      await ageInvitation();
      await users.inviteAdmin(created.userId, "fr", admin);
    }
    await ageInvitation();
    await expect(users.inviteAdmin(created.userId, "fr", admin)).rejects.toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
    });
  });

  it("serializes admin activation against resend without reviving a consumed invitation", async () => {
    const users = await import("../src/server/services/user-service.server");
    const { activateUser } = await import("../src/server/services/user-invitation-service.server");
    const created = await users.createAdmin(
      { name: "New", email: "new@test.invalid", language: "fr" },
      admin,
    );
    const old = token();
    await ageInvitation();
    const results = await Promise.allSettled([
      activateUser(old, password),
      users.inviteAdmin(created.userId, "fr", admin),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const user = await db.user.findUniqueOrThrow({
      where: { id: created.userId },
      include: { invitation: true },
    });
    if (user.accountActivated) expect(user.invitation?.consumedAt).not.toBeNull();
    else {
      expect(user.invitation?.consumedAt).toBeNull();
      await expect(activateUser(token(), password)).resolves.toBe("ADMIN");
    }
    await expect(activateUser(old, password)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
  });

  it("creates admins atomically and activates only once before granting admin access", async () => {
    const users = await import("../src/server/services/user-service.server");
    const { activateUser } = await import("../src/server/services/user-invitation-service.server");
    const data = { name: "New Admin", email: "new@test.invalid", language: "ru" as const };
    const results = await Promise.allSettled([
      users.createAdmin(data, admin),
      users.createAdmin(data, admin),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.user.count({ where: { emailNormalized: data.email } })).toBe(1);
    const pending = await db.user.findUniqueOrThrow({ where: { emailNormalized: data.email } });
    expect(pending).toMatchObject({ role: "ADMIN", contractorId: null, accountActivated: false });
    await db.user.update({
      where: { id: pending.id },
      data: { passwordHash: await auth.hashPassword(password) },
    });
    await expect(
      auth.login({ email: data.email, password }, new Request("https://app.test")),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" });
    const link = token();
    const activations = await Promise.allSettled([
      activateUser(link, password),
      activateUser(link, password),
    ]);
    expect(activations.filter((result) => result.status === "fulfilled")).toEqual([
      { status: "fulfilled", value: "ADMIN" },
    ]);
    expect(
      (await auth.login({ email: data.email, password }, new Request("https://app.test"))).principal
        .role,
    ).toBe("ADMIN");
    await expect(users.inviteAdmin(pending.id, "fr", admin)).rejects.toMatchObject({
      code: "USER_NOT_INVITABLE",
    });
  });

  it("preserves failed admin invitations and rejects replaced expired and disabled links", async () => {
    const users = await import("../src/server/services/user-service.server");
    const { activateUser } = await import("../src/server/services/user-invitation-service.server");
    mail.send.mockRejectedValueOnce(new Error("mail unavailable"));
    const created = await users.createAdmin(
      { name: "New", email: "new@test.invalid", language: "fr" },
      admin,
    );
    expect(created.delivery).toBe("FAILED");
    const old = token();
    await expect(users.inviteAdmin(created.userId, "fr", admin)).rejects.toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
    });
    await ageInvitation();
    const resends = await Promise.allSettled([
      users.inviteAdmin(created.userId, "ru", admin),
      users.inviteAdmin(created.userId, "ru", admin),
    ]);
    expect(resends.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(activateUser(old, password)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await db.userInvitation.updateMany({ data: { expiresAt: new Date(0) } });
    await expect(activateUser(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await ageInvitation();
    await users.inviteAdmin(created.userId, "fr", admin);
    await db.user.update({ where: { id: created.userId }, data: { active: false } });
    await expect(activateUser(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await expect(users.inviteAdmin(created.userId, "fr", admin)).rejects.toMatchObject({
      code: "USER_NOT_INVITABLE",
    });
  });

  it("rejects cross role duplicates and contractor resends through admin service", async () => {
    const users = await import("../src/server/services/user-service.server");
    await service.createContractor(input, admin);
    await expect(
      users.createAdmin({ name: "New", email: input.email, language: "fr" }, admin),
    ).rejects.toMatchObject({ status: 409 });
    const worker = await db.user.findUniqueOrThrow({ where: { emailNormalized: input.email } });
    await expect(users.inviteAdmin(worker.id, "fr", admin)).rejects.toMatchObject({
      code: "USER_NOT_INVITABLE",
    });
    await expect(
      service.createContractor({ ...input, email: admin.email }, admin),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.contractor.count()).toBe(1);
    for (const action of [
      () =>
        users.createAdmin(
          { name: "New", email: "new@test.invalid", language: "fr" },
          { ...admin, role: "CONTRACTOR" },
        ),
      () => users.inviteAdmin(admin.userId, "fr", { ...admin, role: "CONTRACTOR" }),
      () => users.listUsers({ search: "", page: 1 }, { ...admin, role: "CONTRACTOR" }),
    ])
      await expect(action()).rejects.toMatchObject({ status: 403 });
    mail.configured = false;
    await expect(
      users.createAdmin({ name: "New", email: "new@test.invalid", language: "fr" }, admin),
    ).rejects.toMatchObject({ code: "INVITATIONS_NOT_CONFIGURED" });
  });

  it("paginates and filters users without exposing credentials or invitation hashes", async () => {
    const users = await import("../src/server/services/user-service.server");
    await service.createContractor(input, admin);
    await db.user.createMany({
      data: Array.from({ length: 26 }, (_, i) => ({
        name: `Person ${i}`,
        emailNormalized: `person${i}@test.invalid`,
        passwordHash: "secret-password",
        role: "ADMIN" as const,
      })),
    });
    const first = await users.listUsers({ search: "", page: 1 }, admin);
    const second = await users.listUsers({ search: "", page: 2 }, admin);
    expect(first.users).toHaveLength(25);
    expect(second.users).toHaveLength(3);
    expect(new Set([...first.users, ...second.users].map((user) => user.id)).size).toBe(28);
    expect((await users.listUsers({ search: "PERSON", page: 1, role: "ADMIN" }, admin)).total).toBe(
      26,
    );
    expect(
      (await users.listUsers({ search: "worker@", page: 1, role: "CONTRACTOR" }, admin)).total,
    ).toBe(1);
    for (const secret of ["passwordHash", "tokenHash", "messageId", token()])
      expect(JSON.stringify(first)).not.toContain(secret);
  });

  it("creates a pending account then activates and allows login and assignment", async () => {
    const created = await service.createContractor(input, admin);
    expect(created.delivery).toBe("ACCEPTED");
    const pending = await db.user.findUniqueOrThrow({
      where: { emailNormalized: input.email },
      include: { invitation: true },
    });
    expect(pending.accountActivated).toBe(false);
    await db.user.update({
      where: { id: pending.id },
      data: { passwordHash: await auth.hashPassword(password) },
    });
    const sessions = await import("../src/server/auth/session.server");
    const issued = await sessions.createSession(pending, "WEB");
    expect(
      await sessions.getOptionalPrincipal(
        new Request("https://app.test", { headers: { authorization: `Bearer ${issued.token}` } }),
      ),
    ).toBeNull();
    expect(pending.invitation?.tokenHash).not.toBe(token());
    expect(pending.invitation?.messageId).toBe("brevo-message-1");
    await expect(
      auth.login({ email: input.email, password }, new Request("https://app.test")),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" });
    const { assignRequest } = await import("../src/server/services/request-service.server");
    const request = await db.repairRequest.create({
      data: {
        reference: "RR-INVITE",
        trackingTokenHash: "invite",
        problemType: "POTHOLE",
        description: "test",
        latitude: 55,
        longitude: 37,
        status: "VERIFIED",
      },
    });
    await expect(
      assignRequest({ requestId: request.id, contractorId: created.contractorId, actor: admin }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.activateContractor(token(), password);
    expect(
      (await auth.login({ email: input.email, password }, new Request("https://app.test")))
        .principal.contractorId,
    ).toBe(created.contractorId);
    await assignRequest({
      requestId: request.id,
      contractorId: created.contractorId,
      actor: admin,
    });
    expect((await db.repairRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe(
      "ASSIGNED",
    );
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
  });
  it("rolls back the company when a user email already exists", async () => {
    await expect(
      service.createContractor({ ...input, email: admin.email }, admin),
    ).rejects.toMatchObject({ code: "CONTRACTOR_EMAIL_EXISTS" });
    expect(await db.contractor.count()).toBe(0);
    expect(mail.send).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent creates atomically", async () => {
    const results = await Promise.allSettled([
      service.createContractor(input, admin),
      service.createContractor(input, admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.contractor.count()).toBe(1);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });
  it("preserves the pending account on delivery failure", async () => {
    mail.send.mockRejectedValueOnce(new Error("timeout"));
    const created = await service.createContractor(input, admin);
    expect(created.delivery).toBe("FAILED");
    expect(await db.contractor.count()).toBe(1);
    await ageInvitation();
    expect((await service.inviteContractor(created.contractorId, "ru", admin)).delivery).toBe(
      "ACCEPTED",
    );
    expect(mail.send.mock.calls.at(-1)![0].language).toBe("ru");
  });
  it("invalidates old links on resend and enforces cooldown", async () => {
    const created = await service.createContractor(input, admin);
    const previous = token();
    await expect(service.inviteContractor(created.contractorId, "fr", admin)).rejects.toMatchObject(
      { code: "RATE_LIMIT_EXCEEDED" },
    );
    await ageInvitation();
    await service.inviteContractor(created.contractorId, "fr", admin);
    await expect(service.activateContractor(previous, password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await service.activateContractor(token(), password);
  });
  it("allows only one concurrent activation", async () => {
    await service.createContractor(input, admin);
    const results = await Promise.allSettled([
      service.activateContractor(token(), password),
      service.activateContractor(token(), "Another-password-123"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("serializes concurrent resends", async () => {
    const created = await service.createContractor(input, admin);
    await ageInvitation();
    const results = await Promise.allSettled([
      service.inviteContractor(created.contractorId, "fr", admin),
      service.inviteContractor(created.contractorId, "ru", admin),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });
  it("rejects expired links without activating", async () => {
    await service.createContractor(input, admin);
    await db.userInvitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { emailNormalized: input.email } }))
        .accountActivated,
    ).toBe(false);
  });
  it("invites an existing company without a user", async () => {
    const { language: _language, ...data } = input;
    const company = await db.contractor.create({ data });
    await service.inviteContractor(company.id, "ru", admin);
    expect(await db.contractor.count()).toBe(1);
    await service.activateContractor(token(), password);
  });
  it("preserves existing activated accounts", async () => {
    const { language: _language, ...data } = input;
    const company = await db.contractor.create({ data });
    const user = await db.user.create({
      data: {
        name: input.contact,
        emailNormalized: input.email,
        passwordHash: await auth.hashPassword(password),
        role: "CONTRACTOR",
        contractorId: company.id,
      },
    });
    expect(user.accountActivated).toBe(true);
    await expect(service.inviteContractor(company.id, "fr", admin)).rejects.toMatchObject({
      code: "CONTRACTOR_ACCOUNT_EXISTS",
    });
    expect(
      (await auth.login({ email: input.email, password }, new Request("https://app.test")))
        .principal.userId,
    ).toBe(user.id);
  });
  it("rejects non admins and missing configuration before writes", async () => {
    await expect(
      service.createContractor(input, { ...admin, role: "CONTRACTOR" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.inviteContractor("missing", "fr", { ...admin, role: "CONTRACTOR" }),
    ).rejects.toMatchObject({ status: 403 });
    mail.configured = false;
    await expect(service.createContractor(input, admin)).rejects.toMatchObject({
      code: "INVITATIONS_NOT_CONFIGURED",
    });
    expect(await db.contractor.count()).toBe(0);
  });
  it("does not reactivate disabled users or companies", async () => {
    const created = await service.createContractor(input, admin);
    await db.contractor.update({ where: { id: created.contractorId }, data: { active: false } });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
    await db.contractor.update({ where: { id: created.contractorId }, data: { active: true } });
    await db.user.updateMany({
      where: { contractorId: created.contractorId },
      data: { active: false },
    });
    await expect(service.activateContractor(token(), password)).rejects.toMatchObject({
      code: "INVITATION_INVALID",
    });
  });
  it("limits resend attempts per hour", async () => {
    const created = await service.createContractor(input, admin);
    for (let i = 0; i < 5; i++) {
      await ageInvitation();
      await service.inviteContractor(created.contractorId, "fr", admin);
    }
    await ageInvitation();
    await expect(service.inviteContractor(created.contractorId, "fr", admin)).rejects.toMatchObject(
      { code: "RATE_LIMIT_EXCEEDED" },
    );
    expect(mail.send).toHaveBeenCalledTimes(6);
  });
  it("lists access metadata without leaking secrets", async () => {
    const created = await service.createContractor(input, admin);
    const { listContractors } =
      await import("../src/server/repositories/request-repository.server");
    const { toContractorDto } = await import("../src/server/mappers/repair-request-mappers.server");
    const list = async () => (await listContractors(db)).map(toContractorDto);
    expect((await list())[0]).toMatchObject({
      id: created.contractorId,
      canAssign: false,
      accessStatus: "PENDING",
      invitation: { delivery: "ACCEPTED" },
    });
    const serialized = JSON.stringify(await list());
    expect(serialized).not.toContain("tokenHash");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain(token());
    await service.activateContractor(token(), password);
    expect((await list())[0]).toMatchObject({ canAssign: true, accessStatus: "ACTIVE" });
  });
});
