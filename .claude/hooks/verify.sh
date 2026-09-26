#!/usr/bin/env bash
# Stop hook: verify uncommitted code changes with typecheck, eslint and prettier.
# Exit 2 sends the failure output back to Claude so it fixes the issues.

input=$(cat)
cd "$CLAUDE_PROJECT_DIR" || exit 0

# Already blocked once this turn: don't loop forever on a failure Claude can't fix.
if [ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ]; then
  exit 0
fi

# Only verify when there are uncommitted code/config changes.
if ! git status --porcelain | grep -qE '\.(ts|vue|js|mjs|cjs|json|css|scss)$'; then
  exit 0
fi

failed=0
report=""

run() {
  local name=$1
  shift
  local out
  if ! out=$("$@" 2>&1); then
    failed=1
    report+=$'\n'"### $name failed"$'\n'"$(tail -n 40 <<<"$out")"$'\n'
  fi
}

run "typecheck (pnpm typecheck)" pnpm typecheck
run "lint (eslint src/)" pnpm exec eslint src/
run "format (prettier --check src/)" pnpm exec prettier --check src/

if [ "$failed" -ne 0 ]; then
  echo "Verification failed. Fix these issues (run \`pnpm format\` / \`pnpm lint\` for auto-fixable ones):$report" >&2
  exit 2
fi

exit 0
