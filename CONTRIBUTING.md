# Contributing

Bliish.space stays small, readable, self-hosted, and explicit about its tradeoffs.

## Principles

- Keep core workflows server-rendered and form-first.
- Do not add a framework, service, queue, worker, cache, or ORM unless it removes more code and risk than it adds.
- Prefer prepared SQL, plain HTML, and plain CSS over hidden abstractions.
- Check `docs/dependency-policy.md` before adding a dependency.
- Keep submitted code cohesive enough to review in one pass.

## Development

```bash
pnpm install
pnpm db:init
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Code Standards

- Keep files cohesive and small enough to review.
- Use TypeScript types for auth, permissions, database rows, and sanitizer boundaries.
- Use `better-sqlite3` prepared statements for database access.
- Keep the database schema source of truth in `src/server/db/schema.ts`; schema work starts from a fresh local data directory.
- Sanitize user HTML before storage and only render sanitized HTML.
- Keep mutations protected by CSRF.
- Validate IDs and ownership before mutating data.
- Keep route handlers thin: routes validate and authorize; database modules own SQL; views own markup.
- Reuse shared UI such as `CommentList`, `CommentPanel`, `Panel`, `ProfileImage`, and `trustedHtml` instead of duplicating page-local variants.
- When deleting rows that reference uploaded files, delete the filesystem objects in the same route or orchestration path.
- New reportable content must update `reportSubjectTypes`, `src/server/db/moderation/subjects.ts`, and the report links that expose it.
- Do not expose raw server errors to users.
- Do not commit generated build output, local SQLite files, uploaded media, dependency directories, or private notes.
- Keep documentation tied to code paths. If a doc describes behavior, verify the route, database helper, sanitizer, deployment script, or policy constant that implements it.

## AI-Assisted Contributions

AI coding tools may be used to assist with contributions. Contributors remain responsible for reviewing, editing, testing, licensing, and security of all submitted code.

Disclose substantial AI assistance in the pull request description or commit message without making it prominent project branding. A concise note is enough:

```text
AI assistance: AI tools were used to help draft or refactor parts of this change. I reviewed, edited, and tested the final code.
```

## Pull Request Checklist

- Describe the behavior change and the affected routes or modules.
- Disclose substantial AI assistance, if used.
- Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Include tests for auth, permissions, sanitization, uploads, or destructive actions when touched.
- Include screenshots for visible UI changes.
- Update docs when setup, schema, deployment, security behavior, or project policy changes.
- Confirm no new external network dependency was introduced.
- Confirm attribution is captured in `NOTICE` for any third-party material.
