# /visualize — Render Visual Milestone

Read `.agents/contracts/ARCH.md` and `.agents/contracts/PROGRESS.md`.
Read `.agents/skills/visualize/SKILL.md`.
Detect platform from ARCH.md Tech Decisions.
Follow the visualisation instructions for the detected platform.

Context: $ARGUMENTS

Render type:
- `arch` or `architecture` → type=architecture
- `milestone`              → type=milestone-summary
- `complete`               → type=completion-summary
- task ID                  → type=task-complete
- empty                    → infer from current build state

Save output to `.agents/visuals/` and print the file path.
