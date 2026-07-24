# URL Shortener — Project Guide

pnpm + Turborepo monorepo. `libs/engine` is the pure TypeScript core — domain (value objects
`OriginalUrl`/`ShortCode`, aggregate `ShortenedUrl`, ports `UrlRepository`/`CodeGenerator`) and
application layer (use cases) — tested with Vitest and free of any framework or IO. `libs/infrastructure`
implements the ports (Prisma + PostgreSQL adapter) and exposes a composition root that wires
adapters into use cases. `applications/web` is the React Router v7 (framework mode, SSR) +
React 19 + Tailwind v4 UI: loaders/actions call use cases obtained from the composition root.
Dependencies point inward only: web → infrastructure → engine, never the reverse.

## Commands

```bash
pnpm dev          # all packages in watch mode (turbo)
pnpm build        # build everything
pnpm test         # Vitest across packages
pnpm lint         # ESLint (flat config) — Prettier + husky/lint-staged gate commits
pnpm typecheck    # tsc (+ react-router typegen in web)
docker compose up # run the built app (and services) locally
```

Scope to one package with `pnpm --filter <package> <script>`.

## Non-negotiable conventions

- **The domain stays pure.** No framework, Prisma, or Node-API imports inside `libs/engine` —
  it must run (and be tested) with nothing but TypeScript.
- **Routes never instantiate adapters.** Loaders/actions get use cases from the composition
  root — `new PrismaClient()` or an adapter constructor in a route file is a rejected change.
- **Errors are typed values in the domain** (`ok | error` results). Exceptions are for bugs;
  routes map error values to user-facing responses at the edge.
- **Conventional commits** (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`), small and scoped.
- Validation happens once, at the boundary, inside value objects — past construction, types are
  proof.

## Skills (when to load which)

- **clean-code** — writing or refactoring ANY TypeScript: naming, function shape, control flow,
  module limits, the pre-commit self-review.
- **ddd-solid** — touching the domain, adding a use case, or reviewing architecture: the
  tactical-pattern map of this repo and the calibration rule (abstractions must earn their keep).
- **react-best-practices** — anything in `applications/web`: routes, loaders/actions, component
  and hook rules for React Router v7 + React 19.
- **unit-tests** — writing or running tests: Vitest conventions, in-memory port fakes,
  determinism via injected clock/generator.
- **e2e-tests** — Playwright suite in `applications/web/e2e`: critical paths only,
  accessible selectors, wait-on-state, the isbot/UA gotcha for click assertions.
- **security-review** — touching URL validation, the redirect route, or user input; run its
  audit before calling a feature done.
- **parallel-worktree** — multi-session work on larger efforts: isolated worktrees per work
  area, gates before merging back (not exercised in this single-session challenge).
- **tdd** — red-green-refactor loop and test philosophy (behavior over implementation, no
  horizontal slicing). This challenge wrote tests alongside code rather than strictly
  test-first; the skill is the reference for when the loop is worth running end-to-end.
