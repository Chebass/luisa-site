import { describe, expect, it } from "vitest";
import { requestClientIp } from "./client-ip";

describe("client IP for rate limits", () => {
  it("uses Cloudflare's verified header instead of a supplied forwarding chain", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.1",
      "x-forwarded-for": "198.51.100.2, 203.0.113.1",
    });
    expect(requestClientIp(headers, "cloudflare")).toBe("203.0.113.1");
  });
  it("does not fall back to a spoofable chain if the Cloudflare header is missing", () => {
    expect(
      requestClientIp(
        new Headers({ "x-forwarded-for": "198.51.100.2" }),
        "cloudflare",
      ),
    ).toBe("unknown");
  });
  it("keeps the trusted proxy convention outside Workers and ignores Cloudflare headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.2",
      "x-forwarded-for": "203.0.113.1, 192.0.2.1",
    });
    expect(requestClientIp(headers)).toBe("203.0.113.1");
    expect(requestClientIp(new Headers())).toBe("unknown");
  });
});
