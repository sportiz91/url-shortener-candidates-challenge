---
name: react-best-practices
description:
  React Router v7 (framework mode) + React 19 + TypeScript rules for applications/web — routes,
  loaders/actions, components, state, effects, typing. Apply when writing or reviewing ANY route,
  component, or hook in the web app.
---

# React Best Practices

## Routes are the data boundary

- **Loaders and actions own all data access.** Reads happen in `loader`, writes in `action` —
  both run on the server (SSR). No client-side data fetching when a loader can do it; no
  `useEffect`-fetch for anything a route already knows.
- Routes call **use cases through the composition root** — never instantiate Prisma or adapters
  in a route module. The route is glue: parse input → call use case → map result to response.
- **Typed route modules**: import `Route` types from `./+types/<route>` and type
  `loader`/`action`/component args with them (`Route.LoaderArgs`, `Route.ComponentProps`).
  Loader data flows in as a typed prop — never re-declare its shape by hand.
- Mutations go through `<Form method="post">` (or `useFetcher` for in-page mutations) so they
  work before hydration and revalidate loader data automatically. No hand-rolled `onSubmit` +
  `fetch`.
- **Pending UI via `useNavigation`** (`navigation.state !== "idle"`) or `fetcher.state` — never
  a hand-managed `isSubmitting` useState.
- Expected failures returned from an action (invalid URL, collision) are **typed data**, checked
  via `actionData` — not thrown. Thrown responses are for the error boundary.
- **Export an `ErrorBoundary`** from routes that can fail meaningfully (e.g. the redirect route's
  404). Use `isRouteErrorResponse` to render expected errors distinctly from crashes.
- URL is state: filters/pagination live in searchParams, not in useState duplicating them.

## Files & naming

- **PascalCase for component files** (`UrlForm.tsx`, `UrlList.tsx`); camelCase for utility files
  (`formatDate.ts`); hooks prefixed `use*` (`useCopyToClipboard.ts`).
- **One component per file** (exception: a genuinely tiny unexported subcomponent — the moment
  it grows or needs its own test, it moves out).
- **Non-JSX helpers live in separate `.ts` files grouped by concern** — never a `utils.ts`
  catch-all.
- Render helpers are extracted as **pure top-level functions or components in the same file**,
  never nested `renderX()` closures inside the component body.
- Named exports; handlers `handle*`; booleans `is*/has*/can*`.

## Component internals

Keep a consistent internal order so readers learn the rhythm once:

**props type → hooks → effects → derived values → event handlers → render.**

- Props type is declared **directly above the component**, destructured in the parameter:
  `const UrlForm = ({ onSuccess }: UrlFormProps) =>`. Convention: **`type`, not `interface`**,
  for props.
- **Shared prop types go in a `types.ts`** (per feature) and are imported — never duplicate a
  union like `'idle' | 'copied'` across two components.
- Too many props → split the component or compose via `children`.
- Ternaries for conditional render, not `&&` (the `0 &&` footgun).

## TypeScript

- **Avoid `as` assertions** — narrow with type guards (`instanceof`, `in`, custom predicates)
  so the compiler proves it.
- **Generics for components that render different item types** (`<List<T> items renderItem>`)
  — keep type safety instead of widening to `unknown`.
- **Derive, don't hand-write**: `ReturnType<typeof useX>`, `Awaited<ReturnType<typeof loader>>`
  — a hand-maintained copy of an inferable type will desync.
- **`useState<Url | null>(null)`** — explicit generic when the initial value doesn't reveal the
  full type; let primitives infer (`useState(0)`).
- **Custom hooks have clear return types** and `use*` names; generics when they wrap a generic
  operation.
- No `enum` — const maps with `as const`.

## State & effects

- Derive, don't store: never `setState` in an effect to compute derived state — compute in
  render or `useMemo`. Start state local; lift only when actually shared.
- `useEffect` is **ONLY** for: synchronizing with external systems (DOM APIs, timers, SDKs),
  data fetching **with race-condition cleanup** (`let active = true` … cleanup flips it) when a
  loader genuinely can't own it, subscriptions (prefer `useSyncExternalStore`), guarded
  one-time init.
- `useEffect` is **NEVER** for: data transformations (compute during render), expensive
  calculations (`useMemo`), or reacting to user events — that logic lives in the handler that
  caused it, including analytics and notifications.
- **Memoize only where measured**: `React.memo`/`useMemo`/`useCallback` are not defaults —
  weigh comparison cost vs re-render cost. Restructure with `children` first (JSX passed as
  children doesn't re-render with the wrapper's state).

## React 19

- No `forwardRef` — `ref` is a regular prop.
- `use(Context)` instead of `useContext`; `<Context>` renders directly as a provider.
- `useOptimistic` for instant UI with automatic rollback — never hand-roll optimistic state.

## Anti-patterns (hard NO)

Client-side fetching of loader-servable data · adapters instantiated in routes · nested render
functions · `utils.ts` catch-alls · duplicated prop-type unions · `as` to silence the compiler ·
`setState`-in-effect derivation · hand-rolled pending state · memoizing everything by default.
