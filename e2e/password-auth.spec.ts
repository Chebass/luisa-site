import { test, expect } from "@playwright/test";

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
