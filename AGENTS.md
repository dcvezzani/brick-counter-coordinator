# Agent instructions (robots only)

Humans: use [README.md](README.md). This file is for AI assistants.

## Project owner

| Field | Value |
|-------|-------|
| **Name** | David Vezzani |
| **Address as** | **Dave** (not "Queen" or other aliases) |
| **Role** | Product owner / author for this application |

## Canonical process (this repo)

- **AIDLC:** [docs/AIDLC.md](docs/AIDLC.md) — do not invent process outside this document.

## Skill library (AI-DLC)

- **Upstream catalog & format:** [AI-DLC/docs/SKILLS.md](https://github.com/queen-of-code/AI-DLC/blob/main/docs/SKILLS.md)
- **Submodule:** [`.claude/deps/ai-dlc`](.claude/deps/ai-dlc) — track branch **`main`**. Canonical bundles live under **`skills/`** in that repo. [`.claude/skills`](.claude/skills) is a **symlink** to `deps/ai-dlc/skills`.
- **Cursor:** discovers `.claude/skills/` and `.cursor/skills/` (symlink to the same tree). Rules: [.cursor/rules/project-owner.md](.cursor/rules/project-owner.md), [.cursor/rules/aidlc.md](.cursor/rules/aidlc.md).

## Phase orchestrators (from AI-DLC submodule)

Primary user invocations: **`/plan`**, **`/design`**, **`/build`**, **`/review`**, **`/ship`** — implemented as Agent Skills. Canonical definitions live in **[AI-DLC](https://github.com/queen-of-code/AI-DLC)**; this repo exposes them via **`.claude/skills`** (symlink), not a second committed copy.

| Skill | Path |
|-------|------|
| `/plan` | [.claude/skills/plan/SKILL.md](.claude/skills/plan/SKILL.md) |
| `/design` | [.claude/skills/design/SKILL.md](.claude/skills/design/SKILL.md) |
| `/build` | [.claude/skills/build/SKILL.md](.claude/skills/build/SKILL.md) |
| `/review` | [.claude/skills/review/SKILL.md](.claude/skills/review/SKILL.md) |
| `/ship` | [.claude/skills/ship/SKILL.md](.claude/skills/ship/SKILL.md) |

These **orchestrate** AIDLC phases and **pull in** library skills (`architecture`, `frontend-web`, `backend-saas`, `testing`, `git-workflow`, `spec-management`, …) and **agent bundles** (e.g. `agent-product-manager`, `agent-grounding-reviewer`, `agent-reviewer`, `agent-security-review`, `agent-devops-review`, …) as nested playbooks.

## Repo layout

- **Features:** `feature/<kebab-slug>/` — copy from [feature/_template/](feature/_template/) for new work.
- **ADRs:** `adr/NNNN-title-with-dashes.md` — see [adr/README.md](adr/README.md).
- **Project memory:** [PROJECT.md](PROJECT.md) — read at session start; updated by Learn after each Feature.

## Issue tracker (AIDLC)

| Field | Value |
|--------|--------|
| **System** | `github-projects-v2` |
| **GitHub account** | **`dcvezzani`** (personal — not `dcvezzani_church`) |
| **Work item for a Feature** | GitHub issue on `dcvezzani/brick-counter-coordinator`; URL pattern `github.com/dcvezzani/brick-counter-coordinator/issues/NNN` |
| **Phase signal** | Projects v2 single-select field **`AIDLC phase`** on user board; label **`aidlc_work:unstarted`** triggers automation; **`aidlc_work:in_progress`** = agent mutex |
| **Parent ↔ `feature/<slug>/`** | Issue body includes `AIDLC feature folder: feature/<kebab-slug>/` |
| **Automation entry points** | [`.github/workflows/aidlc-agent-launch.yml`](.github/workflows/aidlc-agent-launch.yml) (`issues.labeled`); [`.github/workflows/aidlc-launch-from-board.yml`](.github/workflows/aidlc-launch-from-board.yml); [`.github/workflows/aidlc-issue-comment-launch.yml`](.github/workflows/aidlc-issue-comment-launch.yml) (`/aidlc-launch` comment) |

**Board:** [users/dcvezzani/projects/2](https://github.com/users/dcvezzani/projects/2) — **`AIDLC_PROJECT_NUMBER=2`**. Vars: `AIDLC_PROJECT_OWNER=dcvezzani`, `AIDLC_PROJECT_OWNER_TYPE=user`.

**Secrets:** `CURSOR_API_KEY`, `AIDLC_PROJECT_PAT` (PAT with **`project`** + **`repo`** for `dcvezzani`). **Cursor dashboard** (not GitHub): `AIDLC_GH_CALLBACK_TOKEN`.

**Setup guide:** [docs/github-queue.md](docs/github-queue.md). Queue reference: [AI-DLC GITHUB-AIDLC-QUEUE.md](.claude/deps/ai-dlc/docs/GITHUB-AIDLC-QUEUE.md).

## `/review` dimensions (orchestrator must cover all in scope)

The **`/review`** phase skill is not a shallow CI check. It must drive evaluation of:

1. **Tech Spec compliance** — trace criteria and contracts to code/tests.
2. **Practical testing sufficiency** — right behaviors proven, not coverage theater.
3. **DevOps** — rollout, deploy path, rollback, monitoring/observability vs Tech Spec.
4. **Frontend/UI** — when applicable: **`frontend-web`** skill plus **browser MCP** to exercise flows; if MCP unavailable, ship a manual browser script and mark gaps.
5. **Security** — lightweight pass via **`agent-security-review`** (and **`backend-saas`** for API/auth patterns).

**Delivery:** each dimension should post feedback **as GitHub PR comments** when tools allow; mirror in `feature/<slug>/review-report.md`.

**Handoff to `/build`:** after review comments exist, **`/build`** triages each thread — **fix** valid findings or **reply** with why invalid, then **resolve**.

See [.claude/skills/review/SKILL.md](.claude/skills/review/SKILL.md).
