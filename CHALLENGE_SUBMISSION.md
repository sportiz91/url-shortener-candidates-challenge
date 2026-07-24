# Submission

## What I Did

In priority order:

1. **Domain model first** (`libs/engine`). Replaced the 9-possible-codes generator and
   the module-level `Map` with a small, calibrated domain: `OriginalUrl` and `ShortCode`
   value objects, a `ShortenedUrl` aggregate, use cases (`ShortenUrl`, `ResolveShortCode`,
   `ListUrls`) behind ports, and errors as typed values instead of exceptions. I
   deliberately stopped there — no CQRS, no domain events, no event sourcing. A URL
   shortener doesn't earn that complexity; the boundaries are in place for the day it does.

2. **Persistence** (`libs/infrastructure`). Prisma + PostgreSQL behind the `UrlRepository`
   port, wired once in `createContainer()` — routes never see Prisma. The decisions I'd
   defend in a review:
   - **Uniqueness belongs to the database.** Random code + unique constraint + bounded
     retry on `P2002`. Check-then-insert would race under concurrent requests.
   - **Shortening is idempotent**: the same URL always returns the same code (unique
     constraint on the normalized URL, and losing that race falls back to the winner's code).
   - **Click counting is one atomic UPDATE** (`increment`), not load-mutate-save on the
     aggregate — concurrent redirects would drop clicks otherwise.

3. **Web app** (`applications/web`). Thin loaders/actions that parse input, call a use
   case, and map typed errors to responses. Reusable `Button/Input/Card/CopyButton`
   components, pending state via `useNavigation`, inline error feedback, `/urls` stats
   table, friendly 404 boundary. Redirects are **302, not 301** — browsers cache permanent
   redirects and stats would silently stop counting. Crawler clicks are excluded via `isbot`.

4. **Abuse prevention.** URL validation lives _inside_ the value object (scheme allowlist,
   no embedded credentials, 2048-char cap, self-host blocklist) so no entry point can
   bypass it — that closes the `javascript:alert(1)` open-redirect hole in the original
   code. The shorten action has a per-client fixed-window rate limit (429 + `Retry-After`);
   `X-Forwarded-For` is only trusted behind `TRUST_PROXY=true` because otherwise the header
   is attacker-controlled.

5. **Quality gates.** ESLint (flat) + Prettier + husky/lint-staged pre-commit, 28 Vitest
   tests covering the domain and every use-case branch (collision retry, retry exhaustion,
   idempotency race, bot exclusion), plus a 4-scenario Playwright e2e suite for the
   critical paths (shorten, 302 redirect, invalid-input feedback, click stats) running
   against a real server + Postgres. GitHub Actions CI runs it all: lint/format/typecheck/
   unit tests/build, the e2e suite against a Postgres service, and the Docker image build.
   The unit tests run against an in-memory repository fake — that fake existing at all is
   the proof the dependency inversion is real.

Docker was verified end-to-end: `docker-compose up --build` boots Postgres, applies
migrations and serves on `:3000` with zero manual steps.

## What I Would Do With More Time

- Integration tests for the Prisma adapter against a real Postgres (testcontainers).
- If this ran on more than one instance: Redis-backed rate limiter, and a cache-aside
  decorator over the repository for redirects — caching only the immutable target URL,
  never the click count.
- A click-events table (timestamp, referrer) behind the same port instead of a plain
  counter, for real analytics. The counter was the right scope for 2 hours.
- Custom slugs and link expiration (TTL).
- Operational polish: structured logging, a `/health` endpoint, error tracking.

## AI Usage

Built with Claude Code end to end — and the repo ships my actual working setup so you can
see the workflow, not just its output:

- **`CLAUDE.md`** pins the conventions the agent must respect (domain stays pure, routes
  never instantiate adapters, errors as typed values, conventional commits).
- **`.claude/skills/`** are the standards the agent loads while coding here: clean-code,
  react-best-practices (React Router v7 flavored), unit-tests, security-review, tdd, and
  parallel-worktree (how I scale this workflow on bigger codebases; not needed for a
  single-session challenge).
- **Deterministic gates instead of trust**: a `PostToolUse` hook (`.claude/settings.json`)
  runs prettier + eslint --fix after every AI edit, and husky/lint-staged + typecheck +
  tests gate every commit. AI-written code merges through exactly the same checks
  human-written code would. `.claude/settings.hooks.example.jsonc` shows the stricter
  hooks I'd enable on a team repo.

Example prompts from the session (abridged):

> "Replace the intern generator with a `ShortCode` value object: 7 base62 chars,
> crypto-random with rejection sampling. Uniqueness is the DB's job — unique constraint
> plus a bounded retry on Prisma's P2002, never check-then-insert."

> "Routes stay thin: parse the form, call the use case from the composition root, map
> typed errors to 400/429 responses. If a route imports PrismaClient, that's a rejected
> change."

> "Write ShortenUrl specs against the in-memory fake: happy path, invalid URL,
> idempotency, collision retry, retry exhaustion, and losing the original-url race to a
> concurrent request."

What stayed human: the prioritization above, the aggregate boundary, 302 vs 301,
idempotent shortening, bot filtering, and the call to keep the rate limiter in-memory for
a single-instance deploy while documenting the Redis path instead of building it.

## Feedback

Good challenge. The intentionally broken template surfaces priorities fast, and the
monorepo shape (apps vs libs) rewards putting boundaries in the right place rather than
just making the UI pretty. The 2-hour box is tight, but that seems to be the point — it
forces explicit trade-offs, which is more interesting than a polished-everything take-home.
One small suggestion: say explicitly that adding services to `docker-compose.yml` (a
database) is expected — it's implied by the persistence requirement, but a candidate could
hesitate to touch the provided infra.
