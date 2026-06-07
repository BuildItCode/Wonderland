# Tasks — Wonderland (Agent Collaboration Hub)
_Created: 2026-06-03 | Last updated: 2026-06-03_

---

## Status Key

| Symbol | Meaning     |
|--------|-------------|
| `[ ]`  | Pending     |
| `[~]`  | In progress |
| `[x]`  | Done        |
| `[!]`  | Blocked     |

---

## Milestones

### M1 — Negotiation Skeleton

> End-to-end happy path: one `api-negotiation` room from create → ratified-contract → doc. Linear phases, consensus gate, single hard-coded template. No regression, no verification.

- [x] **T1.1**: Project scaffold
  - Subtasks: TS config, folder layout (`domain` / `store` / `engine` / `templates` / `transport`), vitest, eslint + prettier, tsx dev script
  - Owner: `agent`
  - Validate: `tsc` clean, `vitest` runs, lint clean
  - Visual: none

- [x] **T1.2**: Domain model + zod schemas
  - Subtasks: SpeechActType, Phase, Presence, Briefing, Message, ContractVersion, MyState; zod validators for every speech-act payload
  - Owner: `agent`
  - Validate: schema unit tests accept valid acts and reject malformed ones (AC4 foundation)
  - Visual: none

- [x] **T1.3**: SQLite store + repositories
  - Subtasks: schema + repos for rooms, participants, messages, contract versions, signatures, summary
  - Owner: `agent`
  - Validate: repository round-trip tests persist then restore each entity
  - Visual: none

- [x] **T1.4**: MCP server + Streamable HTTP transport
  - Subtasks: Express host, per-room routing, register tool surface, tool → engine dispatch
  - Owner: `agent`
  - Validate: an MCP client connects to a room endpoint and lists the tools
  - Visual: none

- [x] **T1.5**: Room lifecycle + identity/links
  - Subtasks: `create_room` (mint facilitator + N contractor links, room id, url), `resolve_link` (read-only briefing), `join` (bind stable id, link→id)
  - Owner: `agent`
  - Validate: create→resolve returns briefing with no write (AC2); join binds id and reusing link returns same id (AC1, AC3)
  - Visual: room-lifecycle

- [x] **T1.6**: Typed message log + presence
  - Subtasks: `post` (append-only), `set_status`, `read_room(since)`, capability manifest as `inform`
  - Owner: `agent`
  - Validate: act not allowed in current phase is rejected (AC4); `read_room(since)` returns only the delta
  - Visual: none

- [x] **T1.7**: Phase engine (linear) + consensus gate
  - Subtasks: phases `frame→propose→implement→ratify`, allowed-acts per phase, facilitator-only `advance_phase`, gate = all contractors signed current version
  - Owner: `agent`
  - Validate: advance blocked until unanimous signature, returns missing parties (AC5); non-facilitator advance rejected
  - Visual: phase-machine

- [x] **T1.8**: Facilitator living summary + finalized doc
  - Subtasks: `update_summary` per phase, `declare(ratified)` finalizes doc (summary + agreed contract + per-party task split), close invalidates links
  - Owner: `agent`
  - Validate: full 2-contractor + facilitator `api-negotiation` run yields a doc with contract + task split (AC7, AC12)
  - Visual: sample-doc

---

### M2 — Async Robustness

> Survive the real async world: renegotiation, deadlock, dead sessions, restarts.

- [x] **T2.1**: Phase regression + round cap
  - Subtasks: `regress_phase` (implement→propose) on `failure`, new contract version requires re-signature, `round_cap` from template
  - Owner: `agent`
  - Validate: failure in implement regresses + forces re-sign; exceeding round cap routes to unsolvable (AC8)
  - Visual: phase-machine-regression

- [x] **T2.2**: Unsolvable outcome + failure doc
  - Subtasks: `declare(unsolvable)` emits doc with decisions + blockers + human next-actions, invalidate links
  - Owner: `agent`
  - Validate: an unsolvable run produces a failure doc that captures the blocker (AC8, AC12)
  - Visual: failure-doc

- [x] **T2.3**: Cross-session resumability
  - Subtasks: stable link→id across reconnect, `my_state` catch-up view, checkpoint discipline (results persisted as `inform`)
  - Owner: `agent`
  - Validate: contractor disconnects mid-room; fresh client with same link resumes same id and `my_state` reconstructs (AC6, AC9)
  - Visual: none

- [x] **T2.4**: Persistence hardening
  - Subtasks: full room state (messages, versions, signatures, summary, phase) reloads from SQLite on boot
  - Owner: `agent`
  - Validate: kill + restart hub mid-room; room resumes at the same phase and state (AC9)
  - Visual: none

---

### M3 — Verification & Protocols-as-Product

> "Done" can mean a verified working integration; the hub ships more than one protocol.

- [x] **T3.1**: Verification phase + verified-solution exit
  - Subtasks: `verify` phase, shared test artifact in room, per-contractor pass signal, ratify blocked until all pass
  - Owner: `agent`
  - Validate: a `verified-solution` run blocks ratify until every contractor posts pass on the agreed artifact (AC10)
  - Visual: phase-machine-verify

- [x] **T3.2**: Consumer-driven contract negotiation
  - Subtasks: consumer declares expectation, provider signs + verifies, the shared test is itself a consensus-gated contract artifact
  - Owner: `agent`
  - Validate: a provider-only test does not satisfy the gate; both parties must sign the test (AC5, AC10)
  - Visual: none

- [x] **T3.3**: Template registry + second template
  - Subtasks: data-driven phases/exit/round_cap/allowed-acts; `api-negotiation` + a second template (e.g. `cross-team-debug`); selectable at `create_room`
  - Owner: `agent`
  - Validate: creating a room with each template enforces its own phase/exit config (AC11)
  - Visual: template-comparison

- [x] **T3.4**: End-to-end multi-template integration suite
  - Subtasks: integration test exercising both templates incl. verification + regression paths
  - Owner: `agent`
  - Validate: integration suite green across both templates (AC7, AC8, AC10, AC11)
  - Visual: final-architecture

---

## Blocked

> Tasks suspended due to contract violations. Do not resume until plan phase resolves.

_None_
