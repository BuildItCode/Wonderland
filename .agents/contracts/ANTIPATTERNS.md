# Anti-Patterns — {{PROJECT_NAME}}
_Created: {{DATE}}_

> Populated automatically during build and validate phases.
> Each entry represents a real failure that occurred in this project.
> Subagents read this file before every task to avoid repeating mistakes.

---

## Categories

### Architecture Violations
<!-- Interface mismatches, forbidden imports, unapproved dependencies -->

### Scope Creep
<!-- Features added beyond current task definition -->

### Implementation Patterns to Avoid
<!-- Code patterns that caused failures, tech-specific gotchas -->

### Ambiguities That Caused Failures
<!-- Requirements that were unclear and led to wrong implementation -->

---

<!-- Template for auto-generated entries:

## {{DATE}} — {{Violation Title}}

- Task: {{task id}}
- Check: {{which validation check caught this}}
- Found: {{what was in the code}}
- Contract says: {{what the contract required}}
- Impact: {{what broke or needed to change}}
- Resolution: {{what was done to fix it}}

-->
