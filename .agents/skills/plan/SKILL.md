---
name: plan
description: >
  Plan phase of the agentic dev flow. Handles project ideation, contract generation,
  Mermaid architecture diagrams, and task breakdown. Use when starting a project or
  when a contract violation forces a return to planning.
---

## Output Rules

Follow output rules in `SKILL.md` (master). No greetings, no narration, no summaries.

# Plan Phase

No code. Output is contracts. Build starts only after human approval.

---

## Step 1 — Read Contracts

```
read .agents/contracts/SPEC.md         (if exists)
read .agents/contracts/ARCH.md         (if exists)
read .agents/contracts/TASKS.md        (if exists)
read .agents/contracts/DECISIONS.md    (if exists)
read .agents/contracts/ANTIPATTERNS.md (if exists)
```

Change request → diff proposed change against existing contracts → surface conflicts first.

---

## Step 2 — Fill Gaps

Extract from what the user already said. Only ask what's missing. One question at a time.

Need all six before proceeding:
- What is being built?
- Who uses it and what's their primary need?
- Platform — web / mobile-rn / mobile-flutter / ios / android / backend / cli / library / desktop?
- Tech stack?
- Done criteria — how is a task verified complete?
- Out of scope?

Record Platform as first row in ARCH.md Tech Decisions.

---

## Step 3 — Write Contracts

Use templates. Write all files.

**SPEC.md**
```markdown
# Specification — {name}
_Updated: {date}_

## Intent
{1-3 sentences}

## User Stories
- As a {role}, I want {capability} so that {outcome}

## Acceptance Criteria
- [ ] {measurable, testable}

## Out of Scope
- {explicit exclusion}
```

**ARCH.md**
```markdown
# Architecture — {name}
_Updated: {date}_

## System Diagram
\`\`\`mermaid
graph TD
  ...
\`\`\`

## Component Map
\`\`\`mermaid
graph LR
  ...
\`\`\`

## Data Flow
\`\`\`mermaid
sequenceDiagram
  ...
\`\`\`

## Tech Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Platform | {value} | {reason} |

## Contracts
{type signatures, API shapes, module boundaries}
```

**TASKS.md**
```markdown
# Tasks — {name}
_Updated: {date}_

## Status
[ ] pending  [~] in-progress  [x] done  [!] blocked

### M1 — {name}
- [ ] T1.1: {title}
  - Subtasks: {list}
  - Owner: agent
  - Validate: {what validator checks}
  - Visual: {component name or none}
```

---

## Step 4 — Review Gate

Output contract summary. Then:

```
Plan ready. Approve or change?
```

Nothing else. Wait.

On approval:
1. Append approval entry to `DECISIONS.md`
2. Call `/visualize arch`
3. Hand off to `build/SKILL.md`

---

## Contract Updates (Mid-Build Violation)

1. Add violation → `ANTIPATTERNS.md`
2. Fix ambiguous criteria → `SPEC.md`
3. Fix wrong assumption → `ARCH.md`
4. Reset affected tasks → `TASKS.md` (mark pending)
5. Log decision → `DECISIONS.md`
6. Show only changed sections.

```
Contracts updated. Approve changes to resume?
```
