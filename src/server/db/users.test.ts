import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-users-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("./client.js");
  db = client.sqlite;
  const schema = await import("./schema.js");
  schema.initializeDatabase();

  return {
    users: await import("./users.js")
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

describe("users", () => {
  it("omits banned accounts from profile discovery", async () => {
    const { users } = await loadIsolatedDb();
    users.createUser({ username: "Active", email: "active@example.test", handle: "active", passwordHash: "hash" });
    const bannedId = users.createUser({ username: "Banned", email: "banned@example.test", handle: "banned", passwordHash: "hash" });

    users.setUserBanned(bannedId, true);

    expect(users.listUsers(null, 10).map((person) => person.id)).not.toContain(bannedId);
    expect(users.searchUsers("Banned", null)).toEqual([]);
    expect(users.newestUsers(null, 10).map((person) => person.id)).not.toContain(bannedId);
    expect(users.getProfile(bannedId)?.bannedAt).toBeTruthy();
  });

  it("rejects reserved profile handles", async () => {
    const { users } = await loadIsolatedDb();
    users.createUser({ username: "Active", email: "active@example.test", handle: "active", passwordHash: "hash" });

    for (const handle of ["admin", "staff", "bliish"]) {
      expect(users.handleReserved(handle)).toBe(true);
      expect(() =>
        users.createUser({
          username: handle,
          email: `${handle}@example.test`,
          handle,
          passwordHash: "hash"
        })
      ).toThrow(users.HandleReservedError);
    }
  });

  it("allows the configured admin account to claim a reserved profile handle", async () => {
    const { users } = await loadIsolatedDb();

    const adminId = users.createUser({
      username: "Admin",
      email: "admin@example.test",
      handle: "admin",
      passwordHash: "hash"
    });

    expect(adminId).toBe(1);
    expect(users.getProfile(adminId)?.handle).toBe("admin");
  });

  it("rejects too-short profile handles", async () => {
    const { users } = await loadIsolatedDb();

    expect(() =>
      users.createUser({
        username: "Short",
        email: "short@example.test",
        handle: "ab",
        passwordHash: "hash"
      })
    ).toThrow("Invalid profile handle.");
  });
});
