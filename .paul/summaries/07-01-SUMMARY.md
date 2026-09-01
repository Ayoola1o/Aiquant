---
phase: 07-per-bot-daily-pnl-tracking
plan: 01
plan_type: execute
status: completed
date: "2026-08-05"
files_modified:
  - backend/trading_engine.py
  - backend/main.py
  - frontend/src/components/LiveSession.tsx
  - .paul/STATE.md
  - .paul/ROADMAP.md
---

# 07-01 Summary: Per-Bot Daily PnL Tracking & Date-Categorized Analytics

## What Was Accomplished
- **Date-Categorized Daily PnL Store (`trading_engine.py`)**: Added `daily_pnl_store` dictionary to `TradingBot` mapping calendar dates (`YYYY-MM-DD`) to realized PnL, trade counts, wins, and win rates.
- **Bot State Snapshot Stream (`trading_engine.py` & `main.py`)**: Included `daily_pnl_today`, `daily_pnl_by_date`, and `daily_pnl_list` in bot state API responses and WebSocket updates.
- **Frontend Daily PnL Breakdown Table (`LiveSession.tsx`)**: Added a **Today's P&L** KPI card tile and a **Daily P&L Breakdown by Date** interactive table for each active strategy bot, allowing users to distinguish performance across calendar days.

## Acceptance Criteria Results
- [x] `TradingBot` tracks realized PnL by date (`YYYY-MM-DD`) on every trade execution in `backend/trading_engine.py`
- [x] `TradingBot.get_state()` returns `daily_pnl_today`, `daily_pnl_by_date`, and `daily_pnl_list`
- [x] Update `/api/bots/{bot_id}/state` and WebSocket payloads in `backend/main.py`
- [x] Add Daily PnL Date Breakdown UI table/cards in `LiveSession.tsx`
- [x] Automated verification test passes with 100% success rate

## Decisions & Deviations
- None. Implementation completed strictly as requested by user.

## Next Steps
- Phase 7 complete! Milestone 3 active phase ready for Phase 8: Production Containerization & Cloud Deployment Infrastructure.
