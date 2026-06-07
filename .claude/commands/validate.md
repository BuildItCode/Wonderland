# /validate — Run Validation

Read `.agents/contracts/` (all files).
Read `.agents/skills/validate/SKILL.md`.
Detect platform from ARCH.md and read `.agents/skills/quality/SKILL.md`
and `.agents/skills/quality/platforms/{platform}/SKILL.md`.
Follow the validation pipeline exactly.

Context: $ARGUMENTS

Mode:
- `full`      → full project validation
- `milestone` → milestone-scoped validation
- task ID     → single task validation
- empty       → infer from current build state

After validation, call /visualize with the appropriate render type.
