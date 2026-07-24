#!/usr/bin/env bash
# PostToolUse gate: auto-format + lint-fix whatever file Claude just edited.
# Deliberately fail-silent (always exit 0) — husky/lint-staged is the hard
# gate at commit time; this hook just keeps the working tree clean mid-loop.
set -u
cd "$(dirname "$0")/../.." || exit 0

input=$(cat 2>/dev/null || true)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
if [ -z "$file" ]; then
  file="${CLAUDE_FILE_PATHS:-}"
  file="${file%% *}"
fi
[ -n "$file" ] && [ -f "$file" ] || exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md)
    pnpm exec prettier --write "$file" >/dev/null 2>&1 || true ;;
esac
case "$file" in
  *.ts|*.tsx)
    pnpm exec eslint --fix "$file" >/dev/null 2>&1 || true ;;
esac
exit 0
