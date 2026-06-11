# Log section template

Append a new dated section to [docs/support/ide-error-fix-log.md](../../../docs/support/ide-error-fix-log.md). Do not replace prior sections.

---

## Section template

```markdown
## Scan YYYY-MM-DD

Goal: [one-line goal, e.g. clear IDE diagnostics after feature X]

### Baseline (from scan-ide-diagnostics.sh)

| Check | Result |
|-------|--------|
| TSC errors (`checkJs`) | N |
| Prettier files | N |

Sample TSC errors (if any):
- [paste first few lines from scan output]

### Batch 1 — [category name]

| Issue | Files affected | Fix |
|-------|----------------|-----|
| ... | ... | ... |

### Batch 2 — [category name]

| Issue | Files affected | Fix |
|-------|----------------|-----|
| ... | ... | ... |

### Final verification

| Check | Result |
|-------|--------|
| `npm run check:types` | 0 errors |
| `npm run check:format` | clean |
| `npm run test:unit -- --run` | N tests passed |

### Files added

- ...

### Files updated (non-formatting)

- ...

Plus N files touched by Prettier only (no logic changes).
```

---

## Tips

- Run `./.agents/skills/vue-js-ide-hygiene/scripts/scan-ide-diagnostics.sh --json` for baseline counts.
- Group fixes by batch (type infra → JSDoc → tests → Prettier) to match the skill workflow.
- List only non-Prettier logic changes under "Files updated"; summarize Prettier-only count separately.
