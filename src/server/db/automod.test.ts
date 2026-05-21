import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-automod-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("./client.js");
  db = client.sqlite;
  const schema = await import("./schema.js");
  schema.initializeDatabase();

  return {
    automod: await import("./automod.js"),
    blogs: await import("./blogs/index.js"),
    moderation: await import("./moderation/index.js"),
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

describe("automod rules", () => {
  it("rejects matching submissions only in the configured scope", async () => {
    const { automod, users } = await loadIsolatedDb();
    const adminId = users.createUser({ username: "Admin", email: "admin@example.test", handle: "admin-user", passwordHash: "hash" });

    automod.saveAutomodRule({
      name: "Blocked phrase",
      pattern: "badword",
      patternType: "keyword",
      scope: "blog",
      action: "reject",
      enabled: true,
      actorId: adminId
    });

    expect(() => automod.scanAutomodSubmission("blog", "This includes BADWORD.")).toThrow();
    expect(() => automod.scanAutomodSubmission("comment", "This includes BADWORD.")).not.toThrow();
  });

  it("matches common punctuation, leetspeak, and spacing bypasses", async () => {
    const { automod, users } = await loadIsolatedDb();
    const adminId = users.createUser({ username: "Admin", email: "admin@example.test", handle: "admin-user", passwordHash: "hash" });

    automod.saveAutomodRule({
      name: "Normalized keyword",
      pattern: "badword",
      patternType: "keyword",
      scope: "all",
      action: "reject",
      enabled: true,
      actorId: adminId
    });
    automod.saveAutomodRule({
      name: "Tall glyph keyword",
      pattern: "blockword",
      patternType: "keyword",
      scope: "all",
      action: "reject",
      enabled: true,
      actorId: adminId
    });

    expect(() => automod.scanAutomodSubmission("post", "b @ d w 0 r d")).toThrow();
    expect(() => automod.scanAutomodSubmission("post", "ＢＡＤｗｏｒｄ")).toThrow();
    expect(() => automod.scanAutomodSubmission("post", "b@d w0rd")).toThrow();
    expect(() => automod.scanAutomodSubmission("post", "b10ck w0rd")).toThrow();
  });

  it("creates system reports for review matches", async () => {
    const { automod, blogs, moderation, users } = await loadIsolatedDb();
    const adminId = users.createUser({ username: "Admin", email: "admin@example.test", handle: "admin-user", passwordHash: "hash" });
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const blogId = blogs.createBlog(authorId, "Title", "body");

    automod.saveAutomodRule({
      name: "Regex review",
      pattern: "bad\\s+phrase",
      patternType: "regex",
      scope: "all",
      action: "review",
      enabled: true,
      actorId: adminId
    });

    automod.scanAutomodSubmission("blog", "A bad phrase appears here.").createReports({
      subjectType: "blog",
      subjectId: blogId,
      authorId
    });

    const report = moderation.listReports()[0];
    expect(report.reporterId).toBeNull();
    expect(report.subjectAuthorId).toBe(authorId);
    expect(report.subjectType).toBe("blog");
  });

  it("keeps disabled rules out of normal matching", async () => {
    const { automod, users } = await loadIsolatedDb();
    const adminId = users.createUser({ username: "Admin", email: "admin@example.test", handle: "admin-user", passwordHash: "hash" });

    automod.saveAutomodRule({
      name: "Disabled",
      pattern: "hidden",
      patternType: "keyword",
      scope: "all",
      action: "review",
      enabled: false,
      actorId: adminId
    });

    expect(() => automod.scanAutomodSubmission("blog", "hidden text")).not.toThrow();
    expect(automod.listAutomodRules().some((rule) => rule.name === "Disabled")).toBe(true);
  });
});
