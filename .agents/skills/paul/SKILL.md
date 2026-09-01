---
name: paul
description: Plan-Apply-Unify Loop (PAUL) structured AI development framework. Use when user invokes /paul commands (/paul:init, /paul:plan, /paul:apply, /paul:unify, /paul:status, /paul:help, etc.) or requests PAUL workflow execution.
---

# PAUL (Plan-Apply-Unify Loop) Framework Skill

This skill enables full support for the **PAUL** framework within Antigravity.

## Core Philosophy
Every unit of engineering work follows the 3-step loop:
1. **PLAN** (`/paul:plan`) — Define requirements, scope work units, specify success criteria.
2. **APPLY** (`/paul:apply`) — Execute tasks, write code, run verification.
3. **UNIFY** (`/paul:unify`) — Reconcile project state, update roadmap, generate summary. Never skip UNIFY.

## Reference Locations
- Framework Workflows: `C:\Users\ASUS\.claude\paul-framework\workflows\`
- Framework Rules: `C:\Users\ASUS\.claude\paul-framework\rules\`
- Framework Templates: `C:\Users\ASUS\.claude\paul-framework\templates\`
- Commands Reference: `C:\Users\ASUS\.claude\commands\paul\`

## Project State
Project PAUL files live inside `.paul/`:
- `.paul/PROJECT.md` — High-level vision, core value, architecture overview.
- `.paul/STATE.md` — Current loop position, active phase, milestones.
- `.paul/ROADMAP.md` — Planned phases, features, and task items.
- `.paul/plans/` — Individual phase execution plans.
- `.paul/summaries/` — Phase completion summaries.

## Supported Commands & Handlers
When the user types any `/paul:<command>`:
- `/paul:init` — Initialize `.paul/` directory and populate PROJECT.md, STATE.md, ROADMAP.md.
- `/paul:plan` — Enter PLAN phase for next roadmap milestone or quick change.
- `/paul:apply` — Execute tasks in current plan, running quality gates and verification.
- `/paul:unify` — Reconcile state, update ROADMAP.md, generate summary.
- `/paul:status` — Read `.paul/STATE.md` and `.paul/ROADMAP.md` and display active state.
- `/paul:progress` — Show overall completion metric and milestone status.
- `/paul:help` — Output full PAUL command reference.
