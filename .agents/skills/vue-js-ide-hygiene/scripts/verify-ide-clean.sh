#!/usr/bin/env bash
# Gate: scan must pass; optionally run unit tests.
# Usage: verify-ide-clean.sh [--skip-tests]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_TESTS=0

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: verify-ide-clean.sh [--skip-tests]" >&2
      exit 2
      ;;
  esac
done

echo "=== verify-ide-clean: scan ==="
"$SCRIPT_DIR/scan-ide-diagnostics.sh"

if [[ $SKIP_TESTS -eq 0 ]]; then
  echo
  echo "=== verify-ide-clean: unit tests ==="
  npm run test:unit -- --run
fi

echo
echo "verify-ide-clean: PASS"
