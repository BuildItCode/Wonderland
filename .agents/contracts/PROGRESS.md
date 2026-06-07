# Progress — Wonderland (Agent Collaboration Hub)
_Created: 2026-06-03_

---

## Milestones Overview

| Milestone | Status  | Started | Completed | Visual |
|-----------|---------|---------|-----------|--------|
| M1 — Negotiation Skeleton            | done | 2026-06-03 | 2026-06-03 | [milestone-1](../visuals/milestone-1.html) |
| M2 — Async Robustness                | done | 2026-06-03 | 2026-06-03 | [milestone-2](../visuals/milestone-2.html) |
| M3 — Verification & Protocols        | done | 2026-06-03 | 2026-06-03 | [milestone-3](../visuals/milestone-3.html) |

---

## Task Log

## 2026-06-03 — T1.1 Project scaffold ✓
- Milestone: M1
- Files: package.json, tsconfig.json, eslint.config.js, .prettierrc.json, .prettierignore, vitest.config.ts, .gitignore, .env.example, src/index.ts, src/{domain,store,engine,templates,transport}/.gitkeep
- Visual: none
- Notes: Node16 module resolution + `"type":"module"` → relative imports require `.js` extensions. `better-sqlite3` install deferred to T1.3 (native). esbuild postinstall warning is benign — vitest runs.

## 2026-06-03 — T1.2 Domain model + zod schemas ✓
- Milestone: M1
- Files: src/domain/{ids,enums,contract,speech-acts,room,index}.ts, src/domain/{speech-acts,contract}.test.ts
- Visual: none
- Notes: Speech acts modelled as a strict discriminated union on `act`; payloads strict to reject unknown fields (security rule). `messageSchema` duplicates variants (envelope + act) rather than intersecting, because intersection + `.strict()` reject each other's keys. 17 tests green on zod v4.

## 2026-06-03 — T1.3 SQLite store + repositories ✓
- Milestone: M1
- Files: src/domain/ports.ts, src/store/{schema,db,room-repository,participant-repository,message-repository,contract-repository,index}.ts, src/store/store.test.ts
- Visual: none
- Notes: Repository interfaces live in `domain/ports.ts` (DI); SQLite impls in `store`. Role-link token is a column on `participants` → token resolves to the same participant id (AC3 groundwork). `node:sqlite` `.all()` rows typed `Record<string,SQLOutputValue>[]`, cast via `unknown`. Added `types:["node"]` to tsconfig so TS6 picks up node ambient types. 29 tests green.

## 2026-06-03 — T1.4 MCP server + Streamable HTTP transport ✓
- Milestone: M1
- Files: src/domain/{errors,service}.ts, src/transport/{tools,server,index}.ts, src/transport/transport.test.ts
- Visual: none
- Notes: `HubService` port (domain) is the transport↔engine seam; transport never imports store. Stateless Streamable HTTP at POST /mcp — all room state lives in SQLite, so a fresh MCP server/transport per request is fine. 10 M1 tools registered. Tests cover in-memory list+dispatch and real HTTP tool listing. 32 tests green.

## 2026-06-03 — T1.5 Room lifecycle + identity/links ✓
- Milestone: M1
- Files: src/domain/template.ts, src/templates/{api-negotiation,index}.ts, src/engine/{deps,hub-engine,index}.ts, src/engine/lifecycle.test.ts
- Visual: [task-T1.5](../visuals/task-T1.5.html)
- Notes: `HubEngine` (not yet `implements HubService` — methods land across T1.6–T1.8). Clock + IdGenerator injected (DI, deterministic tests). Role-link token IS the identity: reuse → same participantId (AC3). `resolve_link` never writes (AC2). One facilitator + ≥1 contractor enforced.

## 2026-06-03 — T1.6 Typed message log + presence ✓
- Milestone: M1
- Files: src/engine/{deps,guards,lifecycle,messaging,hub-engine}.ts (engine refactored to facade + ops modules), src/domain/ports.ts + src/store/contract-repository.ts (added latestSignedVersion), src/engine/messaging.test.ts
- Visual: none
- Notes: Engine split into ops modules (lifecycle/messaging) behind a thin `HubEngine` facade to stay under size limits. `post` validates act-vs-phase (AC4) then payload via `speechActSchema`. Side effects: `propose` mints a contract version, `accept` signs it. `read_room(since)` returns deltas. 48 tests green.

## 2026-06-03 — T1.7 Phase engine + consensus gate ✓
- Milestone: M1
- Files: src/engine/{consensus,phase}.ts, src/engine/hub-engine.ts (advancePhase), src/engine/phase.test.ts
- Visual: [task-T1.7](../visuals/task-T1.7.html)
- Notes: Consensus gate is mechanical and config-free — `unsignedContractors` returns contractors who haven't signed the latest version; advance blocks (not throws) with the missing list (AC5). No contract yet ⇒ vacuously satisfied (frame→propose allowed). Facilitator-only enforced via ForbiddenError.

## 2026-06-03 — T1.8 Facilitator summary + finalized doc ✓
- Milestone: M1
- Files: src/engine/{closing,hub-engine,lifecycle}.ts, src/index.ts (composition root), src/engine/closing.test.ts, src/integration.test.ts
- Visual: [task-T1.8](../visuals/task-T1.8.html)
- Notes: `declare(ratified)` re-checks consensus then emits the doc (summary + agreed contract + per-party task split) and sets phase `closed`, which invalidates links (join/resolve/post/advance reject; read survives). `HubEngine implements HubService` (completeness enforced by tsc). index.ts validates env with zod, mkdirs the DB dir, wires store→engine→server. Real-stack HTTP integration test passes. 58 tests green.

## 2026-06-03 — T2.1 Phase regression + round cap ✓
- Milestone: M2
- Files: src/domain/service.ts (RegressResult), src/engine/regression.ts, src/engine/messaging.ts (fatal-failure hook), src/engine/hub-engine.ts (regressPhase), src/transport/tools.ts (regress_phase tool), src/transport/transport.test.ts, src/engine/regression.test.ts
- Visual: [task-T2.1](../visuals/task-T2.1.html)
- Notes: Fatal `failure` past propose auto-regresses; explicit facilitator `regress_phase` records the reason. Regression mints a copy of the latest contract with cleared signatures + supersedes the old → re-signature forced (AC8). Round cap exceeded ⇒ outcome unsolvable + closed. Tool surface now 11.

## 2026-06-03 — T2.2 Unsolvable outcome + failure doc ✓
- Milestone: M2
- Files: src/store/schema.ts + room-repository.ts + domain/ports.ts (doc column, setDoc/getDoc), src/engine/doc.ts (shared buildDoc, success + failure), src/engine/closing.ts (persist doc + readDoc), src/engine/regression.ts (persist doc on cap), src/domain/service.ts + hub-engine.ts + transport/tools.ts (read_doc), src/engine/failure-doc.test.ts
- Visual: [task-T2.2](../visuals/task-T2.2.html)
- Notes: Doc building extracted to `doc.ts` (shared by declare + round-cap close). Failure doc mines blockers from `failure` messages + adds human next-actions. Doc persisted to a `doc` column and retrievable via `read_doc` (survives close). Tool surface now 12.

## 2026-06-03 — T2.3 Cross-session resumability ✓
- Milestone: M2
- Files: src/engine/messaging.ts (assignedTasks derivation), src/engine/resumability.test.ts, src/integration.test.ts (HTTP resume)
- Visual: none
- Notes: Resume falls out of the link-as-identity + stateless-HTTP design. `my_state` reconstructs id, status, own messages, signedVersion, and assignedTasks (the signed contract's terms, shown only once committed). HTTP test: session 1 creates/joins/posts then disconnects; session 2 with the same link recovers the same id + transcript. Checkpoint discipline = post results as `inform` (durable + recoverable).

## 2026-06-03 — T2.4 Persistence hardening ✓
- Milestone: M2
- Files: src/persistence.test.ts
- Visual: none
- Notes: Resume-on-boot needs no extra code — repos read from disk lazily, schema is `IF NOT EXISTS`, file DBs use WAL. Test drives a real temp-file DB to implement phase, closes it (simulated exit), reopens the same path: phase/summary/messages/signatures all intact and the room continues (implement→ratify). AC9 covered end-to-end (connection + process restart).

## 2026-06-03 — T3.1 Verification phase + verified-solution exit ✓
- Milestone: M3
- Files: src/domain/{contract,service,ports}.ts, src/store/{schema,contract-repository}.ts (verifications table), src/engine/{consensus,verification,phase,closing,doc,notes,regression,hub-engine}.ts, src/templates/api-negotiation-verified.ts + index.ts, src/transport/tools.ts, src/transport/transport.test.ts, src/engine/verification.test.ts
- Visual: [task-T3.1](../visuals/task-T3.1.html)
- Notes: Shared test artifact rides on `ContractBody.verification` (consensus-gated). `submit_verification` records per-contractor passes (verifications table). Verify→ratify gate + declare('verified') require all passes. New `api-negotiation-verified` template (keeps the M1 ratified-contract template intact — demonstrates both exit modes). Extracted shared `appendNote` to notes.ts. Tool surface now 13.

## 2026-06-03 — T3.2 Consumer-driven contract negotiation ✓
- Milestone: M3
- Files: src/engine/phase.ts (verified-solution requires an agreed artifact before implement), src/engine/verification.test.ts (adjusted), src/engine/consumer-driven.test.ts
- Visual: none
- Notes: The shared test is the contract's `verification` field — agreed only when the contract is signed by all (consensus). Added an "agree the test before implementing" guard for verified-solution templates. Tests prove: consumer can declare the test (B proposes), provider-only signature does NOT satisfy the gate (AC5), and a verified room cannot implement without an agreed artifact (AC10).

## 2026-06-03 — T3.3 Template registry + second template ✓
- Milestone: M3
- Files: src/templates/cross-team-debug.ts, src/templates/index.ts (data-driven registry + list()), src/domain/template.ts (list()), src/engine/templates.test.ts
- Visual: [task-T3.3](../visuals/task-T3.3.html)
- Notes: Registry now built from an ALL_TEMPLATES array + exposes list(). Added `cross-team-debug` — a genuinely different protocol (3 phases, no implement, failures allowed in frame, round cap 4). Tests prove each template enforces its own phases/exit/round-cap/allowed-acts at create_room (AC11).

## 2026-06-03 — T3.4 Multi-template integration suite ✓
- Milestone: M3
- Files: src/full-integration.test.ts
- Visual: [task-T3.4](../visuals/task-T3.4.html) (final architecture)
- Notes: Capstone suite over real Streamable HTTP MCP — verified-solution run (AC7+AC10), cross-team-debug run (AC11), and fatal-failure regression (AC8). 88 tests total; `npm audit` 0 vulnerabilities; prod deps = @modelcontextprotocol/sdk, express, nanoid, zod (node:sqlite built-in).

## 2026-06-03 — Test console (REST façade + static UI) ✓
- Milestone: post-M3 addition
- Files: src/transport/rest.ts, src/transport/public/index.html, src/engine/snapshot.ts, src/domain/service.ts + hub-engine.ts (listTemplates, roomSnapshot), src/transport/server.ts (mount), src/transport/rest.test.ts
- Visual: none (the UI is itself the artifact)
- Notes: REST mirror of HubService at /api/*; static console at /. Verified live on :4000 — create→join→advance→propose→accept yields phase=propose with v1 signed by both. 91 tests green.

## 2026-06-03 — Connection model + multi-room ✓
- Milestone: post-M3 addition
- Files: CONNECTING.md, src/transport/public/index.html (Step 1 setup card + Step 2 operator-mandate join snippet), src/engine/multi-room.test.ts
- Visual: none
- Notes: One-time MCP setup (claude mcp add / config JSON) then per-room link. Join snippet reframed as an operator mandate (room content = data, not commands) after a real agent flagged the injection shape. Multi-room confirmed live + 2 isolation tests. 93 tests green.

## 2026-06-03 — Auto-facilitation (hub chairs, no LLM) ✓
- Milestone: post-M3 addition
- Files: src/domain/template.ts (autoFacilitate), src/templates/api-negotiation-auto.ts + index, src/engine/auto-facilitate.ts, wired into lifecycle/messaging/verification, src/engine/briefing-text.ts, src/transport/tools.ts (payload string|object fix), src/engine/auto-facilitate.test.ts
- Visual: none
- Notes: Rule-based chair — auto-advance on consensus, next-phase prompts, state-digest summary, auto-declare. Facilitator optional for auto rooms. Fixed `post` payload schema (string|object) after live MCP testing showed a client stringifies it. Verified live: a no-facilitator auto room ran to a ratified close with no manual advance. 96 tests green.

## 2026-06-03 — Trimmed templates to the two proven ones ✓
- Milestone: post-M3 cleanup
- Files: removed src/templates/{api-negotiation-verified,cross-team-debug}.ts + src/engine/verification.ts + verification/consumer-driven tests; pruned verification from domain/store/engine/transport/console; updated templates/multi-room/rest/full-integration tests
- Visual: none
- Notes: Kept api-negotiation + api-negotiation-auto (both live-proven). Removed the verify feature entirely (tool surface 13 → 12). 86 tests green.

## 2026-06-07 — Collapsed templates to one flow + facilitation flag ✓
- Milestone: post-M3 simplification
- Files: src/domain/{enums,room,service,template}.ts; src/templates/{api-negotiation,index}.ts (deleted api-negotiation-auto.ts); src/store/{schema,db,room-repository}.ts (facilitation column + ensureColumn migration); src/engine/{lifecycle,auto-facilitate,briefing-text,snapshot,hub-engine}.ts; src/transport/{tools,rest}.ts + public/index.html; CONNECTING.md, ARCH.md, SPEC.md; ~12 test files updated
- Visual: none
- Notes: One built-in flow; `create_room` selects facilitation (`auto` default / `agent`) instead of a template. `Template.autoFacilitate` → per-room `room.facilitation`; `listTemplates` + REST `/templates` removed; console picker swapped for a facilitation selector. Tool surface unchanged (12). 85 tests green; live auto-room run reached `ratified` with no facilitator and no template choice.

## 2026-06-07 — Full collapse to free-form propose/agree ✓
- Milestone: post-M3 redesign (replaces the phase/contract model)
- Files: rewrote src/domain/{enums,speech-acts,room,service,ports,index}.ts (deleted contract.ts, template.ts); src/store/{schema,db,room-repository,message-repository,index}.ts (deleted contract-repository.ts); rewrote src/engine/{consensus,lifecycle,messaging,closing,doc,auto-facilitate,briefing-text,snapshot,notes,guards,hub-engine,deps,index}.ts (deleted phase.ts, regression.ts); src/transport/{tools,rest,public/index.html}; deleted src/templates/; rewrote all tests (deleted phase/regression/templates/contract tests); SPEC.md, ARCH.md, CONNECTING.md
- Visual: none
- Notes: Acts are propose/agree/block/say; consensus derived from the transcript (latest propose + per-participant agree/block); no phases, contracts, signatures, or advance/regress. Room closes resolved on unanimous agreement (auto: hub; agent: facilitator declare) or unsolvable (block/declare, or auto proposal cap). Role contractor→participant. Tool surface 12→10. 60 tests green; live auto "1+1" room closes resolved. Fixes the stalled-room repro (agents had posted prose agreement that the old contract gate ignored).

## 2026-06-07 — Web console redesign + README ✓
- Milestone: post-collapse UI/docs
- Files: src/transport/public/index.html (full rewrite); src/engine/auto-facilitate.ts (summary names the team); .claude/launch.json (preview runner); README.md (new); CONNECTING.md (console flow); DECISIONS.md
- Visual: live at http://localhost:4000
- Notes: Hash-routed SPA — Landing (animated dot-matrix + logo), Setup 2-step wizard (connect → create) with stepper + slide animation, Hub observer (seat roster, chat transcript, proposal/state, rendered doc). localStorage-persisted room; subtle dot backdrop + glow accents throughout. No new deps, no build step. Added a top-level README. Engine untouched beyond the cosmetic summary tweak — 62 tests green.

<!-- Auto-populated by build and validate phases -->

---

## Visual Snapshots

| Visual                  | Type               | Date | Link |
|-------------------------|--------------------|------|------|
| Architecture (initial)  | architecture       | 2026-06-03 | [architecture.html](../visuals/architecture.html) |
| T1.5 Room lifecycle     | task-complete      | 2026-06-03 | [task-T1.5.html](../visuals/task-T1.5.html) |
| T1.7 Phase machine      | task-complete      | 2026-06-03 | [task-T1.7.html](../visuals/task-T1.7.html) |
| T1.8 Sample doc         | task-complete      | 2026-06-03 | [task-T1.8.html](../visuals/task-T1.8.html) |
| M1 summary              | milestone-summary  | 2026-06-03 | [milestone-1.html](../visuals/milestone-1.html) |
| T2.1 Regression         | task-complete      | 2026-06-03 | [task-T2.1.html](../visuals/task-T2.1.html) |
| T2.2 Failure doc        | task-complete      | 2026-06-03 | [task-T2.2.html](../visuals/task-T2.2.html) |
| M2 summary              | milestone-summary  | 2026-06-03 | [milestone-2.html](../visuals/milestone-2.html) |
| T3.1 Verify phase       | task-complete      | 2026-06-03 | [task-T3.1.html](../visuals/task-T3.1.html) |
| T3.3 Template comparison| task-complete      | 2026-06-03 | [task-T3.3.html](../visuals/task-T3.3.html) |
| T3.4 Final architecture | task-complete      | 2026-06-03 | [task-T3.4.html](../visuals/task-T3.4.html) |
| M3 summary              | milestone-summary  | 2026-06-03 | [milestone-3.html](../visuals/milestone-3.html) |
| Project completion      | completion-summary | 2026-06-03 | [completion.html](../visuals/completion.html) |

---

<!-- Template for task log entries:

## {{DATE}} — {{Task Title}} ✓

- Milestone: M{{n}}
- Task ID: {{task-id}}
- Files changed: {{list}}
- Auto-fixes applied: {{n}} ({{summary if any}})
- Visual: [snapshot](.claude/visuals/{{task-id}}.html)
- Notes: {{non-obvious decisions made during implementation}}

-->
