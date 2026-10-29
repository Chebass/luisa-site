// Runs against a fresh, isolated local Postgres cluster. Never uses production credentials.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const run = promisify(execFile);
const bin = process.env.POSTGRES_BIN ?? "C:/Program Files/PostgreSQL/18/bin";
const exe = (name) =>
  path.join(bin, process.platform === "win32" ? `${name}.exe` : name);
const directory = await mkdtemp(path.join(tmpdir(), "luisa-pg-test-"));
const port = "55439";
const sql = async (query, ok = true) => {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(
      exe("psql"),
      [
        "-h",
        "127.0.0.1",
        "-p",
        port,
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-A",
        "-t",
        "-f",
        "-",
      ],
      { windowsHide: true, env: { ...process.env, PGCLIENTENCODING: "UTF8" } },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString("utf8")));
    child.stderr.on("data", (b) => (stderr += b.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(query);
  });
  if (ok && result.code !== 0) throw new Error(result.stderr);
  if (!ok) {
    assert.notEqual(result.code, 0, "Expected SQL failure");
    return result.stderr;
  }
  return result.stdout.trim().replaceAll("\r\n", "\n");
};
let server;
try {
  await run(exe("initdb"), [
    "-D",
    directory,
    "-U",
    "postgres",
    "-A",
    "trust",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  server = spawn(
    exe("postgres"),
    ["-D", directory, "-p", port, "-h", "127.0.0.1"],
    { windowsHide: true, stdio: "ignore" },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await sql("select 1");
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!ready) throw new Error("Test database did not start");
  await sql(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;grant usage on schema auth to authenticated;grant execute on function auth.jwt() to authenticated;create publication supabase_realtime;",
  );
  await sql(
    await readFile("supabase/migrations/202610280001_initial.sql", "utf8"),
  );
  await sql(await readFile("supabase/seed.sql", "utf8"));
  await sql(
    "insert into public.owner_access values('owner@example.com');update public.settings set min_notice_hours=0,owner_phone='51982280618';",
  );
  const start =
    "(((now() at time zone 'America/Lima')::date+1)+time '08:00') at time zone 'America/Lima'";
  const later =
    "(((now() at time zone 'America/Lima')::date+1)+time '09:20') at time zone 'America/Lima'";
  const results = await Promise.allSettled([
    sql(
      `select public.create_booking('Elena','51988777666',${start},'Primera');`,
    ),
    sql(
      `select public.create_booking('Otra persona','51988777665',${start},'Choque');`,
    ),
  ]);
  assert.equal(
    results.filter((r) => r.status === "fulfilled").length,
    1,
    "Only one concurrent booking may win",
  );
  // Whichever request won, capture its phone and immutable name.
  const original = JSON.parse(
    await sql("select row_to_json(c) from public.clients c limit 1"),
  );
  await sql(
    `select public.create_booking('Nombre distinto','${original.phone}',${later},'Para su hijo');`,
  );
  assert.equal(
    await sql("select count(*) from public.clients"),
    "1",
    "No duplicate clients",
  );
  assert.equal(
    await sql("select name from public.clients"),
    original.name,
    "Public booking cannot overwrite a client name",
  );
  const token = await sql(
    "select action_token from public.appointments order by start_at limit 1",
  );
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(
    await sql(
      `set role anon;select public.create_booking('Intruso','51988777664',${later});`,
      false,
    ),
    /permission denied/i,
    "RPCs must not be callable as anon",
  );
  assert.match(
    await sql("set role anon;select * from public.clients;", false),
    /permission denied/i,
    "Public role cannot read clients",
  );
  assert.equal(
    await sql(
      "set role authenticated;set request.jwt.claims='{}';select count(*) from public.clients;",
    ),
    "SET\nSET\n0",
    "Non-owner RLS returns no data",
  );
  const ownerRead = await sql(
    'set role authenticated;set request.jwt.claims=\'{"email":"owner@example.com"}\';select count(*) from public.clients;',
  );
  assert.ok(ownerRead.endsWith("1"), "Owner can read clients");
  const confirmed = JSON.parse(
    await sql(
      `select public.change_appointment(p_token=>'${token}',p_action=>'confirm');`,
    ),
  );
  assert.equal(confirmed.status, "confirmed");
  const repeated = JSON.parse(
    await sql(
      `select public.change_appointment(p_token=>'${token}',p_action=>'confirm');`,
    ),
  );
  assert.equal(repeated.already, true, "Confirm is idempotent");
  assert.match(
    await sql(
      `select public.save_unavailability('block',jsonb_build_object('start_at',${start},'end_at',${start}+interval '40 minutes','reason','Conflict'));`,
      false,
    ),
    /BLOCK_CONFLICT/,
  );
  await sql(
    `select public.change_appointment(p_token=>'${token}',p_action=>'cancel');`,
  );
  const cancelled = JSON.parse(
    await sql(
      `select public.change_appointment(p_token=>'${token}',p_action=>'cancel');`,
    ),
  );
  assert.equal(cancelled.already, true, "Cancel is idempotent");
  await sql(
    `select public.create_booking('Nueva reserva','51988777664',${start},'Horario liberado');`,
  );
  assert.equal(
    await sql(
      "select count(*) from public.appointment_events where event='cancel'",
    ),
    "1",
    "Idempotent actions must not duplicate audit events",
  );
  const unprotected = await sql(
    "select count(*) from pg_tables where schemaname='public' and rowsecurity=false",
  );
  assert.equal(unprotected, "0", "Every application table must enable RLS");
  const blocked =
    "(((now() at time zone 'America/Lima')::date+2)+time '08:00') at time zone 'America/Lima'";
  await sql(
    `select public.save_unavailability('block',jsonb_build_object('start_at',${blocked},'end_at',${blocked}+interval '2 hours','reason','Descanso'));`,
  );
  assert.match(
    await sql(
      `select public.create_booking('Public bypass','51988777663',${blocked},'',false,true);`,
      false,
    ),
    /SLOT_UNAVAILABLE/,
    "Public requests cannot override blocks",
  );
  await sql(
    `select public.create_booking('Owner override','51988777663',${blocked},'',true,true);`,
  );
  assert.match(
    await sql(
      `select public.create_booking('Double booking','51988777662',${blocked},'',true,true);`,
      false,
    ),
    /SLOT_UNAVAILABLE/,
    "Owner override cannot bypass existing appointments",
  );
  const moveToken = await sql(
    "select action_token from public.appointments where status='scheduled' order by start_at desc limit 1",
  );
  const moved =
    "(((now() at time zone 'America/Lima')::date+3)+time '08:00') at time zone 'America/Lima'";
  await sql("update public.settings set slot_minutes=60;");
  await sql(
    `select public.change_appointment(p_token=>'${moveToken}',p_action=>'move',p_start=>${moved});`,
  );
  assert.equal(
    await sql(
      `select extract(epoch from(end_at-start_at))::integer from public.appointments where action_token='${moveToken}';`,
    ),
    "2400",
    "Changing duration must preserve existing appointments",
  );
  await sql("update public.settings set change_notice_hours=120;");
  assert.match(
    await sql(
      `select public.change_appointment(p_token=>'${moveToken}',p_action=>'cancel');`,
      false,
    ),
    /TOO_LATE/,
  );
  await sql(
    `insert into public.appointments(client_id,start_at,end_at,source,status) select id,now()-interval '4 hours',now()-interval '3 hours','owner','scheduled' from public.clients limit 1;insert into public.appointments(client_id,start_at,end_at,source,status) select id,now()-interval '6 hours',now()-interval '5 hours','owner','no_show' from public.clients limit 1;`,
  );
  assert.equal(
    await sql("select public.complete_past_appointments();"),
    "1",
    "Maintenance completes only past active appointments",
  );
  assert.equal(
    await sql(
      "select count(*) from public.appointments where status='no_show';",
    ),
    "1",
    "Maintenance preserves explicit absences",
  );
  console.log(
    "Database integration passed: concurrent bookings, unique clients, private names, RLS, token entropy, idempotence, block conflicts, audit, cancellation and rebooking.",
  );
} finally {
  if (server) {
    await run(exe("pg_ctl"), [
      "-D",
      directory,
      "-m",
      "immediate",
      "stop",
    ]).catch(() => server.kill());
  }
  console.log("Isolated database stopped. Test files:", directory);
}
