---
name: e2e-tests
description: Playwright end-to-end conventions for this repo — critical paths only, accessible selectors, deterministic waits. Load when writing or running e2e tests.
---

# E2E Tests (Playwright)

E2E is the most expensive test tier — cover **critical paths, not everything**.
Unit tests in `libs/engine` own the domain branches; e2e proves the wiring:
route → use case → database → response, through a real browser and server.

## Critical paths for this app

1. Shorten happy path — form → short link visible + copy button.
2. Redirect — short URL answers `302` with the exact `Location`.
3. Validation feedback — unsafe input (`javascript:`) shows an inline error.
4. Stats — `/urls` lists the link with its click count after a tracked hit.

Suite lives in `applications/web/e2e/`, config in `playwright.config.ts`.
Run with `pnpm --filter web e2e` (starts the dev server itself; needs the
docker `db` service up).

## Selectors

- Prefer accessible queries: `getByRole`, `getByLabel`, `getByPlaceholder` —
  they test what users perceive and survive markup refactors.
- `data-testid` only when a role/name is genuinely ambiguous. If you need it,
  the component's accessibility probably needs work first.
- Never CSS/class selectors — Tailwind class soup churns constantly.

## Determinism rules

- **Wait for state, never for time.** `await expect(locator).toBeVisible()`,
  not `waitForTimeout`. Zero sleeps in specs.
- **Unique data per test.** Every scenario shortens its own URL
  (timestamp + random suffix) — idempotent shortening would otherwise reuse
  rows across runs and couple tests to each other.
- **Serial workers (`workers: 1`).** The shorten action is rate limited per
  client; parallel workers make the request count nondeterministic.
- **Click-count assertions must send a real browser UA.** `isbot` filters
  headless/system agents (including Playwright's request UA and
  HeadlessChrome) out of stats — a default-UA hit asserts 0 clicks and fails.

## Server lifecycle

`webServer` in the config boots `pnpm dev` and waits for the URL; locally it
reuses a server you already have running (`reuseExistingServer: !CI`). In CI
the job provides Postgres as a service container and passes `DATABASE_URL`.

## Artifacts

`test-results/` and `playwright-report/` are gitignored — traces are kept on
first retry only (`trace: "on-first-retry"`).
