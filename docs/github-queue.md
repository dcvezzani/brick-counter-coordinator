# GitHub issue queue (optional)

This repo uses **manual** issue tracking by default. Each AIDLC Feature should have a parent GitHub issue whose body links to `feature/<slug>/`.

## Manual workflow

1. Create a GitHub issue for the Feature.
2. Add to the issue body: `AIDLC feature folder: feature/<kebab-slug>/`
3. Run `/plan` in Cursor to draft the Product Spec in that folder.
4. Track phase progress via labels, comments, or a project board column.

## Optional automation

To wire GitHub Projects (classic) columns, `aidlc_work:*` labels, GitHub Actions, and Mac `launchd` cron:

1. Read [GITHUB-AIDLC-PROJECT.md](https://github.com/queen-of-code/AI-DLC/blob/main/docs/GITHUB-AIDLC-PROJECT.md) in the AI-DLC repo.
2. Copy workflow templates from `docs/templates/github-workflows/` in AI-DLC into `.github/workflows/`.
3. Update the **Issue tracker (AIDLC)** table in [AGENTS.md](../AGENTS.md) with your automation entry points.

For GitHub Projects v2 or Cursor Cloud Agent launch patterns, see [alexa-recipe-app](https://github.com/queen-of-code/alexa-recipe-app) as a reference consumer repo.

## Switching trackers

If you use Linear, Jira, or another system, run **`agent-issue-tracker-setup`** and follow [ISSUE-TRACKER-PORTABILITY.md](https://github.com/queen-of-code/AI-DLC/blob/main/docs/ISSUE-TRACKER-PORTABILITY.md).
