---
name: unit-tests
description:
  Write and run Vitest unit tests for this repo — colocated specs, AAA structure, fake port
  implementations instead of mocks, coverage focused on domain + use cases. Use when generating
  tests, running tests, checking coverage, or doing TDD on a module.
---

# Unit Tests

Vitest, colocated specs. Run with `pnpm test` from the root (Turborepo fans out per package) or
`pnpm --filter <package> test` for one package.

## Conventions

- **Colocated specs**: `shortened-url.ts` → `shortened-url.spec.ts`, same directory. The test
  lives next to the thing it proves.
- **AAA structure**: Arrange / Act / Assert, visually separated, one logical assertion per test.
  Test names state behavior, not implementation: `rejects urls without http(s) scheme`, not
  `test isValid returns false`.
- **Test through the public API of the unit.** A use case is tested by calling `execute()`; a
  value object by its factory. Never reach into private state or test intermediate internals —
  tests that mirror the implementation break on every refactor while proving nothing.
- **Independent tests**: no shared mutable state; each test builds its own fixtures.

## Fake the ports, don't mock the internals (the DDD angle)

The domain depends on ports (`UrlRepository`, `CodeGenerator`) — interfaces owned by
`libs/engine`. In tests, substitute them with **small, honest in-memory implementations**, not
`vi.mock` patchwork:

```ts
class InMemoryUrlRepository implements UrlRepository {
  private urls = new Map<string, ShortenedUrl>();
  async save(url: ShortenedUrl) {
    this.urls.set(url.code.value, url);
  }
  async findByCode(code: ShortCode) {
    return this.urls.get(code.value) ?? null;
  }
}
```

- The fact that an `InMemoryUrlRepository` can fully replace the Prisma adapter **is the proof
  that dependency inversion works** — the domain never learns what database it runs on.
- Fakes hold real behavior (a Map, a counter); they can be asserted against directly
  (`repository.findByCode(...)` after the act phase) instead of verifying call counts.
- **Never mock the unit under test.** Mock/fake only its collaborators, at the port boundary.
- Reserve `vi.fn()` for genuine interaction checks at the edge (e.g. "generator was not called
  when a custom code is provided") — behavior assertions beat call-count assertions.

## Determinism

Anything nondeterministic is **injected as a port** so tests control it:

- **Clock**: use cases receive a `Clock` (or `now()` function); tests pass a fixed instant.
  Never `new Date()` inside domain logic, never sleep/retry in tests.
- **Code generation**: tests pass a stub `CodeGenerator` returning known codes — collision
  scenarios become trivial ("generator returns taken code first, free code second").
- No test may depend on ordering, wall time, network, or a real database. The Prisma adapter is
  covered by its own thin integration layer, not by unit tests.

## Coverage focus

- **Priority: `libs/engine` — value objects, aggregate invariants, and use cases** — this is
  where the business rules live and where high coverage pays.
- Test the unhappy paths deliberately: invalid URLs, collisions, not-found, expired. The happy
  path is one test; the edges are the suite.
- UI components are tested for behavior when they carry logic worth protecting — not for pixel
  output, and never as a substitute for domain tests.

## TDD mode

When asked for TDD: strict **RED → GREEN → REFACTOR**. Write the failing spec first, run it to
see it fail for the right reason, implement the minimum, re-run, then refactor with the suite
green. Never write the implementation and backfill tests in the same step.
