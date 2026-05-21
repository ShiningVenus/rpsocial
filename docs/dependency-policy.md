# Dependency Policy

Bliish.space keeps runtime dependencies intentionally small so self-hosted instances remain easy to audit and operate.

## Defaults

- Prefer the TypeScript standard library, Hono APIs, prepared SQLite statements, and local helpers before adding a package.
- Add a dependency only when it removes meaningful security risk, maintenance burden, or large duplicated code.
- Keep optional infrastructure optional. Do not add a required hosted service, queue, cache, analytics tool, or object store for a core workflow.
- Pin package versions through `pnpm-lock.yaml`.

## Review Checklist

Before adding a dependency, confirm:

- the package is actively maintained;
- the license can be used in a GPL-3.0-only project;
- the package is needed at runtime or can stay in `devDependencies`;
- the same behavior is not already available in the app's shared modules, `src/server`, `src/ui`, or the platform;
- attribution is added to `NOTICE` when required.

Run `pnpm install`, `pnpm typecheck`, `pnpm test`, and `pnpm build` after dependency changes.
