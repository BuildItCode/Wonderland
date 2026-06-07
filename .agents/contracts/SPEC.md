# Specification — Wonderland (Agent Collaboration Hub)
_Created: 2026-06-03 | Last updated: 2026-06-03_

---

## Intent

An in-house, **model-less MCP coordination hub**. Multiple coding agents (contractors) plus one neutral facilitator agent join an ephemeral, addressable **room** to negotiate and solve a task that spans different codebases — asynchronously. The hub holds no model and does no work; it runs the phase state machine, enforces a consensus gate, and persists state. The output is a consensus-ratified (optionally verified) contract plus a decision document.

---

## User Stories

- As a **convener** (tech lead / architect, human or agent), I want to create a room from a task description and a template and receive shareable role-links, so that I can pull the right agents into a structured negotiation.
- As a **contractor agent**, I want a pre-join briefing (task, attendees + their teams, procedure, my role) so that I can gather what I need from my codebase **before** joining.
- As a **contractor agent**, I want to exchange typed speech acts (`inform`/`propose`/`accept`/`reject`/`request`/`failure`) and publish a capability manifest and results, so that we converge on an agreed contract.
- As a **facilitator agent**, I want to run the phase machine, keep a living summary, and enforce the consensus gate, so that the room advances only on unanimous sign-off and produces a doc.
- As a **contractor whose session died**, I want to rejoin via my link as the same identity and catch up via `my_state` + summary, so that async work survives interruption.
- As **any party**, I want a verification phase where we agree a shared test and both sides pass before ratify, so that "done" means a working integration, not just a plan.
- As **any party**, I want a doc on close — success or unsolvable — capturing decisions and blockers, so that humans have a record and clear next actions.

---

## Acceptance Criteria

- [ ] **AC1** `create_room` returns a room id, an addressable room URL, and one facilitator + N contractor role-links.
- [ ] **AC2** `resolve_link` (pre-join) returns the briefing (task, template/procedure, role, attendees + teams) and grants **no** write access.
- [ ] **AC3** `join` binds a stable identity to a role-link; reusing the same link returns the **same** participant id.
- [ ] **AC4** `post` rejects any speech act not allowed in the current phase.
- [ ] **AC5** The advance gate fires **only** when every contractor has signed (accepted) the current contract version; otherwise the phase does not advance. Only the facilitator may advance.
- [ ] **AC6** The facilitator-maintained living summary is readable by late joiners; `my_state` returns a contractor's own messages, signature status, presence status, and assigned tasks in one call.
- [ ] **AC7** A full `api-negotiation` run (create → frame → propose → implement → ratify) between two simulated contractor clients + a facilitator produces a finalized doc containing the agreed contract and a per-party task split.
- [ ] **AC8** A `failure` act in `implement` regresses the room to `propose`, mints a new contract version requiring re-signature, and is bounded by the template round cap; exceeding the cap yields an `unsolvable` outcome + doc.
- [ ] **AC9** A contractor can disconnect mid-room and a fresh client using the same link resumes the same identity and reconstructs state — surviving a hub process restart (SQLite-persisted).
- [ ] **AC10** With `exit = verified-solution`, the room requires an agreed shared test artifact and a pass signal from **every** contractor before ratify.
- [ ] **AC11** At least two templates exist with distinct phase/exit configuration, selectable at `create_room`.
- [ ] **AC12** Closing a room (`done` or `unsolvable`) invalidates all role-links and emits the doc.

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
