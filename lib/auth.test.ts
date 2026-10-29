import { describe, it, expect, vi } from "vitest";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { credentialsSchema, signInOwner, signOutCurrentDevice } from "./auth";
import { authCookieOptions } from "./supabase/cookie-options";

// Fictitious Auth HTTP provider: exercises the actual Supabase SDK and cookie adapter,
// without real accounts, external requests, application tables or real passwords.
const owner = "owner@example.test";
const password = "  Test-only-password-123!  ";
type Session = { id: number; user: User; access: string; refresh: string };
class AuthFixture {
  sessions = new Map<number, Session>();
  issuedTokens = new Map<string, number>();
  scopes: string[] = [];
  refreshes = 0;
  lifetime = 3600;
  private serial = 0;
  fetch: typeof fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const headers = new Headers(init?.headers);
    const token = (headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<
      string,
      string
    >;
    const current = this.sessions.get(this.issuedTokens.get(token) ?? -1);
    if (
      url.pathname === "/auth/v1/token" &&
      url.searchParams.get("grant_type") === "password"
    ) {
      if (
        body.password !== password ||
        ![owner, "other@example.test"].includes(body.email)
      )
        return Response.json(
          {
            code: "invalid_credentials",
            error_description: "Invalid login credentials",
          },
          { status: 400 },
        );
      const user = {
        id:
          body.email === owner
            ? "00000000-0000-4000-8000-000000000001"
            : "00000000-0000-4000-8000-000000000002",
        email: body.email,
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
        email_confirmed_at: "2026-01-01T00:00:00Z",
      } as User;
      const session = { id: ++this.serial, user, access: "", refresh: "" };
      this.sessions.set(session.id, session);
      return this.issue(session);
    }
    if (
      url.pathname === "/auth/v1/token" &&
      url.searchParams.get("grant_type") === "refresh_token"
    ) {
      const session = [...this.sessions.values()].find(
        (s) => s.refresh === body.refresh_token,
      );
      if (!session)
        return Response.json(
          { code: "refresh_token_not_found", msg: "Refresh token not found" },
          { status: 400 },
        );
      this.refreshes++;
      return this.issue(session);
    }
    if (url.pathname === "/auth/v1/user")
      return current
        ? Response.json(current.user)
        : Response.json(
            { code: "bad_jwt", msg: "Invalid JWT" },
            { status: 401 },
          );
    if (url.pathname === "/auth/v1/logout") {
      const scope = url.searchParams.get("scope") ?? "global";
      this.scopes.push(scope);
      if (scope === "global") this.sessions.clear();
      else if (current) this.sessions.delete(current.id);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected Auth fixture endpoint: ${url.pathname}`);
  };
  private issue(session: Session) {
    const now = Math.floor(Date.now() / 1000);
    const sequence = ++this.serial;
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    session.access = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: session.user.id, email: session.user.email, aud: "authenticated", role: "authenticated", iat: now, exp: now + this.lifetime, session_id: String(session.id), nonce: sequence })}.test-signature`;
    session.refresh = `fixture-refresh-${sequence}`;
    this.issuedTokens.set(session.access, session.id);
    return Response.json({
      access_token: session.access,
      token_type: "bearer",
      expires_in: this.lifetime,
      expires_at: now + this.lifetime,
      refresh_token: session.refresh,
      user: session.user,
    });
  }
}
function device(service: AuthFixture) {
  const cookies = new Map<string, string>();
  const writes: CookieOptions[] = [];
  const reopen = () =>
    createServerClient(
      "https://fixture.supabase.test",
      "sb_publishable_fixture",
      {
        global: { fetch: service.fetch },
        cookieOptions: { ...authCookieOptions, secure: false },
        cookies: {
          getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
          setAll: (items) => {
            for (const item of items) {
              writes.push(item.options);
              if (item.options.maxAge === 0 || !item.value)
                cookies.delete(item.name);
              else cookies.set(item.name, item.value);
            }
          },
        },
      },
    );
  return { cookies, writes, reopen, client: reopen() };
}
const verifyOwner = (client: SupabaseClient) => async () => {
  const { data, error } = await client.auth.getUser();
  return !error && data.user?.email === owner;
};

describe("password login and independent persistent sessions", () => {
  it("normalizes the email while preserving the exact password", () => {
    expect(
      credentialsSchema.parse({ email: "  OWNER@EXAMPLE.TEST  ", password }),
    ).toEqual({ email: owner, password });
    expect(
      credentialsSchema.safeParse({ email: "invalid", password }).success,
    ).toBe(false);
    expect(
      credentialsSchema.safeParse({ email: owner, password: "" }).success,
    ).toBe(false);
  });
  it("keeps the signed-in owner after recreating the client, with persistent cookies and JWT", async () => {
    const service = new AuthFixture();
    const laptop = device(service);
    await signInOwner(
      laptop.client,
      { email: `  ${owner.toUpperCase()}  `, password },
      verifyOwner(laptop.client),
    );
    const reopened = laptop.reopen();
    const { data, error } = await reopened.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.email).toBe(owner);
    const session = await reopened.auth.getSession();
    expect(session.data.session?.access_token.split(".")).toHaveLength(3);
    expect(
      laptop.writes.some((options) => options.maxAge === 400 * 24 * 60 * 60),
    ).toBe(true);
    const saved = [...laptop.cookies.values()].join("");
    const decoded = saved.startsWith("base64-")
      ? Buffer.from(saved.slice(7), "base64url").toString("utf8")
      : saved;
    expect(decoded).not.toContain(password);
    expect(decoded).not.toContain('"password"');
  });
  it("supports laptop and phone at once; signing out on laptop does not revoke phone refresh", async () => {
    const service = new AuthFixture();
    const laptop = device(service);
    const phone = device(service);
    await signInOwner(
      laptop.client,
      { email: owner, password },
      verifyOwner(laptop.client),
    );
    await signInOwner(
      phone.client,
      { email: owner, password },
      verifyOwner(phone.client),
    );
    expect(service.sessions.size).toBe(2);
    await signOutCurrentDevice(laptop.client);
    expect(service.scopes).toEqual(["local"]);
    expect(laptop.cookies.size).toBe(0);
    expect(service.sessions.size).toBe(1);
    expect((await laptop.reopen().auth.getSession()).data.session).toBeNull();
    const { data, error } = await phone.reopen().auth.refreshSession();
    expect(error).toBeNull();
    expect(data.session?.user.email).toBe(owner);
    expect(phone.cookies.size).toBeGreaterThan(0);
  });
  it("refreshes a nearly expired JWT from saved cookies without asking for the password again", async () => {
    const service = new AuthFixture();
    service.lifetime = 30;
    const laptop = device(service);
    const first = await laptop.client.auth.signInWithPassword({
      email: owner,
      password,
    });
    expect(first.error).toBeNull();
    const reopened = laptop.reopen();
    const user = await reopened.auth.getUser();
    expect(user.error).toBeNull();
    expect(user.data.user?.email).toBe(owner);
    expect(service.refreshes).toBeGreaterThan(0);
    const refreshed = await reopened.auth.getSession();
    expect(refreshed.data.session?.access_token).not.toBe(
      first.data.session?.access_token,
    );
  });
  it("rejects valid credentials for a non-owner and clears only that device", async () => {
    const service = new AuthFixture();
    const ownerDevice = device(service);
    const rejected = device(service);
    await signInOwner(
      ownerDevice.client,
      { email: owner, password },
      verifyOwner(ownerDevice.client),
    );
    await expect(
      signInOwner(
        rejected.client,
        { email: "other@example.test", password },
        verifyOwner(rejected.client),
      ),
    ).rejects.toThrow("Revisa tu correo y contraseña");
    expect(rejected.cookies.size).toBe(0);
    expect(service.scopes).toEqual(["local"]);
    expect((await ownerDevice.client.auth.getUser()).data.user?.email).toBe(
      owner,
    );
  });
  it("does not verify private access or retain a session after invalid credentials", async () => {
    const service = new AuthFixture();
    const laptop = device(service);
    const verify = vi.fn(async () => true);
    await expect(
      signInOwner(
        laptop.client,
        { email: owner, password: "incorrect" },
        verify,
      ),
    ).rejects.toThrow("Revisa tu correo y contraseña");
    expect(verify).not.toHaveBeenCalled();
    expect(laptop.cookies.size).toBe(0);
  });
  it("clears the new local session if server authorization cannot be checked", async () => {
    const service = new AuthFixture();
    const laptop = device(service);
    await expect(
      signInOwner(laptop.client, { email: owner, password }, async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("No pudimos comprobar el acceso");
    expect(laptop.cookies.size).toBe(0);
    expect(service.scopes).toEqual(["local"]);
  });
});
