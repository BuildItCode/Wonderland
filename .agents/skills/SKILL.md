---
name: dev-flow
description: >
  Full agentic local development orchestration system with persistent memory, architectural
  planning, live visual milestones, contract-driven subagent coordination, and automated
  validation loops. Trigger this skill whenever the user wants to plan a project, start
  development, validate work, or visualize progress. Also triggers for: "let's plan",
  "start building", "show me progress", "validate this", "update the contracts", or
  any software project that needs structured planning before implementation.
---

# Agentic Dev Flow — Orchestration

## Output Rules — Non-Negotiable

These apply to every response in every phase. No exceptions.

- **No greetings.** Never start with "Sure!", "Great!", "Absolutely!", "Of course!" or any affirmation.
- **No summaries of what you just did.** Do the thing. Don't narrate doing it.
- **No filler.** Cut "I'll now proceed to...", "Let me...", "I'm going to...", "As you can see..."
- **No over-explanation.** State what matters. Skip the why unless it changes a decision.
- **Errors only.** Don't list what passed — only report failures and what's needed to fix them.
- **Questions are single, direct, specific.** One question at a time. No preamble before it.
- **Status lines are one line.** `✓ T1.2 done` not a paragraph about what was accomplished.
- **Code is code.** Output it. Don't describe what it does unless there's a non-obvious decision.
- **Waiting for input = one line.** `Plan ready. Approve or change?` — nothing more.

---

## Phase Map

```
PLAN → BUILD → VALIDATE → (fix loop) → COMPLETE
  ↑_______________|  (contract violation → back to plan)
```

| Phase | Skill | Command | Triggers |
|---|---|---|---|
| Plan | `plan/SKILL.md` | `/plan` | New idea, change request |
| Build | `build/SKILL.md` | `/build` | Plan approved |
| Validate | `validate/SKILL.md` | `/validate` | Subtask complete |
| Visualize | `visualize/SKILL.md` | `/visualize` | Each milestone |
| Quality | `quality/SKILL.md` | (auto-loaded) | Every build & validate |

---

## Contracts — Source of Truth

Read all on session start. Write after every state change.

```
.agents/contracts/
  SPEC.md          # intent, user stories, acceptance criteria
  ARCH.md          # diagrams, tech decisions, interfaces
  TASKS.md         # task list with status
  DECISIONS.md     # approved decisions log
  ANTIPATTERNS.md  # what not to do
  PROGRESS.md      # milestone log + visual refs
```

---

## Orchestration Rules

1. Session start → read all contracts before anything else.
2. Plan phase → no code until SPEC.md + ARCH.md + TASKS.md exist and user approved.
3. Build phase → one subtask at a time → auto-validate after each.
4. Validate:
   - PASS → update PROGRESS.md → visualize → next task
   - FAIL fixable → auto-fix (max 2 retries)
   - FAIL violation → block task → update ANTIPATTERNS.md → back to plan → wait for user
5. Complete → full validation → auto-fix if needed → surface result only when clean.

---

## Subagent Context (in order)

1. `.agents/contracts/SPEC.md`
2. `.agents/contracts/ARCH.md`
3. `.agents/contracts/TASKS.md` (current task only)
4. `.agents/contracts/ANTIPATTERNS.md`
5. `.agents/skills/quality/SKILL.md`
6. `.agents/skills/quality/platforms/{platform}/SKILL.md`
7. Phase skill file

---

## Phase Entry Points

| Condition | Read |
|---|---|
| New project / change request / violation | `plan/SKILL.md` |
| Plan approved, task ready | `build/SKILL.md` |
| Subtask or project needs verification | `validate/SKILL.md` |
| Milestone reached | `visualize/SKILL.md` |
