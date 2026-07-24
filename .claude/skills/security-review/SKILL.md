---
name: security-review
description:
  Security standards + audit checklist scoped to a URL shortener — open-redirect prevention, input
  validation at the boundary, abuse/rate limiting, error hygiene, race-safe counters. Apply
  AUTOMATICALLY when touching URL validation, the redirect route, actions handling user input, or
  before finishing a feature — even if the user doesn't mention security.
---

# Security Review

A URL shortener's core feature — "give me a URL, I'll redirect anyone to it" — is an **open
redirect as a product**. The controls below are what keep it from being an open redirect as a
vulnerability.

## Input validation at the boundary (value objects as parsers)

- All external input (form fields, route params) crosses into the domain **through a value
  object exactly once**: `OriginalUrl.create()`, `ShortCode.create()`. Past that point the type
  proves validity — no re-validation, no unvalidated strings floating around.
- Value objects **parse, not just check**: normalize (trim, lowercase host) and return a typed
  result (`ok | error`), never a boolean next to a raw string.
- Length caps before anything else: cap the original URL (e.g. 2048 chars) and the short code
  **before** running regexes or parsing — a length cap is the cheapest DoS mitigation.
- Short codes: strict allowlist (`[A-Za-z0-9_-]`, fixed length range). Reject anything else —
  codes end up in paths; they must never smuggle `/`, `.`, `%` encodings.

## Open-redirect hardening (the redirect route)

- **Scheme allowlist: `http:` and `https:` only.** Parse with `new URL()` and check
  `url.protocol` — never a `startsWith("http")` string check (`httpx://`, mixed case, and
  whitespace tricks pass it). This kills `javascript:`, `data:`, `file:`, `vbscript:`.
- **No credentials in URLs**: reject when `url.username` or `url.password` is set —
  `https://trusted.com@evil.com` is a phishing classic.
- Redirect with an explicit status (301/302 chosen deliberately — 301s get cached by browsers,
  which also caches mistakes) and **only ever to the stored, validated `OriginalUrl`** — never
  interpolate request input into the `Location` header.
- Unknown code → clean 404 page. Same response shape for "never existed" and any other
  not-served state — don't build an oracle.

## Abuse prevention

- **Per-IP rate limiting on the create endpoint** — a shortener without it is a free spam-link
  factory. A fixed/sliding window in memory is honest for single-instance scope; note the
  horizontal-scaling limitation instead of pretending it isn't there.
- **Trust-proxy caveat**: `X-Forwarded-For` is client-controlled unless a trusted proxy sets
  it. Only read the entry appended by YOUR proxy (rightmost untrusted hop); behind no proxy,
  use the socket address. Rate limiting keyed on spoofable input is decorative.
- Cap request body size at the action boundary; the URL length cap in the value object protects
  the DB layer independently.

## Error hygiene

- **Never leak internals**: Prisma errors, stack traces, and constraint names go to the server
  log; the user gets a generic, mapped message ("That URL couldn't be shortened"). Expected
  failures are typed values (see clean-code), so the mapping is exhaustive, not accidental.
- Don't reflect the submitted URL back unescaped in error messages — that's stored/reflected
  XSS through the error path. React escapes by default; keep it that way (no
  `dangerouslySetInnerHTML` anywhere in this app).

## Race-safe persistence

- **Click/visit counters: atomic increment, never read-modify-write.**
  `UPDATE ... SET visits = visits + 1` (Prisma: `{ increment: 1 }`) — fetching the row,
  adding 1 in JS, and saving loses updates under concurrency, and two of those interleaved
  under-count silently.
- **Code uniqueness is enforced by the database** (unique constraint), not by
  check-then-insert — two concurrent requests can both pass the check. Treat the unique
  violation as the collision signal and retry with a fresh code.

## Audit process (run before finishing)

1. Walk the redirect route against the open-redirect section; walk every action against the
   input-validation section.
2. Grep sweeps (candidates → verify each hit):

   ```bash
   grep -rn "redirect(" applications/web/app        # Location always from stored OriginalUrl?
   grep -rn "new URL(\|startsWith(" libs applications  # scheme checked via protocol?
   grep -rn "dangerouslySetInnerHTML" applications  # must be zero hits
   grep -rn "visits\|count" libs applications | grep -i "\+ 1\|++"  # atomic increments only
   grep -rn "console.error\|throw" applications/web/app  # internals mapped before the client?
   ```

3. Report findings as `Issue | file:line | what an attacker could do | fix`, severity-ordered.
   No findings → say so explicitly and list what was checked.

## Repo hygiene (public submission)

No secrets in code or history — DB credentials only via env; `.env` gitignored with a committed
`.env.example` of placeholders.
