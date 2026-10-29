import { test, expect } from "@playwright/test";

// Keep every navigation observable by Playwright's Auth and destination mocks.
test.use({ serviceWorkers: "block" });

// Auth responses are intercepted. These tests never submit a password to a real account.
test("password access offers email, password visibility and no public registration", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  test.skip(
    (await page.getByLabel("Tu correo", { exact: true }).count()) === 0,
    "Requires the local Supabase connection; no credentials are sent.",
  );
  await expect(
    page.getByRole("button", { name: "Continuar con Google" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /registrar|crear cuenta/i }),
  ).toHaveCount(0);
  const password = page.getByLabel("Tu contraseña", { exact: true });
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ocultar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(
    page.getByText(
      "Tu sesión quedará abierta en este dispositivo hasta que la cierres.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-password-login.png`,
    fullPage: true,
  });
});

test("password access shows a busy submit button and rejects incorrect credentials without cookies", async ({
  page,
  context,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let submissions = 0;
  await page.route("**/auth/v1/**", async (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    submissions++;
    await gate;
    await route.fulfill({
      status: 400,
      headers,
      json: {
        code: "invalid_credentials",
        error_description: "Invalid login credentials",
      },
    });
  });
  try {
    await page.goto("/login");
    test.skip(
      (await page.getByLabel("Tu correo", { exact: true }).count()) === 0,
      "Requires the local Supabase connection; no credentials are sent.",
    );
    await page
      .getByLabel("Tu correo", { exact: true })
      .fill("nobody@example.test");
    await page
      .getByLabel("Tu contraseña", { exact: true })
      .fill("fictional-password-for-test");
    await page
      .getByRole("button", { name: "Entrar a mi espacio", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Ingresando…", exact: true }),
    ).toHaveAttribute("aria-busy", "true");
  } finally {
    release();
  }
  await expect(page.locator(".login-form").getByRole("alert")).toHaveText(
    "No pudimos ingresar. Revisa tu correo y contraseña.",
  );
  await expect(page).toHaveURL(/\/login$/);
  expect(submissions).toBe(1);
  expect(
    (await context.cookies()).filter((cookie) =>
      cookie.name.includes("auth-token"),
    ),
  ).toHaveLength(0);
  const session = await page.request.get("/api/auth/session");
  expect(session.status()).toBe(401);
});

test("password access keeps the app skeleton visible until the destination finishes loading", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signedIn = false;
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "owner@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    email_confirmed_at: "2026-01-01T00:00:00Z",
  };
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", email: user.email, exp: now + 3600, iat: now })}.fixture-signature`;
  // Both Auth and the destination are mocked: no fixture JWT is sent to a real provider.
  await page.route("**/auth/v1/**", async (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    await route.fulfill({
      headers,
      json: route.request().url().includes("/token")
        ? {
            access_token: token,
            token_type: "bearer",
            refresh_token: "fixture-refresh",
            expires_in: 3600,
            expires_at: now + 3600,
            user,
          }
        : user,
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    signedIn = true;
    await route.fulfill({ json: { authenticated: true } });
  });
  await page.route("**/login*", async (route) => {
    if (signedIn) {
      await route.fulfill({
        status: 307,
        headers: { location: "/inicio" },
        body: "",
      });
      return;
    }
    await route.continue();
  });
  await page.route("**/inicio*", async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<!doctype html><html lang="es"><body><h1>Agenda de prueba lista</h1></body></html>',
    });
  });
  try {
    await page.goto("/login");
    test.skip(
      (await page.getByLabel("Tu correo", { exact: true }).count()) === 0,
      "Requires the local Supabase connection; no credentials are sent.",
    );
    await page.getByLabel("Tu correo", { exact: true }).fill(user.email);
    await page
      .getByLabel("Tu contraseña", { exact: true })
      .fill("fictional-password-for-test");
    await page
      .getByRole("button", { name: "Entrar a mi espacio", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Cargando inicio" }),
    ).toBeVisible();
    await expect(page.locator(".app-loading-shell")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(page.locator(".password-login-form")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Entrar a mi espacio", exact: true }),
    ).toHaveCount(0);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.locator(".app-loading-shell")).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: "Agenda de prueba lista" }),
  ).toBeVisible();
});
