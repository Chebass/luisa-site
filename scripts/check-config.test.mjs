import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectConfiguration } from "./check-config.mjs";

const fixture = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-public",
  SUPABASE_SERVICE_ROLE_KEY: "fixture-private",
  OWNER_EMAIL: "owner@example.test",
  NEXT_PUBLIC_APP_URL: "https://fixture.netlify.app",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "fixture-widget",
  TURNSTILE_SECRET_KEY: "fixture-secret",
  NEXT_PUBLIC_DEMO_MODE: "false",
};

test("production requires real Turnstile keys and an explicit disabled demo", () => {
  assert.deepEqual(inspectConfiguration(fixture, true).errors, []);
  const result = inspectConfiguration(
    {
      ...fixture,
      NEXT_PUBLIC_DEMO_MODE: "true",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
    true,
  );
  assert.equal(result.errors.length, 3);
});

test("local HTTP is accepted only for loopback and is rejected in production", () => {
  const env = { ...fixture, NEXT_PUBLIC_APP_URL: "http://localhost:3000" };
  assert.equal(inspectConfiguration(env).errors.length, 0);
  assert.equal(inspectConfiguration(env, true).errors.length, 1);
  assert.equal(
    inspectConfiguration({ ...env, NEXT_PUBLIC_APP_URL: "http://192.168.1.4" })
      .errors.length,
    1,
  );
});

test("origin rejects routes, credentials and invalid URLs", () => {
  for (const value of [
    "not-a-url",
    "https://app.test/reservar",
    "https://user:secret@app.test",
    "https://app.test?x=1",
  ]) {
    const { errors } = inspectConfiguration(
      { ...fixture, NEXT_PUBLIC_APP_URL: value },
      true,
    );
    assert.equal(errors.length, 1);
    assert.equal(
      errors.join().includes(value),
      false,
      "Never print configured values",
    );
  }
});

test("missing required keys are named without revealing existing credentials", () => {
  const { errors } = inspectConfiguration(
    { ...fixture, TURNSTILE_SECRET_KEY: "" },
    true,
  );
  assert.deepEqual(errors, ["Falta TURNSTILE_SECRET_KEY."]);
  assert.equal(
    JSON.stringify(errors).includes(fixture.SUPABASE_SERVICE_ROLE_KEY),
    false,
  );
});

test("Push is optional for booking but incomplete Push configuration fails", () => {
  const optional = inspectConfiguration(fixture, true);
  assert.equal(optional.errors.length, 0);
  assert.equal(optional.warnings.length, 1);
  const partial = inspectConfiguration(
    { ...fixture, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "fixture-push" },
    true,
  );
  assert.equal(partial.errors.length, 2);
  const complete = inspectConfiguration(
    {
      ...fixture,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "fixture-push",
      VAPID_PRIVATE_KEY: "fixture-push-secret",
      VAPID_SUBJECT: "mailto:owner@example.test",
    },
    true,
  );
  assert.equal(complete.errors.length, 0);
  assert.equal(complete.warnings.length, 0);
});
