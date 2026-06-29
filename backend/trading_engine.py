import json
import time
import os
import sys
import threading
import websockets
import asyncio
import requests
import numpy as np
import pandas as pd
import yfinance as yf
from quant_engine import compute_indicators
from backtest_engine import BaseStrategy

BUILDGUIDE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "buildguide"))
if BUILDGUIDE_PATH not in sys.path:
    sys.path.append(BUILDGUIDE_PATH)


class TradingBot:
    """
    Represents an independent active strategy execution bot.
    Each bot runs its own thread with its own asyncio event loop.
    Streams market data from the selected feed source, aggregates OHLCV candles,
    evaluates the loaded strategy, and executes simulated or Alpaca paper orders.
    """

    DURATION_MAP = {
        "10s": 10, "1m": 60, "5m": 300,
        "15m": 900, "1h": 3600, "1d": 86400
    }

    def __init__(self, bot_id, name, symbol, strategy_code, timeframe,
                 starting_cash=10000.0, feed_source="binance",
                 alpaca_key_id="", alpaca_secret_key=""):
        self.bot_id = bot_id
        self.name = name
        self.symbol = symbol.upper()
        self.strategy_code = strategy_code
        self.timeframe = timeframe
        self.feed_source = feed_source.lower()
        self.alpaca_key_id = alpaca_key_id
        self.alpaca_secret_key = alpaca_secret_key

        self.is_active = False
        self.start_time = None
        self.cash = starting_cash
        self.starting_cash = starting_cash
        self.positions = {}
        self.trades = []
        self.limit_orders = []
        self.candles = []
        self.logs = []
        self.equity_history = []  # List of dicts: {"timestamp": str, "equity": float}
        self.active_candle = None
        self.candle_start_time = 0
        self.avg_cost = 0.0
        self.realized_pnl = 0.0

        self.candle_duration = self.DURATION_MAP.get(timeframe, 10)

        self.strategy_instance = None
        self.loop = None
        self.thread = None
        self._lock = threading.Lock()
        self._warmup_done = False   # set True after warmup candles are loaded
        self._candle_count_at_warmup = 0

        # Callbacks registered by the session manager for state push
        self._on_tick_callbacks = []

        self.load_strategy(strategy_code)

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------
    def log(self, message: str):
        ts = time.strftime("%H:%M:%S")
        entry = f"[{ts}] {message}"
        self.logs.append(entry)
        if len(self.logs) > 300:
            self.logs.pop(0)
        print(f"[Bot {self.bot_id}] {entry}", flush=True)

    # ------------------------------------------------------------------
    # Strategy loading
    # ------------------------------------------------------------------
    def load_strategy(self, code_str: str) -> bool:
        if not code_str:
            self.strategy_instance = None
            return True
        ns = {"BaseStrategy": BaseStrategy, "np": np, "pd": pd}
        loc = {}
        try:
            exec(compile(code_str, f"<bot_{self.bot_id}>", "exec"), ns, loc)
            cls = next((v for v in loc.values()
                        if isinstance(v, type) and issubclass(v, BaseStrategy) and v is not BaseStrategy), None)
            if not cls:
                self.log("Error: No BaseStrategy subclass found in script.")
                return False
            self.strategy_instance = cls()
            self.strategy_code = code_str
            self.log("Strategy loaded successfully.")
            return True
        except Exception as e:
            self.log(f"Strategy load failed: {e}")
            return False

    def warmup_candles(self):
        """
        Fetches historical candles on startup to warm up strategy indicators (SMA, EMA, RSI, MACD).
        Prevents starting with empty candle series and delayed trading.
        """
        self.log(f"Warming up strategy indicators for {self.symbol} ({self.timeframe}) using historical data...")
        
        # 1. Map timeframe to API intervals
        binance_interval = "1m"
        yfinance_interval = "1m"
        yfinance_period = "1d"
        
        if self.timeframe == "1m":
            binance_interval = "1m"
            yfinance_interval = "1m"
            yfinance_period = "1d"
        elif self.timeframe == "5m":
            binance_interval = "5m"
            yfinance_interval = "5m"
            yfinance_period = "5d"
        elif self.timeframe == "15m":
            binance_interval = "15m"
            yfinance_interval = "15m"
            yfinance_period = "5d"
        elif self.timeframe == "1h":
            binance_interval = "1h"
            yfinance_interval = "1h"
            yfinance_period = "1mo"
        elif self.timeframe == "1d":
            binance_interval = "1d"
            yfinance_interval = "1d"
            yfinance_period = "6mo"
            
        # 2. Try fetching from Binance first (preferred for crypto / fast / reliable)
        df = pd.DataFrame()
        if "USDT" in self.symbol or "BTC" in self.symbol or "ETH" in self.symbol:
            try:
                from quant_engine import fetch_binance_history
                df = fetch_binance_history(self.symbol, interval=binance_interval, limit=100)
            except Exception as e:
                self.log(f"Binance warmup fetch failed: {e}")
                
        # 3. Fallback to Yahoo Finance
        if df.empty:
            try:
                from quant_engine import fetch_historical_data
                df = fetch_historical_data(self.symbol, period=yfinance_period, interval=yfinance_interval)
                if not df.empty:
                    df = df.tail(100).reset_index(drop=True)
            except Exception as e:
                self.log(f"yFinance warmup fetch failed: {e}")
                
        # 4. Populate self.candles with enriched indicator data
        if not df.empty:
            try:
                df = compute_indicators(df)
            except Exception as e:
                self.log(f"Warmup indicator computation failed: {e}")

            warmup_list = []
            for _, row in df.iterrows():
                def _f(col, default):
                    v = row.get(col, default) if hasattr(row, 'get') else getattr(row, col, default)
                    return default if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v)

                warmup_list.append({
                    "timestamp": str(row["timestamp"]),
                    "open":   float(row["open"]),
                    "high":   float(row["high"]),
                    "low":    float(row["low"]),
                    "close":  float(row["close"]),
                    "volume": float(row["volume"]),
                    "sma":         _f("sma", float(row["close"])),
                    "ema":         _f("ema", float(row["close"])),
                    "rsi":         _f("rsi", 50.0),
                    "macd":        _f("macd", 0.0),
                    "macd_signal": _f("macd_signal", 0.0),
                    "macd_hist":   _f("macd_hist", 0.0),
                    "bb_upper":    _f("bb_upper", float(row["close"])),
                    "bb_lower":    _f("bb_lower", float(row["close"])),
                    "atr":         _f("atr", 0.0),
                })
            with self._lock:
                self.candles = warmup_list
                self.equity_history = [{"timestamp": c["timestamp"], "equity": self.starting_cash} for c in warmup_list]
                self._warmup_done = True
                self._candle_count_at_warmup = len(warmup_list)
            self.log(f"Warmup successful. Loaded {len(self.candles)} historical candle bars. Indicators are active.")
        else:
            # Create realistic mock warmup with trending price walk so SMA signals fire quickly
            self.log("Warmup: Creating simulated mock historical bars with realistic price walk...")
            import datetime
            price = 50000.0 if "BTC" in self.symbol else (3000.0 if "ETH" in self.symbol else 150.0)
            mock_list = []
            base_time = datetime.datetime.now()
            # Use a random-walk with drift so SMA crossovers actually occur in history
            drift = np.random.choice([-1, 1]) * 0.0008
            for i in range(100):
                ts = (base_time - datetime.timedelta(seconds=(100-i) * self.candle_duration)).strftime("%Y-%m-%d %H:%M:%S")
                price *= 1.0 + drift + np.random.normal(0, 0.003)
                price = max(price, 1.0)
                body = abs(np.random.normal(0, 0.005)) * price
                h = price + abs(np.random.normal(0, 0.002)) * price
                l = price - abs(np.random.normal(0, 0.002)) * price
                mock_list.append({
                    "timestamp": ts,
                    "open": round(price * (1 - np.random.uniform(0, 0.001)), 6),
                    "high": round(h, 6),
                    "low":  round(l, 6),
                    "close": round(price, 6),
                    "volume": float(np.random.uniform(0.1, 2.5))
                })
            
            # Compute indicators on the simulated mock series too!
            df_mock = pd.DataFrame(mock_list)
            try:
                df_mock = compute_indicators(df_mock)
            except Exception as e:
                self.log(f"Mock warmup indicator computation failed: {e}")

            mock_enriched = []
            for _, row in df_mock.iterrows():
                def _f(col, default):
                    v = row.get(col, default) if hasattr(row, 'get') else getattr(row, col, default)
                    return default if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v)

                mock_enriched.append({
                    "timestamp": str(row["timestamp"]),
                    "open":   float(row["open"]),
                    "high":   float(row["high"]),
                    "low":    float(row["low"]),
                    "close":  float(row["close"]),
                    "volume": float(row["volume"]),
                    "sma":         _f("sma", float(row["close"])),
                    "ema":         _f("ema", float(row["close"])),
                    "rsi":         _f("rsi", 50.0),
                    "macd":        _f("macd", 0.0),
                    "macd_signal": _f("macd_signal", 0.0),
                    "macd_hist":   _f("macd_hist", 0.0),
                    "bb_upper":    _f("bb_upper", float(row["close"])),
                    "bb_lower":    _f("bb_lower", float(row["close"])),
                    "atr":         _f("atr", 0.0),
                })

            with self._lock:
                self.candles = mock_enriched
                self.equity_history = [{"timestamp": c["timestamp"], "equity": self.starting_cash} for c in mock_enriched]
                self._warmup_done = True
                self._candle_count_at_warmup = len(mock_enriched)
            self.log(f"Loaded {len(self.candles)} simulated historical bars for warmup. Indicators are active.")

    # ------------------------------------------------------------------
    # Alpaca Paper API helpers
    # ------------------------------------------------------------------
    def _alpaca_headers(self):
        return {
            "APCA-API-KEY-ID": self.alpaca_key_id,
            "APCA-API-SECRET-KEY": self.alpaca_secret_key,
        }

    def sync_alpaca_account(self):
        if not (self.alpaca_key_id and self.alpaca_secret_key):
            return
        try:
            r = requests.get("https://paper-api.alpaca.markets/v2/account",
                             headers=self._alpaca_headers(), timeout=5)
            if r.status_code == 200:
                self.cash = float(r.json().get("cash", self.cash))
                self.log(f"[Alpaca] Account synced — Cash: ${self.cash:,.2f}")
            else:
                self.log(f"[Alpaca] Account sync error: {r.text}")
        except Exception as e:
            self.log(f"[Alpaca] Account sync exception: {e}")

    def sync_alpaca_positions(self):
        if not (self.alpaca_key_id and self.alpaca_secret_key):
            return
        try:
            r = requests.get("https://paper-api.alpaca.markets/v2/positions",
                             headers=self._alpaca_headers(), timeout=5)
            if r.status_code == 200:
                self.positions = {}
                for p in r.json():
                    sym = p.get("symbol", "").upper()
                    self.positions[sym] = float(p.get("qty", 0.0))
                    if sym == self.symbol:
                        self.avg_cost = float(p.get("avg_entry_price", 0.0))
            else:
                self.log(f"[Alpaca] Positions sync error: {r.text}")
        except Exception as e:
            self.log(f"[Alpaca] Positions sync exception: {e}")

    # ------------------------------------------------------------------
    # Order execution
    # ------------------------------------------------------------------
    def place_market_order(self, action: str, qty: float) -> bool:
        action = action.upper()

        # ── Alpaca Paper ───────────────────────────────────────────────
        if self.alpaca_key_id and self.alpaca_secret_key:
            alpaca_sym = self.symbol.replace("USDT", "USD")
            
            # Prevent order rejection by capping the order notional to Alpaca's $200k limit
            current_price = self.active_candle["close"] if self.active_candle else (self.candles[-1]["close"] if self.candles else 0.0)
            if current_price > 0:
                notional = qty * current_price
                if notional > 195000.0:
                    old_qty = qty
                    qty = round(195000.0 / current_price, 6)
                    self.log(f"[Alpaca] Order notional ${notional:,.2f} exceeds limit. Capping quantity from {old_qty:.6f} to {qty:.6f}")

            payload = {"symbol": alpaca_sym, "qty": str(qty),
                       "side": action.lower(), "type": "market", "time_in_force": "gtc"}
            try:
                self.log(f"[Alpaca] Sending MARKET {action} {qty} {alpaca_sym}…")
                r = requests.post("https://paper-api.alpaca.markets/v2/orders",
                                  headers={**self._alpaca_headers(), "Content-Type": "application/json"},
                                  json=payload, timeout=6)
                if r.status_code in (200, 201):
                    order = r.json()
                    fill_price = float(order.get("filled_avg_price") or 0)
                    if fill_price == 0 and self.active_candle:
                        fill_price = self.active_candle["close"]
                    self.log(f"[Alpaca] Order filled — id: {order.get('id')}")
                    time.sleep(1)
                    old_cost = self.avg_cost
                    self.sync_alpaca_account()
                    self.sync_alpaca_positions()
                    pnl = (fill_price - old_cost) * qty if action == "SELL" and old_cost else 0.0
                    self.realized_pnl += pnl
                    self._record_trade(action, fill_price, qty, 0.0, pnl)
                    return True
                else:
                    self.log(f"[Alpaca] Order rejected: {r.text}")
                    return False
            except Exception as e:
                self.log(f"[Alpaca] Order exception: {e}")
                return False

        # ── Local simulated paper ──────────────────────────────────────
        with self._lock:
            if self.active_candle:
                price = self.active_candle["close"]
            elif self.candles:
                price = self.candles[-1]["close"]
            else:
                self.log("Cannot place order — no active price tick or closed candles available.")
                return False

            if action == "BUY":
                cost = qty * price
                fee = cost * 0.001
                if self.cash >= cost + fee:
                    self.cash -= cost + fee
                    prev = self.positions.get(self.symbol, 0.0)
                    self.positions[self.symbol] = prev + qty
                    self.avg_cost = ((prev * self.avg_cost) + (qty * price)) / (prev + qty) if (prev + qty) else price
                    self._record_trade("BUY", price, qty, fee, 0.0)
                    self.log(f"SIM BUY {qty} {self.symbol} @ ${price:,.2f}")
                    return True
                self.log("BUY rejected — insufficient cash.")
                return False

            elif action == "SELL":
                held = self.positions.get(self.symbol, 0.0)
                if held >= qty:
                    revenue = qty * price
                    fee = revenue * 0.001
                    pnl = (price - self.avg_cost) * qty - fee
                    self.cash += revenue - fee
                    self.realized_pnl += pnl
                    self.positions[self.symbol] = max(0.0, held - qty)
                    if self.positions[self.symbol] < 1e-8:
                        self.avg_cost = 0.0
                    self._record_trade("SELL", price, qty, fee, pnl)
                    self.log(f"SIM SELL {qty} {self.symbol} @ ${price:,.2f} | P&L: ${pnl:,.2f}")
                    return True
                self.log("SELL rejected — insufficient position.")
                return False

    def _record_trade(self, action, price, qty, fee, pnl):
        self.trades.append({
            "id": len(self.trades) + 1,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "action": action,
            "price": price,
            "qty": qty,
            "fee": fee,
            "pnl": float(pnl),
        })

    # ------------------------------------------------------------------
    # State snapshot (called frequently — keep fast)
    # ------------------------------------------------------------------
    def get_state(self):
        with self._lock:
            cp = self.active_candle["close"] if self.active_candle else (
                self.candles[-1]["close"] if self.candles else 0.0)
            pos_qty = self.positions.get(self.symbol, 0.0)
            portfolio_value = self.cash + pos_qty * cp
            unrealized = (cp - self.avg_cost) * pos_qty if pos_qty > 0 and self.avg_cost > 0 else 0.0

            sells = [t for t in self.trades if t["action"] == "SELL"]
            wins = [t for t in sells if t.get("pnl", 0) > 0]
            win_rate = (len(wins) / len(sells)) * 100 if sells else 0.0

            elapsed = int(time.time() - self.start_time) if self.is_active and self.start_time else 0
            h, rem = divmod(elapsed, 3600)
            m, s = divmod(rem, 60)
            running_time = f"{h:02d}:{m:02d}:{s:02d}"

            total_pnl = self.realized_pnl + unrealized
            pnl_pct = (total_pnl / self.starting_cash) * 100 if self.starting_cash else 0.0

            return {
                "bot_id": self.bot_id,
                "name": self.name,
                "is_active": self.is_active,
                "symbol": self.symbol,
                "timeframe": self.timeframe,
                "feed_source": self.feed_source,
                "starting_cash": self.starting_cash,
                "cash": self.cash,
                "portfolio_value": portfolio_value,
                "positions": dict(self.positions),
                "avg_cost": self.avg_cost,
                "realized_pnl": self.realized_pnl,
                "unrealized_pnl": unrealized,
                "total_pnl": total_pnl,
                "pnl_pct": pnl_pct,
                "win_rate": win_rate,
                "running_time": running_time,
                "trade_count": len(self.trades),
                "trades": self.trades[-50:],
                "limit_orders": self.limit_orders,
                "candles": self.candles[-100:],
                "equity_history": self.equity_history[-100:],
                "active_candle": self.active_candle,
                "logs": self.logs[-100:],
            }

    # ------------------------------------------------------------------
    # Candle helpers
    # ------------------------------------------------------------------
    def _update_active_candle(self, price: float, qty: float):
        now = time.time()
        # Accelerated duration for mock feed so strategies fire trades immediately (every 8s)
        duration = 8.0 if self.feed_source == "mock" else self.candle_duration

        with self._lock:
            if self.active_candle is None:
                # Chronologically advance timestamp by timeframe duration in mock mode
                if self.feed_source == "mock" and self.candles:
                    try:
                        from datetime import datetime, timedelta
                        last_ts = datetime.strptime(self.candles[-1]["timestamp"], "%Y-%m-%d %H:%M:%S")
                        next_ts = last_ts + timedelta(seconds=self.candle_duration)
                        ts_str = next_ts.strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        ts_str = time.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    ts_str = time.strftime("%Y-%m-%d %H:%M:%S")

                self.active_candle = {
                    "timestamp": ts_str,
                    "open": price, "high": price, "low": price,
                    "close": price, "volume": qty,
                }
                self.candle_start_time = now
            else:
                self.active_candle["close"] = price
                self.active_candle["high"] = max(self.active_candle["high"], price)
                self.active_candle["low"] = min(self.active_candle["low"], price)
                self.active_candle["volume"] += qty
        if now - self.candle_start_time >= duration:
            self._close_candle(price)

    def _close_candle(self, price: float):
        candle_enriched = None
        with self._lock:
            if self.active_candle is None:
                return
            candle = dict(self.active_candle)
            self.candles.append(candle)
            if len(self.candles) > 500:
                self.candles.pop(0)

            # ── Compute full indicator suite on the closed series ──────────
            df = pd.DataFrame(self.candles)
            try:
                df_ind = compute_indicators(df)
                row = df_ind.iloc[-1]
                # Helper: safely pull a float from the row
                def _f(col, default):
                    v = row.get(col, default) if hasattr(row, 'get') else getattr(row, col, default)
                    return default if (v is None or (isinstance(v, float) and np.isnan(v))) else float(v)

                candle_enriched = {
                    **candle,
                    "sma":         _f("sma", price),
                    "ema":         _f("ema", price),
                    "rsi":         _f("rsi", 50.0),
                    "macd":        _f("macd", 0.0),
                    "macd_signal": _f("macd_signal", 0.0),
                    "macd_hist":   _f("macd_hist", 0.0),
                    "bb_upper":    _f("bb_upper", price * 1.02),
                    "bb_lower":    _f("bb_lower", price * 0.98),
                    "atr":         _f("atr", price * 0.01),
                }
            except Exception as e:
                self.log(f"[Indicator] compute failed on {len(self.candles)} bars: {e}")
                candle_enriched = {**candle, "sma": price, "ema": price,
                                   "rsi": 50.0, "macd": 0.0, "macd_signal": 0.0,
                                   "macd_hist": 0.0, "bb_upper": price, "bb_lower": price, "atr": 0.0}

            # Write enriched candle BACK into self.candles so persisted bars have indicators
            self.candles[-1] = candle_enriched
            
            # Record current equity state at candle close
            pos_qty = self.positions.get(self.symbol, 0.0)
            current_eq = self.cash + pos_qty * price
            self.equity_history.append({
                "timestamp": candle_enriched["timestamp"],
                "equity": round(current_eq, 2)
            })
            if len(self.equity_history) > 1000:
                self.equity_history.pop(0)
                
            self.active_candle = None

        if candle_enriched is None:
            return

        # ── Strategy signal evaluation (outside lock) ────────────────────
        if self.strategy_instance:
            try:
                pos_qty = self.positions.get(self.symbol, 0.0)
                state = {
                    "cash": self.cash,
                    "positions": dict(self.positions),
                    "portfolio_value": self.cash + pos_qty * price,
                    "symbol": self.symbol,
                    "avg_cost": self.avg_cost,
                }
                order = self.strategy_instance.on_candle(candle_enriched, state)
                if order and isinstance(order, dict):
                    act = order.get("action", "").upper()
                    qty_raw = order.get("qty", 0.0)
                    qty = float(qty_raw) if qty_raw else 0.0
                    if act in ("BUY", "SELL") and qty > 0:
                        sma_val = candle_enriched.get('sma', price)
                        rsi_val = candle_enriched.get('rsi', 50)
                        self.log(f"[Strategy→{act}] qty={qty:.6f} | close={price:.4f} sma={sma_val:.4f} rsi={rsi_val:.1f}")
                        self.place_market_order(act, qty)
            except Exception as e:
                self.log(f"[Strategy] Error on candle eval: {e}")

    # ------------------------------------------------------------------
    # Feed loops (all run inside the bot's own asyncio event loop)
    # ------------------------------------------------------------------
    async def _binance_loop(self):
        stream = f"{self.symbol.lower()}@trade"
        urls = [
            f"wss://stream.binance.com/ws/{stream}",
            f"wss://stream.binance.us/ws/{stream}",
        ]
        idx = 0
        while self.is_active and self.feed_source == "binance":
            uri = urls[idx % len(urls)]
            self.log(f"Connecting Binance WS: {uri}")
            try:
                async with websockets.connect(uri, open_timeout=8) as ws:
                    self.log(f"Binance WS connected: {uri}")
                    async for raw in ws:
                        if not self.is_active or self.feed_source != "binance":
                            break
                        msg = json.loads(raw)
                        self._update_active_candle(float(msg["p"]), float(msg["q"]))
                        await asyncio.sleep(0)   # yield — don't block loop
            except Exception as e:
                idx += 1
                err = str(e)
                if idx >= 4 or any(x in err for x in ("Failed to resolve", "gaierror", "NameResolution")):
                    self.log(f"Binance unavailable ({e}). Switching to Mock feed.")
                    self.feed_source = "mock"
                    return
                self.log(f"Binance WS error: {e}. Retrying in 5s…")
                await asyncio.sleep(5)

    async def _yfinance_loop(self):
        self.log(f"Starting Yahoo Finance polling for {self.symbol}…")
        ticker = self.symbol.replace("USDT", "-USD")
        while self.is_active and self.feed_source == "yfinance":
            try:
                df = yf.download(ticker, period="1d", interval="1m", progress=False)
                if not df.empty:
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.get_level_values(0)
                    row = df.iloc[-1]
                    self._update_active_candle(float(row["Close"]), float(row.get("Volume", 1.0)))
                await asyncio.sleep(6)
            except Exception as e:
                err = str(e)
                if any(x in err for x in ("Failed to resolve", "gaierror", "NameResolution")):
                    self.log(f"yFinance offline ({e}). Switching to Mock.")
                    self.feed_source = "mock"
                    return
                self.log(f"yFinance error: {e}. Retrying in 10s…")
                await asyncio.sleep(10)

    async def _alpaca_loop(self):
        self.log(f"Starting Alpaca feed for {self.symbol}…")
        if self.alpaca_key_id and self.alpaca_secret_key:
            self.sync_alpaca_account()
            self.sync_alpaca_positions()

        ticker = self.symbol.replace("USDT", "-USD")
        while self.is_active and self.feed_source == "alpaca":
            try:
                price = 0.0
                qty = 1.0

                # Try Alpaca data API first
                if self.alpaca_key_id and self.alpaca_secret_key:
                    alpaca_sym = self.symbol.replace("USDT", "USD")
                    is_crypto = len(alpaca_sym) > 4 and "USD" in alpaca_sym
                    url = (f"https://data.alpaca.markets/v1beta3/crypto/us/latest/trades?symbols={alpaca_sym}"
                           if is_crypto
                           else f"https://data.alpaca.markets/v2/stocks/{alpaca_sym}/trades/latest")
                    r = requests.get(url, headers=self._alpaca_headers(), timeout=5)
                    if r.status_code == 200:
                        data = r.json()
                        trade = (data.get("trades", {}).get(alpaca_sym, {})
                                 if is_crypto else data.get("trade", {}))
                        if trade:
                            price = float(trade.get("p", 0.0))
                            qty = float(trade.get("s", 1.0))

                # Fallback to yfinance
                if price <= 0:
                    df = yf.download(ticker, period="1d", interval="1m", progress=False)
                    if not df.empty:
                        if isinstance(df.columns, pd.MultiIndex):
                            df.columns = df.columns.get_level_values(0)
                        price = float(df.iloc[-1]["Close"])
                        qty = float(df.iloc[-1].get("Volume", 1.0))

                if price > 0:
                    self._update_active_candle(price, qty)
                await asyncio.sleep(5)

            except Exception as e:
                err = str(e)
                if any(x in err for x in ("Failed to resolve", "gaierror", "NameResolution")):
                    self.log(f"Alpaca offline ({e}). Switching to Mock.")
                    self.feed_source = "mock"
                    return
                self.log(f"Alpaca error: {e}. Retrying in 8s…")
                await asyncio.sleep(8)

    async def _mock_loop(self):
        self.log(f"Starting Local Mock Simulation for {self.symbol}…")
        # Seed price from last warmup candle if available, otherwise use typical price
        with self._lock:
            if self.candles:
                price = float(self.candles[-1]["close"])
            else:
                price = 50000.0 if "BTC" in self.symbol else (3000.0 if "ETH" in self.symbol else 150.0)

        # Use a realistic random walk: moderate volatility + occasional regime shifts
        drift = np.random.choice([-1, 1]) * 0.0003
        regime_ticks = 0
        while self.is_active and self.feed_source == "mock":
            try:
                # Regime shift every ~80 ticks to create SMA crossovers
                regime_ticks += 1
                if regime_ticks >= np.random.randint(60, 120):
                    drift = np.random.choice([-1, 1]) * np.random.uniform(0.0002, 0.0008)
                    regime_ticks = 0
                    self.log(f"[Mock] Price regime shift — new drift: {drift:+.5f}")

                # Step price with realistic intrabar noise
                price *= 1.0 + drift + np.random.normal(0, 0.0015)
                price = max(price, 1.0)
                qty = float(np.random.uniform(0.05, 3.0))
                self._update_active_candle(price, qty)
                await asyncio.sleep(1.0)
            except Exception as e:
                self.log(f"Mock loop error: {e}")
                await asyncio.sleep(2)

    async def _master_loop(self):
        while self.is_active:
            fs = self.feed_source
            if fs == "yfinance":
                await self._yfinance_loop()
            elif fs == "alpaca":
                await self._alpaca_loop()
            elif fs == "mock":
                await self._mock_loop()
            else:
                await self._binance_loop()

    # ------------------------------------------------------------------
    # Start / Stop
    # ------------------------------------------------------------------
    def start(self):
        with self._lock:
            if self.is_active:
                return
            self.is_active = True
            self.start_time = time.time()

        try:
            self.warmup_candles()
        except Exception as e:
            self.log(f"Warmup warning: {e}")

        def _run():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            try:
                self.loop.run_until_complete(self._master_loop())
            except (asyncio.CancelledError, GeneratorExit):
                pass  # Normal shutdown — loop was stopped externally
            except RuntimeError as e:
                if "Event loop stopped before Future completed" not in str(e):
                    self.log(f"[Loop] RuntimeError: {e}")
            except Exception as e:
                self.log(f"[Loop] Unexpected exception: {e}")
            finally:
                try:
                    self.loop.close()
                except Exception:
                    pass

        self.thread = threading.Thread(target=_run, daemon=True, name=f"bot-{self.bot_id}")
        self.thread.start()
        self.log(f"Bot started — feed: {self.feed_source}, symbol: {self.symbol}, tf: {self.timeframe}")

    def stop(self):
        with self._lock:
            if not self.is_active:
                return
            self.is_active = False
            self.start_time = None
        if self.loop and not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self.loop.stop)
        self.log("Bot stopped.")


# ======================================================================
# LiveSessionManager
# ======================================================================

class LiveSessionManager:
    """
    Manages the fleet of active TradingBot instances.
    REST polling (/api/live/bots) is the primary data delivery mechanism;
    WebSocket push is used as a secondary real-time channel.
    """

    def __init__(self):
        self.bots: dict[str, TradingBot] = {}
        self.connected_websockets: set = set()
        self._lock = threading.Lock()

    def log(self, message: str):
        print(f"[LiveSessionManager] {message}", flush=True)

    # ------------------------------------------------------------------
    # Bot lifecycle
    # ------------------------------------------------------------------
    def start_bot(self, bot_id, name, symbol, strategy_code, timeframe,
                  starting_cash=10000.0, feed_source="binance",
                  alpaca_key_id="", alpaca_secret_key="") -> bool:
        with self._lock:
            if bot_id in self.bots:
                self.bots[bot_id].stop()
            bot = TradingBot(bot_id, name, symbol, strategy_code, timeframe,
                             starting_cash, feed_source, alpaca_key_id, alpaca_secret_key)
            self.bots[bot_id] = bot
        bot.start()
        return True

    def stop_bot(self, bot_id: str):
        with self._lock:
            bot = self.bots.pop(bot_id, None)
        if bot:
            bot.stop()

    def get_bot(self, bot_id: str):
        with self._lock:
            return self.bots.get(bot_id)

    def get_all_states(self) -> dict:
        with self._lock:
            bots = dict(self.bots)
        return {bid: bot.get_state() for bid, bot in bots.items()}

    def place_order_for_bot(self, bot_id: str, action: str, qty: float) -> bool:
        bot = self.get_bot(bot_id)
        if bot:
            return bot.place_market_order(action, qty)
        return False

    # ------------------------------------------------------------------
    # WebSocket push helper (called from the FastAPI event loop)
    # ------------------------------------------------------------------
    async def broadcast_bot_update(self, bot_id: str):
        if not self.connected_websockets:
            return
        bot = self.get_bot(bot_id)
        if not bot:
            return
        state = bot.get_state()
        payload = json.dumps({"type": "bot_state", "bot_id": bot_id, "data": state})
        dead = set()
        for ws in list(self.connected_websockets):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self.connected_websockets -= dead

    # ------------------------------------------------------------------
    # Backwards-compatibility shims for legacy endpoints
    # ------------------------------------------------------------------
    def _ensure_default(self):
        if "default" not in self.bots:
            self.start_bot("default", "Manual Trading Bot", "BTCUSDT", "", "10s",
                           10000.0, "mock")

    @property
    def is_active(self):
        bot = self.bots.get("default")
        return bot.is_active if bot else False

    def get_state(self):
        self._ensure_default()
        return self.bots["default"].get_state()

    def reset_account(self, starting_cash: float = 10000.0):
        bot = self.bots.get("default")
        if bot:
            bot.stop()
        self.start_bot("default", "Manual Trading Bot", "BTCUSDT", "", "10s",
                       starting_cash, "mock")

    def start_session(self, symbol="BTCUSDT", strategy_code="", timeframe="10s") -> bool:
        return self.start_bot("default", "Default Bot", symbol, strategy_code, timeframe,
                              feed_source="mock")

    def stop_session(self):
        self.stop_bot("default")

    def place_market_order(self, action: str, qty: float) -> bool:
        return self.place_order_for_bot("default", action, qty)

    def place_limit_order(self, action: str, qty: float, price: float) -> bool:
        bot = self.get_bot("default")
        if bot:
            bot.log(f"LIMIT orders not yet supported. Action: {action} qty: {qty} @ {price}")
        return False


# Global singleton
live_session = LiveSessionManager()
