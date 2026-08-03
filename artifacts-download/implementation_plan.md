# Beta Phase 1: Quant Research Platform — Implementation Plan

## Overview

Transform Aiquant from a backtester + live trader into a complete **Quant Research Workbench** as described in `beta-testing-phase-1.md`. We focus exclusively on Phase 1 (Research Platform → 100%) since the live trading engine is already solid.

The plan is additive — nothing existing is broken or removed.

---

## What We're Building

### Backend (6 additions)
1. **Feature Engine** — modular indicator library beyond current 6 indicators
2. **Backtest Realism** — slippage, spread, and partial fill simulation
3. **Extended Backtest Metrics** — rolling Sharpe, monthly returns heatmap, profit factor, expectancy, Monte Carlo
4. **Strategy Registry** — strategy profiles with versioning, tags, performance history (DB + API)
5. **Experiment Tracker** — save every backtest run with prompt, model, params, results (DB + API)
6. **Market Data Expansion** — funding rates, open interest, Fear & Greed, economic calendar fetchers

### Frontend (3 additions)
1. **Enhanced Backtester charts** — rolling Sharpe, monthly heatmap, trade distribution, exposure chart
2. **Strategy Library page** — strategy profile cards with version history
3. **Experiment History page** — searchable experiment log with AI notes

---

## User Review Required

> [!IMPORTANT]
> The plan adds ~4 new API routes and 2 new DB tables. The existing backtest route `/api/backtest` gets slippage parameters added (backward-compatible optional fields).

> [!WARNING]
> Monte Carlo simulation runs N=1000 paths by default. For very long backtests (>5 years daily), this may take 3-5 seconds server-side. We can add it as a separate async endpoint `/api/backtest/montecarlo` if you prefer.

## Open Questions

> [!IMPORTANT]
> **Slippage model**: Do you want slippage ON by default (conservative, more realistic) or OFF by default (opt-in)? Suggested default: **0.05% slippage + half-spread**, configurable via UI.

> [!IMPORTANT]
> **Feature Engine scope for Phase 1**: The document lists 8 feature modules (technical, volatility, momentum, volume, market_structure, statistical, onchain, sentiment). For Phase 1 we propose implementing the first 5 (technical, volatility, momentum, volume, market_structure) and onchain/sentiment as Phase 2 stubs. Agree?

---

## Proposed Changes

---

### Backend — Feature Engine

#### [NEW] `backend/feature_engine/__init__.py`
Empty init to make it a package.

#### [NEW] `backend/feature_engine/technical.py`
Extended technical indicators beyond current SMA/EMA/RSI/MACD/BB/ATR:
- VWAP, ADX, CCI, Stochastic %K/%D, Williams %R, Aroon, Ichimoku Cloud (Tenkan/Kijun/Senkou), DEMA, TEMA, Hull MA, Keltner Channels

#### [NEW] `backend/feature_engine/volatility.py`
- Historical volatility (20/60-day), Realized variance, Parkinson estimator, Yang-Zhang estimator, Z-score of volatility

#### [NEW] `backend/feature_engine/momentum.py`
- Rate of Change (ROC), PPO (Percentage Price Oscillator), TSI (True Strength Index), Coppock Curve, DPO (Detrended Price Oscillator), momentum divergence flags

#### [NEW] `backend/feature_engine/volume.py`
- OBV (On-Balance Volume), VWAP, MFI (Money Flow Index), Chaikin Money Flow, Volume Profile, Accumulation/Distribution Line, Force Index

#### [NEW] `backend/feature_engine/market_structure.py`
- Swing High/Low detection, Higher-High/Lower-Low structure flags, Support/Resistance zones, Pivot Points (Classic, Camarilla, Fibonacci)

#### [NEW] `backend/feature_engine/statistical.py`
- Z-Score, rolling percentile rank, entropy, autocorrelation, Hurst exponent, ADF stationarity test flag, regime detection (HMM-lite using rolling stats)

#### [NEW] `backend/feature_engine/engine.py`
`FeatureEngine` class — takes a DataFrame, returns enriched DataFrame with all requested features. Strategies call `FeatureEngine.calculate(df, features=["ATR", "VWAP", "OBV", ...])`.

---

### Backend — Enhanced Backtest Engine

#### [MODIFY] [`backtest_engine.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/backtest_engine.py)

Add `SlippageModel` and `FillModel` classes before `run_historical_backtest`:

```python
class SlippageModel:
    def __init__(self, slippage_pct=0.0005, spread_pct=0.0002):
        ...
    def get_fill_price(self, close, action, volume=None) -> float:
        # BUY fills at close*(1+slippage+half_spread)
        # SELL fills at close*(1-slippage-half_spread)
```

Add new parameters to `run_historical_backtest()`:
- `slippage_pct: float = 0.0005` — default 0.05%  
- `spread_pct: float = 0.0002` — default 0.02%

All `BUY`/`SELL` fills use `SlippageModel.get_fill_price()` instead of raw `close`.

Add MFE/MAE proper tracking (currently using `np.random.uniform` — replace with actual candle-level high/low tracking during trade lifetime).

---

### Backend — Extended Metrics

#### [MODIFY] [`backtest_engine.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/backtest_engine.py) — metrics section (lines 507+)

Add to returned `kpis`:
- `profit_factor`: gross_profit / abs(gross_loss)
- `recovery_factor`: total_return / max_drawdown
- `payoff_ratio`: avg_win / abs(avg_loss)
- `exposure_pct`: % of candles with an open position
- `avg_bars_in_trade`: average trade duration in candles

Add to returned `data`:
- `monthly_returns`: list of `{month: "YYYY-MM", return_pct: float}` — for calendar heatmap
- `rolling_sharpe`: list of `{timestamp, sharpe}` — 20-period rolling
- `trade_distribution`: histogram bins of PnL per trade

#### [NEW] `backend/montecarlo.py`
Standalone Monte Carlo engine:
```python
def run_monte_carlo(trade_pnls: list, starting_capital: float, n_paths=1000, n_trades=None) -> dict:
    # Returns: percentile curves (5th, 25th, 50th, 75th, 95th), 
    # ruin probability, best/worst case, median final equity
```

Endpoint: `POST /api/backtest/montecarlo` — accepts trade logs from a previous backtest result.

---

### Backend — Strategy Registry

#### [MODIFY] [`database.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/database.py)

New table: `strategies`
```sql
CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    author TEXT DEFAULT 'User',
    created_by TEXT DEFAULT 'manual',  -- 'manual' | 'ai'
    code TEXT NOT NULL,
    symbols TEXT,          -- JSON array: ["BTC-USD", "ETH-USD"]
    timeframes TEXT,       -- JSON array: ["1h", "4h"]
    tags TEXT,             -- JSON array: ["mean-reversion", "crypto"]
    status TEXT DEFAULT 'draft',  -- 'draft' | 'tested' | 'paper' | 'live'
    notes TEXT DEFAULT '',
    best_sharpe REAL,
    best_sortino REAL,
    best_max_dd REAL,
    profit_factor REAL,
    win_rate REAL,
    expectancy REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

CRUD functions: `save_strategy`, `get_strategies`, `get_strategy`, `update_strategy`, `delete_strategy`, `update_strategy_metrics`.

#### [MODIFY] [`main.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/main.py)

New routes:
- `GET /api/strategies` — list all strategies
- `POST /api/strategies` — save new strategy
- `PUT /api/strategies/{id}` — update
- `DELETE /api/strategies/{id}` — delete

---

### Backend — Experiment Tracker

#### [MODIFY] [`database.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/database.py)

New table: `experiments`
```sql
CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id INTEGER,          -- FK to strategies table (nullable)
    strategy_name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    period TEXT NOT NULL,
    interval TEXT NOT NULL,
    starting_capital REAL NOT NULL,
    commission_pct REAL NOT NULL,
    slippage_pct REAL,
    spread_pct REAL,
    ai_prompt TEXT DEFAULT '',
    ai_model TEXT DEFAULT '',
    -- Results
    pnl REAL,
    pnl_pct REAL,
    sharpe REAL,
    sortino REAL,
    max_dd REAL,
    win_rate REAL,
    profit_factor REAL,
    total_trades INTEGER,
    -- Serialized data
    kpis_json TEXT,
    ai_notes TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    created_at TEXT NOT NULL
)
```

Functions: `save_experiment`, `get_experiments`, `get_experiment`, `update_experiment_notes`.

#### [MODIFY] [`main.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/main.py)

- Auto-save experiment after every `/api/backtest` call
- `GET /api/experiments` — list experiments (with filter: strategy_name, ticker, date range)
- `GET /api/experiments/{id}` — full experiment detail
- `PUT /api/experiments/{id}/notes` — update AI notes
- `POST /api/backtest/montecarlo` — Monte Carlo endpoint

---

### Backend — Market Data Expansion

#### [NEW] `backend/market_data.py`

New data fetchers:
```python
def get_funding_rates(symbol: str) -> list:        # Binance funding rate history
def get_open_interest(symbol: str) -> list:        # Binance OI history
def get_fear_greed_index(limit: int = 30) -> list: # alternative.me API (free, no key)
def get_economic_calendar() -> list:               # investing.com scrape or hardcoded schedule
def get_vix(period: str = "1mo") -> list:          # yfinance ^VIX
def get_dxy(period: str = "1mo") -> list:          # yfinance DX-Y.NYB
def get_treasury_yield(period: str = "1mo") -> list: # yfinance ^TNX
```

#### [MODIFY] [`main.py`](file:///c:/Users/ASUS/Documents/Aiquant/backend/main.py)

New data endpoints:
- `GET /api/market/funding?symbol=BTCUSDT`
- `GET /api/market/openinterest?symbol=BTCUSDT`
- `GET /api/market/feargreed`
- `GET /api/market/vix`
- `GET /api/market/dxy`

---

### Frontend — Enhanced Backtester Charts

#### [MODIFY] [`Backtester.tsx`](file:///c:/Users/ASUS/Documents/Aiquant/frontend/src/components/Backtester.tsx)

Add 5 new chart tabs to the results panel (using existing Recharts library):
1. **Rolling Sharpe** — LineChart of 20-period rolling Sharpe ratio
2. **Monthly Returns Heatmap** — calendar grid (months × years), color-coded green/red by return %
3. **Trade Distribution** — BarChart showing PnL distribution histogram across bins
4. **Exposure Chart** — AreaChart showing % time in market vs cash over the period
5. **Monte Carlo** — multi-line chart showing 5th/25th/50th/75th/95th percentile equity paths

Add optional slippage/spread controls to the backtest form:
```
[✓] Realistic Execution    Slippage: [0.05]%    Spread: [0.02]%
```

---

### Frontend — Strategy Library

#### [MODIFY] [`AIStrategyLab.tsx`](file:///c:/Users/ASUS/Documents/Aiquant/frontend/src/components/AIStrategyLab.tsx)

Add a "Strategy Library" tab alongside the code editor:
- Grid of strategy cards showing: name, status badge, best Sharpe, win rate, tags, created date
- "Save to Library" button after generating/editing a strategy
- Click a card → loads code into editor + shows performance history
- Filter by: status, tags, author (manual/AI)

---

### Frontend — Experiment History

#### [MODIFY] [`HistoryPage.tsx`](file:///c:/Users/ASUS/Documents/Aiquant/frontend/src/components/HistoryPage.tsx)

Extend with a second tab "Experiment Log" (separate from bot sessions):
- Table: Experiment #, Strategy, Ticker, Period, Sharpe, Max DD, Win Rate, PnL%, Date
- Click → side panel showing full KPIs + AI notes editor
- Search and filter by ticker, strategy, date

---

## Verification Plan

### Automated
- `GET /api/strategies` → 200, returns empty list on fresh DB
- `POST /api/strategies` → 201, persists to DB
- `POST /api/backtest` → returns `monthly_returns`, `rolling_sharpe`, `trade_distribution` in response
- `POST /api/backtest/montecarlo` → returns 5 percentile curves, ruin probability
- `GET /api/experiments` → returns auto-saved experiments from backtest runs
- `GET /api/market/feargreed` → returns list with `value` and `classification` fields

### Manual
- Run a backtest in Backtester UI → verify 5 new chart tabs appear
- Save a strategy → confirm it appears in Strategy Library with correct metadata
- Run same strategy twice → confirm 2 experiments appear in Experiment Log
- Enable slippage → confirm fills are slightly worse than close price in trade logs

---

## Implementation Order

1. **DB schema** — add `strategies` and `experiments` tables to `database.py`
2. **Feature Engine** — create `backend/feature_engine/` package (5 modules + engine.py)
3. **Slippage model** — add to `backtest_engine.py`
4. **Extended metrics** — add to `backtest_engine.py` return dict
5. **Monte Carlo** — create `backend/montecarlo.py`
6. **Market data** — create `backend/market_data.py`
7. **API routes** — add all new endpoints to `main.py`
8. **Backtester UI** — 5 new chart tabs + slippage controls
9. **Strategy Library UI** — tab in AIStrategyLab
10. **Experiment Log UI** — tab in HistoryPage
