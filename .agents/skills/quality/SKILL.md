---
name: quality
description: >
  Universal code quality enforcement for the agentic dev flow. Applies SOLID principles,
  DRY, small focused components, and naming discipline to all platforms. Always loaded
  by the build and validate phases alongside the platform-specific quality skill.
  Read this first, then read the platform skill from platforms/{platform}/SKILL.md.
---

# Universal Code Quality

These rules apply to every platform, every task, every subagent. Violations are fixable
failures (2 auto-retries) unless they break architecture contracts, which escalates to plan.

## Output Rules

- Report failures only — skip passing checks in output
- One line per violation: `✗ {file}:{line} — {rule} — {fix}`
- No explanation of the rule — just what violated it and how to fix it
- Zero violations: `✓ Quality checks passed.` — nothing else

---

## SOLID

**Single Responsibility** — every function, class, component, or module does one thing.
If you need "and" to describe it, split it.

**Open / Closed** — extend behaviour via parameters, composition, or interfaces.
Never add `if platform === 'x'` branches inside shared modules — use strategy or injection.

**Liskov Substitution** — subtypes are fully substitutable for their declared interface.
Never narrow a parameter type or widen a return type in an implementation.

**Interface Segregation** — interfaces and prop types expose only what the consumer needs.
No god interfaces that bundle unrelated capabilities.

**Dependency Inversion** — high-level modules depend on abstractions.
Side-effectful dependencies (network, storage, clock) are injected, never imported directly inside logic.

---

## DRY

- Same logic in two places → extract before the task is submitted
- Same UI structure in two places → make it a component / composable / widget
- String and number literals repeated → named constant at module or config level
- Copy-paste with minor edits is always a violation

---

## Size Limits

| Unit | Hard limit | Soft target |
|---|---|---|
| Function / method | 40 lines | ≤ 20 lines |
| Component / widget / composable | 150 lines | ≤ 80 lines |
| File / module | 400 lines | ≤ 250 lines |
| Class | 200 lines | ≤ 120 lines |

When a limit is breached: extract, never compress. Platform skills may tighten these limits
for specific unit types (e.g. Flutter `build()` methods, Compose `@Composable` bodies).

---

## Naming

- Descriptive and self-documenting — abbreviate only well-known terms (`id`, `url`, `api`, `ctx`, `dto`)
- Booleans prefixed: `is`, `has`, `can`, `should`
- Event handler props prefixed `on`; implementations prefixed `handle`
- Avoid: `data`, `info`, `manager`, `helper`, `util` — name the concept instead
- Functions / methods are verbs: `fetchUser`, `parseDate`, `buildQuery`
- Types, classes, interfaces are nouns: `UserProfile`, `AuthToken`, `CartItem`
- Language-specific casing conventions take precedence (camelCase, PascalCase, snake_case)

---

## Error Handling

- Every external call (network, file I/O, DB, device API) has explicit error handling
- Typed errors where the language supports it — no `catch (e: any)` or bare `except Exception`
- Errors propagate with context: wrap with message and original cause
- Silent catch blocks are never acceptable
- Platform skills define the language-specific error hierarchy and mapping patterns

---

## Documentation

- Every exported / public symbol has a doc comment (JSDoc / KDoc / DocC / Dartdoc / docstring)
- Doc comments describe *what* and *why* — not *how*
- Algorithm-level comments are acceptable as a single block above the function, not inline
- Inline comments that explain *what* the code does indicate a refactor is needed

---

## Immutability

- Prefer immutable data structures; mutate only at clearly bounded state management layers
- Pure functions (no side effects) are kept pure and unit-tested as such
- State mutation is isolated to dedicated state management layers (ViewModel, store, notifier)

---

## Testing

- Every piece of logic has a unit test
- Test names describe behaviour in plain language: `"returns null when user is not found"`
- No test-only conditionals in production code
- Mocks replace external boundaries only (network, storage, hardware) — never internal logic
- Platform skills define the testing stack and layer responsibilities

---

## Platform Rules

After applying all universal rules, read the platform skill:

| Platform | Skill |
|---|---|
| `web` | `quality/platforms/web/SKILL.md` |
| `mobile-rn` | `quality/platforms/mobile-rn/SKILL.md` |
| `mobile-flutter` | `quality/platforms/mobile-flutter/SKILL.md` |
| `mobile-android` | `quality/platforms/android/SKILL.md` |
| `mobile-ios` | `quality/platforms/ios/SKILL.md` |
| `backend` | `quality/platforms/backend/SKILL.md` |
| `cli` | `quality/platforms/cli/SKILL.md` |
| `library` | `quality/platforms/library/SKILL.md` |
