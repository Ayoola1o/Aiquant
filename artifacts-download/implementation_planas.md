# Master Product Roadmap & Implementation Plan: AI Quant Operating System (AIQOS)

> Comprehensive synthesis based on core system architecture, `beta-testing-phase-1.md`, `Alpha-testing-phase`, and institutional UI workspace guidelines.

---

## Strategic Vision & Release Roadmap

Instead of a collection of web pages, Aiquant is structured as an **Institutional AI Quant Operating System (AIQOS)**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               AI QUANT OPERATING SYSTEM (AIQOS)                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                 UNIFIED WORKSPACE MANAGER                                   │
│  [Mission Control] [AI Quant Lab] [Research Lab] [Strategy Studio] [Backtest] [Paper/Live]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                   SHARED SERVICE LAYER                                      │
│  ┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────┐  │
│  │ Multi-Agent Team │ │ Feature Engine  │ │ Strategy Engine  │ │  Broker & Risk Engine   │  │
│  │ (Debate/Memory)  │ │ (Technical/Vol) │ │ (DSL & Registry) │ │ (Slippage/Circuit Bkr)  │  │
│  └──────────────────┘ └─────────────────┘ └──────────────────┘ └─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Data Lake (OHLCV, Funding, OI, Macro, AI Memory)              │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Release Milestones

| Milestone | Scope & Objectives | Focus |
|---|---|---|
| **Phase 1 (v1.5)** | **Core Engine & Infrastructure** — Feature Engine, Backtest Realism (Slippage/Spread/Partial fills), Strategy Registry, Experiment Tracker, Market Data Expansion, Async Monte Carlo. | Backend & Core Research |
| **Phase 2 (v2.0)** | **Institutional AI Quant OS UI** — 10 Integrated Workspaces, Dockable Layouts, Multi-Agent Debate Panel, Feature Inspector, Research Notebook, Decision Timeline, Agent Memory System, Institutional Design System. | Institutional UX & AIOS |
| **Phase 3 (v3.0)** | **Institutional-Grade Scaling** — Multi-monitor window detachment, Plugin ecosystem, Distributed backtesting, Multi-account broker orchestration, Team collaboration. | Enterprise Scale |

---

## Phase 1 (v1.5): Engine Foundation & Research Infrastructure

### 1. Modular Feature Engine (`backend/feature_engine/`)
- `technical.py`: VWAP, ADX, CCI, Stochastic %K/%D, Williams %R, Aroon, Ichimoku Cloud (Tenkan/Kijun/Senkou), DEMA, TEMA, Hull MA, Keltner Channels.
- `volatility.py`: Historical Volatility (20/60-day), Realized Variance, Parkinson Estimator, Yang-Zhang Estimator, Z-score of Volatility.
- `momentum.py`: Rate of Change (ROC), PPO (Percentage Price Oscillator), TSI (True Strength Index), Coppock Curve, Detrended Price Oscillator (DPO).
- `volume.py`: OBV (On-Balance Volume), MFI (Money Flow Index), Chaikin Money Flow, Volume Profile, Accumulation/Distribution Line, Force Index.
- `market_structure.py`: Swing High/Low detection, Higher-High/Lower-Low structure flags, Support/Resistance zones, Pivot Points (Classic, Camarilla, Fibonacci).
- `statistical.py`: Rolling Z-score, Percentile rank, Entropy, Autocorrelation, Hurst Exponent, ADF stationarity flag.
- `engine.py`: Unified `FeatureEngine.calculate(df, features=[...])` dispatch.

### 2. High-Fidelity Backtesting & Execution Simulator
- **`SlippageModel`**: Configurable spread, slippage tolerance, liquidity limits, and maker/taker fee structures in [`backtest_engine.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/backtest_engine.py).
- **Exact Trade Excursion**: Real candle-level MFE (Maximum Favorable Excursion) and MAE (Maximum Adverse Excursion) calculated throughout position lifecycle.
- **Extended Institutional Metrics**: Sharpe, Sortino, Calmar, Omega Ratio, Profit Factor, Expectancy, Payoff Ratio, Recovery Factor, Kelly Criterion.
- **Async Monte Carlo Engine**: `POST /api/backtest/montecarlo` running N=1,000 to N=10,000 paths in [`backend/montecarlo.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/montecarlo.py) (5th, 25th, 50th, 75th, 95th percentile equity curves, ruin probability).

### 3. Strategy Registry & Experiment Tracker
- **Database Schemas** in [`database.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/database.py):
  - `strategies`: Strategy metadata, DSL code, tags, performance stats, versioning, and lifecycle promotion stage (`Draft` ──> `Research` ──> `Backtested` ──> `Paper` ──> `Approved` ──> `Live` ──> `Archived`).
  - `experiments`: Logs of every backtest run (prompt, model, params, dataset, KPIs, AI notes).
- **REST Endpoints** in [`main.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/main.py):
  - `/api/strategies`: Full CRUD + `/api/strategies/{id}/promote`.
  - `/api/experiments`: Query filters + notes editor.

### 4. Market Data Expansion (`backend/market_data.py`)
- Live connectors for Funding Rates (Binance), Open Interest (Binance), Fear & Greed Index (Alternative.me API), Macro Indicators (`^VIX`, `DX-Y.NYB`, `^TNX`).

---

## Phase 2 (v2.0): Institutional AI Quant OS Frontend & Workspaces

### 1. Institutional Design System & UX Language
- **8px Spacing Grid** & Ergonomic Compact Density.
- **Color Tokens**: Obsidian background (`#090A0F`), Slate surfaces (`#12151E`), Neon Accents (Cyan `#00F0FF`, Emerald `#00FF9D`, Crimson `#FF2E63`, Gold `#FFB800`).
- **Typography & Motion**: Inter & JetBrains Mono fonts with micro-animations, glassmorphism layers, and status glowing pulse indicators.
- **Unified Command Palette**: `Ctrl + K` fast launcher for strategies, assets, workspaces, and AI agents.

### 2. Dockable Workspace Manager & 10 Core Workspaces
Full workspace environment with draggable/dockable panels and layout persistence:
1. **Dashboard (Mission Control)**: Global market status, AI system health, active backtest queue, latency telemetry, risk alerts, top opportunities.
2. **AI Quant Lab (Main Workspace)**: TradingView interactive chart, Multi-Agent Debate window, Decision Confidence meter, Watchlist, Order Book, Trades, Feature Inspector console.
3. **Research Lab & Interactive Notebook**: Hypothesis generator, dataset explorer, feature builder, markdown/Python hybrid research canvas.
4. **Strategy Studio**: Visual strategy node/condition editor + code mirror with live AI strategy coach code reviews.
5. **Backtesting Laboratory**: Equity curve, drawdown underwater, rolling Sharpe, monthly returns heatmap, trade distribution histogram, Monte Carlo fan chart.
6. **Paper Trading Command Center**: Execution simulator, live paper charts, order book, simulated fill logs, active position risk guardrails.
7. **Live Trading Terminal**: Multi-broker execution console (Binance, Alpaca, Hyperliquid), DOM, Time & Sales, Emergency Panic Stop.
8. **Portfolio Manager**: Portfolio allocation pie, correlation matrix, asset exposure heatmaps, rebalancing wizard.
9. **Analytics & Intelligence Center**: Performance attribution, KPI cards, weakness detector, predictive analytics summary.
10. **AI Command Center**: Multi-agent agent status, debate window, agent memory logs, task queue, resource utilization.

### 3. Signature Features

#### A. Feature Inspector
Hover or click any candle to open the Feature Inspector overlay showing exact computed metrics for that timestamp:
```
Candle: 2026-08-03 14:00 UTC | Close: $64,250
├─ Technicals: RSI (24.2), ADX (41.5), ATR ($420), VWAP ($63,980)
├─ Volume: OBV (+14.2M), MFI (22.1), Vol Profile (High Node)
├─ Market Intel: Funding (+0.012%), OI (+$450M), Fear & Greed (28 - Fear)
└─ AI Insight: "RSI oversold + VWAP bounce + rising OI indicates high-probability long setup."
```

#### B. Multi-Agent AI Debate Team
Specialized agent team (`Fundamental`, `Technical`, `Sentiment`, `Risk`, `Moderator`) debating every trading proposal:
```
[Bull Agent]: "EMA 20 crossed EMA 50 on 1H chart with high volume."
[Bear Agent]: "Funding rate is overextended; macro CPI release in 2 hours."
[Risk Agent]: "Max drawdown limit permits 1.5% position size."
[Moderator Agent]: "APPROVED - Direction: BUY, Size: 1.5%, Stop Loss: $63,100, Take Profit: $66,800."
```

#### C. Decision Timeline & AI Memory
- Every trade logs a permanent decision trail: `Signal` ──> `AI Debate` ──> `Risk Gate` ──> `Execution` ──> `Post-Trade AI Review`.
- AI memory module maintains persistent context across research sessions (remembers past hypotheses, failed backtests, and user preferences).

#### D. Interactive Research Notebook
Integrated Markdown + Python + Chart research canvas allowing users to document quantitative experiments, save snapshots, and export reports.

---

## Phase 3 (v3.0): Institutional Grade Scaling & Execution

- **Multi-Monitor Detachment**: Detach individual charts and workspaces to independent browser windows.
- **Plugin System**: Custom indicator and external broker plugin interface.
- **Live Broker Orchestration**: Multi-account execution across Binance, Alpaca, Hyperliquid, MT5, and Interactive Brokers.
- **Distributed Backtesting**: Task queue execution for multi-parameter grid searches across multiple cores/workers.

---

## Immediate Next Steps (Implementation Order)

1. **Step 1 (Phase 1 Engine)**: Implement `feature_engine/`, `backtest_engine.py` (slippage + extended metrics), `montecarlo.py`, `market_data.py`, and `database.py` schema updates.
2. **Step 2 (Phase 1 API)**: Wire `/api/strategies`, `/api/experiments`, `/api/backtest/montecarlo`, and `/api/market/*` in `main.py`.
3. **Step 3 (Phase 2 UI Architecture)**: Build the Institutional Design System CSS tokens + Workspace Layout Manager.
4. **Step 4 (Phase 2 Workspaces)**: Implement Mission Control, AI Quant Lab (with Feature Inspector & AI Debate), Backtesting Lab, and Strategy Studio.
