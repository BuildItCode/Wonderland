---
name: validate
description: >
  Validation phase of the agentic dev flow. Runs after every subtask and at milestone/
  project completion. Checks implementation against SPEC.md acceptance criteria and
  ARCH.md contracts. Triggers auto-fix loop on recoverable failures. Escalates contract
  violations to plan phase. Use after any build step or when user asks to validate.
---

# Validate Phase

Checks facts against contracts. No opinions.

---

## Modes

| Mode | Scope |
|---|---|
| `task` | Changed files only |
| `milestone` | All milestone files |
| `full` | Entire codebase |

---

## Pipeline

Stop at first **violation** — escalate immediately.
Collect **fixable** failures — run auto-fix loop after.

**Check 0 — Platform Quality**
Read `quality/SKILL.md` + `quality/platforms/{platform}/SKILL.md`.
Run validation checklist at bottom of platform skill.
- Style/idiom → fixable
- Architecture rule broken → violation

**Check 1 — Lint & Types**
```bash
{lint_command}  # from ARCH.md Tech Decisions
```
→ fixable

**Check 2 — Tests**
```bash
{test_command}
```
→ fixable if test logic wrong; violation if interface changed

**Check 3 — Acceptance Criteria**
Each criterion in `SPEC.md` → map to verifiable check → run → pass/fail.
→ always violation

**Check 4 — Architecture Contracts**
`ARCH.md` Contracts section:
- Exported interfaces match declared signatures?
- Module boundaries respected?
- Only approved dependencies in use?
→ always violation

**Check 5 — Anti-Pattern Scan**
Scan changed files against `ANTIPATTERNS.md`. Flag file + line.
→ trivial → fixable; structural → violation

---

## Auto-Fix Loop

Max 2 iterations. Still failing after 2 → reclassify as violation.

```
iteration:
  targeted fix (scope of failure only — no refactoring)
  re-run failing checks only
  pass → done
  fail → next iteration or ESCALATE
```

Constraints:
- Touch only files relevant to the failure
- No interface changes
- No new dependencies
- Log each fix in `PROGRESS.md` under `Auto-fixes:`

---

## Escalation

1. Write to `ANTIPATTERNS.md`:
```markdown
## {date} — {title}
- Task: {id}
- Check: {which}
- Found: {what}
- Contract: {what it required}
- Impact: {what must change}
```
2. Mark task `[!]` in `TASKS.md`
3. Call `plan/SKILL.md` with violation context
4. Stop. Wait for human.

---

## Report Format

Report failures only. Skip passing checks.

```
VALIDATION — {scope} — {date}
✗ {check name}
  → {file}:{line} — {what was wrong}
  → expected: {contract value}
  → found:    {actual value}

Result: FAIL — {FIXABLE | VIOLATION}
Action: {auto-fix attempt | escalating to plan}
```

If everything passes:

```
VALIDATION — {scope} — {date}
✓ All checks passed.
```
