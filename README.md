# URL Shortener

Shortens URLs, redirects short codes to their targets, and tracks click statistics.

## Architecture

```
url-shortener/
├── applications/web/      # React Router v7 (SSR) — UI + HTTP boundary (loaders/actions)
├── libs/engine/           # Pure domain + application layer (no framework, no IO)
└── libs/infrastructure/   # Prisma/PostgreSQL adapter + composition root
```

Dependencies point inward only: `web → infrastructure → engine`.

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
and GitHub Actions CI (lint, format check, typecheck, tests, build, Docker image).

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
pnpm test          # unit tests (Vitest)
pnpm lint          # ESLint
pnpm typecheck     # tsc + react-router typegen
pnpm format        # Prettier
pnpm db:migrate    # create/apply a migration in dev
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
