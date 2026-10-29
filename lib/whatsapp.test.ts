import { describe, it, expect } from "vitest";
import { normalizePhone, whatsappLink, appointmentMessage } from "./whatsapp";
import { renderTemplate } from "./templates";
import { defaultSettings } from "./demo";
import { toCsv } from "./csv";
describe("phone and WhatsApp messages", () => {
  it("normalizes valid Peruvian mobile numbers", () => {
    expect(normalizePhone("982 280 618")).toBe("51982280618");
    expect(normalizePhone("+51 982 280 618")).toBe("51982280618");
    expect(() => normalizePhone("123")).toThrow();
    expect(() => normalizePhone("51882280618")).toThrow();
  });
  it("encodes punctuation, links and line breaks in wa.me links", () => {
    const link = whatsappLink(
      "982280618",
      "Hola, Luisa.\n¿Nos vemos? https://example.com/c/a",
    );
    expect(new URL(link).searchParams.get("text")).toContain("\n¿Nos vemos?");
    expect(link).toMatch(/^https:\/\/wa.me\/51982280618\?text=/);
  });
  it("creates token action URLs and formats dates in Lima", () => {
    const body = appointmentMessage(
      "{nombre} {fecha} {hora} {enlace_confirmar} {enlace_cancelar} {enlace_modificar}",
      { start_at: "2026-10-29T01:00Z", action_token: "secret" },
      defaultSettings,
      "https://example.com",
      "Nombre escrito",
    );
    expect(body).toContain("miércoles 28 de octubre");
    expect(body).toContain("Nombre escrito");
    expect(body).toContain("https://example.com/c/secret/confirmar");
    expect(body).toContain("/cancelar");
    expect(body).toContain("/modificar");
  });
  it("only replaces exact template variables", () => {
    expect(renderTemplate("Hola {nombre}, {otra}", { nombre: "Elena" })).toBe(
      "Hola Elena, {otra}",
    );
  });
  it("escapes CSV quotes and neutralizes spreadsheet formulas", () => {
    expect(
      toCsv([['=IMPORTXML("secret")', "Normal, con coma", "\nlinea"]]),
    ).toContain('"\'=IMPORTXML(""secret"")"');
    expect(toCsv([['A"B']])).toContain('"A""B"');
  });
});
