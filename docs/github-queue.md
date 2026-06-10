# GitHub Issues + Projects v2 (AIDLC automation)

Work is tracked on a **GitHub Projects v2** board owned by **`dcvezzani`** (personal account) with an **"AIDLC phase"** single-select field. Automation launches **Cursor Cloud Agents** for each phase skill (`/plan`, `/design`, `/build`, `/review`, `/ship`).

**GitHub account:** `dcvezzani` — not `dcvezzani_church` or other org accounts.

Board: [**AIDLC — brick-counter-coordinator** (project #2)](https://github.com/users/dcvezzani/projects/2)

---

## One-time setup checklist

### 1 — GitHub CLI account

Confirm the active account:

```bash
gh auth status
gh api user -q .login   # must print: dcvezzani
```

If `gh` lacks **project** scope (needed to create/list boards):

```bash
gh auth refresh -h github.com -s project,read:project
```

### 2 — Projects v2 board

1. Open [github.com/users/dcvezzani/projects](https://github.com/users/dcvezzani/projects) → **New project**.
2. Name it e.g. **AIDLC — brick-counter-coordinator**.
3. Add a **single-select** field titled **`AIDLC phase`** with options (in order):

   `Idea` · `Plan` · `Design` · `Build` · `Review` · `Ship` · `Done` · `Won't do`

4. Note the **project number** from the URL (`…/projects/2` → `2`).

Repo variables (configured):

| Variable | Value |
|----------|-------|
| `AIDLC_PROJECT_OWNER` | `dcvezzani` |
| `AIDLC_PROJECT_OWNER_TYPE` | `user` |
| `AIDLC_PROJECT_NUMBER` | `2` |

### 3 — Repository labels

Created on `dcvezzani/brick-counter-coordinator`:

| Label | Purpose |
|-------|---------|
| `aidlc_work:unstarted` | Triggers agent launch (with board phase) |
| `aidlc_work:in_progress` | Mutex — blocks duplicate agent runs |

### 4 — GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Value |
|--------|-------|
| `CURSOR_API_KEY` | From [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations) → **API Keys** |
| `AIDLC_PROJECT_PAT` | GitHub PAT for account **`dcvezzani`** with **`project`** and **`repo`** scopes. Required for Projects v2 GraphQL (`GITHUB_TOKEN` cannot read personal user projects). Can be the same token you use for `AIDLC_GH_CALLBACK_TOKEN`. |

Create PAT: GitHub → Settings → Developer settings → Fine-grained or classic token → scopes **`project`**, **`repo`**.

### 5 — Cursor Cloud Agents environment

1. [cursor.com/onboard](https://cursor.com/onboard) — connect GitHub account **`dcvezzani`** and select **`dcvezzani/brick-counter-coordinator`**.
2. Environment install is defined in [`.cursor/environment.json`](../.cursor/environment.json) (submodule init).
3. Cursor dashboard → **Cloud Agents** → this repo → **Environment** → add secret:

| Name | Value |
|------|-------|
| `AIDLC_GH_CALLBACK_TOKEN` | GitHub PAT (`repo` scope) so agents can comment and clear `aidlc_work:in_progress` when done |

**Do not** commit this token or add it to GitHub Actions secrets.

### 6 — Push workflows

Workflows live in [`.github/workflows/`](../.github/workflows/):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `aidlc-agent-launch.yml` | `issues.labeled` (`aidlc_work:unstarted`) or manual | Read board phase → launch Cursor agent |
| `aidlc-launch-from-board.yml` | `workflow_dispatch`, `repository_dispatch` | Central launcher (used by comment trigger) |
| `aidlc-issue-comment-launch.yml` | Comment `/aidlc-launch` on issue | Manual launch after board drag |

Composite action: `.claude/deps/ai-dlc/.github/actions/aidlc-launch` (requires AI-DLC submodule on `main`).

---

## AIDLC phase → agent mapping

| Board phase | Cursor skill | Auto-creates PR |
|-------------|--------------|-----------------|
| Idea | — | — |
| **Plan** | `/plan` | Yes (draft) |
| **Design** | `/design` | Yes (draft) |
| **Build** | `/build` | Yes |
| **Review** | `/review` | No |
| **Ship** | `/ship` (Validate only; `/learn` manual) | No |
| Done / Won't do | — | — |

Process: [AIDLC.md](AIDLC.md).

---

## Per-feature workflow

### Start a feature

1. Create a GitHub issue on `dcvezzani/brick-counter-coordinator`. Body must include:

   ```
   AIDLC feature folder: feature/<kebab-slug>/
   ```

2. Add the issue to the AIDLC project board.
3. Set **AIDLC phase** to `Idea` until ready.

Example for current work:

```
AIDLC feature folder: feature/part-out-coordinator/
```

### Trigger an agent

**Option A — label (primary for personal accounts)**

1. Move the board card to the target phase (e.g. **Plan**).
2. Apply label **`aidlc_work:unstarted`** to the issue.

**Option B — comment**

1. Move the board card to the target phase.
2. Comment **`/aidlc-launch`** on the issue.

**Option C — manual dispatch**

```bash
gh workflow run aidlc-agent-launch.yml \
  -R dcvezzani/brick-counter-coordinator \
  -f issue_number=<N> \
  -f phase=plan
```

Or board-driven (reads phase from project):

```bash
gh workflow run aidlc-launch-from-board.yml \
  -R dcvezzani/brick-counter-coordinator \
  -f issue_number=<N>
```

### While the agent runs

- Issue has `aidlc_work:in_progress` — do not re-trigger until the agent clears it.
- Track at [cursor.com/agents](https://cursor.com/agents) or the issue comment link.

### When the agent finishes

The agent clears `aidlc_work:in_progress` via `$AIDLC_GH_CALLBACK_TOKEN` and posts a summary. Move the card to the next phase and re-apply `aidlc_work:unstarted` or comment `/aidlc-launch`.

---

## Why `issues.labeled` (not board webhooks)?

On **personal** GitHub accounts, `projects_v2_item` events do not fire for user-owned projects. **`issues.labeled`** is the reliable event-driven trigger. See [AI-DLC GITHUB-AIDLC-PROJECT.md](https://github.com/queen-of-code/AI-DLC/blob/main/docs/GITHUB-AIDLC-PROJECT.md) (personal-account path).

---

## Optional later: merge → next phase

When you have deploy CI, add from AI-DLC templates:

- `aidlc-pr-merged.yml` — advance board on PR merge
- `aidlc-pr-opened-review.yml` — PR opened → Review agent
- `aidlc-ship-after-deploy.yml` — Ship after staging deploy

See [GITHUB-AIDLC-QUEUE.md](../.claude/deps/ai-dlc/docs/GITHUB-AIDLC-QUEUE.md) in the AI-DLC submodule.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| GraphQL permission error | Set `AIDLC_PROJECT_PAT` with **`project`** scope for **`dcvezzani`** |
| Issue not on board | Add issue to project; set `AIDLC_PROJECT_NUMBER` |
| Wrong GitHub user in `gh` | `gh auth switch -u dcvezzani` |
| Agent can't find skills | Ensure submodule init in `.cursor/environment.json`; push `.claude/deps/ai-dlc` submodule pointer |
| Composite action not found | Workflows need `submodules: true` checkout (already in templates) |
