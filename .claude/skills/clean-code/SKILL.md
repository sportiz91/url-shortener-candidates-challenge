---
name: clean-code
description:
  Function- and module-level engineering standards for this repo — naming, function shape, control
  flow, TypeScript usage, comments, error handling, and the pre-commit self-review. Apply when
  WRITING or REFACTORING any TypeScript code (domain, infrastructure, routes, tests). Complements
  react-best-practices (UI architecture) — this skill is about how each function and file reads.
---

# Clean Code

These are the project's engineering standards. They exist so every file — human- or AI-written —
reads the same way, and so AI-generated code is reviewed against explicit rules rather than merged
on vibes.

## Naming

- **Intention-revealing, full words**: `dayOfMonth` not `mday`, `expiresAt` not `tmExp`. No
  abbreviations that need mental mapping, no `a1`/`a2`.
- **No type or noise words in names**: `typeString`, `fetchDataAsync`, `urlObject` — the type
  system and `await` already say it. `fetchDataAsync` → `fetchData`.
- **Consistent vocabulary**: one word per concept across the codebase. If it's `shortCode` in the
  domain, it is never `slug`/`hash`/`key` elsewhere for the same thing.
- **Short names are fine in tight scope**: loop `i`, one-line lambdas (`urls.map(u => u.code)`),
  variables used within 3-5 lines of declaration.
- **Named booleans before complex ifs**: extract a compound condition into a named variable or
  predicate — `if (isExpired(url))`, not `if (url.expiresAt !== null && url.expiresAt < now)`.
  The reader only dives into the logic if they need to.
- **Name length ∝ visibility**: public API methods get short, intuitive names (`findByCode`)
  because they're read constantly at call sites; private helpers get the long descriptive name
  (`retrieveUrlWithNormalizedScheme`) because they're implementation detail.
- No redundant context: inside `ShortenedUrl`, the field is `code`, not `shortenedUrlCode`.
- Magic numbers/strings get a name only when non-obvious or reused —
  `const SHORT_CODE_LENGTH = 7` yes; `slice(0, 1)` needs no `FIRST_ELEMENT_COUNT`.

## Control flow

- **Guard clauses over `else`**: early `return`/`continue` instead of nesting. `if-else-if`
  chains become a sequence of early returns or a lookup map.
- **No negated parenthesized comparisons**: `!(a === b)` is `a !== b`; `!(count > 0)` is
  `count <= 0`.
- **No Yoda conditions**: `getCode() === null`, never `null === getCode()`. Comparisons read
  left-to-right.
- **Truthy checks where safe**: `if (!user)`, `if (!hasAccess)` — not `if (user === null)`,
  `if (hasAccess === false)`. Compare explicitly only when `0` or `''` are valid values.
- Compute derived values in explanatory intermediate variables instead of one dense expression.

## Functions

- **One thing, one abstraction level.** A function either orchestrates (calls named steps) or
  does work (implements one step). Mixing both is the smell that triggers extraction.
- **≤ 30 lines.** Longer means it's doing more than one thing — split it.
- **Max 4 parameters** — beyond that, group into a single typed object. Never boolean flags as
  parameters: a flag means the function does two things; split it.
- **Verbs always.** `get*` returns without side effects; `set*` assigns without returning;
  `create*` for constructors-with-logic. Predicates read naturally in an `if`:
  `is/has/can/will/should/does` prefixes (`isExpired`, `hasCustomCode`, `canRedirect`).
- No hidden side effects: a `get*`/`compute*`/`format*` function must not mutate or persist.
- Inline the trivial: a helper used once, unexported, 1-5 lines of obvious logic → inline it.
  Extract only what is reused, genuinely complex, or significantly clarified by a name.

## Modules

- **≤ 800 lines hard cap; at 500 stop and rethink** the module's responsibilities.
- **No catch-all `Utils`/`Tools`/`helpers` files, classes, or folders** — they accumulate
  unrelated functions and cohesion dies. Group by concern: `url-normalization.ts`, `clock.ts`.
- **SOLID applies — SRP above all**: one module, one job. A value object validates itself; a
  use case orchestrates; a repository persists. Never two of those in one place.
- Top-to-bottom readability: exported/main thing first, then helpers.
- Dead code is deleted, not commented out — git remembers.
- Duplication: tolerate it twice, extract on the third occurrence, into the nearest shared scope.
  Duplication is far cheaper than the wrong abstraction.

## TypeScript

- **`any` is banned.** Unknown input → `unknown`, then narrow. No `as` casts to silence errors —
  fix the type. No `!` non-null assertions — handle the null path.
- Explicit parameter and return types on exported functions; locals may rely on inference.
- **Parse, don't validate**: external data (form input, request params, env vars) crosses the
  boundary through a value-object constructor or schema exactly once; everything past it is
  typed and trusted. This is why `OriginalUrl` and `ShortCode` exist.
- Discriminated unions for multi-state values (`{ ok: true, value } | { ok: false, error }`) —
  never parallel optionals that can desync.
- Shared domain types are single-sourced and imported — never re-declare a union in two files.

## Comments & errors

- Code self-documents through naming and structure; a comment explaining _what_ means the code
  failed — refactor instead. Comments are for **non-obvious constraints and why**.
- Never: commented-out code, journal comments, TODO without an owner-intention.
- Expected failures (invalid URL, code not found, collision) are **typed return values**, not
  thrown — exceptions are for bugs and unexpected states.
- Never swallow: every `catch` handles meaningfully, rethrows with context, or logs with enough
  detail to debug. Internal errors never leak to the user (see security-review).

## Pre-commit self-review (the AI-native signal)

Before committing, read the full diff (`git diff --staged`) and check:

1. Does every function name still tell the truth about what it does?
2. Any leftover scaffolding — `console.log`, commented experiments, unused imports?
3. Could a reviewer follow each file top-to-bottom without jumping?
4. Is every non-obvious decision either self-evident or commented with its constraint?
5. Anything here you couldn't explain if asked in an interview? Rework it until you can.
