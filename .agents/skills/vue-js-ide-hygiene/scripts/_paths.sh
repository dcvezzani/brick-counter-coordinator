#!/usr/bin/env bash
# Shared paths for vue-js-ide-hygiene scripts.
# Source from other scripts: . "$(dirname "$0")/_paths.sh"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)"; then
  :
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
fi

# Prettier / scan globs (relative to REPO_ROOT)
VUE_JS_GLOBS=(
  "src/**/*.vue"
  "src/**/*.js"
  "e2e/**/*.js"
  "vitest.config.js"
  "vite.config.js"
  "playwright.config.js"
)

vue_js_prettier_args() {
  printf '%s\n' "${VUE_JS_GLOBS[@]}"
}

cd "$REPO_ROOT"
