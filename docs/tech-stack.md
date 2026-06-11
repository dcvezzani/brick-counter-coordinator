# Tech stack — Brick Counter Coordinator

**Status:** Frontend scaffold in repo; coordinator server detail in `/design`.  
**Last updated:** 2026-06-11

## Summary

| Layer | Choices |
|-------|---------|
| **UI framework** | [Vue 3](https://vuejs.org/) + [Vite](https://vite.dev/) |
| **Component library** | [shadcn-vue](https://shadcn-vue.com/) (Reka UI primitives, copy-in components) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4, CSS variables (`new-york` style, `olive` base) |
| **Icons** | [Lucide](https://lucide.dev/) via `@lucide/vue` (shadcn-vue default) |
| **Routing** | [Vue Router](https://router.vuejs.org/) |
| **Language (client)** | **JavaScript** — `.js` / `<script setup>` (no `lang="ts"`); `components.json` → `"typescript": false` |
| **Path aliases** | [`jsconfig.json`](../jsconfig.json) (`@/*` → `src/*`) |
| **Tests** | [Vitest](https://vitest.dev/) (unit), [Playwright](https://playwright.dev/) (e2e) |
| **Coordinator server** | **Planned** — Node.js, WebSockets (contracts in Tech Spec) |
| **BrickLink** | Session-backed AJAX/fetch only — **no iframes** |

## Frontend layout

```
src/
  components/ui/     # shadcn-vue primitives (added via CLI — JS output)
  views/             # One file per application view (storyboard → live)
  router/            # Routes aligned to docs/support/application-views.md
  lib/utils.js       # cn() helper
  style.css          # Tailwind + theme tokens
```

Config: [`components.json`](../components.json) · [`jsconfig.json`](../jsconfig.json) · MCP: [`.cursor/mcp.json`](../.cursor/mcp.json) · Skills: [shadcn-vue](../.agents/skills/shadcn-vue/SKILL.md) · [vue-js-ide-hygiene](../.agents/skills/vue-js-ide-hygiene/SKILL.md)

## Application preferences

Product and behavioral defaults live in one committed JSON file. Import through the loader — do not read the JSON path directly from components.

| Kind | Location |
|------|----------|
| Product/behavior defaults | [`config/app-preferences.json`](../config/app-preferences.json) via [`src/lib/app-config.js`](../src/lib/app-config.js) |
| Secrets & deploy flags | `.env` (`VITE_*`, future `BRICKLINK_*`) |
| Storyboard demo data | `src/fixtures/` |
| UI toolchain | `components.json`, `vite.config.js` |

Sections in `app-preferences.json`: `storyboard`, `newSession`, `partSearch`, `picker`, `lotEntry`, `swipeNumberInput`.

## shadcn-vue workflow

```bash
npm install
npm run dev              # storyboard / local UI

npx shadcn-vue@latest info
npx shadcn-vue@latest add button card input form ...
```

With `"typescript": false`, the CLI installs **JavaScript** components. Use the **shadcn-vue MCP** (`shadcnVue`) or the project skill when adding components.

**Note:** A few complex components (`chart`, `sidebar`, `carousel`) have historically been fussy in JS mode; most storyboard primitives (button, card, input, form, table) work fine.

## Storyboard vs production

| Mode | Data | Backend | Purpose |
|------|------|---------|---------|
| **Storyboard (Unit 0)** | Fixture / in-memory mocks | None | Navigate all views; stakeholder feedback |
| **Live (Unit 1+)** | API + WebSockets | Node coordinator | Real sessions and persistence |

Storyboard screens should reuse the same routes and view components that production will extend.

## Supersedes

Earlier notes listed Font Awesome and generic “ShadCN” without a Vue binding. **shadcn-vue + Lucide** is the canonical UI stack. **JavaScript on the client** matches Dave’s preference (no TypeScript); shadcn-vue supports this via `components.json`.
