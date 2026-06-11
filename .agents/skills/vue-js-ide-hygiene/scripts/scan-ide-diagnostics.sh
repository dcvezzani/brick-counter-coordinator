#!/usr/bin/env bash
# Read-only IDE diagnostic scan: checkJs (tsc) + Prettier check.
# Usage: scan-ide-diagnostics.sh [--json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_paths.sh
. "$SCRIPT_DIR/_paths.sh"

JSON=0
if [[ "${1:-}" == "--json" ]]; then
  JSON=1
fi

TSC_OUTPUT=""
TSC_EXIT=0
TSC_ERROR_COUNT=0
PRETTIER_EXIT=0
PRETTIER_FILE_COUNT=0
PRETTIER_FILES=()

run_tsc() {
  set +e
  TSC_OUTPUT="$(npx tsc --noEmit -p jsconfig.json 2>&1)"
  TSC_EXIT=$?
  set -e
  if [[ $TSC_EXIT -ne 0 ]]; then
    TSC_ERROR_COUNT="$(printf '%s\n' "$TSC_OUTPUT" | grep -c 'error TS' || true)"
  fi
}

run_prettier() {
  local check_output=""
  local check_exit=0
  local -a glob_args=()
  while IFS= read -r glob; do
    glob_args+=("$glob")
  done < <(vue_js_prettier_args)

  set +e
  check_output="$(npx prettier --check "${glob_args[@]}" 2>&1)"
  check_exit=$?
  set -e
  PRETTIER_EXIT=$check_exit

  if [[ $check_exit -ne 0 ]]; then
    while IFS= read -r line; do
      if [[ "$line" == \[warn]* ]]; then
        local file="${line#\[warn\] }"
        if [[ "$file" == *.* ]]; then
          PRETTIER_FILES+=("$file")
        fi
      fi
    done <<< "$check_output"
    PRETTIER_FILE_COUNT="${#PRETTIER_FILES[@]}"
    if [[ $PRETTIER_FILE_COUNT -eq 0 ]]; then
      PRETTIER_FILE_COUNT="$(printf '%s\n' "$check_output" | grep -oE '[0-9]+ files' | grep -oE '[0-9]+' | tail -1 || echo 0)"
    fi
  fi
}

run_tsc
run_prettier

OVERALL_EXIT=0
if [[ $TSC_EXIT -ne 0 || $PRETTIER_EXIT -ne 0 ]]; then
  OVERALL_EXIT=1
fi

if [[ $JSON -eq 1 ]]; then
  SCAN_TSC_ERRORS="$TSC_ERROR_COUNT" \
  SCAN_TSC_EXIT="$TSC_EXIT" \
  SCAN_PRETTIER_EXIT="$PRETTIER_EXIT" \
  SCAN_PRETTIER_COUNT="$PRETTIER_FILE_COUNT" \
  SCAN_TSC_OUTPUT="$TSC_OUTPUT" \
  SCAN_PRETTIER_FILES="$(printf '%s\n' "${PRETTIER_FILES[@]}")" \
  node -e "
    const files = (process.env.SCAN_PRETTIER_FILES || '').split('\n').filter(Boolean);
    const sample = (process.env.SCAN_TSC_OUTPUT || '').split('\n').slice(0, 20).join('\n');
    console.log(JSON.stringify({
      tscErrors: Number(process.env.SCAN_TSC_ERRORS),
      tscExit: Number(process.env.SCAN_TSC_EXIT),
      prettierFiles: Number(process.env.SCAN_PRETTIER_COUNT),
      prettierExit: Number(process.env.SCAN_PRETTIER_EXIT),
      prettierFileList: files,
      tscSample: sample,
      ok: process.env.SCAN_TSC_EXIT === '0' && process.env.SCAN_PRETTIER_EXIT === '0',
    }, null, 2));
  "
  exit "$OVERALL_EXIT"
fi

echo "=== vue-js-ide-hygiene scan ==="
echo "Repo: $REPO_ROOT"
echo

echo "--- checkJs (tsc --noEmit -p jsconfig.json) ---"
if [[ $TSC_EXIT -eq 0 ]]; then
  echo "OK — 0 errors"
else
  echo "FAIL — $TSC_ERROR_COUNT error(s)"
  printf '%s\n' "$TSC_OUTPUT" | head -30
  if [[ $TSC_ERROR_COUNT -gt 30 ]]; then
    echo "... ($((TSC_ERROR_COUNT - 30)) more)"
  fi
fi
echo

echo "--- Prettier (check) ---"
if [[ $PRETTIER_EXIT -eq 0 ]]; then
  echo "OK — all matched files use Prettier code style"
else
  echo "FAIL — ${PRETTIER_FILE_COUNT} file(s) need formatting"
  if [[ ${#PRETTIER_FILES[@]} -gt 0 ]]; then
    printf '%s\n' "${PRETTIER_FILES[@]}" | head -20
    if [[ ${#PRETTIER_FILES[@]} -gt 20 ]]; then
      echo "... ($(( ${#PRETTIER_FILES[@]} - 20 )) more)"
    fi
  fi
fi
echo

if [[ $OVERALL_EXIT -eq 0 ]]; then
  echo "Result: PASS"
else
  echo "Result: FAIL — see .agents/skills/vue-js-ide-hygiene/playbooks.md"
fi

exit "$OVERALL_EXIT"
