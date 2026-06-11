#!/usr/bin/env bash
# Format all vue/js files in project scope with Prettier.
# Usage: format-vue-js.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_paths.sh
. "$SCRIPT_DIR/_paths.sh"

local_globs=()
while IFS= read -r glob; do
  local_globs+=("$glob")
done < <(vue_js_prettier_args)

npx prettier --write "${local_globs[@]}"
echo "format-vue-js: done"
