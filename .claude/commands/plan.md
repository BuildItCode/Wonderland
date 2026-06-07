# /plan — Enter Planning Phase

Read `.agents/contracts/` (all files, if they exist).
Read `.agents/skills/plan/SKILL.md`.
Follow the plan phase instructions exactly.

Context: $ARGUMENTS

If $ARGUMENTS is empty and no contracts exist → start fresh project interview.
If $ARGUMENTS is empty and contracts exist → present current plan summary and ask what to change.
If $ARGUMENTS contains a change request → diff against existing contracts, surface conflicts first.
