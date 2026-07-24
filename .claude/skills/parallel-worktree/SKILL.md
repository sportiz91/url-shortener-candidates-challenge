---
name: parallel-worktree
description:
  Create, operate, and clean up isolated git worktrees so multiple Claude Code sessions can work
  the same repo in parallel without sharing a working tree. Use when the user wants parallel lines
  of work, mentions another session/agent already editing, or when something misbehaves inside an
  existing worktree (missing node_modules, missing env files, phantom type errors).
---

# Parallel Worktree

> **Not exercised in this challenge (single-session scope)** — included because it's how I scale
> AI-assisted work on larger codebases: one Claude Code session per work area, each in its own
> worktree, quality gates before anything merges back.

## The model

A git worktree is a second working directory backed by the **same** repository. Two sessions in
two worktrees can edit, build, and test simultaneously with zero interference at the file level.

**Shared** across all worktrees: the object store, branches, remotes, stashes — a commit made in
one worktree is instantly visible to `git log` in another.

**Isolated** per worktree: the checked-out files, untracked files, `node_modules`, build output,
and gitignored env files. That isolation is also the trap: a fresh worktree contains _tracked
files only_, so everything that makes the repo actually run must be re-created (steps 2-3).

## Parallelize by area, not by task

Scope each worktree to a **work area** (e.g. `libs/engine` vs `applications/web` vs docs), not
to a ticket. Two tasks touching the same area belong in the SAME worktree, done sequentially —
parallel edits to one module is how merge conflicts are born, and no registry detects them until
it's too late. Two to three parallel sessions is the sustainable ceiling.

## 1. Create

```bash
git fetch origin main
git worktree add ../<repo>-wt-<area> -b <branch-name> origin/main
```

Base on the branch your team integrates into (here `main`; adjust if the repo uses a
`development` trunk). Keep worktrees **outside** the main checkout (sibling directory or a
dedicated `~/worktrees/`) so tooling in one never scans the other.

## 2. Install dependencies

```bash
cd ../<repo>-wt-<area> && pnpm install --frozen-lockfile
```

Cheap: pnpm's content-addressable store is shared machine-wide, so installs are mostly
hardlinks — seconds, near-zero extra disk.

## 3. Copy gitignored env files (only if running the app)

Lint, typecheck, and unit tests don't need them. The dev server and anything hitting a database
does:

```bash
cp <main-checkout>/.env <worktree>/.env    # repeat per env file the app reads
```

If something still misbehaves, diff what other untracked files the main checkout has:
`git ls-files --others --exclude-standard | grep -v node_modules`.

## 4. Infrastructure is NOT isolated

The worktree isolates code, not ports or containers. Dev-server ports and docker services
(Postgres, etc.) are shared with the main checkout — **run one dev stack at a time**, or give
each worktree its own port/database name before starting a second. Migrations run from one
worktree against a shared database affect all of them.

## 5. Quality gates before merging back

Inside the worktree, before its branch goes anywhere:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

A worktree whose gates are red delivers nothing. First-run quirk in build-orchestrated repos:
generated outputs (types, `dist/` declarations) don't exist yet, so the first typecheck may
report phantom errors — run the build once, re-run, and only errors that survive are real.

## 6. Merge discipline

Each worktree's branch merges back through the same door as any other branch: push, PR/MR,
review. Never merge worktree branches into each other locally to "combine" work — integrate
through the trunk so history stays linear per area.

## 7. Cleanup

When the branch is merged or abandoned:

```bash
git worktree remove ../<repo>-wt-<area>
git branch -d <branch-name>        # only if merged
git worktree prune                 # after any manual deletion
```

`worktree remove` refuses if there are uncommitted changes — that refusal is a safety net, not
an obstacle; inspect what's dirty before forcing. Removing the worktree also deletes its copied
env secrets, which is desirable. Leaving dead worktrees around costs disk and — worse — invites
a session to resume in a stale checkout.
