import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-skins-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");

  const client = await import("./client.js");
  db = client.sqlite;
  const schema = await import("./schema.js");
  schema.initializeDatabase();

  return {
    comments: await import("./comments.js"),
    skins: await import("./skins.js"),
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

describe("skins", () => {
  it("installs builtin skins in curated order with visible original credits", async () => {
    const { skins } = await loadIsolatedDb();
    const builtinSkins = skins.listSkins(null, 50).filter((skin) => skin.sourceKey);

    expect(builtinSkins.slice(0, 2).map((skin) => skin.sourceKey)).toEqual(["bliish.light", "bliish.dark"]);
    expect(builtinSkins).toHaveLength(17);

    const blackAndGrey = builtinSkins.find((skin) => skin.sourceKey === "spacehey.black-and-grey");
    expect(blackAndGrey?.username).toBe("");
    expect(blackAndGrey?.descriptionHtml).toContain("Original SpaceHey layout credit");
    expect(blackAndGrey?.descriptionHtml).toContain("Bela");
    expect(blackAndGrey?.descriptionHtml).toContain("https://layouts.spacehey.com/layout?id=2719");
    expect(blackAndGrey?.codeHtml).not.toContain("Original SpaceHey layout credit");
  });

  it("hides skins authored by banned users", async () => {
    const { skins, users } = await loadIsolatedDb();
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const bannedId = users.createUser({ username: "Banned", email: "banned@example.test", handle: "banned", passwordHash: "hash" });
    const visibleSkinId = skins.createSkin(
      authorId,
      "Visible",
      "description",
      '<style>[data-skin-part="bio"]{color:red}</style>'
    );
    const hiddenSkinId = skins.createSkin(
      bannedId,
      "Hidden skin",
      "description",
      '<style>[data-skin-part="bio"]{color:blue}</style>'
    );

    users.setUserBanned(bannedId, true);

    expect(skins.listSkins(null, 100).filter((skin) => !skin.sourceKey).map((skin) => skin.id)).toEqual([visibleSkinId]);
    expect(skins.getSkin(visibleSkinId)?.id).toBe(visibleSkinId);
    expect(skins.getSkin(hiddenSkinId)).toBeUndefined();
  });

  it("sorts community skins by visible comments before recency", async () => {
    const { comments, skins, users } = await loadIsolatedDb();
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const commenterId = users.createUser({ username: "Commenter", email: "commenter@example.test", handle: "commenter", passwordHash: "hash" });
    const newestSkinId = skins.createSkin(
      authorId,
      "Newest",
      "description",
      '<style>[data-skin-part="bio"]{color:red}</style>'
    );
    const discussedSkinId = skins.createSkin(
      authorId,
      "Discussed",
      "description",
      '<style>[data-skin-part="bio"]{color:blue}</style>'
    );

    db?.prepare("UPDATE skins SET updated_at = ? WHERE id = ?").run("2026-01-02 00:00:00", newestSkinId);
    db?.prepare("UPDATE skins SET updated_at = ? WHERE id = ?").run("2026-01-01 00:00:00", discussedSkinId);
    comments.addComment("skin", discussedSkinId, commenterId, "nice");

    const communitySkins = skins.listSkins(null, 100).filter((skin) => !skin.sourceKey);
    expect(communitySkins.map((skin) => skin.id)).toEqual([discussedSkinId, newestSkinId]);
    expect(communitySkins.map((skin) => skin.commentCount)).toEqual([1, 0]);
  });
});
