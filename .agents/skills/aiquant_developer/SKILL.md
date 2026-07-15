---
name: aiquant-developer
description: Expert knowledge on the Aiquant backtest engine, custom strategy framework, indicator implementations, and environment quirks (Alpaca/Yahoo).
---

# Aiquant Developer Skill

This skill contains the complete architecture knowledge and quirks of the Aiquant quantitative trading platform. Use this knowledge whenever the user asks you to write a strategy, debug a backtest, or troubleshoot indicators.

## 1. Strategy Framework

Aiquant strategies are written in Python and must be compatible with the Jesse-inspired engine. 
- All strategies must inherit from `Strategy` (either from `jesse.strategies` or `aiquant.strategies`).
- Implement the following core methods:
  - `should_long(self) -> bool`
  - `should_short(self) -> bool`
  - `go_long(self)`
  - `go_short(self)`
  - `update_position(self)`
- **Candle Data Format:** When accessing raw candle data (e.g., `self.candles`), expect a numpy array of shape `(N, 6)` where the columns are:
  - `0`: Timestamp (in UTC milliseconds)
  - `1`: Open
  - `2`: Close
  - `3`: High
  - `4`: Low
  - `5`: Volume

## 2. Multi-Timeframe (MTF) & Candles

- **Fetching MTF Candles:** Use `self.get_candles(exchange, symbol, timeframe)` (e.g., `self.get_candles(self.exchange, self.symbol, '4h')`).
- **UTC Alignment:** The Aiquant engine groups multi-timeframe candles (like `4h` and `1D`) strictly on UTC boundaries (e.g. 00:00, 04:00, 08:00 UTC). Do NOT shift timestamps manually for local timezones; the engine forces `utc=True`.
- **Forming Candle:** `self.candles[-1]` is the *closed* candle on which the strategy executes. 

## 3. Indicators (`aiquant.indicators` as `ta`)

Aiquant implements native indicators that slightly differ from standard libraries:
- **`ta.ema(candles, period)`**: Fully vectorized using Pandas `ewm(span=period, adjust=False)`. It computes over the *entire* array on every tick, so it expects a long `candles` array to properly converge.
- **`ta.atr(candles, period)`**: Implemented with Wilder's Smoothing (not standard SMA/EMA), which perfectly mirrors Jesse's Tulipy ATR.
- **`ta.donchian(candles, period)`**: Properly maps column `3` to High and `4` to Low. 
- **Missing Indicators:** If you call an indicator that doesn't exist, the `__getattr__` fallback automatically calculates an SMA on the `close` column.

## 4. Backtest Engine Architecture

When debugging discrepancies in `backend/backtest_engine.py`, remember:
- **Warmup Candles:** Aiquant strictly supports 210 days of warmup candles for indicator stability. 
- **Dynamic Calculation:** The number of warmup candles (`warmup_candles`) is dynamically calculated by counting the number of timestamps in the fetched DataFrame that are *prior* to the user's requested start date.
- **Execution Skip:** During the warmup period (`idx < warmup_candles`), the engine ingests candle data into `si._candles` but uses a `continue` statement to skip strategy execution (`should_long`, `update_position`). 
- **Empty Portfolio Edge Case:** Always safely extract timestamps for `drawdown_history` to prevent `IndexError` in case all fetched data was categorized as warmup data (e.g. `df_ts < target_start`).

## 5. Environment & Exchange Quirks

- **Yahoo Finance Fallbacks:** Yahoo Finance restricts intraday (`1h`) data to the last 730 days. If the requested backtest start date (including the 210-day warmup buffer) goes beyond 730 days, `quant_engine.py` will automatically fall back to `1d` (daily) interval to prevent API rejection.
- **Alpaca MCP:** The official Alpaca MCP server is Python-based (`uvx alpaca-mcp-server`). The NPM package `@alpaca-mcp/server` does NOT exist (404 error). If a Node version is required, the community package `@ideadesignmedia/alpaca-mcp` is valid.
- **Sandbox Network:** Direct external API calls to Alpaca (`paper-api.alpaca.markets`) or Binance are blocked by Sandbox DNS restrictions (`getaddrinfo` fails). Always use the MCP server or the engine's built-in routing.
