import { test, expect } from "@playwright/test";
test("modal is centered, locks background scroll, and animates before unmounting", async ({
  page,
}) => {
  await page.goto("/inicio");
  await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
  const modal = page.locator("dialog.modal");
  await expect(modal).toBeVisible();
  await expect
    .poll(async () => modal.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1");
  const bounds = await modal.boundingBox();
  const viewport = page.viewportSize()!;
  expect(
    Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2),
  ).toBeLessThan(12);
  expect(
    Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2),
  ).toBeLessThan(12);
  expect(bounds!.y).toBeGreaterThan(0);
  expect(bounds!.height).toBeLessThan(viewport.height);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(modal).toHaveAttribute("data-exiting", "true");
  await expect(modal).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});
test("calendar, time and option pickers work inside the centered modal", async ({
  page,
}) => {
  await page.goto("/disponibilidad");
  await page
    .getByRole("button", { name: "Bloquear un horario", exact: true })
    .click();
  await page.getByRole("button", { name: "Desde el día", exact: true }).click();
  const picker = page.locator(".zen-date-popover");
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(page.locator("dialog.modal")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Desde las: hora", exact: true })
    .click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Desde las: hora", exact: true }),
  ).toContainText("10");
  await page
    .getByRole("combobox", { name: "Desde las: minutos", exact: true })
    .click();
  await page.getByRole("option", { name: "30", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Desde las: minutos", exact: true }),
  ).toContainText("30");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/calendario");
  await page.getByRole("combobox", { name: "Filtrar por estado" }).click();
  await page.getByRole("option", { name: "Confirmadas", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Filtrar por estado" }),
  ).toContainText("Confirmadas");
});
test("public copy describes on-site sessions and keyboard selectors respect reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/reservar");
  await expect(
    page.getByText("Te recibimos en casa", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /a domicilio|Vamos a tu hogar|comodidad de tu hogar/i,
  );
  await page.goto("/calendario");
  const select = page.getByRole("combobox", { name: "Filtrar por estado" });
  await select.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Sin canceladas", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Atendidas", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(select).toContainText("Atendidas");
  expect(errors).toEqual([]);
});

test("section navigation shows the destination skeleton while its content loads", async ({
  page,
}, testInfo) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/clientes*", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/inicio");
    const nav = page.getByRole("navigation", {
      name:
        testInfo.project.name === "mobile"
          ? "Navegación móvil"
          : "Navegación principal",
    });
    await nav.getByRole("link", { name: "Clientes", exact: true }).click();
    await expect(
      page.getByRole("status", { name: "Cargando clientes" }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".skeleton-clientes .sk-client").first(),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: "Tus clientes", exact: true }),
  ).toBeVisible();
});
