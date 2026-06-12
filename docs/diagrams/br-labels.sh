#!/usr/bin/env bash
# Replace literal \n with <br> in Mermaid .mmd label text.
# Use for renderers that expect HTML line breaks instead of escaped newlines.
#
# Usage:
#   docs/diagrams/br-labels.sh              # all *.mmd in this directory
#   docs/diagrams/br-labels.sh path/to/a.mmd path/to/b.mmd

set -euo pipefail

diagram_dir="$(cd "$(dirname "$0")" && pwd)"

if [[ $# -eq 0 ]]; then
  shopt -s nullglob
  files=("$diagram_dir"/*.mmd)
  shopt -u nullglob
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No .mmd files found in $diagram_dir" >&2
    exit 1
  fi
else
  files=("$@")
fi

for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Not a file: $file" >&2
    exit 1
  fi

  if ! grep -q '\\n' "$file"; then
    echo "Skipped (no \\n): $file"
    continue
  fi

  perl -pi -e 's/\\n/<br>/g' "$file"
  echo "Updated: $file"
done
