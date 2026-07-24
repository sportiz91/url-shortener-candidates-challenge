---
name: ddd-solid
description: How DDD tactical patterns and SOLID are applied in this codebase — and when NOT to add more of them. Load when touching the domain, adding a use case, or reviewing architecture.
---

# DDD & SOLID — as applied here

The rule above every rule: **abstractions must earn their keep**. DDD and SOLID
lower the cost of change; used speculatively they raise it. This repo draws the
line deliberately — copy the line, not just the patterns.

## Tactical DDD map (where each pattern lives)

| Pattern          | Here                                         | The invariant it protects                                  |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------- |
| Value Object     | `OriginalUrl`                                | only normalized, safe http(s) URLs exist past the boundary |
| Value Object     | `ShortCode`                                  | codes are always 7 base62 chars                            |
| Aggregate        | `ShortenedUrl`                               | created valid, zero clicks, immutable identity             |
| Ports            | `UrlRepository`, `CodeGenerator`, `Clock`    | domain never touches IO or ambient state                   |
| Use cases        | `ShortenUrl`, `ResolveShortCode`, `ListUrls` | one business operation each, orchestration only            |
| Composition root | `createContainer()` in infrastructure        | adapters wired in exactly one place                        |

Rules that keep this honest:

- **VOs parse, they don't validate after the fact.** `create()` returns
  `Result` — an invalid instance is unrepresentable. New input rules go in the
  VO, never in a route.
- **Expected failures are typed values** (`Result` + error unions). Exceptions
  mean a broken invariant (e.g. a persisted row failing VO validation) — crash
  loudly, don't model it.
- **High-contention state can bypass load-mutate-save.** Click counting is an
  atomic repository operation because the real invariant is "never lose a
  click", not "the aggregate saw every increment". Domain purity loses to
  correctness under concurrency — say so explicitly in the code.

## SOLID, concretely

- **S** — route parses HTTP, use case orchestrates, VO validates, adapter
  persists. If a diff touches two of those responsibilities in one unit, split it.
- **O** — new storage = new adapter behind `UrlRepository`. Use cases don't change.
- **L** — adapters must honor the port contract exactly (the in-memory fake
  mimics both unique constraints for this reason).
- **I** — ports stay small and client-shaped (`Clock` is one method). Don't
  grow a god-repository; add a focused port.
- **D** — routes and use cases depend on interfaces only. The enforcement is
  not the interface existing but the composition root being the ONLY
  instantiation site — `new PrismaClient()` outside it is a rejected change.
  Proof of inversion: the whole application layer runs against
  `InMemoryUrlRepository` with no database.

## What we deliberately did NOT do (calibration)

No CQRS, no domain events, no event sourcing, no caching layer, no generic
repository. A URL shortener doesn't earn them. The boundaries above make each
one cheap to add the day metrics say it's needed — adding them before that is
speculative complexity, which reviewers here treat as a defect, not a flex.

When proposing a new abstraction, name (1) the invariant or change-cost it
protects and (2) the concrete trigger that justifies it now. No trigger → YAGNI.
