# /build — Enter Build Phase

Read `.agents/contracts/` (all files).
Read `.agents/skills/build/SKILL.md`.
Detect platform from ARCH.md and read `.agents/skills/quality/SKILL.md`
and `.agents/skills/quality/platforms/{platform}/SKILL.md`.
Follow the build phase instructions exactly.

Context: $ARGUMENTS

If $ARGUMENTS specifies a task ID → start from that task.
If $ARGUMENTS is empty → start from the first pending task in TASKS.md.

Pre-build checklist must pass before any code is written.
After each subtask, call /validate automatically.
After each milestone, pause and ask the user before continuing.
