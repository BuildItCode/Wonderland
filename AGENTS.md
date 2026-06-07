# AGENTS.md

Auto-read by Codex at every session start.

---

## Orchestration

Read `.agents/skills/SKILL.md` before any action.
All contracts, skills, and visuals live in `.agents/` — the shared directory for all agents.

---

## Contracts — Source of Truth

Read all files in `.agents/contracts/` at session start.

| File | Purpose |
|---|---|
| `SPEC.md` | Intent, user stories, acceptance criteria |
| `ARCH.md` | Architecture diagrams, tech decisions, interfaces |
| `TASKS.md` | Task list with status |
| `DECISIONS.md` | Approved decisions log |
| `ANTIPATTERNS.md` | What not to do — read before every build task |
| `PROGRESS.md` | Milestone log and visual refs |

If any contract file is missing or empty → enter plan phase immediately.

---

## Phase Skills

Load only the skill for the current phase.

| Phase | Trigger | Skill |
|---|---|---|
| Plan | New project, change request, contract violation | `.agents/skills/plan/SKILL.md` |
| Build | Plan approved, task ready | `.agents/skills/build/SKILL.md` |
| Validate | After each subtask, milestone, or on request | `.agents/skills/validate/SKILL.md` |
| Visualize | Each milestone, on architecture render | `.agents/skills/visualize/SKILL.md` |

---

## Quality Rules

Load for every build and validate phase:
1. `.agents/skills/quality/SKILL.md`
2. Detect platform from `ARCH.md` Tech Decisions
3. `.agents/skills/quality/platforms/{platform}/SKILL.md`
4. Load `references/` files only when relevant to the task

---

## Output Rules

- No greetings, affirmations, or pleasantries
- No narration of what you are about to do
- No summaries of what you just did
- Failures only — never list passing checks
- One line per failure: `✗ {file}:{line} — {rule} — {fix}`
- Zero failures: `✓ Quality checks passed.`
- Waiting for input: one line — `Plan ready. Approve or change?`
- Milestone gate: one line — `M1 done. Continue?`

---

## Codex Notes

- Use `workspace-write` sandbox for all file writes
- Visuals render to `.agents/visuals/`
- Never auto-advance past a milestone gate
- Ambiguity during build → `BLOCKED: {reason}` and stop
