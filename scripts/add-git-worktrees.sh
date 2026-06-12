#!/usr/bin/env bash
# Create one or more git worktrees from labeled names.
#
# Usage:
#   ./scripts/add-git-worktrees.sh [options] LABEL [LABEL...]
#
# Examples:
#   ./scripts/add-git-worktrees.sh spec-cups spec-lots
#   ./scripts/add-git-worktrees.sh --base origin/main --branch-prefix docs/review- agent-1 agent-2
#   ./scripts/add-git-worktrees.sh --worktree-prefix brick-counter spec-cups

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: add-git-worktrees.sh [options] LABEL [LABEL...]

Create sibling git worktrees and branches for parallel agent (or other) work.

Options:
  --base REF            Git ref to branch from (default: current branch)
  --branch-prefix PRE   Prefix for each new branch name (default: none)
  --worktree-prefix PRE Sibling directory name prefix (default: repo directory name)
  --no-submodules       Skip submodule init after each worktree is created
  --dry-run             Print commands without running them
  -h, --help            Show this help

Each LABEL produces:
  - Worktree path:  <parent>/<worktree-prefix>-<label>
  - Branch name:    <branch-prefix><label>  (slashes in labels become hyphens)
  - Base commit:    --base ref (default: HEAD / current branch)

Submodule init tries `git submodule update --init --recursive` first. If that
fails (e.g. unpushed submodule SHA), submodules are cloned from the primary
worktree checkout when available.

Examples:
  ./scripts/add-git-worktrees.sh spec-cups spec-lots
  ./scripts/add-git-worktrees.sh --base cursor/issue-2-build-phase-4faf \\
      --branch-prefix docs/spec-review- --worktree-prefix brick-counter \\
      spec-cups spec-lots spec-lot-form
EOF
}

die() {
  echo "add-git-worktrees.sh: $*" >&2
  exit 1
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

init_submodules() {
  local wt="$1"
  local main="$2"

  if [ "$INIT_SUBMODULES" != true ]; then
    return 0
  fi

  echo "  Initializing submodules in $wt"

  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] git -C $wt submodule update --init --recursive"
    return 0
  fi

  if git -C "$wt" submodule update --init --recursive 2>/dev/null; then
    return 0
  fi

  if [ ! -f "$main/.gitmodules" ]; then
    return 0
  fi

  echo "  Submodule fetch failed; cloning from primary worktree at $main"

  while IFS= read -r path; do
    [ -n "$path" ] || continue
    local sha
    sha="$(git -C "$main" ls-tree HEAD "$path" 2>/dev/null | awk '{print $3}')"
    [ -n "$sha" ] || continue

    if [ -d "$main/$path" ]; then
      rm -rf "$wt/$path"
      mkdir -p "$(dirname "$wt/$path")"
      git clone --local "$main/$path" "$wt/$path"
      git -C "$wt/$path" checkout "$sha"
    fi
  done < <(git config -f "$main/.gitmodules" --get-regexp '^submodule\..*\.path$' | awk '{print $2}')
}

BASE_REF=""
BRANCH_PREFIX=""
WORKTREE_PREFIX=""
INIT_SUBMODULES=true
DRY_RUN=false
LABELS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --base)
      [ $# -ge 2 ] || die "--base requires a ref"
      BASE_REF="$2"
      shift 2
      ;;
    --branch-prefix)
      [ $# -ge 2 ] || die "--branch-prefix requires a value"
      BRANCH_PREFIX="$2"
      shift 2
      ;;
    --worktree-prefix)
      [ $# -ge 2 ] || die "--worktree-prefix requires a value"
      WORKTREE_PREFIX="$2"
      shift 2
      ;;
    --no-submodules)
      INIT_SUBMODULES=false
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

if [ -z "$BASE_REF" ]; then
  BASE_REF="$(git branch --show-current)"
  [ -n "$BASE_REF" ] || BASE_REF="HEAD"
fi

if [ -z "$WORKTREE_PREFIX" ]; then
  WORKTREE_PREFIX="$(basename "$ROOT")"
fi

MAIN_WT="$(primary_worktree_path)"
PARENT_DIR="$(dirname "$ROOT")"

# Resolve base to a commit so worktrees are consistent even when BASE_REF is a branch name.
BASE_COMMIT="$(git rev-parse "$BASE_REF")"

echo "Repository:      $ROOT"
echo "Base ref:        $BASE_REF ($BASE_COMMIT)"
echo "Worktree prefix: $WORKTREE_PREFIX"
echo "Branch prefix:   ${BRANCH_PREFIX:-<none>}"
echo "Labels:          ${LABELS[*]}"
echo

for raw_label in "${LABELS[@]}"; do
  label="$(sanitize_label "$raw_label")"
  [ -n "$label" ] || die "invalid empty label after sanitizing: $raw_label"

  branch="${BRANCH_PREFIX}${label}"
  wt_path="${PARENT_DIR}/${WORKTREE_PREFIX}-${label}"

  echo "==> $raw_label"
  echo "    worktree: $wt_path"
  echo "    branch:   $branch"

  if [ -e "$wt_path" ]; then
    die "path already exists: $wt_path"
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    run git worktree add "$wt_path" "$branch"
  else
    run git worktree add "$wt_path" -b "$branch" "$BASE_COMMIT"
  fi

  init_submodules "$wt_path" "$MAIN_WT"
  echo
done

echo "Done. Worktrees:"
run git worktree list
