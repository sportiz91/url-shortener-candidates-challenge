# URL Shortener

Shortens URLs, redirects short codes to their targets, and tracks click statistics.

## Architecture

```
                     ┌──────────────────────────────────────────────┐
                     │            applications/web                  │
                     │      React Router v7 · SSR · React 19        │
                     │                                              │
 Browser ──POST───▶  │  _index.tsx  (action: shorten + rate limit)  │
 Browser ──GET────▶  │  s.$code.tsx (loader: redirect 302 + click)  │
 Browser ──GET────▶  │  urls.tsx    (loader: stats table)           │
                     │       │                                      │
                     │  .server/container.ts    ← composition root  │
                     │  .server/rate-limiter.ts ← 429 + Retry-After │
                     └───────┼──────────────────────────────────────┘
                             │  routes only see USE CASES (interfaces)
                     ┌───────▼──────────────────────────┐
                     │          libs/engine             │  pure TypeScript,
                     │  VOs: OriginalUrl · ShortCode    │  no framework,
                     │  Aggregate: ShortenedUrl         │  no IO
                     │  Use cases: ShortenUrl           │
                     │    ResolveShortCode · ListUrls   │
                     │  Ports: UrlRepository            │
                     │    CodeGenerator · Clock         │
                     └───────▲──────────────────────────┘
                             │  implements the ports (arrow INVERTED:
                             │  infrastructure depends on the domain)
                     ┌───────┴──────────────────────────┐
                     │      libs/infrastructure         │
                     │  PrismaUrlRepository (P2002 →    │
                     │    typed SaveConflictError)      │
                     │  createContainer() ← the ONLY    │
                     │    place Prisma is instantiated  │
                     └───────┬──────────────────────────┘
                             │ SQL
                        ┌────▼───────┐
                        │ PostgreSQL │  docker compose · pgdata volume
                        └────────────┘  migrations apply on boot
```

Dependencies point inward only: `web → infrastructure → engine`.

Quality runs as three rings around the code — while it's written, at commit, and on push:

```
  while coding (AI-assisted)        at commit                    on push
 ┌───────────────────────────┐   ┌──────────────────────┐   ┌───────────────────────┐
 │ Claude Code               │   │ husky pre-commit     │   │ GitHub Actions CI     │
 │ · CLAUDE.md house rules   │   │  └─ lint-staged:     │   │  quality: lint,       │
 │ · .claude/skills          │──▶│     prettier --write │──▶│   format:check,       │
 │ · PostToolUse hook:       │   │     eslint --fix     │   │   typecheck, test,    │
 │   prettier + eslint --fix │   │     (staged files)   │   │   build               │
 │   after every AI edit     │   │                      │   │  docker: image build  │
 └───────────────────────────┘   └──────────────────────┘   └───────────────────────┘
```

- **`libs/engine`** — value objects (`OriginalUrl`, `ShortCode`), the `ShortenedUrl`
  aggregate, typed domain errors, and use cases (`ShortenUrl`, `ResolveShortCode`,
  `ListUrls`) written against ports (`UrlRepository`, `CodeGenerator`, `Clock`).
  Tested with Vitest against an in-memory repository fake — no database needed.
- **`libs/infrastructure`** — implements `UrlRepository` with Prisma on PostgreSQL,
  translating unique-constraint violations into domain errors, and exposes
  `createContainer()`: the single composition root. Routes never see Prisma.
- **`applications/web`** — thin routes that parse input, call a use case, and map
  typed errors to responses. Reusable UI components, pending states via
  `useNavigation`, and a stats view at `/urls`.

## Tech Stack

| Technology                                    | Description                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [pnpm](https://pnpm.io/)                      | Fast, disk-efficient package manager with built-in monorepo support via workspaces                |
| [Turbo](https://turbo.build/)                 | High-performance build system for monorepos. Runs tasks in parallel and caches results            |
| [React](https://react.dev/)                   | Library for building user interfaces with components                                              |
| [React Router v7](https://reactrouter.com/)   | Full-stack React framework. Handles routing, data loading (loaders), mutations (actions), and SSR |
| [TypeScript](https://www.typescriptlang.org/) | Typed superset of JavaScript for catching errors at compile time                                  |
| [Tailwind CSS](https://tailwindcss.com/)      | Utility-first CSS framework for rapid UI development                                              |
| [Vite](https://vite.dev/)                     | Fast build tool and dev server with hot module replacement                                        |
| [Prisma](https://www.prisma.io/)              | ORM — schema, migrations and the PostgreSQL client behind the repository port                     |
| [PostgreSQL](https://www.postgresql.org/)     | Persistence. Unique constraints are the single arbiter of code/URL uniqueness                     |
| [Vitest](https://vitest.dev/)                 | Unit tests for the domain and application layer                                                   |

Quality gates: ESLint (flat config) + Prettier + husky/lint-staged on every commit,
and GitHub Actions CI (lint, format check, typecheck, unit tests, build, Playwright
e2e against a Postgres service, Docker image).

## Docker Setup

Everything (app + PostgreSQL + migrations) runs with one command:

```bash
docker-compose up --build
```

Open `http://localhost:3000`

The `web` container applies pending Prisma migrations on boot and then starts the
server, so a fresh clone works with no extra steps. Data survives restarts via the
`pgdata` volume.

## Local Setup (development)

```bash
pnpm install
cp .env.example .env
docker compose up -d db     # PostgreSQL on localhost:55432
pnpm db:migrate             # apply migrations (reads .env)
pnpm dev
```

Open `http://localhost:5173`

### Useful scripts

```bash
pnpm test               # unit tests (Vitest)
pnpm --filter web e2e   # Playwright e2e (needs the db service up)
pnpm lint               # ESLint
pnpm typecheck          # tsc + react-router typegen
pnpm format             # Prettier
pnpm db:migrate         # create/apply a migration in dev
```

## Security notes

- URL validation lives inside the `OriginalUrl` value object (scheme allowlist,
  no embedded credentials, length cap, self-host blocklist) — it cannot be
  bypassed by any entry point, which closes the `javascript:`/`data:` open-redirect
  hole of the original code.
- The shorten action is rate limited per client (fixed window, `429` +
  `Retry-After`). `X-Forwarded-For` is only trusted when `TRUST_PROXY=true`.
- Redirects use `302` so click statistics keep counting (a `301` would be cached
  by browsers forever); bot traffic is excluded from stats via `isbot`.
