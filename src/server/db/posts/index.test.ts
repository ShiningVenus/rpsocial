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
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-posts-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");
  process.env.BLIISH_ADMIN_USER_ID = "999999";

  const client = await import("../client.js");
  db = client.sqlite;
  const schema = await import("../schema.js");
  schema.initializeDatabase();

  return {
    groups: await import("../groups.js"),
    posts: await import("./index.js"),
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

describe("posts", () => {
  it("requires accepted friendship for cross-wall posting", async () => {
    const { posts, relationships, users } = await loadIsolatedDb();
    const ownerId = users.createUser({ username: "Owner", email: "owner@example.test", handle: "owner", passwordHash: "hash" });
    const friendId = users.createUser({ username: "Friend", email: "friend@example.test", handle: "friend", passwordHash: "hash" });
    const strangerId = users.createUser({ username: "Stranger", email: "stranger@example.test", handle: "stranger", passwordHash: "hash" });

    relationships.requestFriend(ownerId, friendId);
    relationships.acceptFriend(ownerId, friendId);

    expect(posts.canPostToWall(ownerId, ownerId)).toBe(true);
    expect(posts.canPostToWall(friendId, ownerId)).toBe(true);
    expect(posts.canPostToWall(strangerId, ownerId)).toBe(false);
  });

  it("lists propped posts the viewer can still interact with", async () => {
    const { groups, posts, relationships, users } = await loadIsolatedDb();
    const viewerId = users.createUser({ username: "Viewer", email: "viewer@example.test", handle: "viewer", passwordHash: "hash" });
    const friendId = users.createUser({ username: "Friend", email: "friend@example.test", handle: "friend", passwordHash: "hash" });
    const blockedId = users.createUser({ username: "Blocked", email: "blocked@example.test", handle: "blocked", passwordHash: "hash" });
    relationships.requestFriend(viewerId, friendId);
    relationships.acceptFriend(viewerId, friendId);
    groups.createGroup(friendId, "Everyone", "description");
    const groupId = groups.createGroup(friendId, "Design Club", "description");
    groups.joinGroup(groupId, viewerId);

    const ownPostId = posts.createWallPost(viewerId, viewerId, "own prop");
    const friendPostId = posts.createWallPost(friendId, friendId, "friend prop");
    const groupPostId = posts.createGroupPost(friendId, groupId, "group prop");
    const blockedPostId = posts.createWallPost(blockedId, blockedId, "blocked prop");
    for (const postId of [ownPostId, friendPostId, groupPostId, blockedPostId]) {
      posts.addPostProp(postId, viewerId);
    }
    relationships.blockUser(blockedId, viewerId);

    expect(new Set(posts.proppedPostsForViewer(currentUser(viewerId), 10).map((post) => post.id))).toEqual(
      new Set([ownPostId, friendPostId, groupPostId])
    );

    groups.leaveGroup(groupId, viewerId);

    expect(new Set(posts.proppedPostsForViewer(currentUser(viewerId), 10).map((post) => post.id))).toEqual(
      new Set([ownPostId, friendPostId])
    );
  });

  it("hides posts from banned authors in viewer-facing post lists", async () => {
    const { groups, posts, relationships, users } = await loadIsolatedDb();
    const viewerId = users.createUser({ username: "Viewer", email: "viewer@example.test", handle: "viewer", passwordHash: "hash" });
    const bannedId = users.createUser({ username: "Banned", email: "banned@example.test", handle: "banned", passwordHash: "hash" });
    relationships.requestFriend(viewerId, bannedId);
    relationships.acceptFriend(viewerId, bannedId);
    const groupId = groups.createGroup(viewerId, "Design Club", "description");
    groups.joinGroup(groupId, bannedId);

    const wallPostId = posts.createWallPost(bannedId, bannedId, "banned wall");
    const groupPostId = posts.createGroupPost(bannedId, groupId, "banned group");
    posts.addPostProp(wallPostId, viewerId);
    posts.addPostProp(groupPostId, viewerId);

    users.setUserBanned(bannedId, true);

    expect(posts.getVisiblePost(wallPostId, currentUser(viewerId))).toBeUndefined();
    expect(posts.getVisiblePost(groupPostId, currentUser(viewerId))).toBeUndefined();
    expect(posts.feedPageForUser(currentUser(viewerId), { limit: 10 }).items).toEqual([]);
    expect(posts.postsForGroupPage(groupId, currentUser(viewerId), { limit: 10 }).items).toEqual([]);
    expect(posts.proppedPostsForViewer(currentUser(viewerId), 10)).toEqual([]);
  });

  it("requires group membership for group posting and interaction", async () => {
    const { groups, posts, users } = await loadIsolatedDb();
    const ownerId = users.createUser({ username: "Owner", email: "owner@example.test", handle: "owner", passwordHash: "hash" });
    const memberId = users.createUser({ username: "Member", email: "member@example.test", handle: "member", passwordHash: "hash" });
    const outsiderId = users.createUser({ username: "Outsider", email: "outsider@example.test", handle: "outsider", passwordHash: "hash" });
    groups.createGroup(ownerId, "Everyone", "description");
    const groupId = groups.createGroup(ownerId, "Design Club", "description");
    groups.joinGroup(groupId, memberId);
    const postId = posts.createGroupPost(ownerId, groupId, "group post");
    const post = posts.getPost(postId, currentUser(memberId));

    expect(posts.canPostToGroup(memberId, groupId)).toBe(true);
    expect(posts.canPostToGroup(outsiderId, groupId)).toBe(false);
    expect(post && posts.canInteractWithPost(post, memberId)).toBe(true);
    expect(post && posts.canInteractWithPost(post, outsiderId)).toBe(false);
  });

  it("lists post comments oldest to newest", async () => {
    const { posts, users } = await loadIsolatedDb();
    const authorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const postId = posts.createWallPost(authorId, authorId, "post");
    const firstCommentId = posts.addPostComment(postId, authorId, "first");
    const secondCommentId = posts.addPostComment(postId, authorId, "second");
    const replyId = posts.addPostComment(postId, authorId, "reply", firstCommentId ?? undefined);

    expect(posts.postCommentsFor(postId, currentUser(authorId)).map((comment) => comment.id)).toEqual([
      firstCommentId,
      replyId,
      secondCommentId
    ]);
  });
});
