import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIsolatedDb() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-relationships-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");
  process.env.BLIISH_ADMIN_USER_ID = "999999";

  const client = await import("./client.js");
  db = client.sqlite;
  const schema = await import("./schema.js");
  schema.initializeDatabase();

  return {
    relationships: await import("./relationships.js"),
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
  delete process.env.BLIISH_ADMIN_USER_ID;
});

describe("relationships", () => {
  it("accepts an incoming pending request when the receiver sends a reciprocal request", async () => {
    const { relationships, users } = await loadIsolatedDb();
    const senderId = users.createUser({ username: "Sender", email: "sender@example.test", handle: "sender", passwordHash: "hash" });
    const receiverId = users.createUser({ username: "Receiver", email: "receiver@example.test", handle: "receiver", passwordHash: "hash" });

    expect(relationships.requestFriend(senderId, receiverId)).toBe("requested");
    expect(relationships.requestFriend(receiverId, senderId)).toBe("accepted");

    expect(relationships.friendshipBetween(senderId, receiverId)).toMatchObject({
      sender_id: senderId,
      receiver_id: receiverId,
      status: "ACCEPTED"
    });
    expect(relationships.pendingRequestsFor(receiverId)).toEqual([]);
    expect(relationships.sentRequestsFor(senderId)).toEqual([]);
    expect(relationships.friendsFor(senderId).map((person) => person.id)).toEqual([receiverId]);
  });
});
