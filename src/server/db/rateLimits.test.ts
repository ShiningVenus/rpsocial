import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-rate-limits-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("./client.js");
  db = client.sqlite;
  const schema = await import("./schema.js");
  schema.initializeDatabase();

  return {
    rateLimits: await import("./rateLimits.js")
  };
}

afterEach(() => {
  db?.close();
  db = undefined;
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
  delete process.env.BLIISH_DATABASE_PATH;
  delete process.env.BLIISH_UPLOAD_DIR;
});

describe("rate limits", () => {
  it("blocks a subject after the configured action limit", async () => {
    const { rateLimits } = await loadIsolatedDb();
    const input = {
      action: "post.create",
      subjectHash: "subject-a",
      limit: 2,
      pruneAfterSeconds: 60 * 60,
      windowSeconds: 60
    };

    expect(rateLimits.consumeRateLimit(input)).toBe(true);
    expect(rateLimits.consumeRateLimit(input)).toBe(true);
    expect(rateLimits.consumeRateLimit(input)).toBe(false);

    expect(rateLimits.consumeRateLimit({ ...input, subjectHash: "subject-b" })).toBe(true);
    expect(rateLimits.consumeRateLimit({ ...input, action: "comment.create" })).toBe(true);
  });

  it("enables raid mode without blocking login or staff recovery", async () => {
    const { rateLimits } = await loadIsolatedDb();
    db?.prepare("INSERT INTO users (username, email, email_canonical, password_hash) VALUES (?, ?, ?, ?)").run("Admin", "admin@example.test", "admin@example.test", "hash");

    expect(rateLimits.raidModeActive()).toBe(false);

    rateLimits.saveRateLimitSettings([{ action: "post.create", limit: 2, windowSeconds: 30 }], 1);
    rateLimits.enableRaidMode(1);

    expect(rateLimits.raidModeActive()).toBe(true);
    expect(rateLimits.rateLimitPolicyFor("auth.signup").limit).toBe(0);
    expect(rateLimits.rateLimitPolicyFor("post.create").limit).toBe(0);
    expect(rateLimits.rateLimitPolicyFor("auth.login").limit).toBeGreaterThan(0);
    expect(rateLimits.rateLimitPolicyFor("auth.reset").limit).toBeGreaterThan(0);
    expect(rateLimits.rateLimitPolicyFor("staff.write").limit).toBeGreaterThan(0);

    rateLimits.disableRaidMode();

    expect(rateLimits.raidModeActive()).toBe(false);
    expect(rateLimits.rateLimitPolicyFor("auth.signup").limit).toBeGreaterThan(0);
    expect(rateLimits.rateLimitPolicyFor("post.create")).toEqual({ limit: 2, windowSeconds: 30 });
  });
});
