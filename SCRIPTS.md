# Repository scripts

Helper scripts maintained in **this repo** (not the AI-DLC submodule or agent skill bundles). Run from the repository root unless a script says otherwise.

| Location | Role |
|----------|------|
| [`scripts/`](scripts/) | **Canonical** — general repo tooling (git, automation, maintenance) |
| [`docs/diagrams/`](docs/diagrams/) | Diagram-specific utilities co-located with `.mmd` sources |
| [`package.json`](package.json) `scripts` | npm/Vite/Playwright tasks — see [Development](README.md#development) |
| [`.claude/skills/git-commit/`](.claude/skills/git-commit/) | Commit helper — see [AGENTS.md](AGENTS.md) (vendored via submodule) |
| [`.agents/skills/`](.agents/skills/) | Agent-local playbooks and their scripts (e.g. vue-js-ide-hygiene) |

When you add a script under `scripts/`, **document it in this file** in the same PR.

---

## Conventions

1. **Shebang** — `#!/usr/bin/env bash` for shell; use `set -euo pipefail` where appropriate.
2. **Executable** — `chmod +x scripts/your-script.sh`
3. **Help** — Support `-h` / `--help` for non-trivial CLIs.
4. **Dry-run** — Prefer a `--dry-run` flag when the script mutates git state or filesystem paths outside the repo.
5. **Paths** — Resolve the repo root with `git rev-parse --show-toplevel` when the script depends on git context.
6. **Naming** — `kebab-case.sh` (or `.py` / `.mjs` when justified). One primary purpose per file.

---

## Index

| Script | Summary |
|--------|---------|
| [`scripts/add-git-worktrees.sh`](#add-git-worktrees) | Create labeled sibling git worktrees for parallel work |
| [`scripts/remove-git-worktrees.sh`](#remove-git-worktrees) | Remove labeled sibling worktrees (branches are kept) |
| [`docs/diagrams/br-labels.sh`](#br-labels-diagrams) | Normalize Mermaid label line breaks for HTML renderers |

---

## `scripts/`

### `add-git-worktrees`

**File:** [`scripts/add-git-worktrees.sh`](scripts/add-git-worktrees.sh)

Create one or more **sibling** git worktrees (and branches) from a list of labels — useful for parallel Cursor agents, spec reviews, or any isolated branch work.

**Usage:**

```bash
./scripts/add-git-worktrees.sh [options] LABEL [LABEL...]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--base REF` | Current branch | Git ref each new branch starts from |
| `--branch-prefix PRE` | *(none)* | Prepended to each branch name |
| `--worktree-prefix PRE` | Repo directory name | Sibling folder prefix (`<parent>/<prefix>-<label>`) |
| `--no-submodules` | Submodules initialized | Skip submodule setup |
| `--dry-run` | Off | Print commands without executing |
| `-h`, `--help` | — | Show usage |

Labels are lowercased; `/`, spaces, and `_` become hyphens.

**Examples:**

```bash
# Single worktree from current branch
./scripts/add-git-worktrees.sh my-feature

# Parallel agent worktrees (matches prior spec-review layout)
./scripts/add-git-worktrees.sh \
  --base origin/cursor/issue-2-build-phase-4faf \
  --branch-prefix docs/spec-review- \
  --worktree-prefix brick-counter \
  spec-cups spec-lots spec-lot-form
```

Produces:

- `../brick-counter-spec-cups` on branch `docs/spec-review-spec-cups`
- `../brick-counter-spec-lots` on branch `docs/spec-review-spec-lots`
- etc.

**Submodules:** Runs `git submodule update --init --recursive` in each worktree. If the pinned submodule SHA is not on the remote, clones submodule checkouts from the **primary** worktree (same fallback used during manual parallel-agent setup).

**Cleanup:** use [`remove-git-worktrees.sh`](#remove-git-worktrees) with the same `--worktree-prefix` and labels. Delete local branches separately with `git branch -d` if needed.

---

### `remove-git-worktrees`

**File:** [`scripts/remove-git-worktrees.sh`](scripts/remove-git-worktrees.sh)

Remove sibling worktrees by label. **Does not delete git branches** — only unlinks the extra working directories.

**Usage:**

```bash
./scripts/remove-git-worktrees.sh [options] LABEL [LABEL...]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--worktree-prefix PRE` | Repo directory name | Must match the prefix used when worktrees were created |
| `--force` | Off | Force remove when the worktree has uncommitted changes |
| `--prune` / `--no-prune` | prune on | Run `git worktree prune` after removals |
| `--dry-run` | Off | Print commands without executing |
| `-h`, `--help` | — | Show usage |

The **primary** worktree (first entry in `git worktree list`) is never removed.

**Examples:**

```bash
# Preview removal
./scripts/remove-git-worktrees.sh --dry-run \
  --worktree-prefix brick-counter \
  list-cups list-lots lot-form

# Remove worktrees (branches remain)
./scripts/remove-git-worktrees.sh \
  --worktree-prefix brick-counter \
  list-cups list-lots lot-form

# Delete a branch afterward, if you choose
git branch -d docs/spec-review-list-cups
```

**Notes:**

- **Submodules:** worktrees created by `add-git-worktrees.sh` often have `.claude/deps/ai-dlc` checked out. The script deinits submodule paths and clears worktree admin metadata before `git worktree remove`.
- If removal fails due to dirty files, re-run with `--force`.
- If a directory exists but is not registered in `git worktree list`, the script stops with an error (avoid accidental `rm -rf`).
- Use the **same labels and `--worktree-prefix`** as `add-git-worktrees.sh`, **or** pass the full sibling directory name, **or** a relative path from the repo root (e.g. `../brick-counter-coordinator-docs-view-specs-new-session.md`).
- Removed flags `--keep-branch`, `--force-delete-branch`, and `--branch-prefix` — this script never deletes branches.

---

## Diagrams

### `br-labels` (diagrams)

**File:** [`docs/diagrams/br-labels.sh`](docs/diagrams/br-labels.sh)

Post-process Mermaid `.mmd` files: replace literal `\n` in node labels with `<br>` for renderers that expect HTML line breaks.

**Usage:**

```bash
# All *.mmd in docs/diagrams/
./docs/diagrams/br-labels.sh

# Specific files
./docs/diagrams/br-labels.sh docs/diagrams/view-navigation.mmd
```

Lives next to the diagram sources rather than under `scripts/` because it only applies to `docs/diagrams/*.mmd`.

---

## Related (documented elsewhere)

| Tool | Doc |
|------|-----|
| `npm run dev`, `build`, `test:*`, `check:*` | [README.md — Development](README.md#development) |
| `./git-commit.sh` (via `.claude/skills/git-commit/`) | [AGENTS.md — Skill shell scripts](AGENTS.md#skill-shell-scripts) |
| Vue/JS IDE hygiene (`format-vue-js.sh`, `verify-ide-clean.sh`, …) | [`.agents/skills/vue-js-ide-hygiene/SKILL.md`](.agents/skills/vue-js-ide-hygiene/SKILL.md) |
| AI-DLC automation (`aidlc-cron.sh`, workflow composites, …) | [`.claude/deps/ai-dlc/`](.claude/deps/ai-dlc/) submodule |

---

## Adding a new script

1. Add `scripts/<name>.sh` (or appropriate extension) following [Conventions](#conventions).
2. Add a row to the [Index](#index) and a section under [`scripts/`](#scripts) (or note co-location if domain-specific).
3. Wire into `package.json` only when the script is part of routine dev/CI (`npm run …`).
4. Keep scripts **idempotent** or **dry-run capable** when they change git or shared paths.

**Section template** (copy for new entries):

```markdown
### `short-name`

**File:** [`scripts/example.sh`](scripts/example.sh)

One-sentence purpose.

**Usage:**

\`\`\`bash
./scripts/example.sh [options] ARGS
\`\`\`

**Options:** *(table or list)*

**Examples:** *(concrete commands)*

**Notes:** *(edge cases, cleanup, dependencies)*
```
