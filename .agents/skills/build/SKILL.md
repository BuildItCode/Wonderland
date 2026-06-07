---
name: build
description: >
  Build phase of the agentic dev flow. Executes tasks from TASKS.md one at a time,
  spawns subagents per subtask, enforces contracts, and gates each subtask behind
  automatic validation. Use after plan is approved.
---

## Output Rules

Follow output rules in `SKILL.md` (master). No greetings, no narration, no summaries.

# Build Phase

One task at a time. Validate after each. No milestone advances without human confirm.

---

## Pre-Build Checklist

Fail any → call `plan/SKILL.md`:
- [ ] `SPEC.md` has acceptance criteria
- [ ] `ARCH.md` has system diagram
- [ ] `TASKS.md` has pending tasks
- [ ] `DECISIONS.md` has approval entry

---

## Build Loop

```
for each milestone M:
  for each task T:
    mark T [~]
    execute T
    validate/SKILL.md
    PASS  → mark T [x], update PROGRESS.md, visualize/SKILL.md
    FAIL fixable  → fix (max 2 retries) → re-validate
    FAIL violation → mark T [!], update ANTIPATTERNS.md, plan/SKILL.md → STOP
  visualize/SKILL.md milestone-summary
  → "M{n} done. Continue?" — wait for human
```

---

## Subagent Context

Pass in this order — nothing else:

```
System:
  Code implementation agent. Follow contracts. No architectural decisions.
  No features outside current task. Ambiguity → output BLOCKED: {reason} and stop.

Files:
  1. .agents/contracts/SPEC.md
  2. .agents/contracts/ARCH.md          (relevant sections only)
  3. .agents/contracts/ANTIPATTERNS.md
  4. .agents/skills/quality/SKILL.md
  5. .agents/skills/quality/platforms/{platform}/SKILL.md
  6. Current task from TASKS.md

Task: {T.title}
Subtasks: {T.subtasks}
Validate: {T.validate}
Platform: {from ARCH.md}
```

Read `ARCH.md` to resolve `{platform}` before spawning.

---

## Code Constraints

- Passes all checks in quality skills (universal + platform)
- Matches tech stack in `ARCH.md`
- Follows interface contracts in `ARCH.md`
- Doc comments on exported symbols — no inline comments
- Testable in isolation
- No unapproved dependencies

---

## Agent Hard Limits

- No features outside current task
- No interface changes — flag as violation instead
- No patterns from `ANTIPATTERNS.md`
- No bare error handling on external calls
- No hardcoded env values

---

## PROGRESS.md Entry

```markdown
## {date} — {title} ✓
- Milestone: M{n}
- Files: {list}
- Visual: [snapshot](.agents/visuals/{task-id}.html)
- Notes: {non-obvious decisions only}
```

---

## Final Completion

1. `validate/SKILL.md` scope=full
2. All pass → `visualize/SKILL.md` completion-summary
3. Any fail → auto-fix → re-validate
4. Surface result only when clean
