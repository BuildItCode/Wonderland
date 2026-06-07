---
name: visualize
description: >
  Visualization phase of the agentic dev flow. Renders Mermaid diagrams and milestone
  progress artifacts adapted to the project's platform. Architecture diagrams always
  render as HTML. Live UI previews only render for web projects. Mobile, CLI, backend,
  and library projects get platform-appropriate alternatives. Triggers at plan approval,
  each task completion, milestone completion, and project finish. Also use when user asks
  to "show progress", "visualize", or "show me what's been built".
---

## Output Rules

Follow output rules in `SKILL.md` (master). No greetings, no narration, no summaries.

# Visualize Phase

Render. Save. Print path. Done.

---

## Step 0 — Detect Platform

Read `ARCH.md` Tech Decisions → extract Platform row.

| Matches | Platform |
|---|---|
| React, Vue, Svelte, Next, Nuxt, Angular, HTML | `web` |
| React Native, Expo | `mobile-rn` |
| Flutter | `mobile-flutter` |
| Swift, SwiftUI, UIKit | `mobile-ios` |
| Kotlin, Jetpack Compose, Android | `mobile-android` |
| Express, Fastify, Django, Rails, Go, Rust (no UI) | `backend` |
| CLI, Terminal | `cli` |
| npm lib, SDK, package | `library` |
| Electron, Tauri | `desktop` |

---

## Render Types

| Type | When | All Platforms |
|---|---|---|
| `architecture` | Plan approved | ✓ always |
| `task-complete` | Task validated | Platform-adaptive |
| `milestone-summary` | Milestone validated | ✓ always |
| `completion-summary` | Project done | ✓ always |

---

## Architecture Render

Extract all mermaid blocks from `ARCH.md`. One `<section>` per diagram.
Output: `.agents/visuals/architecture.html`

---

## Task-Complete Render — By Platform

**`web`** — HTML preview of the completed component.

**`mobile-rn` / `mobile-flutter`** — Device frame wireframe (375×812):
```html
<div class="device-frame"><div class="screen">
  <div class="screen-region nav">{nav bar}</div>
  <div class="screen-region content">{content}</div>
  <div class="screen-region cta">{primary action}</div>
</div></div>
```

**`mobile-ios` / `mobile-android`** — Screen flow diagram (Mermaid) with modified screen highlighted + view hierarchy summary.

**`backend`** — Sequence diagram of the completed endpoint + endpoint table (method / path / request / response).

**`cli`** — Command tree diagram + terminal usage example block.

**`library`** — Module diagram of exported symbols + usage code snippet.

**`desktop`** — Window frame wireframe (1280×800).

All task-complete renders include the component map from `ARCH.md` with completed nodes in green:
```
classDef completed fill:#22c55e,color:#fff
```

Output: `.agents/visuals/task-{task-id}.html`

---

## Milestone Summary Render

Always rendered. Includes:
- Milestone name + timestamp
- Task list with status badges
- Architecture diagram (completed nodes green)
- Acceptance criteria checklist
- Test pass count + auto-fix count
- `web` only: links to task HTML previews
- non-web: links to platform diagrams

Output: `.agents/visuals/milestone-{n}.html`

---

## Completion Summary Render

Always rendered. Includes:
- All milestones + tasks + timestamps
- Full architecture diagram (all nodes green)
- Complete acceptance criteria (all checked)
- DECISIONS.md as timeline
- ANTIPATTERNS.md as lessons-learned
- Links to all milestone visuals

Output: `.agents/visuals/completion.html`

---

## Render Instructions

1. Detect `$PLATFORM`
2. Read relevant contracts
3. Read `.agents/visuals/visual-base.html` for base styles
4. Generate HTML
5. Save to `.agents/visuals/{filename}.html`
6. Update `PROGRESS.md` with link
7. Output:

```
Visual: .agents/visuals/{filename}.html
```

Nothing else.
