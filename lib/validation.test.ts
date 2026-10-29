import { describe, it, expect } from "vitest";
import {
  bookingSchema,
  settingsSchema,
  blockSchema,
  ruleSchema,
} from "./validation";
import { defaultSettings } from "./demo";
describe("input validation", () => {
  const booking = {
    name: "Elena",
    phone: "982280618",
    start_at: "2026-10-29T14:20:00Z",
  };
  it("normalizes booking phones, trims names and defaults notes", () => {
    expect(
      bookingSchema.parse({ ...booking, name: "  Elena  " }),
    ).toMatchObject({ name: "Elena", phone: "51982280618", service_note: "" });
  });
  it("rejects honeypot content, short names, invalid times and oversize notes", () => {
    for (const change of [
      { website: "spam" },
      { name: "A" },
      { start_at: "not a date" },
      { service_note: "a".repeat(501) },
    ])
      expect(bookingSchema.safeParse({ ...booking, ...change }).success).toBe(
        false,
      );
  });
  it("rejects an inverted or out-of-range visible window", () => {
    expect(
      settingsSchema.safeParse({
        ...defaultSettings,
        visible_start: "22:00",
        visible_end: "06:00",
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...defaultSettings, visible_start: "26:00" })
        .success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...defaultSettings, slot_minutes: 0 }).success,
    ).toBe(false);
  });
  it("rejects backwards blocks and weekly rules", () => {
    expect(
      blockSchema.safeParse({
        start_at: "2026-10-29T18:00:00Z",
        end_at: "2026-10-29T17:00:00Z",
        reason: "Break",
      }).success,
    ).toBe(false);
    expect(
      ruleSchema.safeParse({
        weekday: 3,
        start_time: "18:00",
        end_time: "09:00",
        label: "Work",
      }).success,
    ).toBe(false);
  });
});
