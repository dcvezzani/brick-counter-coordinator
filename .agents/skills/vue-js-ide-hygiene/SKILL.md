---
name: vue-js-ide-hygiene
description: Clears Cursor/VS Code diagnostics on Vue and JS files using checkJs, Prettier, and Vue SFC type shims. Use when vue/js files show IDE errors, formatting warnings, missing *.vue module types, or when asked to sweep project hygiene.
---

# Vue / JS IDE hygiene

Eliminate IDE diagnostics on all project `*.vue` and `*.js` files. The repo uses **`checkJs: true`** in [jsconfig.json](../../../jsconfig.json) — the same errors TypeScript reports are what Cursor/VS Code shows.

## When to use

- Red squiggles on Vue SFC or JS imports in the IDE
- Prettier format warnings on save or in the problems panel
- Pre-PR hygiene sweep after large refactors
- User asks to clear vue/js formatting or type errors

## Quick start

From repo root:

```bash
npm run check:ide          # types + format only
npm run verify:ide         # types + format + unit tests
```

If either fails, run the scan for details, fix in batches, re-verify until clean:

```bash
./.agents/skills/vue-js-ide-hygiene/scripts/scan-ide-diagnostics.sh
```

Resolve scripts **relative to this skill tree** first (see [AGENTS.md](../../../AGENTS.md) skill shell script lookup order).

## Batch workflow

Review files in **small batches**. After each batch, re-run `npm run check:ide`.

1. **Type infrastructure** — confirm canonical files exist (do not recreate ad hoc):
   - [src/env.d.ts](../../../src/env.d.ts) — `*.vue` shim, Vite client ref, `Document.activeElement`
   - [src/test-globals.d.ts](../../../src/test-globals.d.ts) — `@vue/test-utils` DOMWrapper augmentation
   - [jsconfig.json](../../../jsconfig.json) — `"types": ["vite/client"]`, include `src/**/*.d.ts`
2. **Source JSDoc** — composables and lib helpers with over-narrow inferred types
3. **Test patterns** — mocks, `find()` vs `get()`, DOM element access (see [playbooks.md](playbooks.md))
4. **Prettier** — `npm run fix:format`
5. **Verify** — `npm run verify:ide`
6. **Log** — append a dated section to [docs/support/ide-error-fix-log.md](../../../docs/support/ide-error-fix-log.md) using [log-template.md](log-template.md)
7. **Commit** — only when the user requests; use the **git-commit** skill (`~/.claude/skills/git-commit/git-commit.sh`). Stage only hygiene-related files.

## Scripts

All scripts live in [scripts/](scripts/). Invoke from repo root.

| Script | Purpose |
|--------|---------|
| [scripts/scan-ide-diagnostics.sh](scripts/scan-ide-diagnostics.sh) | Read-only: `tsc` + Prettier check; summary to stdout |
| [scripts/format-vue-js.sh](scripts/format-vue-js.sh) | `prettier --write` on project vue/js globs |
| [scripts/verify-ide-clean.sh](scripts/verify-ide-clean.sh) | Gate: scan + optional unit tests |

```bash
# Detailed scan (human-readable)
./.agents/skills/vue-js-ide-hygiene/scripts/scan-ide-diagnostics.sh

# Machine-readable summary for agents
./.agents/skills/vue-js-ide-hygiene/scripts/scan-ide-diagnostics.sh --json

# Format all vue/js in scope
./.agents/skills/vue-js-ide-hygiene/scripts/format-vue-js.sh

# Full gate (includes unit tests)
./.agents/skills/vue-js-ide-hygiene/scripts/verify-ide-clean.sh

# Types + format only
./.agents/skills/vue-js-ide-hygiene/scripts/verify-ide-clean.sh --skip-tests
```

## npm aliases

| Script | Equivalent |
|--------|------------|
| `npm run check:types` | `tsc --noEmit -p jsconfig.json` |
| `npm run check:format` | Prettier check on full vue/js scope |
| `npm run fix:format` | skill `format-vue-js.sh` |
| `npm run check:ide` | `verify-ide-clean.sh --skip-tests` |
| `npm run verify:ide` | `verify-ide-clean.sh` (with unit tests) |
| `npm run format` | alias for `fix:format` |

## Guardrails

- **Never** add `export {}` to `src/env.d.ts` — it breaks global `declare module '*.vue'`.
- Keep test-utils augmentation in **`src/test-globals.d.ts`** only (separate from `env.d.ts`).
- Prettier scope includes `e2e/` and root config js files, not just `src/`.
- Do not stage unrelated files when committing hygiene fixes.

## Reference

- Recurring error patterns and fixes: [playbooks.md](playbooks.md)
- Log section template: [log-template.md](log-template.md)
- Prior sweep example: [docs/support/ide-error-fix-log.md](../../../docs/support/ide-error-fix-log.md)
