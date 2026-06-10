# Brick Counter Coordinator

Coordinator for LEGO brick counting workflows — built with the **AI Development Lifecycle (AIDLC)**.

## AIDLC quick start

1. **Process definition:** [docs/AIDLC.md](docs/AIDLC.md)
2. **Agent instructions:** [AGENTS.md](AGENTS.md) (for AI assistants only)
3. **Phase skills:** invoke `/plan`, `/design`, `/build`, `/review`, `/ship` in Cursor Agent chat

### Skills setup

The [AI-DLC](https://github.com/queen-of-code/AI-DLC) library is a **git submodule** at [`.claude/deps/ai-dlc`](.claude/deps/ai-dlc). [`.claude/skills`](.claude/skills) symlinks to it.

**Clone with submodule:**

```bash
git clone --recurse-submodules <url>
```

Or after a plain clone:

```bash
git submodule update --init --recursive
```

**Bump AI-DLC** (maintainers):

```bash
cd .claude/deps/ai-dlc && git fetch origin && git checkout main && git pull
cd ../.. && git add .claude/deps/ai-dlc && git commit -m "chore: bump AI-DLC submodule"
```

### Starting a feature

1. Copy [feature/_template/](feature/_template/) to `feature/<your-feature-slug>/`
2. Run **`/plan`** to draft the Product Spec
3. After human approval, run **`/design`** for Tech Spec(s)
4. Continue through **`/build`** → **`/review`** → **`/ship`**

## Docs

| Doc | Description |
|-----|-------------|
| [docs/AIDLC.md](docs/AIDLC.md) | Canonical AIDLC process |
| [docs/github-queue.md](docs/github-queue.md) | GitHub Projects v2 + Cursor Cloud Agent automation (`dcvezzani`) |
| [PROJECT.md](PROJECT.md) | Project memory for agents |
| [AGENTS.md](AGENTS.md) | Agent/skill discoverability |

## Development

_Application code and local run instructions will be added with the first Feature._
