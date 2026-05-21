import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "./context.js";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedRateLimiter() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-rate-limit-subject-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("./db/client.js");
  db = client.sqlite;
  const schema = await import("./db/schema.js");
  schema.initializeDatabase();

  return await import("./rateLimit.js");
}

afterEach(() => {
  db?.close();
  db = undefined;
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
  delete process.env.BLIISH_DATABASE_PATH;
  delete process.env.BLIISH_UPLOAD_DIR;
});

describe("action rate limits", () => {
  it("requires form subject data when no account is signed in", async () => {
    const { assertActionRateLimit } = await loadIsolatedRateLimiter();

    expect(() => assertActionRateLimit(publicFormContext(), "auth.signup")).toThrow();
  });

  it("rate limits public forms by the submitted subject", async () => {
    const { assertActionRateLimit } = await loadIsolatedRateLimiter();

    for (let index = 0; index < 5; index += 1) {
      assertActionRateLimit(publicFormContext(), "auth.signup", "email:jane@example.test");
    }

    expect(() => assertActionRateLimit(publicFormContext(), "auth.signup", "email:jane@example.test")).toThrow();
    expect(() => assertActionRateLimit(publicFormContext(), "auth.signup", "email:alex@example.test")).not.toThrow();
  });
});

function publicFormContext() {
  return {
    get: () => null,
    req: {
      header: () => undefined
    }
  } as unknown as AppContext;
}
