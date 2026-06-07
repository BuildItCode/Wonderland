# Specification — Wonderland (Agent Collaboration Hub)
_Created: 2026-06-03 | Last updated: 2026-06-07_

---

## Intent

An in-house, **model-less MCP coordination hub**. Coding agents from different teams join an ephemeral, addressable **room** to converge on a solution to a task that spans their codebases — asynchronously. The hub holds no model and does no work: it tracks the **proposal** under discussion, enforces **unanimous agreement**, and persists state. A room is either **hub-chaired** (`auto` — the hub closes it itself, rule-based, no LLM) or **agent-chaired** (`agent` — a neutral facilitator agent declares the outcome). The output is a resolved solution (or an unsolvable report) plus a decision document.

---

## User Stories

- As a **convener** (tech lead / architect, human or agent), I want to create a room from a task description (choosing whether the hub or a facilitator agent chairs it) and receive shareable role-links, so that I can pull the right agents into a shared workspace.
- As a **participant agent**, I want a pre-join briefing (task, attendees + their teams, procedure, my role) so that I can gather what I need from my codebase **before** joining.
- As a **participant agent**, I want to discuss with `say`, put a candidate solution forward with `propose` (plain text), and register my stance with `agree`/`block`, so that we converge on a solution every party accepts.
- As a **facilitator agent** (agent-chaired rooms), I want to keep a living summary and declare the outcome, so that the room closes only on unanimous agreement and produces a doc.
- As a **convener**, I want an **auto** mode where the hub itself closes the room the instant every participant agrees, so that no facilitator agent is required.
- As a **participant whose session died**, I want to rejoin via my link as the same identity and catch up via `my_state` + summary, so that async work survives interruption.
- As **any party**, I want a doc on close — resolved or unsolvable — capturing the agreed solution, decisions, and blockers, so that humans have a record and clear next actions.

---

## Acceptance Criteria

- [ ] **AC1** `create_room` returns a room id, an addressable room URL, and one role-link per party (the facilitator party is optional in `auto` mode, required in `agent` mode).
- [ ] **AC2** `resolve_link` (pre-join) returns the briefing (task, facilitation, procedure, role, attendees + teams) and grants **no** write access.
- [ ] **AC3** `join` binds a stable identity to a role-link; reusing the same link returns the **same** participant id.
- [ ] **AC4** `post` accepts the four acts (`say`/`propose`/`agree`/`block`); the latest `propose` is the current proposal, and a new `propose` resets every participant's stance.
- [ ] **AC5** A room is **resolved only** when every participant has `agree`d to the current proposal; an outstanding `block` or a missing agreement prevents resolution. In `agent` mode only the facilitator may `declare`.
- [ ] **AC6** The living summary is readable by late joiners; `my_state` returns a participant's own messages, their stance on the proposal, and presence status in one call.
- [ ] **AC7** A full run (create → discuss → propose → unanimous agree → resolved), in both `auto` and `agent` modes, produces a finalized doc containing the agreed solution and a per-party sign-off.
- [ ] **AC8** A room can close `unsolvable` — a facilitator `declare("unsolvable")`, or in `auto` mode exceeding the proposal cap — yielding an `unsolvable` outcome + a doc capturing the blockers.
- [ ] **AC9** A participant can disconnect mid-room and a fresh client using the same link resumes the same identity and reconstructs state — surviving a hub process restart (SQLite-persisted).
- [ ] **AC10** Facilitation is per-room: `auto` closes the room (resolved/unsolvable) with no facilitator agent; `agent` leaves closing to a facilitator's `declare`. Both honour the unanimous-agreement gate.
- [ ] **AC11** ~~At least two templates exist with distinct phase/exit configuration, selectable at `create_room`.~~ **Superseded** (see DECISIONS 2026-06-07): collapsed to a single built-in flow; `create_room` instead selects a **facilitation mode**.
- [ ] **AC12** Closing a room (`resolved` or `unsolvable`) invalidates all role-links for further action and emits the doc (which stays readable).

---

## Out of Scope

- Cross-organization trust, auth, secret isolation, exfiltration controls — **in-house single-trust-domain** assumption (the agent already reads the codebase).
- The hub running any LLM/model itself — facilitator and contractors are **external** MCP agents.
- Real-time / synchronous voice or video — interaction is **async**.
- Building the contractor or facilitator agents — any MCP-capable client works; we ship role-link briefings + role prompts, not models.
- Rich web UI / dashboard beyond a minimal read-only doc view.
- Production multi-tenant hardening, rate limiting, horizontal scaling.
- Non-MCP transports.

---

## Open Questions

> Questions that arose during planning and need resolution before or during build.
> Remove entries once resolved; log the resolution in DECISIONS.md.

- [ ] Room addressing: true wildcard subdomains vs. path-based `/{roomId}` behind one host. v1 leans path-based; subdomain is a cosmetic layer later.
- [ ] Does v1 actively target 3+ contractors, or keep an N-capable data model but only exercise 2-party scenarios?
- [ ] Where the facilitator role prompt / procedure spec is packaged — embedded in the briefing payload, or fetched separately.
