#!/usr/bin/env bash
# Remove labeled git worktrees created by add-git-worktrees.sh (or matching its naming).
# Does not delete git branches — use git branch -d manually if needed.
#
# Usage:
#   ./scripts/remove-git-worktrees.sh [options] LABEL [LABEL...]
#
# Examples:
#   ./scripts/remove-git-worktrees.sh spec-cups spec-lots
#   ./scripts/remove-git-worktrees.sh --worktree-prefix brick-counter spec-cups spec-lots

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: remove-git-worktrees.sh [options] LABEL [LABEL...]

Remove sibling git worktrees by label. Local branches are never deleted.

Options:
  --worktree-prefix PRE Sibling directory name prefix (default: repo directory name)
  --force               Force removal (discard uncommitted changes; required if worktree is dirty)
  --prune               Run git worktree prune after removals (default: on)
  --no-prune            Skip git worktree prune
  --dry-run             Print commands without running them
  -h, --help            Show this help

Each LABEL is resolved against registered worktrees. Accepted forms:
  - Label suffix:     docs-view-specs-new-session.md
  - Full directory:   brick-counter-coordinator-docs-view-specs-new-session.md
  - Relative path:    ../brick-counter-coordinator-docs-view-specs-new-session.md
                      (from repository root)
  - Absolute path:    /path/to/worktree

The primary (first) worktree for this repository is never removed.

Worktrees with initialized submodules are prepared automatically (deinit + admin
metadata cleanup) before removal. Use --force if the worktree has uncommitted changes.

Examples:
  ./scripts/remove-git-worktrees.sh spec-cups spec-lots
  ./scripts/remove-git-worktrees.sh docs-view-specs-new-session.md
  ./scripts/remove-git-worktrees.sh brick-counter-coordinator-docs-view-specs-new-session.md
  ./scripts/remove-git-worktrees.sh --worktree-prefix brick-counter spec-cups
EOF
}

die() {
  echo "remove-git-worktrees.sh: $*" >&2
  exit 1
}

warn() {
  echo "remove-git-worktrees.sh: warning: $*" >&2
}

run() {
  if [ "$DRY_RUN" = true ]; then
    printf '+'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

sanitize_label() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr '/ _' '---' | sed 's/--*/-/g; s/^-//; s/-$//'
}

repo_root() {
  git rev-parse --show-toplevel
}

primary_worktree_path() {
  git worktree list --porcelain | awk '/^worktree / {print $2; exit}'
}

worktree_registered() {
  local path="$1"
  git worktree list --porcelain | awk -v target="$path" '
    /^worktree / { current = $2 }
    current == target { found = 1 }
    END { exit !found }
  '
}

# Resolve a path string relative to the repository root (absolute result).
resolve_path_from_root() {
  local raw="$1"
  local dir base

  if [[ "$raw" == /* ]]; then
    printf '%s' "$raw"
    return 0
  fi

  dir="$(dirname "$raw")"
  base="$(basename "$raw")"
  if [ "$dir" = "." ]; then
    dir="$ROOT"
  else
    dir="$(cd "$ROOT" && cd "$dir" && pwd)"
  fi
  printf '%s/%s' "$dir" "$base"
}

# Resolve a user-supplied label to a registered worktree path.
resolve_worktree_path() {
  local raw="$1"
  local label="$2"
  local raw_base="${raw##*/}"
  local -a candidates=()
  local -a matches=()
  local seen="|"
  local c wt base prefix_dash="${WORKTREE_PREFIX}-"

  if [[ "$raw" == */* || "$raw" == .* ]]; then
    candidates+=("$(resolve_path_from_root "$raw")")
  fi

  candidates+=("${PARENT_DIR}/${WORKTREE_PREFIX}-${label}")
  candidates+=("${PARENT_DIR}/${label}")
  candidates+=("${PARENT_DIR}/${raw_base}")

  if [[ "$raw" == /* ]]; then
    candidates+=("$raw")
  fi

  if [[ "$label" == "$prefix_dash"* ]]; then
    candidates+=("${PARENT_DIR}/${label}")
  fi

  for c in "${candidates[@]}"; do
    [[ "$seen" == *"|$c|"* ]] && continue
    seen="${seen}${c}|"
    if worktree_registered "$c"; then
      printf '%s' "$c"
      return 0
    fi
  done

  while IFS= read -r wt; do
    [ "$wt" = "$MAIN_WT" ] && continue
    base="$(basename "$wt")"
    if [[ "$base" == "$label" || "$base" == "$raw_base" || "$base" == "${WORKTREE_PREFIX}-${label}" ]]; then
      matches+=("$wt")
    fi
  done < <(git worktree list --porcelain | awk '/^worktree / {print $2}')

  if [ ${#matches[@]} -eq 1 ]; then
    printf '%s' "${matches[0]}"
    return 0
  fi

  if [ ${#matches[@]} -gt 1 ]; then
    die "ambiguous worktree match for '$raw': ${matches[*]}"
  fi

  return 1
}

list_registered_worktrees() {
  git worktree list --porcelain | awk -v main="$MAIN_WT" '
    /^worktree / {
      if ($2 != "" && $2 != main) print $2
    }
  '
}

worktree_git_admin_dir() {
  local wt="$1"
  if [ -f "$wt/.git" ]; then
    sed -n 's/^gitdir: //p' "$wt/.git"
  fi
}

# Git refuses `worktree remove` when submodules are checked out in the worktree.
# add-git-worktrees.sh may leave standalone submodule clones (local clone fallback).
prepare_worktree_for_remove() {
  local wt="$1"
  local gitdir path

  [ -f "$ROOT/.gitmodules" ] || return 0

  echo "  preparing submodules for removal"

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if [ -e "$wt/$path" ]; then
      run git -C "$wt" submodule deinit -f "$path" 2>/dev/null || true
      run rm -rf "$wt/$path"
    fi
  done < <(git config -f "$ROOT/.gitmodules" --get-regexp '^submodule\..*\.path$' | awk '{print $2}')

  gitdir="$(worktree_git_admin_dir "$wt")"
  if [ -n "$gitdir" ] && [ -d "$gitdir/modules" ]; then
    run rm -rf "$gitdir/modules"
  fi
}

remove_worktree() {
  local wt="$1"

  prepare_worktree_for_remove "$wt"

  if [ "$FORCE_REMOVE" = true ]; then
    run git worktree remove --force "$wt"
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    run git worktree remove "$wt"
    return 0
  fi

  local err
  if ! err="$(git worktree remove "$wt" 2>&1)"; then
    if printf '%s' "$err" | grep -qE 'modified or untracked|dirty'; then
      die "worktree has local changes; re-run with --force: $wt"
    fi
    die "$err"
  fi
}

WORKTREE_PREFIX=""
FORCE_REMOVE=false
PRUNE=true
DRY_RUN=false
LABELS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --worktree-prefix)
      [ $# -ge 2 ] || die "--worktree-prefix requires a value"
      WORKTREE_PREFIX="$2"
      shift 2
      ;;
    --force)
      FORCE_REMOVE=true
      shift
      ;;
    --prune)
      PRUNE=true
      shift
      ;;
    --no-prune)
      PRUNE=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      while [ $# -gt 0 ]; do LABELS+=("$1"); shift; done
      break
      ;;
    --branch-prefix|--keep-branch|--force-delete-branch)
      die "$1 is no longer supported — this script removes worktrees only, not branches"
      ;;
    -*)
      die "unknown option: $1 (try --help)"
      ;;
    *)
      LABELS+=("$1")
      shift
      ;;
  esac
done

[ ${#LABELS[@]} -gt 0 ] || die "at least one LABEL is required (try --help)"

ROOT="$(repo_root)"
cd "$ROOT"

if [ -z "$WORKTREE_PREFIX" ]; then
  WORKTREE_PREFIX="$(basename "$ROOT")"
fi

MAIN_WT="$(primary_worktree_path)"
PARENT_DIR="$(dirname "$ROOT")"

echo "Repository:      $ROOT"
echo "Primary worktree: $MAIN_WT"
echo "Worktree prefix: $WORKTREE_PREFIX"
echo "Labels:          ${LABELS[*]}"
echo

for raw_label in "${LABELS[@]}"; do
  label="$(sanitize_label "$raw_label")"
  [ -n "$label" ] || die "invalid empty label after sanitizing: $raw_label"

  echo "==> $raw_label"

  if ! wt_path="$(resolve_worktree_path "$raw_label" "$label")"; then
    default_path="${PARENT_DIR}/${WORKTREE_PREFIX}-${label}"
    {
      echo "remove-git-worktrees.sh: worktree not found for '$raw_label'"
      echo "  tried label path: $default_path"
      echo "  relative paths are resolved from the repository root (e.g. ../$(basename "$default_path"))"
      echo "  registered worktrees:"
      list_registered_worktrees | sed 's/^/    /'
      echo "  run: git worktree list"
    } >&2
    exit 1
  fi

  echo "    worktree: $wt_path"

  if [ "$wt_path" = "$MAIN_WT" ]; then
    die "refusing to remove primary worktree: $wt_path"
  fi

  remove_worktree "$wt_path"

  echo
done

if [ "$PRUNE" = true ]; then
  echo "Pruning stale worktree metadata:"
  run git worktree prune
fi

echo "Remaining worktrees:"
run git worktree list
