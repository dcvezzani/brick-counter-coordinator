# Vue / JS IDE hygiene — fix playbooks

Recurring patterns from [docs/support/ide-error-fix-log.md](../../../docs/support/ide-error-fix-log.md). Apply after `scan-ide-diagnostics.sh` classifies failures.

## Type infrastructure

| Pattern | Typical fix |
|---------|-------------|
| `Cannot find module '*.vue'` | Ensure [src/env.d.ts](../../../src/env.d.ts) exists with `declare module '*.vue'`; **no** `export {}` in that file |
| `Property 'env' does not exist on type 'ImportMeta'` | Add `/// <reference types="vite/client" />` in env.d.ts; set `"types": ["vite/client"]` in jsconfig |
| `@vue/test-utils` exports missing after augmentation | Move augmentation to [src/test-globals.d.ts](../../../src/test-globals.d.ts) with `import type {} from '@vue/test-utils'` |

## Source JSDoc (checkJs)

| Pattern | Typical fix |
|---------|-------------|
| Required properties missing on destructured params | Add JSDoc with optional fields: `@param {{ foo: string, bar?: string }} params` |
| `Property 'code' does not exist on type 'Error'` | `throw Object.assign(new Error('...'), { code: 'DUPLICATE_NAME' })` |
| Over-narrow union on numeric slot | Widen `@param` to `{number}` when function accepts any numeric slot |

## Test files

| Pattern | Typical fix |
|---------|-------------|
| `document.activeElement?.dataset` on `Element` | Ensure `Document.activeElement` is `HTMLElement \| null` in env.d.ts |
| `wrapper.get(...).exists()` — `get` omits `exists` in types | Use `wrapper.find(...).exists()` for existence checks |
| `.element.value` / `.blur()` / `.focus()` on generic `Element` | Ensure [src/test-globals.d.ts](../../../src/test-globals.d.ts) augments `DOMWrapper.element` as `HTMLInputElement` |
| Incomplete `vi.mocked(...).mockReturnValue` shape | Return full API shape, or cast partial mock: `/** @type {any} */ ({ ... })` |
| Loop variable inferred as `number` vs literal union | Widen source JSDoc, or annotate loop: `/** @type {const} */ ([-1, 0, 1])` |

## Prettier

| Pattern | Typical fix |
|---------|-------------|
| `Code style issues found in N files` | `npm run fix:format` (full project vue/js scope) |

## Verification order

1. `npm run check:types` — 0 errors
2. `npm run check:format` — all matched files clean
3. `npm run test:unit -- --run` — all tests pass
