import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppBindings } from "../../server/context.js";

let db: SqliteDatabase | undefined;
let tmpDir: string | undefined;

async function loadSiteApp() {
  vi.resetModules();
  tmpDir = mkdtempSync(join(tmpdir(), "bliishspace-site-"));
  process.env.BLIISH_DATABASE_PATH = join(tmpDir, "test.sqlite");
  process.env.BLIISH_UPLOAD_DIR = join(tmpDir, "uploads");
  process.env.BLIISH_BASE_URL = "https://example.test";

  const client = await import("../../server/db/client.js");
  db = client.sqlite;
  const schema = await import("../../server/db/schema.js");
  schema.initializeDatabase();

  const { indexingMiddleware } = await import("../../server/indexing/middleware.js");
  const { registerSiteRoutes } = await import("./index.js");
  const app = new Hono<AppBindings>();
  app.use(async (c, next) => {
    c.set("currentUser", null);
    c.set("csrfToken", "token");
    await next();
  });
  app.use(indexingMiddleware());
  registerSiteRoutes(app);
  return app;
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

describe("site pages", () => {
  it("renders source project structured data on the source page", async () => {
    const app = await loadSiteApp();

    const html = await (await app.request("/source")).text();

    expect(html).toContain('<link rel="canonical" href="https://example.test/source"');
    expect(html).toContain("Primary language: TypeScript. Runtime: Node.js.");
    expect(html).toContain('"@type":"SoftwareSourceCode"');
    expect(html).toContain('"mainEntityOfPage":"https://example.test/source"');
    expect(html).toContain('"codeRepository":"https://github.com/bliish-com/bliishspace"');
    expect(html).toContain('"license":"https://www.gnu.org/licenses/gpl-3.0.html"');
  });
});
