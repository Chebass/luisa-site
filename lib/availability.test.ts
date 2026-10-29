import { describe, it, expect } from "vitest";
import { availableSlots, overlaps } from "./availability";
import { defaultSettings } from "./demo";
import { localInstant } from "./dates";
const now = new Date("2026-10-28T10:00:00Z");
const settings = {
  ...defaultSettings,
  visible_start: "06:00",
  visible_end: "10:00",
};
const input = {
  day: "2026-10-28",
  settings,
  rules: [],
  blocks: [],
  appointments: [],
  now,
};
describe("availability in Lima", () => {
  it("only owners may explicitly override rules and blocks, never other appointments", () => {
    const rules = [
      {
        id: "r",
        weekday: 3,
        start_time: "06:00",
        end_time: "22:00",
        label: "Work",
        active: true,
      },
    ];
    expect(
      availableSlots({ ...input, rules, overrideBlocks: true }),
    ).toHaveLength(0);
    expect(
      availableSlots({ ...input, rules, owner: true, overrideBlocks: true }),
    ).toHaveLength(6);
    expect(
      availableSlots({
        ...input,
        rules,
        owner: true,
        overrideBlocks: true,
        appointments: [
          {
            id: "a",
            status: "confirmed",
            start_at: "2026-10-28T11:00:00Z",
            end_at: "2026-10-28T15:00:00Z",
          },
        ],
      }),
    ).toHaveLength(0);
  });
  it("preserves existing duration while following the current start-time grid", () => {
    const slots = availableSlots({
      ...input,
      settings: { ...settings, slot_minutes: 60 },
      durationMinutes: 40,
    });
    expect(slots.map((s) => s.time)).toEqual(["07:00", "08:00", "09:00"]);
    expect(slots[0].end_at).toBe("2026-10-28T12:40:00.000Z");
  });
  it("uses the Lima day, applies notice, and never exceeds closing time", () => {
    const slots = availableSlots(input);
    expect(slots.map((s) => s.time)).toEqual([
      "07:20",
      "08:00",
      "08:40",
      "09:20",
    ]);
    expect(slots.at(-1)?.end_at).toBe("2026-10-28T15:00:00.000Z");
  });
  it("handles an exact notice boundary", () => {
    expect(
      availableSlots({ ...input, now: localInstant(input.day, "05:20") })[0]
        .time,
    ).toBe("07:20");
  });
  it("removes overlapping weekly rules, blocks and active appointments", () => {
    const slots = availableSlots({
      ...input,
      rules: [
        {
          id: "r",
          weekday: 3,
          start_time: "07:30",
          end_time: "08:00",
          label: "Work",
          active: true,
        },
      ],
      blocks: [
        {
          id: "b",
          start_at: "2026-10-28T13:30:00Z",
          end_at: "2026-10-28T14:00:00Z",
          reason: "Pause",
        },
      ],
      appointments: [
        {
          id: "a",
          start_at: "2026-10-28T14:20:00Z",
          end_at: "2026-10-28T15:00:00Z",
          status: "confirmed",
        },
      ],
    });
    expect(slots.map((s) => s.time)).toEqual([]);
  });
  it("keeps adjacent intervals free, ignores inactive rules and cancelled visits", () => {
    expect(
      overlaps(
        new Date("2026-10-28T12:00Z"),
        new Date("2026-10-28T12:40Z"),
        new Date("2026-10-28T12:40Z"),
        new Date("2026-10-28T13:20Z"),
      ),
    ).toBe(false);
    const slots = availableSlots({
      ...input,
      rules: [
        {
          id: "r",
          weekday: 3,
          start_time: "06:00",
          end_time: "22:00",
          label: "Off",
          active: false,
        },
      ],
      appointments: [
        {
          id: "a",
          start_at: "2026-10-28T13:00:00Z",
          end_at: "2026-10-28T13:40:00Z",
          status: "cancelled",
        },
      ],
    });
    expect(slots).toHaveLength(4);
  });
  it("excludes the appointment being moved", () => {
    expect(
      availableSlots({
        ...input,
        appointments: [
          {
            id: "a",
            start_at: "2026-10-28T13:00:00Z",
            end_at: "2026-10-28T13:40:00Z",
            status: "scheduled",
          },
        ],
        excludeId: "a",
      }),
    ).toHaveLength(4);
  });
  it("accepts exactly 14 calendar days including today, not a fifteenth", () => {
    expect(availableSlots({ ...input, day: "2026-11-10" })).not.toHaveLength(0);
    expect(availableSlots({ ...input, day: "2026-11-11" })).toHaveLength(0);
    expect(availableSlots({ ...input, day: "2026-10-27" })).toHaveLength(0);
  });
  it("uses Lima midnight rather than UTC midnight", () => {
    const slots = availableSlots({
      ...input,
      day: "2026-10-28",
      now: new Date("2026-10-29T01:00Z"),
      settings: {
        ...defaultSettings,
        visible_start: "20:00",
        visible_end: "23:59",
        min_notice_hours: 0,
      },
    });
    expect(slots[0]?.time).toBe("20:00");
  });
  it("owners can schedule with no two-hour notice but cannot overlap", () => {
    expect(availableSlots({ ...input, owner: true })[0].time).toBe("06:00");
  });
  it("does not shorten a session at closing time", () => {
    const slots = availableSlots({
      ...input,
      settings: { ...settings, visible_end: "09:30" },
    });
    expect(slots.at(-1)?.time).toBe("08:40");
  });
  it("ignores recurring rules from another weekday", () => {
    expect(
      availableSlots({
        ...input,
        rules: [
          {
            id: "r",
            weekday: 4,
            start_time: "06:00",
            end_time: "22:00",
            label: "Other day",
            active: true,
          },
        ],
      }),
    ).toHaveLength(4);
  });
});
