import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-moderation-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("../db/client.js");
  db = client.sqlite;
  const schema = await import("../db/schema.js");
  schema.initializeDatabase();

  return {
    actions: await import("./actions.js"),
    blogs: await import("../db/blogs/index.js"),
    moderation: await import("../db/moderation/index.js"),
    users: await import("../db/users.js")
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

describe("moderation report actions", () => {
  it("does not let non-staff resolve reports through the action helper", async () => {
    const { actions, blogs, moderation, users } = await loadIsolatedDb();
    const userId = users.createUser({ username: "User", email: "user@example.test", handle: "user", passwordHash: "hash" });
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const blogId = blogs.createBlog(authorId, "Reported", "body");
    moderation.createReport(userId, "blog", blogId, "reason", authorId);

    const user = users.getCurrentUser(userId);
    if (!user) throw new Error("missing user");
    await expect(actions.moderateReport(user, 1, "resolve")).rejects.toThrow();
    expect(moderation.getReport(1)?.resolvedAt).toBeNull();
  });

  it("lets moderators delete reported regular-user content and resolve the report", async () => {
    const { actions, blogs, moderation, users } = await loadIsolatedDb();
    const modId = users.createUser({ username: "Mod", email: "mod@example.test", handle: "mod", passwordHash: "hash" });
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    users.setUserRole(modId, "moderator");
    const blogId = blogs.createBlog(authorId, "Reported", "body");
    moderation.createReport(modId, "blog", blogId, "reason", authorId);

    const mod = users.getCurrentUser(modId);
    if (!mod) throw new Error("missing moderator");
    await actions.moderateReport(mod, 1, "delete");

    expect(blogs.getBlog(blogId)).toBeUndefined();
    expect(moderation.getReport(1)?.resolvedAt).toBeTruthy();
  });

  it("does not let moderators delete staff-authored content", async () => {
    const { actions, blogs, moderation, users } = await loadIsolatedDb();
    const modId = users.createUser({ username: "Mod", email: "mod@example.test", handle: "mod", passwordHash: "hash" });
    const adminId = users.createUser({ username: "Admin", email: "admin@example.test", handle: "admin-user", passwordHash: "hash" });
    users.setUserRole(modId, "moderator");
    users.setUserRole(adminId, "admin");
    const blogId = blogs.createBlog(adminId, "Reported", "body");
    moderation.createReport(modId, "blog", blogId, "reason", adminId);

    const mod = users.getCurrentUser(modId);
    if (!mod) throw new Error("missing moderator");
    await expect(actions.moderateReport(mod, 1, "delete")).rejects.toThrow();
    expect(blogs.getBlog(blogId)).toBeTruthy();
    expect(moderation.getReport(1)?.resolvedAt).toBeNull();
  });
});
