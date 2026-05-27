# AGENTS.md

This file defines instructions for AI/code agents working anywhere in this repository.

## 1) Repository Identity and Goals

- Project: **bliish.space** (server-rendered social platform).
- Priorities: **small runtime**, **readable code**, **self-hostable defaults**, **security-first form workflows**.
- Keep behavior explicit and auditable over “magic” abstractions.

Primary references:
- `README.md` for setup, project layout, and workflow expectations.
- `ARCHITECTURE.md` for boundaries and ownership.
- `CONTRIBUTING.md` for coding and PR expectations.
- `docs/dependency-policy.md` for dependency decisions.

## 2) Core Architectural Rules (Must Follow)

1. **Server-rendered + form-first stays the default**.
   - Do not introduce client-app-shell assumptions.
   - Avoid adding required client JS for core workflows.

2. **Keep route layering intact**.
   - Routes in `src/routes/**` handle auth, input parsing, validation, redirects.
   - DB modules in `src/server/db/**` own SQL and row-level access logic.
   - Views in `src/views/**` own markup.
   - Shared UI stays in `src/ui/**`.

3. **SQLite + prepared statements only**.
   - Use `better-sqlite3` prepared statement style already used in repo.
   - Do not add ORM/query builder abstraction.

4. **Schema authority**.
   - `src/server/db/schema.ts` is source-of-truth for schema.
   - Any schema-related behavior changes must keep dependent modules in sync (exports, moderation subjects, policy/docs).

5. **Security boundary discipline**.
   - Sanitize user HTML before storage; render via trusted boundaries.
   - Maintain CSRF protection on mutations.
   - Validate identity, ownership, and IDs before writes.
   - Never expose raw server errors to users.

## 3) Change-Size and Scope Expectations

- Favor cohesive, reviewable patches.
- Keep files understandable in one pass.
- Prefer reusing existing modules/components/helpers over creating parallel implementations.
- Do not silently refactor unrelated code while implementing a feature/fix.

## 4) Dependency Policy (Strict)

Before adding any dependency:
- Verify it is genuinely needed and not already solvable with platform/app utilities.
- Ensure license compatibility with GPL-3.0-only project.
- Keep hosted/third-party infra optional; do not introduce mandatory services.
- Update `NOTICE` if required for attribution.
- Run full checks after dependency changes.

If dependency is not clearly justified, **do not add it**.

## 5) Data, Files, and Runtime Artifacts

Do **not** commit runtime or generated local artifacts such as:
- `node_modules/`
- `dist/`
- local DB files under `data/`
- uploads/media generated locally
- private notes or machine-local files

When removing rows that reference uploaded files, ensure filesystem cleanup in same flow.

## 6) Implementation Conventions

### TypeScript and module style
- Preserve existing TypeScript strictness and naming style.
- Keep domain types explicit at boundaries (auth, DB rows, permissions, sanitizer I/O).
- Prefer focused helper functions instead of deep inheritance or broad abstractions.

### Routes and server behavior
- Keep route handlers thin.
- Validate and authorize early.
- Delegate data operations to DB modules.

### UI and views
- Reuse shared UI primitives/components where possible (comments/panels/forms/avatars/links/html boundary).
- Avoid duplicating near-identical UI variants in feature pages.

### Pagination/data access
- Follow existing keyset pagination patterns where applicable (`limit + 1`, opaque cursors).
- Keep indexing/crawler behavior centralized in indexing modules.

## 7) Security and Privacy Guardrails

- Treat profile/skin HTML and media as high-risk input surfaces.
- Keep sanitizer/CSP/URL policy assumptions intact unless intentionally updated.
- Preserve request body size protections and rate-limit integration on mutating forms.
- Never add tracking, analytics beacons, or ad-network integrations by default.

## 8) Documentation Sync Requirements

Update docs when changing behavior in any of these areas:
- setup/development workflow
- schema/data model behavior
- deployment/operations
- security/privacy/policy behavior
- dependency decisions

Docs should reflect actual code paths, not aspirational behavior.

## 9) Testing and Verification Expectations

For meaningful code changes, run:
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If UI is visibly changed, include screenshots in PR context.
If an environment limitation prevents a check, report it explicitly.

## 10) Git and Commit Hygiene

- Keep commit messages clear and scoped.
- Avoid mixing unrelated concerns in one commit.
- Ensure a clean diff (no accidental formatting churn or unrelated lockfile drift unless intended).

Suggested commit format:
- `docs: add repository-wide AGENTS guidance`
- `fix(posts): validate ownership before delete`
- `feat(admin): add automod rule import guard`

## 11) PR Content Expectations for Agents

PR description should include:
1. Behavior change summary.
2. Affected routes/modules.
3. Security/data implications.
4. Tests run and results.
5. AI assistance disclosure when substantial.

Suggested disclosure text:
- `AI assistance: AI tools were used to help draft or refactor parts of this change. I reviewed, edited, and tested the final code.`

## 12) Anti-Patterns to Avoid

- Adding framework/runtime complexity without strong justification.
- Duplicating logic that already exists in shared modules.
- Moving SQL out of DB modules into routes/views.
- Rendering unsanitized UGC.
- Introducing required external services for core product behavior.
- Committing generated/runtime files.

## 13) Fast Pre-PR Checklist

- [ ] Change stays within architecture boundaries.
- [ ] Security constraints preserved (CSRF/auth/ownership/sanitization).
- [ ] No unnecessary new dependencies.
- [ ] Docs updated if behavior/policy changed.
- [ ] `pnpm typecheck` passed.
- [ ] `pnpm test` passed.
- [ ] `pnpm build` passed.
- [ ] Diff contains only intentional files.

---

When in doubt: choose the smallest, clearest, safest change consistent with `ARCHITECTURE.md`, `CONTRIBUTING.md`, and `docs/dependency-policy.md`.
