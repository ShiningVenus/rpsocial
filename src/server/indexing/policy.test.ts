import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppBindings } from "../context.js";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadIndexingApp() {
  const modules = await loadIndexingModules();
  const { indexingMiddleware } = await import("./middleware.js");
  const app = new Hono<AppBindings>();

  app.use(async (c, next) => {
    c.set("currentUser", null);
    c.set("csrfToken", "token");
    await next();
  });
  app.use(indexingMiddleware());
  app.all("*", (c) => c.text("ok"));

  return { app, ...modules };
}

async function loadBlockedCrawlerApp() {
  const modules = await loadIndexingModules();
  const { blockedCrawlerMiddleware } = await import("./crawlers.js");
  const app = new Hono<AppBindings>();
  app.use(blockedCrawlerMiddleware());
  app.get("/robots.txt", (c) => c.text("robots"));
  app.get("/static/css/style.css", (c) => c.text("css"));
  app.get("/sitemap.xml", (c) => c.text("sitemap"));
  return { app, ...modules };
}

async function loadCrawlerRoutesApp() {
  const modules = await loadIndexingModules();
  const { registerCrawlerRoutes } = await import("../../routes/system/crawlers.js");
  const app = new Hono<AppBindings>();
  registerCrawlerRoutes(app);
  return { app, ...modules };
}

async function loadIndexingModules() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-indexing-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");
  process.env.BLIISH_BASE_URL = "https://example.test";

  const client = await import("../db/client.js");
  db = client.sqlite;
  const schema = await import("../db/schema.js");
  schema.initializeDatabase();

  return {
    blogs: await import("../db/blogs/index.js"),
    skins: await import("../db/skins.js"),
    users: await import("../db/users.js")
  };
}

function requestPage(app: Hono<AppBindings>, path: string, userAgent = "Mozilla/5.0") {
  return app.request(path, { headers: { "user-agent": userAgent } });
}

afterEach(() => {
  db?.close();
  db = undefined;
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = undefined;
  delete process.env.BLIISH_DATABASE_PATH;
  delete process.env.BLIISH_UPLOAD_DIR;
  delete process.env.BLIISH_BASE_URL;
});

describe("indexing policy", () => {
  it("indexes public profiles and noindexes private profiles", async () => {
    const { app, users } = await loadIndexingApp();
    const publicId = users.createUser({ username: "Public", email: "public@example.test", handle: "public", passwordHash: "hash" });
    const privateId = users.createUser({ username: "Private", email: "private@example.test", handle: "private", passwordHash: "hash" });
    const bannedId = users.createUser({ username: "Banned", email: "banned@example.test", handle: "banned", passwordHash: "hash" });
    users.updateProfile(privateId, { private: true });
    users.setUserBanned(bannedId, true);

    const publicResponse = await requestPage(app, "/u/public");
    const privateResponse = await requestPage(app, "/u/private");
    const bannedResponse = await requestPage(app, "/u/banned");

    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get("X-Robots-Tag")).toBeNull();
    expect(privateResponse.status).toBe(200);
    expect(privateResponse.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(bannedResponse.status).toBe(200);
    expect(bannedResponse.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("noindexes blogs that are friends-only, private, or under private authors", async () => {
    const { app, blogs, users } = await loadIndexingApp();
    const publicAuthorId = users.createUser({ username: "Author", email: "author@example.test", handle: "author", passwordHash: "hash" });
    const privateAuthorId = users.createUser({ username: "PrivateAuthor", email: "private-author@example.test", handle: "private-author", passwordHash: "hash" });
    users.updateProfile(privateAuthorId, { private: true });
    const publicBlogId = blogs.createBlog(publicAuthorId, "Public", "body", "Life", 0);
    const friendsBlogId = blogs.createBlog(publicAuthorId, "Friends", "body", "Life", 1);
    const privateBlogId = blogs.createBlog(publicAuthorId, "Private", "body", "Life", 2);
    const privateAuthorBlogId = blogs.createBlog(privateAuthorId, "Hidden", "body", "Life", 0);

    expect((await requestPage(app, `/b/${publicBlogId}`)).headers.get("X-Robots-Tag")).toBeNull();
    expect((await requestPage(app, `/b/${friendsBlogId}`)).headers.get("X-Robots-Tag")).toContain("noindex");
    expect((await requestPage(app, `/b/${privateBlogId}`)).headers.get("X-Robots-Tag")).toContain("noindex");
    expect((await requestPage(app, `/b/${privateAuthorBlogId}`)).headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("blocks crawlers from non-indexable pages while allowing search bots on public pages", async () => {
    const { app, users } = await loadIndexingApp();
    const publicId = users.createUser({ username: "Public", email: "public@example.test", handle: "public", passwordHash: "hash" });
    const privateId = users.createUser({ username: "Private", email: "private@example.test", handle: "private", passwordHash: "hash" });
    users.updateProfile(privateId, { private: true });

    const publicSearchBot = await requestPage(app, "/u/public", "Googlebot/2.1");
    const privateSearchBot = await requestPage(app, "/u/private", "Googlebot/2.1");
    const publicCommandLineClient = await requestPage(app, "/u/public", "curl/8.0");
    const privateCommandLineClient = await requestPage(app, "/u/private", "curl/8.0");
    const blockedAiCrawler = await requestPage(app, "/u/public", "GPTBot/1.0");

    expect(publicSearchBot.status).toBe(200);
    expect(publicSearchBot.headers.get("X-Robots-Tag")).toBeNull();
    expect(privateSearchBot.status).toBe(403);
    expect(privateSearchBot.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(publicCommandLineClient.status).toBe(200);
    expect(privateCommandLineClient.status).toBe(403);
    expect(blockedAiCrawler.status).toBe(403);
  });

  it("serves robots policy for private areas and AI crawler agents", async () => {
    const { app } = await loadCrawlerRoutesApp();

    const text = await (await app.request("/robots.txt")).text();

    expect(text).toContain("User-agent: GPTBot\nDisallow: /");
    expect(text).toContain("User-agent: *\nDisallow: /admin");
    expect(text).toContain("Sitemap: https://example.test/sitemap.xml");
  });

  it("blocks AI crawler agents before assets while keeping robots readable", async () => {
    const { app } = await loadBlockedCrawlerApp();

    const robots = await requestPage(app, "/robots.txt", "GPTBot/1.0");
    const staticAsset = await requestPage(app, "/static/css/style.css", "GPTBot/1.0");
    const sitemap = await requestPage(app, "/sitemap.xml", "GPTBot/1.0");

    expect(robots.status).toBe(200);
    expect(staticAsset.status).toBe(403);
    expect(staticAsset.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(sitemap.status).toBe(403);
  });

  it("builds a sitemap from only public canonical content", async () => {
    const { app, blogs, skins, users } = await loadCrawlerRoutesApp();
    const publicAuthorId = users.createUser({ username: "Public", email: "public@example.test", handle: "public", passwordHash: "hash" });
    const privateAuthorId = users.createUser({ username: "Private", email: "private@example.test", handle: "private", passwordHash: "hash" });
    users.updateProfile(privateAuthorId, { private: true });
    const publicBlogId = blogs.createBlog(publicAuthorId, "Public", "body", "Life", 0);
    const friendsBlogId = blogs.createBlog(publicAuthorId, "Friends", "body", "Life", 1);
    const privateAuthorBlogId = blogs.createBlog(privateAuthorId, "Hidden", "body", "Life", 0);
    const skinId = skins.createSkin(publicAuthorId, "Skin", "description", "<div>skin</div>");

    const xml = await (await app.request("/sitemap.xml")).text();

    expect(xml).toContain("/u/public");
    expect(xml).toContain(`/b/${publicBlogId}`);
    expect(xml).toContain(`/s/${skinId}`);
    expect(xml).not.toContain("/u/private");
    expect(xml).not.toContain(`/b/${friendsBlogId}`);
    expect(xml).not.toContain(`/b/${privateAuthorBlogId}`);
  });
});
