import { test, expect } from "@playwright/test";
import { dateKey, shiftDay, weekday } from "../lib/dates";
test("owner can browse, open appointments, inspect clients and plan time", async ({
  page,
}) => {
  await page.goto("/inicio");
  await expect(
    page.getByRole("heading", { name: /Hola, Luisa/ }),
  ).toBeVisible();
  await expect(page.getByText("Demostración ·")).toBeVisible();
  await page
    .getByRole("button", { name: "Elena Mendoza", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Historia de esta cita" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/calendario");
  await expect(
    page.getByRole("heading", { name: "Tu calendario" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Domingo de descanso/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Día de la semana" }),
  ).toHaveValue("0");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/calendario");
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await expect(page.locator(".month-calendar")).toBeVisible();
  await page.goto("/clientes");
  await page.getByRole("textbox", { name: "Buscar clientes" }).fill("Elena");
  await page.locator(".client-card").click();
  await expect(
    page.getByText("Prefiere las sesiones por la mañana."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sus citas" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/disponibilidad");
  await expect(
    page.getByRole("heading", { name: "Horarios fijos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bloquear un horario", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.goto("/ajustes");
  await expect(page.getByRole("textbox", { name: "Tu WhatsApp" })).toHaveValue(
    "51982280618",
  );
  await expect(
    page.getByRole("button", { name: "Descargar mis datos" }),
  ).toBeVisible();
});
test("public booking keeps identity private and appears in the owner agenda", async ({
  page,
}) => {
  await page.goto("/reservar");
  await expect(
    page.getByRole("heading", { name: "¿Cuándo te viene bien?" }),
  ).toBeVisible();
  let found = false;
  for (let i = 0; i < 7; i++) {
    await page.locator(".booking-day-grid button").nth(i).click();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    if (await page.locator(".time-slot").count()) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  await page.locator(".time-slot").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/reservar\/datos$/);
  await page
    .getByRole("textbox", { name: "¿Cómo te llamas?" })
    .fill("Cliente de prueba");
  await page
    .getByRole("textbox", { name: "Tu celular de WhatsApp" })
    .fill("988777666");
  await page
    .getByRole("textbox", { name: /Algo que quieras/ })
    .fill("Para mi mamá");
  await page.getByRole("button", { name: "Guardar reserva de prueba" }).click();
  await expect(page).toHaveURL(/\/reservar\/listo$/);
  await expect(
    page.getByRole("heading", { name: /Un momento de calma/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Cliente de prueba", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/clientes");
  await page
    .getByRole("textbox", { name: "Buscar clientes" })
    .fill("988777666");
  await page.locator(".client-card").click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Cliente de prueba" }),
  ).toBeVisible();
  await page.locator(".client-history button").first().click();
  await expect(page.getByText("Para mi mamá", { exact: true })).toBeVisible();
});
test("navigation and dialogs fit the viewport", async ({ page }, testInfo) => {
  await page.goto("/inicio");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect(
      page.getByRole("navigation", { name: "Navegación móvil" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navegación principal" }),
    ).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .locator("dialog")
      .evaluate((e) => e.getBoundingClientRect().width <= window.innerWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});

test("an owner override requires an explicit confirmation and still creates a normal appointment", async ({
  page,
}) => {
  const today = dateKey();
  const sunday = shiftDay(today, (7 - weekday(today)) % 7 || 7);
  await page.goto("/inicio");
  await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill("Prueba bloqueo");
  await dialog
    .getByRole("textbox", { name: "Celular", exact: true })
    .fill("977666555");
  await dialog.getByLabel("Día de la cita").fill(sunday);
  await expect(
    dialog.getByText("No hay horarios libres este día. Prueba otra fecha."),
  ).toBeVisible();
  await dialog
    .getByRole("checkbox", { name: "También ver mis horarios bloqueados" })
    .check();
  await dialog.locator(".time-slot").first().click();
  await dialog
    .getByRole("button", { name: "Guardar cita", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Este horario está bloqueado" }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Sí, agendar sobre el bloqueo" })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "La cita quedó agendada" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Lo haré después" }).click();
  await page.goto(`/calendario?dia=${sunday}`);
  await page
    .locator(".selected-day-agenda")
    .getByRole("button", { name: "Prueba bloqueo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar cita", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "¿Cancelar esta cita?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mantener la cita", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Por confirmar", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancelar cita", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sí, cancelar la cita", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "La cita fue cancelada" }),
  ).toBeVisible();
});

test("a repeated public phone preserves the private name and only uses the entered name in WhatsApp", async ({
  page,
}) => {
  await page.goto("/reservar");
  for (let i = 1; i < 7; i++) {
    await page.locator(".booking-day-grid button").nth(i).click();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    if (await page.locator(".time-slot").count()) break;
  }
  await expect(page.locator(".time-slot").first()).toBeVisible();
  await page.locator(".time-slot").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "¿Cómo te llamas?" })
    .fill("Nombre escrito diferente");
  await page
    .getByRole("textbox", { name: "Tu celular de WhatsApp" })
    .fill("900000001");
  await page.getByRole("button", { name: "Guardar reserva de prueba" }).click();
  await expect(page).toHaveURL(/\/reservar\/listo$/);
  const url = await page
    .getByRole("link", { name: "Abrir WhatsApp" })
    .getAttribute("href");
  expect(new URL(url!).searchParams.get("text")).toContain(
    "Nombre escrito diferente",
  );
  expect(await page.locator("body").textContent()).not.toContain(
    "Elena Mendoza",
  );
  await page.goto("/clientes");
  await page
    .getByRole("textbox", { name: "Buscar clientes" })
    .fill("900000001");
  await expect(page.locator(".client-card")).toHaveCount(1);
  await expect(page.locator(".client-card")).toContainText("Elena Mendoza");
});

test("the offline shell reads only an encrypted, unexpired device snapshot", async ({
  page,
  context,
}) => {
  await page.goto("/inicio");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const value = {
      savedAt: new Date().toISOString(),
      expiresAt: Date.now() + 3600000,
      owner: "Luisa",
      appointments: [
        {
          name: "Cliente offline de prueba",
          start_at: new Date(Date.now() + 3600000).toISOString(),
          end_at: new Date(Date.now() + 6000000).toISOString(),
          status: "confirmed",
        },
      ],
    };
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(value)),
    );
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("luisa-private-agenda", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("private");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("private", "readwrite");
      t.objectStore("private").put({ key, iv, encrypted }, "agenda");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto("/inicio");
  await expect(
    page.getByRole("heading", { name: "Sin conexión, pero con calma" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cliente offline de prueba" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cita" })).toHaveCount(
    0,
  );
  await context.setOffline(false);
});
