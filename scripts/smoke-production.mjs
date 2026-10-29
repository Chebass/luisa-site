import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.PRODUCTION_TEST_URL ?? "http://localhost:3001";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ??
    (process.platform === "win32"
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
      : undefined),
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/inicio`);
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(
    await page.getByRole("link", { name: "Explorar la demostración" }).count(),
    0,
    "Production must never expose demo access",
  );
  const token = "A".repeat(43);
  const start = new Date(Date.now() + 72 * 3600000).toISOString();
  const end = new Date(Date.now() + 72 * 3600000 + 2400000).toISOString();
  let posts = 0;
  await page.route(`**/api/c/${token}`, async (route) => {
    if (route.request().method() === "POST") posts++;
    await route.fulfill({
      json: {
        start_at: start,
        end_at: end,
        status: posts ? "confirmed" : "scheduled",
        already: false,
      },
    });
  });
  await page.goto(`${base}/c/${token}`);
  await page
    .getByRole("link", { name: "Confirmar mi cita", exact: true })
    .waitFor();
  assert.equal(posts, 0, "GET must not trigger a mutation");
  await page
    .getByRole("link", { name: "Confirmar mi cita", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Tu cita quedó confirmada", exact: true })
    .waitFor();
  assert.equal(
    posts,
    1,
    "Client navigation from summary to confirmation must POST once",
  );
  await page.route(`**/api/c/${token}`, async (route) => {
    if (route.request().method() === "POST") posts++;
    await route.fulfill({
      json: { start_at: start, end_at: end, status: "scheduled" },
    });
  });
  await page.goto(`${base}/c/${token}/cancelar`);
  await page
    .getByRole("button", { name: "Sí, cancelar mi cita", exact: true })
    .waitFor();
  assert.equal(posts, 1, "Opening the cancellation link must not mutate");
  await page.route(`**/api/c/${token}`, async (route) => {
    if (route.request().method() === "POST") posts++;
    await route.fulfill({
      json: {
        start_at: start,
        end_at: end,
        status: "cancelled",
        already: false,
      },
    });
  });
  await page
    .getByRole("button", { name: "Sí, cancelar mi cita", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Tu cita fue cancelada", exact: true })
    .waitFor();
  assert.equal(posts, 2, "Cancellation requires its explicit button");
  await page.goto(`${base}/reservar`);
  assert.equal(
    await page.getByText("Elena Mendoza", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByText("Demostración local", { exact: false }).count(),
    0,
  );
  await context.close();
  console.log(
    "Production smoke passed: demo disabled, private panel redirects, public pages expose no fixtures, confirmation POST follows navigation, cancellation waits for explicit consent. Token HTTP responses were mocked; real OAuth and Supabase integration still require credentials.",
  );
} finally {
  await browser.close();
}
