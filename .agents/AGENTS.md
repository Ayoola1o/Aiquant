# Development Workflow Rules

## Enforcing the PAUL Framework
All non-trivial feature implementations, bug fixes, or structural refactorings MUST follow the Plan-Apply-Unify Loop:
1. Check `.paul/STATE.md` and `.paul/ROADMAP.md` before starting work.
2. Formulate a plan in `.paul/plans/` or via `/paul:plan`.
3. Execute code changes and verify via `/paul:apply`.
4. Always run `/paul:unify` to update project state and summaries before completing the session.
