import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../../currentUser.js";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-db-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");
  process.env.BLIISH_ADMIN_USER_ID = "999999";

  const client = await import("../client.js");
  db = client.sqlite;
  const schema = await import("../schema.js");
  schema.initializeDatabase();

  return {
    comments: await import("../comments.js"),
    blogs: await import("./index.js"),
    relationships: await import("../relationships.js"),
    users: await import("../users.js")
  };
}

function currentUser(id: number): CurrentUser {
  return {
    id,
    username: `user-${id}`,
    email: `user-${id}@example.test`,
    role: "user",
    timeZone: "UTC",
    verifiedAt: null,
    bannedAt: null
  };
}

afterEach(() => {
  db?.close();
  db = undefined;
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
  delete process.env.BLIISH_DATABASE_PATH;
  delete process.env.BLIISH_UPLOAD_DIR;
  delete process.env.BLIISH_ADMIN_USER_ID;
});

describe("blog visibility", () => {
  it("keeps private blogs out of public profile listings", async () => {
    const { blogs, users } = await loadIsolatedDb();
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const viewerId = users.createUser({ username: "Viewer", email: "viewer@example.test", handle: "viewer", passwordHash: "hash" });
    const publicBlogId = blogs.createBlog(authorId, "Public", "body", "Life", 0);

    blogs.createBlog(authorId, "Friends", "body", "Life", 1);
    blogs.createBlog(authorId, "Private", "body", "Life", 2);

    expect(blogs.blogsForUser(authorId, null, 10).map((blog) => blog.id)).toEqual([publicBlogId]);
    expect(blogs.blogsForUser(authorId, currentUser(viewerId), 10).map((blog) => blog.id)).toEqual([
      publicBlogId
    ]);
  });

  it("lists only propped blogs visible to the viewer", async () => {
    const { blogs, relationships, users } = await loadIsolatedDb();
    const viewerId = users.createUser({ username: "Viewer", email: "viewer@example.test", handle: "viewer", passwordHash: "hash" });
    const friendId = users.createUser({ username: "Friend", email: "friend@example.test", handle: "friend", passwordHash: "hash" });
    const strangerId = users.createUser({ username: "Stranger", email: "stranger@example.test", handle: "stranger", passwordHash: "hash" });
    relationships.requestFriend(viewerId, friendId);
    relationships.acceptFriend(viewerId, friendId);

    const publicBlogId = blogs.createBlog(strangerId, "Public", "body", "Life", 0);
    const friendsBlogId = blogs.createBlog(friendId, "Friends", "body", "Life", 1);
    const privateBlogId = blogs.createBlog(strangerId, "Private", "body", "Life", 2);
    for (const blogId of [publicBlogId, friendsBlogId, privateBlogId]) {
      blogs.addBlogProp(blogId, viewerId);
    }

    expect(new Set(blogs.proppedBlogsForViewer(currentUser(viewerId), 10).map((blog) => blog.id))).toEqual(
      new Set([friendsBlogId, publicBlogId])
    );

    relationships.removeFriend(viewerId, friendId);

    expect(blogs.proppedBlogsForViewer(currentUser(viewerId), 10).map((blog) => blog.id)).toEqual([
      publicBlogId
    ]);
  });

  it("hides blocked users from discovery and content listings", async () => {
    const { blogs, relationships, users } = await loadIsolatedDb();
    const viewerId = users.createUser({ username: "Viewer", email: "viewer@example.test", handle: "viewer", passwordHash: "hash" });
    const blockedId = users.createUser({ username: "Blocked", email: "blocked@example.test", handle: "blocked", passwordHash: "hash" });
    const hiddenBlogId = blogs.createBlog(blockedId, "Hidden", "body");

    relationships.blockUser(blockedId, viewerId);

    expect(users.listUsers(currentUser(viewerId)).map((person) => person.id)).not.toContain(blockedId);
    expect(users.searchUsers("Blocked", currentUser(viewerId))).toEqual([]);
    expect(blogs.allBlogs(currentUser(viewerId)).map((blog) => blog.id)).not.toContain(hiddenBlogId);
  });

  it("hides banned users from public content and comments", async () => {
    const { blogs, comments, users } = await loadIsolatedDb();
    const activeId = users.createUser({ username: "Active", email: "active@example.test", handle: "active", passwordHash: "hash" });
    const bannedId = users.createUser({ username: "Banned", email: "banned@example.test", handle: "banned", passwordHash: "hash" });
    const activeBlogId = blogs.createBlog(activeId, "Active", "body");
    const bannedBlogId = blogs.createBlog(bannedId, "Banned", "body");
    const activeCommentId = comments.addComment("blog", activeBlogId, activeId, "active");
    const bannedCommentId = comments.addComment("blog", activeBlogId, bannedId, "banned");
    if (activeCommentId === null || bannedCommentId === null) {
      throw new Error("Comments should be created before the ban.");
    }

    users.setUserBanned(bannedId, true);

    expect(blogs.allBlogs(null, 10).map((blog) => blog.id)).toEqual([activeBlogId]);
    expect(blogs.allBlogs(null, 10).map((blog) => blog.id)).not.toContain(bannedBlogId);
    expect(blogs.searchBlogs("Banned", null, 10).blogs).toEqual([]);
    expect(comments.commentsFor("blog", activeBlogId, { limit: 10 }).map((comment) => comment.id)).toEqual([
      activeCommentId
    ]);
    expect(comments.commentParentId("blog", bannedCommentId)).toBeUndefined();
  });

  it("sorts discovery blog lists by visible props and comments before recency", async () => {
    const { blogs, comments, users } = await loadIsolatedDb();
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const readerId = users.createUser({ username: "Reader", email: "reader@example.test", handle: "reader", passwordHash: "hash" });
    const secondReaderId = users.createUser({ username: "Second Reader", email: "reader2@example.test", handle: "reader2", passwordHash: "hash" });
    const newestId = blogs.createBlog(authorId, "Newest", "body", "Life");
    const discussedId = blogs.createBlog(authorId, "Discussed", "body", "Life");
    const popularId = blogs.createBlog(authorId, "Popular", "body", "Life");

    db?.prepare("UPDATE blogs SET created_at = ? WHERE id = ?").run("2026-01-03 00:00:00", newestId);
    db?.prepare("UPDATE blogs SET created_at = ? WHERE id = ?").run("2026-01-02 00:00:00", discussedId);
    db?.prepare("UPDATE blogs SET created_at = ? WHERE id = ?").run("2026-01-01 00:00:00", popularId);

    blogs.addBlogProp(popularId, readerId);
    comments.addComment("blog", popularId, readerId, "nice");
    comments.addComment("blog", discussedId, readerId, "first");
    comments.addComment("blog", discussedId, secondReaderId, "second");

    const listed = blogs.allBlogs(null, 10);
    expect(listed.map((blog) => blog.id)).toEqual([popularId, discussedId, newestId]);
    expect(listed.map((blog) => blog.commentCount)).toEqual([1, 2, 0]);
    expect(blogs.blogsByCategory("Life", null, 10).map((blog) => blog.id)).toEqual([popularId, discussedId, newestId]);
    expect(blogs.blogsForUser(authorId, null, 10, "engagement").map((blog) => blog.id)).toEqual([popularId, discussedId, newestId]);
  });
});
