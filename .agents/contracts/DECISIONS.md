# Decisions — Wonderland (Agent Collaboration Hub)
_Created: 2026-06-03_

> Append-only log. Never edit existing entries. Add new ones at the bottom.

---

## 2026-06-03 — Plan Approved

- Approved by: human
- Contracts in scope: SPEC.md v1, ARCH.md v1, TASKS.md v1
- Decision: Build a model-less MCP coordination hub (Wonderland). All four discussed layers in scope, split across 3 milestones (M1 skeleton, M2 async robustness, M3 verification + templates).
- Rationale: In-house trust model removes auth/exfiltration concerns; facilitator is an external agent via role-link, not hub-run; async-first. Borrows Contract Net (manager/contractors), FIPA speech acts, consumer-driven contracts.
- Alternatives considered: Python/Go stack (rejected — TS SDK most mature, typing fits speech acts); single-use links (rejected — resumability needs stable reusable links); strictly-linear phases (rejected — real integrations require regression).

---

## 2026-06-03 — Dev toolchain clarification (T1.1)

- Triggered by: build (T1.1 scaffold)
- Changed: ARCH.md Approved Dependencies
- Decision: Added `typescript-eslint` (TS-aware ESLint) and `@types/better-sqlite3` to approved deps.
- Rationale: Implied dev-only tooling for the already-approved `eslint` + `better-sqlite3` choices; not architectural.
- Alternatives considered: Plain ESLint without a TS parser (rejected — cannot lint TypeScript).

---

## 2026-06-03 — Persistence: better-sqlite3 → node:sqlite (T1.3)

- Triggered by: build (T1.3 store) — npm allow-scripts policy blocked better-sqlite3's native install script; Node 26 ABI prebuilds uncertain.
- Changed: ARCH.md Tech Decisions (Persistence), Approved Dependencies.
- Decision: Use Node's built-in `node:sqlite` (`DatabaseSync`) instead of `better-sqlite3`. Removed `better-sqlite3` + `@types/better-sqlite3`.
- Rationale: Same synchronous API shape; zero native dependency; no install-script approval, ABI mismatch, or Windows build-tools risk. Verified loads flag-free on Node 26.
- Supersedes: the `@types/better-sqlite3` addition from the prior toolchain clarification.
- Alternatives considered: Approve better-sqlite3 scripts + node-gyp compile (rejected — fragile on Node 26 / Windows).

---

## 2026-06-03 — Project Complete (M1–M3)

- Triggered by: completion of all 16 tasks across 3 milestones.
- Result: 12/12 acceptance criteria met; 88 tests passing; typecheck + lint clean; `npm audit` 0 vulnerabilities.
- Surface: MCP hub with 13 tools over Streamable HTTP, 3 templates, node:sqlite persistence, full negotiation lifecycle (frame→propose→implement→verify→ratify) with regression, consensus + verification gates, resumability, and finalized success/failure docs.
- Open questions (deferred, non-blocking): true wildcard subdomains (v1 uses path-based `/rooms/{id}`); 3+ contractor scenarios (data model is N-capable, tests exercise 2); facilitator role-prompt packaging.

---

<!-- Template for future entries:

## {{DATE}} — {{Decision Title}}

- Triggered by: {{plan approval | contract violation | user request}}
- Changed: {{which contracts were updated}}
- Decision: {{what was decided}}
- Rationale: {{why}}
- Alternatives considered: {{what was rejected and why}}

-->
