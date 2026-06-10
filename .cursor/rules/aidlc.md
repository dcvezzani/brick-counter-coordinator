---
description: AIDLC repo — use phase skills /plan /design /build /review /ship; ground process in docs/AIDLC.md; library skills from AI-DLC submodule.
alwaysApply: false
---

# AIDLC (brick-counter-coordinator)

- **Process:** [docs/AIDLC.md](../docs/AIDLC.md)
- **Library:** [AI-DLC SKILLS.md](https://github.com/queen-of-code/AI-DLC/blob/main/docs/SKILLS.md)
- **Phase orchestrators:** `.claude/skills/{plan,design,build,review,ship}/SKILL.md` — invoke with `/plan`, `/design`, `/build`, `/review`, `/ship` in Agent chat.
- **Human vs robot docs:** [README.md](../README.md) for people; [AGENTS.md](../AGENTS.md) for assistants only.

When the user is doing feature work, prefer walking them through the phase skills in order unless they explicitly skip a gate.

**`/review`** posts **GitHub PR comments** per review dimension (mirror in `review-report.md`). **`/build`** then **triages** each thread: fix valid items, or **reply** why invalid and **resolve**.
