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
from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
from alpaca.data.requests import CryptoLatestTradeRequest, StockLatestTradeRequest
from alpaca.data.live import CryptoDataStream, StockDataStream

BUILDGUIDE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "buildguide"))
if BUILDGUIDE_PATH not in sys.path:
    sys.path.append(BUILDGUIDE_PATH)


def _get_fallback_crypto_price(symbol: str) -> float:
    """
    Attempts to fetch the latest crypto price from Binance public API.
    If geoblocked or offline, falls back to Coinbase public API.
    """
    symbol = symbol.upper()
    # 1. Try Binance
    try:
        res = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}", timeout=3)
        if res.status_code == 200:
            val = float(res.json().get("price", 0.0))
            if val > 0:
                return val
    except Exception:
        pass
        
    # 2. Try Coinbase fallback
    try:
        coinbase_sym = symbol.replace("USDT", "-USD")
        res = requests.get(f"https://api.coinbase.com/v2/prices/{coinbase_sym}/spot", timeout=3)
        if res.status_code == 200:
            val = float(res.json().get("data", {}).get("amount", 0.0))
            if val > 0:
                return val
    except Exception:
        pass
        
    return 0.0



class RiskManager:
    """
    Multi-layered risk management system sitting between Strategy signals and execution.
    Features: Volatility-Based ATR Sizing, Fat-Finger Order Caps, Price Collar Spread limits,
    Correlation limits, Max Simultaneous Trades, Daily Drawdown Circuit Breakers, and Heartbeat checks.
    """
    def __init__(self, profile=None):
        self.profile = profile or {
            "atr_sizing_enabled": False,
            "atr_risk_percent": 1.0,
            "atr_period": 14,
            "atr_multiplier": 2.0,
            
            "max_order_value_enabled": False,
            "max_order_value": 5000.0,
            
            "price_collar_enabled": False,
            "max_spread_percent": 0.5,
            
            "correlation_limit_enabled": False,
            "max_allocation_per_asset": 20.0,
            
            "max_simultaneous_trades_enabled": False,
            "max_simultaneous_trades": 5,
            
            "max_drawdown_enabled": False,
            "max_drawdown_percent": 3.0,
            
            "heartbeat_check_enabled": False,
            "max_heartbeat_stale_seconds": 30,

            "auto_rebalance_enabled": False,
            "auto_rebalance_interval_minutes": 30,
            "slippage_tolerance_pct": 0.5
        }
        self.paused = False
        self.daily_starting_equity = None
        self.last_equity_check_time = 0.0

    def update_profile(self, new_profile):
        if isinstance(new_profile, dict):
            self.profile.update(new_profile)

    def get_current_spread_percent(self, bot, symbol):
        """
        Gets current bid-ask spread % from Alpaca for live keys, otherwise falls back to simulated spread.
        """
        if bot.alpaca_key_id and bot.alpaca_secret_key:
            try:
                alpaca_sym = symbol.replace("USDT", "USD")
                is_crypto = len(alpaca_sym) > 4 and "USD" in alpaca_sym
                url = (f"https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes?symbols={alpaca_sym}"
                       if is_crypto
                       else f"https://data.alpaca.markets/v2/stocks/{alpaca_sym}/quotes/latest")
                r = requests.get(url, headers=bot._alpaca_headers(), timeout=3)
                if r.status_code == 200:
                    data = r.json()
                    quote = data.get("quotes", {}).get(alpaca_sym, {}) if is_crypto else data.get("quote", {})
                    bid = float(quote.get("bp") or quote.get("bidprice") or 0.0)
                    ask = float(quote.get("ap") or quote.get("askprice") or 0.0)
                    if bid > 0 and ask > 0:
                        spread = ask - bid
                        return (spread / bid) * 100.0
            except Exception:
                pass
        # Simulated standard spread range (0.02% to 0.08%)
        return np.random.uniform(0.02, 0.08)

    def validate_order(self, bot, action: str, qty: float, price: float) -> tuple[bool, float, str]:
        """
        Validates the order payload. Returns (is_allowed, validated_quantity, status_message).
        """
        profile = self.profile
        action = action.upper()

        # 1. Master System Pause
        if self.paused:
            return False, 0.0, "RISK_SYSTEM_PAUSED"

        # 2. Connection Heartbeat Check
        if profile.get("heartbeat_check_enabled"):
            last_tick = getattr(bot, "last_tick_time", None)
            if last_tick and (time.time() - last_tick) > profile.get("max_heartbeat_stale_seconds", 30):
                bot.log(f"[RISK] Order rejected: Stale data feed detected (last tick {time.time() - last_tick:.1f}s ago)")
                return False, 0.0, "STALE_DATA_FEED"

        # 3. Max Daily Drawdown Circuit Breaker
        portfolio_value = bot.cash + sum(bot.positions.get(s, 0.0) * price for s in bot.positions)
        if profile.get("max_drawdown_enabled"):
            now = time.time()
            if self.daily_starting_equity is None or (now - self.last_equity_check_time) > 86400:
                self.daily_starting_equity = portfolio_value
                self.last_equity_check_time = now
            
            drawdown = (self.daily_starting_equity - portfolio_value) / (self.daily_starting_equity or 1.0)
            if drawdown >= (profile.get("max_drawdown_percent", 3.0) / 100.0):
                self.paused = True
                bot.log(
                    f"[CRITICAL RISK] Daily Drawdown limit of {profile.get('max_drawdown_percent')}% reached! "
                    f"Equity: ${portfolio_value:,.2f} vs Day Start: ${self.daily_starting_equity:,.2f}. Triggering emergency pause."
                )
                # Flatten active positions
                pos_qty = bot.positions.get(bot.symbol, 0.0)
                if pos_qty > 0:
                    bot.place_market_order("SELL", pos_qty)
                bot.is_active = False
                return False, 0.0, "DAILY_DRAWDOWN_CIRCUIT_BREAKER_BREACHED"

        # 4. Maximum Simultaneous Open Trades (Only for opening a new long/short position)
        is_opening = False
        held_qty = bot.positions.get(bot.symbol, 0.0)
        if action == "BUY" and held_qty <= 0:
            is_opening = True
        elif action == "SELL" and held_qty >= 0 and bot.alpaca_key_id:
            # check if shorting is enabled and we are opening a short
            is_opening = True

        if is_opening and profile.get("max_simultaneous_trades_enabled"):
            active_positions = sum(1 for sym, q in bot.positions.items() if q > 0.0)
            if active_positions >= profile.get("max_simultaneous_trades", 5):
                bot.log(f"[RISK] Order rejected: Max simultaneous active positions ({active_positions}/{profile.get('max_simultaneous_trades')}) reached.")
                return False, 0.0, "MAX_SIMULTANEOUS_TRADES_EXCEEDED"

        # 4.5. Max Leverage Limit Check
        leverage_limit = getattr(bot, "leverage_limit", 1.0)
        max_exposure = portfolio_value * leverage_limit
        current_exposure = abs(held_qty) * price
        
        if action == "BUY" and held_qty >= 0:
            order_value = qty * price
            if current_exposure + order_value > max_exposure:
                available_exposure = max(0.0, max_exposure - current_exposure)
                new_qty = round(available_exposure / price, 6)
                bot.log(f"[RISK] Order exposure + current exposure exceeds leverage limit of {leverage_limit}x. Downsizing qty {qty:.6f} -> {new_qty:.6f}")
                qty = new_qty
                if qty <= 0.000001:
                    return False, 0.0, "EXCEEDS_LEVERAGE_LIMIT"
        elif action == "SELL" and held_qty <= 0:
            order_value = qty * price
            if current_exposure + order_value > max_exposure:
                available_exposure = max(0.0, max_exposure - current_exposure)
                new_qty = round(available_exposure / price, 6)
                bot.log(f"[RISK] Short exposure exceeds leverage limit of {leverage_limit}x. Downsizing qty {qty:.6f} -> {new_qty:.6f}")
                qty = new_qty
                if qty <= 0.000001:
                    return False, 0.0, "EXCEEDS_LEVERAGE_LIMIT"

        # 5. Sector/Asset Allocation Limit (Only for opening/adding to buy trades)
        if action == "BUY" and profile.get("correlation_limit_enabled"):
            current_position_value = held_qty * price
            order_cost = qty * price
            max_alloc = portfolio_value * (profile.get("max_allocation_per_asset", 20.0) / 100.0)
            
            if current_position_value + order_cost > max_alloc:
                available_alloc = max(0.0, max_alloc - current_position_value)
                new_qty = round(available_alloc / price, 6)
                bot.log(f"[RISK] Order cost + current position exceeds asset allocation limit of {profile.get('max_allocation_per_asset')}%. Downsizing qty {qty:.6f} -> {new_qty:.6f}")
                qty = new_qty
                if qty <= 0.000001:
                    return False, 0.0, "EXCEEDS_ALLOCATION_LIMIT"

        # 6. Volatility-Based ATR Sizing (Override buy qty on open)
        if action == "BUY" and is_opening and profile.get("atr_sizing_enabled"):
            if len(bot.candles) >= 1:
                last_c = bot.candles[-1]
                atr = last_c.get("atr", price * 0.01)
                if atr > 0:
                    risk_amount = portfolio_value * (profile.get("atr_risk_percent", 1.0) / 100.0)
                    stop_loss_distance = profile.get("atr_multiplier", 2.0) * atr
                    target_qty = round(risk_amount / stop_loss_distance, 6)
                    bot.log(
                        f"[RISK] Volatility-based ATR sizing: ATR={atr:.4f}, StopDist={stop_loss_distance:.4f}, "
                        f"Target Risk=${risk_amount:,.2f} (1%). Overriding qty {qty:.6f} -> {target_qty:.6f}"
                    )
                    qty = target_qty
                    if qty <= 0.000001:
                        return False, 0.0, "ATR_SIZING_TOO_SMALL"

        # 7. Max Single Order Dollar Value Cap
        if profile.get("max_order_value_enabled"):
            order_value = qty * price
            max_val = profile.get("max_order_value", 5000.0)
            if order_value > max_val:
                new_qty = round(max_val / price, 6)
                bot.log(f"[RISK] Order value ${order_value:,.2f} exceeds Max Single Order Cap (${max_val:,.2f}). Downsizing qty {qty:.6f} -> {new_qty:.6f}")
                qty = new_qty
                if qty <= 0.000001:
                    return False, 0.0, "EXCEEDS_MAX_ORDER_VALUE"

        # 8. Price Collar Spread Protection
        if profile.get("price_collar_enabled"):
            spread_pct = self.get_current_spread_percent(bot, bot.symbol)
            max_spread = profile.get("max_spread_percent", 0.5)
            if spread_pct > max_spread:
                bot.log(f"[RISK] Order rejected: Spread ({spread_pct:.3f}%) exceeds Price Collar limit ({max_spread}%). Slippage risk too high.")
                return False, 0.0, "PRICE_COLLAR_SPREAD_BREACH"

        return True, qty, "PASSED"

    def get_telemetry_snapshot(self, bot=None) -> dict:
        """
        Returns a structured real-time risk telemetry snapshot dict.
        """
        now = time.time()
        portfolio_val = 10000.0
        active_pos_count = 0
        heartbeat_ok = True

        if bot is not None:
            price = getattr(bot, "last_price", 100.0) or 100.0
            portfolio_val = bot.cash + sum(bot.positions.get(s, 0.0) * price for s in bot.positions)
            active_pos_count = sum(1 for s, q in bot.positions.items() if abs(q) > 0)
            last_tick = getattr(bot, "last_tick_time", None)
            if last_tick and (now - last_tick) > self.profile.get("max_heartbeat_stale_seconds", 30):
                heartbeat_ok = False

        start_eq = self.daily_starting_equity or portfolio_val
        drawdown_pct = round(max(0.0, (start_eq - portfolio_val) / (start_eq or 1.0) * 100.0), 2)

        return {
            "paused": self.paused,
            "portfolio_value": round(portfolio_val, 2),
            "daily_starting_equity": round(start_eq, 2),
            "current_drawdown_pct": drawdown_pct,
            "max_drawdown_limit_pct": float(self.profile.get("max_drawdown_percent", 3.0)),
            "active_positions_count": active_pos_count,
            "max_simultaneous_trades": int(self.profile.get("max_simultaneous_trades", 5)),
            "heartbeat_ok": heartbeat_ok,
            "profile": self.profile,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        }


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
                 alpaca_key_id="", alpaca_secret_key="", hyperliquid_private_key="", risk_profile=None, leverage_limit=1.0):
        self.bot_id = bot_id
        self.name = name
        self.symbol = symbol.upper()
        self.strategy_code = strategy_code
        self.timeframe = timeframe
        self.feed_source = feed_source.lower()
        self.original_feed_source = feed_source.lower()
        self.alpaca_key_id = alpaca_key_id
        self.alpaca_secret_key = alpaca_secret_key
        self.hyperliquid_private_key = hyperliquid_private_key
        self.leverage_limit = leverage_limit
        
        self.risk_manager = RiskManager(risk_profile)
        self.last_tick_time = time.time()

        self.is_active = False
        self.is_paused = False
        self.start_time = None
        self.cash = starting_cash
        self.starting_cash = starting_cash
        self.alpaca_account_cash = starting_cash
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
        self.stop_loss = 0.0
        self.take_profit = 0.0
        self.position_opened_at = None
        self.daily_pnl_store = {}  # Map: "YYYY-MM-DD" -> {"date": str, "realized_pnl": float, "trades_count": int, "wins": int, "win_rate": float}

        self.candle_duration = self.DURATION_MAP.get(timeframe, 10)

        self.strategy_instance = None
        self.loop = None
        # State tracking
        self.last_alpha_status: Optional[str] = None
        self.last_alpha_rationale: Optional[str] = None

        # Lock for thread-safe state access
        self._lock = threading.Lock()
        self._warmup_done = False   # set True after warmup candles are loaded
        self._candle_count_at_warmup = 0

        # Callbacks registered by the session manager for state push
        self._on_tick_callbacks = []

        self.load_strategy(strategy_code)

    def persist_active_state(self):
        try:
            from database import save_active_bot
            import json
            
            risk_profile_json = "{}"
            if hasattr(self, "risk_manager") and getattr(self.risk_manager, "profile", None):
                risk_profile_json = json.dumps(self.risk_manager.profile)
                
            agentic_mode = 1 if isinstance(self, AgenticLiveBot) else 0
            agent_attitude = getattr(self, "agent_attitude", "balanced")
            
            agent_keys = getattr(self, "agent_keys", {})
            gemini_api_key = agent_keys.get("gemini", "")
            tech_agent_key = agent_keys.get("tech", "")
            sentiment_agent_key = agent_keys.get("sentiment", "")
            tradingview_agent_key = agent_keys.get("tradingview", "")
            hyperliquid_agent_key = agent_keys.get("hyperliquid", "")
            firecrawl_agent_key = agent_keys.get("firecrawl", "")

            with self._lock:
                positions_json = json.dumps(self.positions)
                trades_json = json.dumps(self.trades)
                curr_cash = self.cash
                avg_cost = self.avg_cost
                realized_pnl = self.realized_pnl
            
            save_active_bot(
                bot_id=self.bot_id,
                name=self.name,
                symbol=self.symbol,
                strategy_code=self.strategy_code,
                timeframe=self.timeframe,
                starting_cash=self.starting_cash,
                feed_source=self.feed_source,
                alpaca_key_id=self.alpaca_key_id,
                alpaca_secret_key=self.alpaca_secret_key,
                hyperliquid_private_key=self.hyperliquid_private_key,
                risk_profile_json=risk_profile_json,
                agentic_mode=agentic_mode,
                agent_attitude=agent_attitude,
                gemini_api_key=gemini_api_key,
                tech_agent_key=tech_agent_key,
                sentiment_agent_key=sentiment_agent_key,
                tradingview_agent_key=tradingview_agent_key,
                hyperliquid_agent_key=hyperliquid_agent_key,
                firecrawl_agent_key=firecrawl_agent_key,
                leverage_limit=self.leverage_limit,
                current_cash=curr_cash,
                positions_json=positions_json,
                trades_json=trades_json,
                avg_cost=avg_cost,
                realized_pnl=realized_pnl,
                start_time=str(self.start_time) if self.start_time else ""
            )
        except Exception as e:
            self.log(f"Failed to persist active state: {e}")

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
        import sys
        import os
        backend_path = os.path.abspath(os.path.dirname(__file__))
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)

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
        if any(x in self.symbol.upper() for x in ("USDT", "BTC", "ETH", "SOL", "ADA")):
            try:
                from quant_engine import fetch_binance_history
                binance_sym = self.symbol.replace("-", "").upper()
                if "USD" in binance_sym and not binance_sym.endswith("USDT"):
                    binance_sym = binance_sym.replace("USD", "USDT")
                df = fetch_binance_history(binance_sym, interval=binance_interval, limit=100)
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
                             headers=self._alpaca_headers(), timeout=15)
            if r.status_code == 200:
                self.alpaca_account_cash = float(r.json().get("cash", 0.0))
                self.log(f"[Alpaca] Account synced — Total Account Cash: ${self.alpaca_account_cash:,.2f} | Bot Allocated Cash: ${self.cash:,.2f}")
            else:
                self.log(f"[Alpaca] Account sync warning ({r.status_code}): {r.text[:120]}")
        except Exception as e:
            self.log(f"[Alpaca] Account sync timeout/retry: {e}")

    def sync_alpaca_positions(self):
        if not (self.alpaca_key_id and self.alpaca_secret_key):
            return
        try:
            r = requests.get("https://paper-api.alpaca.markets/v2/positions",
                             headers=self._alpaca_headers(), timeout=15)
            if r.status_code == 200:
                self.positions = {}
                alpaca_target = self.symbol.replace("USDT", "USD").upper()
                for p in r.json():
                    sym = p.get("symbol", "").upper()
                    self.positions[sym] = float(p.get("qty", 0.0))
                    if sym == alpaca_target:
                        self.positions[self.symbol] = float(p.get("qty", 0.0))
                        self.avg_cost = float(p.get("avg_entry_price", 0.0))
            else:
                self.log(f"[Alpaca] Positions sync warning ({r.status_code}): {r.text[:120]}")
        except Exception as e:
            self.log(f"[Alpaca] Positions sync timeout/retry: {e}")
        self._update_position_tracking()

    def _update_position_tracking(self):
        qty = self.positions.get(self.symbol, 0.0)
        if abs(qty) > 1e-8:
            if self.position_opened_at is None:
                self.position_opened_at = time.time()
        else:
            self.position_opened_at = None
            self.stop_loss = 0.0
            self.take_profit = 0.0

    # ------------------------------------------------------------------
    # Order execution
    # ------------------------------------------------------------------
    def place_market_order(self, action: str, qty: float, notional: float = 0.0) -> bool:
        """
        Places a market order on Alpaca (paper) or local simulator.
        If notional > 0, sends a fractional dollar-amount order instead of qty.
        Short-selling is allowed when the Alpaca account has shorting_enabled=True.
        """
        action = action.upper()
        current_price = self.active_candle["close"] if self.active_candle else (self.candles[-1]["close"] if self.candles else 0.0)

        # ── Pre-execution Risk Manager Validation ──────────────────────
        if hasattr(self, "risk_manager") and current_price > 0:
            qty_to_validate = qty
            if notional > 0 and qty_to_validate <= 0:
                qty_to_validate = notional / current_price
            
            allowed, new_qty, reason = self.risk_manager.validate_order(self, action, qty_to_validate, current_price)
            if not allowed:
                self.log(f"[RISK] Order BLOCKED: {reason}")
                return False
            if new_qty != qty_to_validate:
                self.log(f"[RISK] Order RESIZED: {qty_to_validate:.6f} -> {new_qty:.6f} ({reason})")
                if notional > 0:
                    notional = new_qty * current_price
                    qty = new_qty
                else:
                    qty = new_qty

        # ── Hyperliquid Testnet ───────────────────────────────────────────────
        if hasattr(self, "hyperliquid_private_key") and self.hyperliquid_private_key:
            try:
                from hyperliquid.utils import constants
                from hyperliquid.exchange import Exchange
                from eth_account import Account

                wallet = Account.from_key(self.hyperliquid_private_key)
                exchange = Exchange(wallet, constants.TESTNET_API_URL)
                
                hl_sym = self.symbol.upper().replace("USDT", "").replace("USD", "")
                is_buy = True if action == "BUY" else False
                
                if notional > 0:
                    qty = round(notional / current_price, 6)
                
                self.log(f"[Hyperliquid] Sending MARKET {action} {qty} {hl_sym}...")
                
                slip_price = current_price * 1.05 if is_buy else current_price * 0.95
                slip_price = round(slip_price, 4) 
                
                result = exchange.order(hl_sym, is_buy, qty, slip_price, {"limit": {"tif": "Ioc"}})
                if result and result.get("status") == "ok":
                    self.log(f"[Hyperliquid] Order accepted: {result}")
                    old_cost = self.avg_cost
                    fill_price = current_price
                    actual_qty = qty
                    pnl = (fill_price - old_cost) * actual_qty if action == "SELL" and old_cost else 0.0
                    self.realized_pnl += pnl
                    self._record_trade(action, fill_price, actual_qty, 0.0, pnl)
                    
                    # Update local cash allocation for Hyperliquid bot
                    cost = actual_qty * fill_price
                    fee = cost * 0.001
                    if action == "BUY":
                        self.cash -= (cost + fee)
                    else:
                        self.cash += (cost - fee)
                    
                    if action == "BUY":
                        self.positions[self.symbol] = self.positions.get(self.symbol, 0.0) + qty
                        self.avg_cost = ((self.positions.get(self.symbol, 0.0) * self.avg_cost) + (qty * fill_price)) / (self.positions.get(self.symbol, 0.0) + qty)
                    else:
                        self.positions[self.symbol] = max(0.0, self.positions.get(self.symbol, 0.0) - qty)
                        if self.positions[self.symbol] < 1e-8:
                            self.avg_cost = 0.0
                    
                    return True
                else:
                    self.log(f"[Hyperliquid] Order rejected: {result}")
                    return False
            except Exception as e:
                self.log(f"[Hyperliquid] Order exception: {e}")
                return False

        # ── Alpaca Paper ───────────────────────────────────────────────
        if self.alpaca_key_id and self.alpaca_secret_key:
            alpaca_sym = self.symbol.replace("USDT", "USD")
            current_price = self.active_candle["close"] if self.active_candle else (self.candles[-1]["close"] if self.candles else 0.0)

            # 1. Validate Account State & Available Buying Power
            shorting_enabled = False
            try:
                acc_res = requests.get("https://paper-api.alpaca.markets/v2/account", headers=self._alpaca_headers(), timeout=15)
                if acc_res.status_code == 200:
                    acc_info = acc_res.json()
                    shorting_enabled = acc_info.get("shorting_enabled", False)
                    if acc_info.get("trading_blocked", False):
                        self.log("[Alpaca] Order rejected: Account is blocked from trading.")
                        return False

                    if action == "BUY" and notional <= 0 and current_price > 0:
                        is_crypto = "USD" in alpaca_sym or "USDT" in alpaca_sym
                        if is_crypto:
                            buying_power = float(acc_info.get("non_marginable_buying_power") or acc_info.get("cash", 0.0))
                        else:
                            buying_power = float(acc_info.get("buying_power", 0.0))

                        order_cost = qty * current_price
                        if order_cost > buying_power:
                            safe_buying_power = buying_power * 0.98
                            if safe_buying_power <= 0.0:
                                self.log(f"[Alpaca] BUY rejected: Buying power (${buying_power:,.2f}) too low.")
                                return False
                            old_qty = qty
                            qty = round(safe_buying_power / current_price, 6)
                            self.log(f"[Alpaca] Downsizing BUY {old_qty:.6f} to {qty:.6f} (BP=${buying_power:,.2f})")
                else:
                    self.log(f"[Alpaca] Account validation returned: {acc_res.text}")
            except Exception as e:
                self.log(f"[Alpaca] Account validation exception: {e}")

            # 2. Validate Position Size (for SELL — allow short if account permits)
            if action == "SELL" and notional <= 0:
                try:
                    pos_res = requests.get("https://paper-api.alpaca.markets/v2/positions", headers=self._alpaca_headers(), timeout=15)
                    if pos_res.status_code == 200:
                        positions_info = pos_res.json()
                        held_qty = 0.0
                        for pos in positions_info:
                            if pos.get("symbol") == alpaca_sym:
                                held_qty = float(pos.get("qty", 0.0))
                                break
                        if qty > held_qty:
                            if held_qty <= 0.0:
                                if shorting_enabled:
                                    self.log(f"[Alpaca] SHORT SELL {qty} {alpaca_sym} (shorting_enabled).")
                                else:
                                    self.log(f"[Alpaca] SELL rejected: No position in {alpaca_sym} & shorting not enabled.")
                                    return False
                            else:
                                old_qty = qty
                                qty = held_qty
                                self.log(f"[Alpaca] Capping SELL to held qty {qty:.6f}")
                    else:
                        self.log(f"[Alpaca] Position validation returned: {pos_res.text}")
                except Exception as e:
                    self.log(f"[Alpaca] Position validation exception: {e}")

            # 3. Cap notional to Alpaca's $200k/order limit with a safety buffer.
            #    We use $175k (not $195k) because Alpaca evaluates notional at
            #    EXECUTION price, not at our local candle price. On volatile
            #    assets like BTC, the price can rise 10-15% between cap-time and
            #    fill-time — which would push a $195k order over $200k and get
            #    it rejected (as seen in production: cap→3.156 BTC @ $61,779 but
            #    Alpaca sees $67,919 = $214,357 notional → rejected).
            ALPACA_NOTIONAL_SAFE_CAP = 175_000.0  # $175k = 12.5% buffer below $200k limit
            if notional <= 0 and current_price > 0:
                order_notional = qty * current_price
                if order_notional > ALPACA_NOTIONAL_SAFE_CAP:
                    old_qty = qty
                    qty = round(ALPACA_NOTIONAL_SAFE_CAP / current_price, 6)
                    new_notional = qty * current_price
                    self.log(
                        f"[Alpaca] Order notional ${order_notional:,.2f} exceeds safe cap ${ALPACA_NOTIONAL_SAFE_CAP:,.0f}. "
                        f"Capping qty {old_qty:.6f} -> {qty:.6f} (est. ${new_notional:,.2f} — "
                        f"12.5% buffer below Alpaca $200k limit protects against execution-price slippage)"
                    )

            # 4. Build payload — notional (fractional $) or qty
            # Determine exact Alpaca order symbol format (e.g., LTC/USD for crypto)
            alpaca_sym = self.symbol.replace("USDT", "USD")
            if any(c in alpaca_sym.upper() for c in ["BTC", "ETH", "SOL", "LTC", "AVAX", "UNI", "DOGE", "LINK"]) and "/" not in alpaca_sym and alpaca_sym.endswith("USD"):
                alpaca_order_sym = f"{alpaca_sym[:-3]}/USD"
            else:
                alpaca_order_sym = alpaca_sym

            if notional > 0:
                client_oid = f"{self.bot_id}_{int(time.time() * 1000)}"
                payload = {
                    "symbol": alpaca_order_sym,
                    "notional": str(round(notional, 2)),
                    "side": action.lower(),
                    "type": "market",
                    "time_in_force": "day",  # notional orders require TIF=day
                    "client_order_id": client_oid,
                }
                self.log(f"[Alpaca] Sending FRACTIONAL MARKET {action} ${notional:.2f} of {alpaca_order_sym} (Client Order ID: {client_oid})…")
            else:
                client_oid = f"{self.bot_id}_{int(time.time() * 1000)}"
                payload = {
                    "symbol": alpaca_order_sym,
                    "qty": str(qty),
                    "side": action.lower(),
                    "type": "market",
                    "time_in_force": "gtc",
                    "client_order_id": client_oid,
                }
                self.log(f"[Alpaca] Sending MARKET {action} {qty} {alpaca_order_sym} (Client Order ID: {client_oid})…")

            try:
                r = requests.post("https://paper-api.alpaca.markets/v2/orders",
                                  headers={**self._alpaca_headers(), "Content-Type": "application/json"},
                                  json=payload, timeout=15)
                # Fallback retry with unformatted symbol if Alpaca expects alternative format
                if r.status_code not in (200, 201) and alpaca_order_sym != alpaca_sym:
                    payload["symbol"] = alpaca_sym
                    r = requests.post("https://paper-api.alpaca.markets/v2/orders",
                                      headers={**self._alpaca_headers(), "Content-Type": "application/json"},
                                      json=payload, timeout=15)

                if r.status_code in (200, 201):
                    order = r.json()
                    
                    try:
                        f_price = float(order.get("filled_avg_price") or 0)
                    except (ValueError, TypeError):
                        f_price = 0.0
                        
                    try:
                        f_qty = float(order.get("filled_qty") or 0)
                    except (ValueError, TypeError):
                        f_qty = 0.0
                        
                    fill_price = f_price
                    if fill_price <= 0:
                        if self.active_candle:
                            fill_price = self.active_candle["close"]
                        elif self.candles:
                            fill_price = self.candles[-1]["close"]
                        else:
                            fill_price = current_price
                            
                    actual_qty = f_qty
                    if actual_qty <= 0:
                        try:
                            actual_qty = float(order.get("qty") or qty)
                        except (ValueError, TypeError):
                            actual_qty = float(qty)
                            
                    self.log(f"[Alpaca] Order accepted — id: {order.get('id')} | client_oid: {client_oid} | status: {order.get('status')}")
                    time.sleep(1)
                    old_cost = self.avg_cost
                    # Update local cash allocation and bot-isolated position
                    cost = actual_qty * fill_price
                    fee = cost * 0.001
                    with self._lock:
                        if action == "BUY":
                            self.cash -= (cost + fee)
                            prev_qty = self.positions.get(self.symbol, 0.0)
                            new_qty = prev_qty + actual_qty
                            self.avg_cost = ((prev_qty * self.avg_cost) + (actual_qty * fill_price)) / new_qty if new_qty > 0 else fill_price
                            self.positions[self.symbol] = new_qty
                        else:
                            self.cash += (cost - fee)
                            prev_qty = self.positions.get(self.symbol, 0.0)
                            new_qty = prev_qty - actual_qty
                            self.positions[self.symbol] = new_qty
                            if abs(new_qty) < 1e-8:
                                self.positions[self.symbol] = 0.0
                                self.avg_cost = 0.0
                        self._update_position_tracking()

                    pnl = (fill_price - old_cost) * actual_qty if action == "SELL" and old_cost else 0.0
                    self.realized_pnl += pnl
                    self._record_trade(action, fill_price, actual_qty, fee, pnl)
                    return True
                else:
                    self.log(f"[Alpaca] Order rejected: {r.text}")
                    return False
            except Exception as e:
                self.log(f"[Alpaca] Order exception: {e}")
                return False
        else:
            # ── Local simulated paper fallback ──────────────────────────────
            with self._lock:
                price = current_price
                if price <= 0:
                    self.log("Cannot place simulated order — no active price available.")
                    return False
                
                # Apply simulated execution slippage penalty
                slip_pct = 0.0
                if hasattr(self, "risk_manager") and self.risk_manager.profile:
                    slip_pct = float(self.risk_manager.profile.get("slippage_tolerance_pct", 0.5)) / 100.0
                
                action = action.upper()
                if action == "BUY":
                    fill_price = price * (1.0 + slip_pct)
                    cost = qty * fill_price
                    fee = cost * 0.001
                    pos_qty = self.positions.get(self.symbol, 0.0)
                    portfolio_value = self.cash + pos_qty * price
                    buying_power = portfolio_value * getattr(self, "leverage_limit", 1.0)

                    if buying_power >= cost + fee:
                        self.cash -= cost + fee
                        prev = self.positions.get(self.symbol, 0.0)
                        self.positions[self.symbol] = prev + qty
                        self.avg_cost = ((prev * self.avg_cost) + (qty * fill_price)) / (prev + qty) if (prev + qty) else fill_price
                        self._record_trade("BUY", fill_price, qty, fee, 0.0)
                        self.log(f"SIM BUY {qty} {self.symbol} @ ${fill_price:,.2f} (base: ${price:,.2f}, slippage: +{slip_pct*100:.2f}%)")
                        return True
                    self.log(f"BUY rejected — insufficient buying power (${buying_power:,.2f} available for ${cost+fee:,.2f} order).")
                    return False

                elif action == "SELL":
                    held = self.positions.get(self.symbol, 0.0)
                    if held >= qty:
                        fill_price = price * (1.0 - slip_pct)
                        revenue = qty * fill_price
                        fee = revenue * 0.001
                        pnl = (fill_price - self.avg_cost) * qty - fee
                        self.cash += revenue - fee
                        self.realized_pnl += pnl
                        self.positions[self.symbol] = max(0.0, held - qty)
                        if self.positions[self.symbol] < 1e-8:
                            self.avg_cost = 0.0
                        self._record_trade("SELL", fill_price, qty, fee, pnl)
                        self.log(f"SIM SELL {qty} {self.symbol} @ ${fill_price:,.2f} (base: ${price:,.2f}, slippage: -{slip_pct*100:.2f}%) | P&L: ${pnl:,.2f}")
                        return True
                    self.log("SELL rejected — insufficient position.")
                    return False


    # ------------------------------------------------------------------
    # Advanced orders: limit / stop / stop_limit / trailing_stop
    # ------------------------------------------------------------------
    def place_advanced_order(
        self,
        action: str,
        order_type: str,
        qty: float = 0.0,
        notional: float = 0.0,
        limit_price: float = 0.0,
        stop_price: float = 0.0,
        trail_price: float = 0.0,
        trail_percent: float = 0.0,
        time_in_force: str = "gtc",
        extended_hours: bool = False,
    ) -> bool:
        """
        Places limit, stop, stop_limit, or trailing_stop orders on Alpaca paper.
        Falls back to local log if no Alpaca keys configured.
        """
        action = action.upper()
        ot = order_type.lower()
        current_price = self.active_candle["close"] if self.active_candle else (self.candles[-1]["close"] if self.candles else 0.0)
        price_to_validate = limit_price or stop_price or current_price

        # ── Pre-execution Risk Manager Validation ──────────────────────
        if hasattr(self, "risk_manager") and price_to_validate > 0:
            qty_to_validate = qty
            if notional > 0 and qty_to_validate <= 0:
                qty_to_validate = notional / price_to_validate
            
            allowed, new_qty, reason = self.risk_manager.validate_order(self, action, qty_to_validate, price_to_validate)
            if not allowed:
                self.log(f"[RISK] Advanced Order BLOCKED: {reason}")
                return False
            if new_qty != qty_to_validate:
                self.log(f"[RISK] Advanced Order RESIZED: {qty_to_validate:.6f} -> {new_qty:.6f} ({reason})")
                if notional > 0:
                    notional = new_qty * price_to_validate
                    qty = new_qty
                else:
                    qty = new_qty

        if not (self.alpaca_key_id and self.alpaca_secret_key):
            self.log(f"[SIM] Advanced {ot.upper()} {action} queued (no Alpaca keys).")
            return True

        alpaca_sym = self.symbol.replace("USDT", "USD")
        payload: dict = {
            "symbol": alpaca_sym,
            "side": action.lower(),
            "type": ot,
            "time_in_force": time_in_force,
            "extended_hours": extended_hours,
        }

        if notional > 0:
            payload["notional"] = str(round(notional, 2))
            payload["time_in_force"] = "day"
        elif qty > 0:
            payload["qty"] = str(qty)
        else:
            self.log("[Alpaca] Advanced order: qty or notional must be > 0.")
            return False

        if ot in ("limit", "stop_limit"):
            if limit_price <= 0:
                self.log(f"[Alpaca] {ot} order: limit_price required.")
                return False
            payload["limit_price"] = str(limit_price)
        if ot in ("stop", "stop_limit"):
            if stop_price <= 0:
                self.log(f"[Alpaca] {ot} order: stop_price required.")
                return False
            payload["stop_price"] = str(stop_price)
        if ot == "trailing_stop":
            if trail_price > 0:
                payload["trail_price"] = str(trail_price)
            elif trail_percent > 0:
                payload["trail_percent"] = str(trail_percent)
            else:
                self.log("[Alpaca] trailing_stop: trail_price or trail_percent required.")
                return False

        try:
            self.log(f"[Alpaca] Sending {ot.upper()} {action} {qty or f'${notional:.2f}'} {alpaca_sym}…")
            r = requests.post(
                "https://paper-api.alpaca.markets/v2/orders",
                headers={**self._alpaca_headers(), "Content-Type": "application/json"},
                json=payload, timeout=6
            )
            if r.status_code in (200, 201):
                order = r.json()
                self.log(f"[Alpaca] {ot.upper()} order placed — id: {order.get('id')} | status: {order.get('status')}")
                return True
            else:
                self.log(f"[Alpaca] {ot.upper()} order rejected: {r.text}")
                return False
        except Exception as e:
            self.log(f"[Alpaca] {ot.upper()} order exception: {e}")
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
        now_date_str = time.strftime("%Y-%m-%d")
        if now_date_str not in self.daily_pnl_store:
            self.daily_pnl_store[now_date_str] = {
                "date": now_date_str,
                "realized_pnl": 0.0,
                "trades_count": 0,
                "wins": 0,
                "win_rate": 0.0
            }
        if action == "SELL":
            self.daily_pnl_store[now_date_str]["realized_pnl"] += float(pnl)
            self.daily_pnl_store[now_date_str]["trades_count"] += 1
            if float(pnl) > 0:
                self.daily_pnl_store[now_date_str]["wins"] += 1
            cnt = self.daily_pnl_store[now_date_str]["trades_count"]
            wns = self.daily_pnl_store[now_date_str]["wins"]
            self.daily_pnl_store[now_date_str]["win_rate"] = round((wns / cnt) * 100.0, 1) if cnt > 0 else 0.0

        self.trades.append({
            "id": len(self.trades) + 1,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "action": action,
            "price": price,
            "qty": qty,
            "fee": fee,
            "pnl": float(pnl),
        })
        self._update_position_tracking()
        self.persist_active_state()

        # Broadcast instant trade alert to Telegram Command & Control Center
        try:
            from telegram_bot import telegram_manager
            action_icon = "🟢 BUY" if action == "BUY" else "🔴 SELL"
            pnl_info = f"\n💵 <b>Realized P&L:</b> <code>{('+' if pnl>=0 else '')}${pnl:,.2f}</code>" if action == "SELL" else ""
            msg = (
                f"🚀 <b>TRADE EXECUTION ALERT</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"🤖 <b>Bot:</b> {self.name} [<code>{self.bot_id}</code>]\n"
                f"⚡ <b>Action:</b> {action_icon} <code>{qty} {self.symbol}</code>\n"
                f"💵 <b>Fill Price:</b> <code>${price:,.2f}</code>\n"
                f"💳 <b>Notional:</b> <code>${(qty * price):,.2f} USD</code>{pnl_info}\n"
                f"⏱ <b>Timestamp:</b> <code>{time.strftime('%H:%M:%S UTC', time.gmtime())}</code>"
            )
            markup = {
                "inline_keyboard": [
                    [{"text": "📊 Fleet Status", "callback_data": "cmd_status"}, {"text": "📦 Positions", "callback_data": "cmd_positions"}]
                ]
            }
            telegram_manager.broadcast_alert(msg, reply_markup=markup)
        except Exception:
            pass

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

            exposure = abs(pos_qty) * cp
            leverage = exposure / portfolio_value if portfolio_value > 0 else 0.0
            pos_duration = time.time() - self.position_opened_at if self.position_opened_at else 0.0

            sells = [t for t in self.trades if t["action"] == "SELL"]
            wins = [t for t in sells if t.get("pnl", 0) > 0]
            win_rate = (len(wins) / len(sells)) * 100 if sells else 0.0

            elapsed = int(time.time() - self.start_time) if self.is_active and self.start_time else 0
            h, rem = divmod(elapsed, 3600)
            m, s = divmod(rem, 60)
            running_time = f"{h:02d}:{m:02d}:{s:02d}"

            total_pnl = self.realized_pnl + unrealized
            pnl_pct = (total_pnl / self.starting_cash) * 100 if self.starting_cash else 0.0

            today_str = time.strftime("%Y-%m-%d")
            daily_today = round(self.daily_pnl_store.get(today_str, {}).get("realized_pnl", 0.0), 2)
            daily_pnl_list = sorted(list(self.daily_pnl_store.values()), key=lambda x: x["date"], reverse=True)

            is_paused_val = getattr(self, "is_paused", False)
            if not self.is_active:
                bot_status_str = "stopped"
            elif is_paused_val:
                bot_status_str = "paused"
            else:
                bot_status_str = "active"

            return {
                "bot_id": self.bot_id,
                "name": self.name,
                "is_active": self.is_active,
                "is_running": self.is_active and not is_paused_val,
                "is_paused": is_paused_val,
                "status": bot_status_str,
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
                "daily_pnl_today": daily_today,
                "daily_pnl_by_date": self.daily_pnl_store,
                "daily_pnl_list": daily_pnl_list,
                "running_time": running_time,
                "trade_count": len(self.trades),
                "trades": self.trades[-50:],
                "limit_orders": self.limit_orders,
                "candles": self.candles[-100:],
                "equity_history": self.equity_history[-100:],
                "active_candle": self.active_candle,
                "logs": self.logs[-100:],
                "last_alpha_status": self.last_alpha_status,
                "last_alpha_rationale": self.last_alpha_rationale,
                "is_agentic": type(self).__name__ == "AgenticLiveBot",
                "agent_attitude": getattr(self, "agent_attitude", "balanced"),
                "leverage": leverage,
                "position_opened_at": self.position_opened_at,
                "position_duration": pos_duration,
                "stop_loss": self.stop_loss,
                "take_profit": self.take_profit,
                "leverage_limit": self.leverage_limit,
                "risk_profile": self.risk_manager.profile if hasattr(self, "risk_manager") else {},
            }

    # ------------------------------------------------------------------
    # Candle helpers
    # ------------------------------------------------------------------
    def _update_active_candle(self, price: float, qty: float):
        now = time.time()
        self.last_tick_time = now

        # Stop-loss / Take-profit validation on incoming tick
        pos_qty = self.positions.get(self.symbol, 0.0)
        if abs(pos_qty) > 1e-8:
            sl = getattr(self, "stop_loss", 0.0)
            tp = getattr(self, "take_profit", 0.0)
            if pos_qty > 0:  # Long
                if sl > 0 and price <= sl:
                    self.log(f"[STOP LOSS] Current price ${price:,.2f} crossed SL ${sl:,.2f}. Closing position.")
                    self.place_market_order("SELL", pos_qty)
                elif tp > 0 and price >= tp:
                    self.log(f"[TAKE PROFIT] Current price ${price:,.2f} crossed TP ${tp:,.2f}. Closing position.")
                    self.place_market_order("SELL", pos_qty)
            elif pos_qty < 0:  # Short
                if sl > 0 and price >= sl:
                    self.log(f"[STOP LOSS] Current price ${price:,.2f} crossed SL ${sl:,.2f}. Closing short position.")
                    self.place_market_order("BUY", abs(pos_qty))
                elif tp > 0 and price <= tp:
                    self.log(f"[TAKE PROFIT] Current price ${price:,.2f} crossed TP ${tp:,.2f}. Closing short position.")
                    self.place_market_order("BUY", abs(pos_qty))

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

        if getattr(self, "is_paused", False) or not self.is_active:
            return

        # ── Strategy signal evaluation (outside lock) ────────────────────
        if self.strategy_instance:
            try:
                # Convert bot's candle list to 2D numpy array for Jesse indicators compatibility
                candles_list = []
                for c in self.candles:
                    try:
                        ts_ms = pd.to_datetime(c["timestamp"]).timestamp() * 1000.0
                    except Exception:
                        ts_ms = 0.0
                    candles_list.append([
                        ts_ms,
                        float(c["open"]),
                        float(c["high"]),
                        float(c["low"]),
                        float(c["close"]),
                        float(c["volume"])
                    ])
                self.strategy_instance.candles = np.array(candles_list)

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
                        self.log(f"[Strategy->{act}] qty={qty:.6f} | close={price:.4f} sma={sma_val:.4f} rsi={rsi_val:.1f}")
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
                self.log(f"Binance WS error: {e}. Switching to Binance REST polling fallback.")
                self.feed_source = "binance_rest"
                return

    async def _binance_rest_loop(self):
        self.log(f"Starting Binance REST polling for {self.symbol}…")
        poll_count = 0
        while self.is_active and self.feed_source == "binance_rest":
            try:
                price = _get_fallback_crypto_price(self.symbol)
                if price > 0:
                    self._update_active_candle(price, 1.0)
                
                await asyncio.sleep(5)
                poll_count += 1
                # If we were originally configured for websocket, try to reconnect every 60 seconds
                if self.original_feed_source == "binance" and poll_count >= 12:
                    self.log("[Binance REST] 60 seconds passed since WebSocket disconnect. Attempting to restore WebSocket stream...")
                    self.feed_source = "binance"
                    break
            except Exception as e:
                self.log(f"Binance REST polling error: {e}. Retrying in 10s…")
                await asyncio.sleep(10)

    async def _yfinance_loop(self):
        self.log(f"Starting Yahoo Finance polling for {self.symbol}…")
        ticker = self.symbol.replace("USDT", "-USD")
        while self.is_active and self.feed_source == "yfinance":
            try:
                price = 0.0
                qty = 1.0
                # For crypto assets, fetch from Binance/Coinbase public REST API first to prevent yfinance rate limits
                if "USD" in ticker or self.symbol.endswith("USDT"):
                    try:
                        price = _get_fallback_crypto_price(self.symbol)
                        qty = 1.0
                    except Exception:
                        pass
                
                if price <= 0:
                    df = yf.download(ticker, period="1d", interval="1m", progress=False)
                    if not df.empty:
                        if isinstance(df.columns, pd.MultiIndex):
                            df.columns = df.columns.get_level_values(0)
                        row = df.iloc[-1]
                        price = float(row["Close"])
                        qty = float(row.get("Volume", 1.0))
                
                if price > 0:
                    self._update_active_candle(price, qty)
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
        poll_count = 0
        while self.is_active and self.feed_source == "alpaca":
            try:
                price = 0.0
                qty = 1.0

                # Try Alpaca SDK Client first
                if self.alpaca_key_id and self.alpaca_secret_key:
                    alpaca_sym = self.symbol.replace("USDT", "USD")
                    is_crypto = len(alpaca_sym) > 4 and "USD" in alpaca_sym
                    
                    try:
                        if is_crypto:
                            if "/" not in alpaca_sym:
                                alpaca_sym = f"{alpaca_sym[:-3]}/{alpaca_sym[-3:]}"
                            client = CryptoHistoricalDataClient(self.alpaca_key_id, self.alpaca_secret_key)
                            req_obj = CryptoLatestTradeRequest(symbol_or_symbols=alpaca_sym)
                            trade_res = client.get_crypto_latest_trade(req_obj)
                        else:
                            client = StockHistoricalDataClient(self.alpaca_key_id, self.alpaca_secret_key)
                            req_obj = StockLatestTradeRequest(symbol_or_symbols=alpaca_sym)
                            trade_res = client.get_stock_latest_trade(req_obj)
                            
                        if trade_res and alpaca_sym in trade_res:
                            trade = trade_res[alpaca_sym]
                            price = float(trade.price)
                            qty = float(trade.size)
                    except Exception as sdk_err:
                        self.log(f"[Alpaca SDK] REST error: {sdk_err}. Falling back to public feed.")

                # Fallback to Binance/Coinbase spot API or yfinance
                if price <= 0:
                    if "USD" in ticker or self.symbol.endswith("USDT"):
                        try:
                            price = _get_fallback_crypto_price(self.symbol)
                            qty = 1.0
                        except Exception:
                            pass
                    
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
                poll_count += 1
                
                # Try to self-heal back to WebSocket if that was our original target feed
                if self.original_feed_source == "alpaca_ws" and poll_count >= 12:
                    self.log("[Alpaca REST] 60 seconds passed since WebSocket disconnect. Attempting to restore WebSocket stream...")
                    self.feed_source = "alpaca_ws"
                    break
                    
            except Exception as e:
                self.log(f"[Alpaca REST] Error: {e}. Switching to Alpaca REST polling fallback.")
                self.feed_source = "alpaca"

    async def _alpaca_ws_loop(self):
        self.log(f"Starting Alpaca WebSocket feed for {self.symbol}…")
        if not self.alpaca_key_id or not self.alpaca_secret_key:
            self.log("[Alpaca WS] Missing API keys. Cannot start WebSocket stream. Falling back to Mock.")
            self.feed_source = "mock"
            return
 
        alpaca_sym = self.symbol.replace("USDT", "USD")
        is_crypto = len(alpaca_sym) > 4 and "USD" in alpaca_sym
        
        if is_crypto:
            if "/" not in alpaca_sym:
                alpaca_sym = f"{alpaca_sym[:-3]}/{alpaca_sym[-3:]}"
            stream = CryptoDataStream(self.alpaca_key_id, self.alpaca_secret_key)
        else:
            stream = StockDataStream(self.alpaca_key_id, self.alpaca_secret_key)
 
        self.log(f"[Alpaca WS] Connecting and subscribing using SDK to trades for {alpaca_sym}")
        
        try:
            async def trade_handler(data):
                price = float(data.price)
                qty = float(data.size)
                if price > 0:
                    self._update_active_candle(price, qty)
 
            # Subscribe using SDK
            stream.subscribe_trades(trade_handler, alpaca_sym)
 
            # Monitor loop to stop stream if state changes
            async def monitor_feed_source():
                while self.is_active and self.feed_source == "alpaca_ws":
                    await asyncio.sleep(1)
                await stream.stop()
 
            monitor_task = asyncio.create_task(monitor_feed_source())
 
            # Run stream
            await stream._run_forever()
            await monitor_task
            
        except Exception as e:
            self.log(f"[Alpaca WS] Connection closed or error: {e}. Switching to Alpaca REST polling fallback.")
            self.feed_source = "alpaca"

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
            elif fs == "alpaca_ws":
                await self._alpaca_ws_loop()
            elif fs == "binance_rest":
                await self._binance_rest_loop()
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
        self.persist_active_state()

    def pause(self):
        with self._lock:
            self.is_paused = True
            self.log("⏸ Bot paused by user.")
        self.persist_active_state()

    def resume(self):
        with self._lock:
            self.is_paused = False
            self.log("▶ Bot resumed by user.")
        self.persist_active_state()

    def stop(self, close_pct: float = 1.0):
        with self._lock:
            if not self.is_active:
                return
            self.is_active = False
            self.is_paused = False
            start_time = self.start_time
            self.start_time = None
            pos_qty = self.positions.get(self.symbol, 0.0)
            trades_snapshot = list(self.trades)
            cash_snapshot = self.cash
            starting_cash_snapshot = self.starting_cash
            bot_name = getattr(self, "name", None) or getattr(self, "strategy_name", None) or f"AI Agent ({self.timeframe})"
            last_alpha = self.last_alpha_rationale or ""
            custom_charts = {}
            if getattr(self, "strategy_instance", None) and hasattr(self.strategy_instance, "_custom_charts"):
                custom_charts = self.strategy_instance._custom_charts

        # Stop event loop immediately
        if self.loop and not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self.loop.stop)

        # Remove from active bots database
        try:
            from database import delete_active_bot
            delete_active_bot(self.bot_id)
        except Exception as e:
            self.log(f"Failed to delete active bot from DB: {e}")

        # Flatten Book on Stop (OUTSIDE LOCK so it does not block state queries)
        try:
            qty_to_close = pos_qty * close_pct
            if qty_to_close > 0.0001:
                self.log(f"Closing open position of {qty_to_close} ({(close_pct*100):.1f}%) {self.symbol} before shutting down...")
                self.place_market_order("SELL", qty_to_close)
            elif qty_to_close < -0.0001:
                self.log(f"Closing short position of {abs(qty_to_close)} ({(close_pct*100):.1f}%) {self.symbol} before shutting down...")
                self.place_market_order("BUY", abs(qty_to_close))
        except Exception as e:
            self.log(f"Failed to close position on shutdown: {e}")

        # Save session to history ledger (OUTSIDE LOCK)
        try:
            from database import save_bot_session
            import json
            
            if isinstance(start_time, (int, float)):
                start_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time))
            else:
                start_str = str(start_time) if start_time else "Unknown"
                
            end_str = time.strftime('%Y-%m-%d %H:%M:%S')
            
            trades_json = []
            wins = 0
            losses = 0
            
            for t in trades_snapshot:
                net_pnl = t.get("pnl", 0.0) - t.get("fee", 0.0)
                if t["action"] == "SELL" and t.get("pnl", 0.0) != 0.0:
                    if net_pnl > 0:
                        wins += 1
                    else:
                        losses += 1
                        
                ts = t.get("timestamp")
                if isinstance(ts, (int, float)):
                    t_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(ts))
                else:
                    t_time = str(ts)
                
                trades_json.append({
                    "symbol": self.symbol,
                    "side": t["action"],
                    "qty": t["qty"],
                    "entry_price": t["price"],
                    "exit_price": t["price"],
                    "entry_date": t_time,
                    "exit_date": t_time,
                    "pnl": t.get("pnl", 0.0),
                    "r_multiple": 0.0,
                    "fees": t.get("fee", 0.0),
                    "net_pnl": net_pnl
                })
            
            pnl = cash_snapshot - starting_cash_snapshot
            if len(trades_snapshot) > 0:
                pnl = sum(t.get("pnl", 0.0) - t.get("fee", 0.0) for t in trades_snapshot)

            save_bot_session(
                bot_id=self.bot_id,
                strategy_name=bot_name,
                symbol=self.symbol,
                start_time=start_str,
                end_time=end_str,
                start_cash=starting_cash_snapshot,
                end_cash=cash_snapshot,
                pnl=pnl,
                total_trades=len(trades_snapshot),
                wins=wins,
                losses=losses,
                trades_json=json.dumps(trades_json),
                last_alpha_rationale=last_alpha,
                custom_charts_json=json.dumps(custom_charts)
            )
            self.log("Session saved to History Ledger.")
        except Exception as e:
            self.log(f"Failed to save session history: {e}")
            
        self.log("Bot stopped and positions flattened.")

# ======================================================================
# AgenticLiveBot (Autonomous Mode)
# ======================================================================

class AgenticLiveBot(TradingBot):
    def __init__(self, bot_id, name, symbol, strategy_code, timeframe,
                 starting_cash=10000.0, feed_source="binance", alpaca_key_id="",
                 alpaca_secret_key="", hyperliquid_private_key="", risk_profile=None, agent_keys=None, agent_attitude="balanced", leverage_limit=1.0):
        super().__init__(bot_id, name, symbol, strategy_code, timeframe,
                         starting_cash, feed_source, alpaca_key_id, alpaca_secret_key, hyperliquid_private_key,
                         risk_profile, leverage_limit=leverage_limit)
        self.agent_keys = agent_keys or {}
        self.agent_attitude = agent_attitude

    def update_agent_keys(self, new_keys: dict):
        """Hot-swap the ADK keys for this bot without restarting."""
        self.agent_keys.update(new_keys)
        self.log("Agent API keys successfully hot-swapped.")

    def update_attitude(self, new_attitude: str):
        """Hot-swap the agent's risk attitude without restarting."""
        self.agent_attitude = new_attitude
        self.log(f"Agent attitude hot-swapped to: {new_attitude.upper()}")
        self.persist_active_state()

    async def _master_loop(self):
        fs = self.feed_source
        if fs == "alpaca":
            asyncio.create_task(self._alpaca_loop())
        elif fs == "yfinance":
            asyncio.create_task(self._yfinance_loop())
        elif fs == "binance_rest":
            asyncio.create_task(self._binance_rest_loop())
        elif fs == "mock":
            asyncio.create_task(self._mock_loop())
        else:
            asyncio.create_task(self._binance_loop())
            
        asyncio.create_task(self._agent_evaluation_loop())
        
        while self.is_active:
            await asyncio.sleep(1)

    async def _agent_evaluation_loop(self):
        """
        Background loop that polls the Multi-Agent ADK with adaptive interval.
        Backs off on rate-limit failures to avoid hammering the API.
        """
        from adk_agent import run_adk_validation
        import json
        self.log("Autonomous Agentic Loop Started.")
        
        # Adaptive interval: start at 90s, back off on failures, cap at 300s
        poll_interval = 90
        min_interval = 90
        max_interval = 300
        first_run = True
        
        while self.is_active:
            if first_run:
                await asyncio.sleep(5)  # Quick 5-second initial warmup
                first_run = False
            else:
                await asyncio.sleep(poll_interval)

            if getattr(self, "is_paused", False) or not self.is_active:
                continue

            self.log(f"Triggering ADK Daily Alpha Brief for {self.symbol}...")
            
            try:
                pos_qty = self.positions.get(self.symbol, 0.0)
                price = self.active_candle['close'] if self.active_candle else (
                    self.candles[-1]['close'] if self.candles else _get_fallback_crypto_price(self.symbol)
                )
                if price <= 0.0:
                    price = 50000.0 if "BTC" in self.symbol else (3000.0 if "ETH" in self.symbol else 150.0)

                port_val = self.cash + (pos_qty * price)
                
                account_profile = {
                    "balance": self.cash,
                    "positions": {self.symbol: pos_qty},
                    "unrealized_pnl": (pos_qty * price) - (pos_qty * getattr(self, 'avg_cost', price)),
                    "drawdown_limit": getattr(self.risk_manager, 'max_drawdown_pct', 5.0) if hasattr(self, 'risk_manager') else 5.0,
                    "max_allocation_pct": getattr(self.risk_manager, 'max_position_pct', 2.0) if hasattr(self, 'risk_manager') else 2.0
                }
                
                # Ensure Gemini key fallback from env
                effective_keys = dict(self.agent_keys)
                if not effective_keys.get("gemini"):
                    effective_keys["gemini"] = os.environ.get("GEMINI_API_KEY", "")

                res = await run_adk_validation(self.symbol, effective_keys, account_profile, self.agent_attitude)
                
                final_action = res.get("final_action", "ABORT")
                status = "APPROVED" if final_action == "EXECUTE" else "REJECTED"
                rationale = res.get("execution_notes", "")
                
                # Detect rate-limit in the response and adapt polling
                is_rate_limited = any(kw in rationale.lower() for kw in ["rate limit", "429", "quota", "exhausted"])
                
                if is_rate_limited:
                    poll_interval = min(poll_interval * 2, max_interval)
                    self.log(f"[Agentic] Rate limit detected — backing off to {poll_interval}s polling interval.")
                else:
                    poll_interval = min_interval
                
                # Append raw tool thoughts to the Alpha Brief
                thoughts = res.get("thoughts", [])
                if thoughts:
                    thoughts_str = "\n".join(f"- {t}" for t in thoughts if t.strip())
                    rationale = f"{rationale}\n\n**Agent Actions (Senpi/Hyperliquid):**\n{thoughts_str}"
                
                self.last_alpha_status = status
                self.last_alpha_rationale = rationale

                self.log(f"[Agentic] Alpha Brief Evaluation Status: {status}")
                self.log(f"[Agentic] Rationale: {rationale}")
                
                order = res.get("approved_order")
                if status == "APPROVED" and order:
                    direction = order.get("direction", "")
                    allocation_pct = res.get("allocation_pct", account_profile["max_allocation_pct"])
                    if direction == "BUY" and pos_qty <= 0:
                        qty = (port_val * (allocation_pct/100)) / price if price > 0 else 0.1
                        self.log(f"[Agentic->BUY] Executing autonomously based on Alpha Brief. Qty: {qty:.4f} (allocated {allocation_pct}%)")
                        self.stop_loss = float(order.get("stop_loss", 0.0))
                        self.take_profit = float(order.get("take_profit", 0.0))
                        self.log(f"[Agentic] Set SL: ${self.stop_loss:,.2f}, TP: ${self.take_profit:,.2f}")
                        self.place_market_order("BUY", qty)
                    elif direction == "SELL" and pos_qty > 0:
                        exit_pct = float(order.get("exit_size_pct", 100.0))
                        qty_to_sell = pos_qty * (exit_pct / 100.0)
                        self.log(f"[Agentic->SELL] Executing autonomously based on Alpha Brief. Qty: {qty_to_sell:.4f} ({exit_pct}% exit)")
                        self.place_market_order("SELL", qty_to_sell)
                    else:
                        self.log(f"[Agentic] Signal '{direction}' evaluated: already in desired state (pos={pos_qty}).")
                        
            except Exception as e:
                self.log(f"[Agentic Error] Failed to run ADK evaluation: {e}")
                poll_interval = min(poll_interval * 2, max_interval)

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
        self.global_risk_profile: dict = {
            "auto_rebalance_enabled": False,
            "auto_rebalance_interval_minutes": 30,
            "slippage_tolerance_pct": 0.5
        }
        self._lock = threading.Lock()
        
        # Start background risk rebalancer scheduler thread
        self._rebalance_thread = threading.Thread(target=self._auto_rebalance_loop, daemon=True, name="live-rebalancer")
        self._rebalance_thread.start()

    def log(self, message: str):
        print(f"[LiveSessionManager] {message}", flush=True)

    def restore_previous_active_bots(self):
        from database import get_active_bots
        import json
        
        try:
            active_list = get_active_bots()
        except Exception as e:
            self.log(f"Error querying active bots for restoration: {e}")
            return
            
        if not active_list:
            self.log("No previous active bots found in database to restore.")
            return
            
        self.log(f"Restoring {len(active_list)} active bot(s) from database...")
        for item in active_list:
            bot_id = item["bot_id"]
            name = item["name"]
            symbol = item["symbol"]
            strategy_code = item["strategy_code"]
            timeframe = item["timeframe"]
            starting_cash = float(item["starting_cash"])
            feed_source = item["feed_source"]
            alpaca_key_id = item["alpaca_key_id"] or ""
            alpaca_secret_key = item["alpaca_secret_key"] or ""
            hyperliquid_private_key = item["hyperliquid_private_key"] or ""
            
            risk_profile = {}
            if item["risk_profile_json"]:
                try:
                    risk_profile = json.loads(item["risk_profile_json"])
                except Exception:
                    pass
            
            agentic_mode = bool(item["agentic_mode"])
            agent_attitude = item["agent_attitude"] or "balanced"
            gemini_api_key = item["gemini_api_key"] or ""
            tech_agent_key = item["tech_agent_key"] or ""
            sentiment_agent_key = item["sentiment_agent_key"] or ""
            tradingview_agent_key = item["tradingview_agent_key"] or ""
            hyperliquid_agent_key = item["hyperliquid_agent_key"] or ""
            firecrawl_agent_key = item["firecrawl_agent_key"] or ""
            leverage_limit = float(item["leverage_limit"] or 1.0)
            
            # Start the bot with start_bot
            self.start_bot(
                bot_id=bot_id,
                name=name,
                symbol=symbol,
                strategy_code=strategy_code,
                timeframe=timeframe,
                starting_cash=starting_cash,
                feed_source=feed_source,
                alpaca_key_id=alpaca_key_id,
                alpaca_secret_key=alpaca_secret_key,
                hyperliquid_private_key=hyperliquid_private_key,
                risk_profile=risk_profile,
                agentic_mode=agentic_mode,
                agent_attitude=agent_attitude,
                gemini_api_key=gemini_api_key,
                tech_agent_key=tech_agent_key,
                sentiment_agent_key=sentiment_agent_key,
                tradingview_agent_key=tradingview_agent_key,
                hyperliquid_agent_key=hyperliquid_agent_key,
                firecrawl_agent_key=firecrawl_agent_key,
                leverage_limit=leverage_limit
            )
            
            # Now, override the bot's runtime states to restore where it was
            bot = self.get_bot(bot_id)
            if bot:
                with bot._lock:
                    if item["current_cash"] is not None:
                        bot.cash = float(item["current_cash"])
                    if item["positions_json"]:
                        try:
                            bot.positions = json.loads(item["positions_json"])
                        except Exception:
                            pass
                    if item["trades_json"]:
                        try:
                            bot.trades = json.loads(item["trades_json"])
                        except Exception:
                            pass
                    if item["avg_cost"] is not None:
                        bot.avg_cost = float(item["avg_cost"])
                    if item["realized_pnl"] is not None:
                        bot.realized_pnl = float(item["realized_pnl"])
                    if item["start_time"]:
                        try:
                            bot.start_time = float(item["start_time"])
                        except ValueError:
                            pass
                self.log(f"Successfully restored bot state for {name} ({symbol}) | Cash: ${bot.cash:.2f}")

    def update_global_risk_profile(self, profile: dict):
        with self._lock:
            self.global_risk_profile = profile
            for bot in self.bots.values():
                if hasattr(bot, "risk_manager"):
                    bot.risk_manager.update_profile(profile)
        self.log("Global risk profile updated across all active strategy bots.")

    # ------------------------------------------------------------------
    # Bot lifecycle
    # ------------------------------------------------------------------
    def start_bot(self, bot_id, name, symbol, strategy_code, timeframe,
                  starting_cash=10000.0, feed_source="binance",
                  alpaca_key_id="", alpaca_secret_key="", hyperliquid_private_key="", risk_profile=None,
                  agentic_mode=False, agent_attitude="balanced", gemini_api_key="", tech_agent_key="",
                  sentiment_agent_key="", tradingview_agent_key="",
                  hyperliquid_agent_key="", firecrawl_agent_key="", leverage_limit=1.0) -> bool:
        with self._lock:
            if bot_id in self.bots:
                self.bots[bot_id].stop()
            profile_to_use = risk_profile or self.global_risk_profile
            
            if agentic_mode:
                agent_keys = {
                    "gemini": gemini_api_key,
                    "tech": tech_agent_key,
                    "sentiment": sentiment_agent_key,
                    "tradingview": tradingview_agent_key,
                    "hyperliquid": hyperliquid_agent_key,
                    "firecrawl": firecrawl_agent_key
                }
                bot = AgenticLiveBot(bot_id, name, symbol, strategy_code, timeframe,
                                     starting_cash, feed_source, alpaca_key_id, alpaca_secret_key,
                                     hyperliquid_private_key=hyperliquid_private_key,
                                     risk_profile=profile_to_use, agent_keys=agent_keys, agent_attitude=agent_attitude, leverage_limit=leverage_limit)
            else:
                bot = TradingBot(bot_id, name, symbol, strategy_code, timeframe,
                                 starting_cash, feed_source, alpaca_key_id, alpaca_secret_key,
                                 hyperliquid_private_key=hyperliquid_private_key,
                                 risk_profile=profile_to_use, leverage_limit=leverage_limit)
            self.bots[bot_id] = bot
        bot.start()
        return True

    def pause_bot(self, bot_id: str) -> bool:
        bot = self.get_bot(bot_id)
        if bot:
            bot.pause()
            return True
        return False

    def resume_bot(self, bot_id: str) -> bool:
        bot = self.get_bot(bot_id)
        if bot:
            bot.resume()
            return True
        return False

    def stop_bot(self, bot_id: str, close_pct: float = 1.0):
        bot = self.get_bot(bot_id)
        if bot:
            bot.stop(close_pct=close_pct)

    def delete_bot(self, bot_id: str) -> bool:
        with self._lock:
            bot = self.bots.pop(bot_id, None)
        if bot and bot.is_active:
            bot.stop(close_pct=1.0)
        return True

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

    def update_keys_for_all_bots(self, new_keys: dict):
        with self._lock:
            for bot in self.bots.values():
                if isinstance(bot, AgenticLiveBot):
                    bot.update_agent_keys(new_keys)

    def update_attitude_for_bot(self, bot_id: str, new_attitude: str):
        bot = self.get_bot(bot_id)
        if isinstance(bot, AgenticLiveBot):
            bot.update_attitude(new_attitude)
            return True
        return False

    def rebalance_fleet_due_to_risk(self) -> tuple[bool, str]:
        """
        Performs volatility-inverse risk parity rebalancing across all active trading bots.
        High volatility bots have their positions scaled down.
        Drawdown penalties are applied (scaling down positions of bots that are losing).
        """
        with self._lock:
            active_bots = [b for b in self.bots.values() if b.is_active]
            if not active_bots:
                return False, "No active bots to rebalance."
            
            bot_metrics = []
            total_equity = 0.0
            
            for bot in active_bots:
                price = bot.active_candle['close'] if bot.active_candle else (bot.candles[-1]['close'] if bot.candles else 0.0)
                if price <= 0.0:
                    price = _get_fallback_crypto_price(bot.symbol)
                    if price <= 0.0:
                        continue
                
                qty = bot.positions.get(bot.symbol, 0.0)
                position_value = qty * price
                equity = bot.cash + position_value
                total_equity += equity
                
                # Volatility calculation based on last 20 candles
                closes = [c['close'] for c in bot.candles[-20:]] if len(bot.candles) >= 5 else []
                if len(closes) >= 5:
                    returns = [(closes[i] - closes[i-1])/closes[i-1] for i in range(1, len(closes))]
                    vol = float(np.std(returns)) if returns else 0.02
                else:
                    vol = 0.02
                
                if vol <= 0.0001:
                    vol = 0.02
                
                # Drawdown penalty
                drawdown = max(0.0, (bot.starting_cash - equity) / bot.starting_cash)
                drawdown_penalty = 1.0
                if drawdown > 0.02:
                    drawdown_penalty = 0.75
                if drawdown > 0.05:
                    drawdown_penalty = 0.50
                if drawdown > 0.08:
                    drawdown_penalty = 0.20
                
                bot_metrics.append({
                    "bot": bot,
                    "symbol": bot.symbol,
                    "price": price,
                    "qty": qty,
                    "equity": equity,
                    "vol": vol,
                    "drawdown_penalty": drawdown_penalty,
                    "raw_weight": 1.0 / vol
                })
            
            if not bot_metrics:
                return False, "No active bots with valid price feeds."
            
            # Normalize target weights
            total_raw_weight = sum(m["raw_weight"] for m in bot_metrics)
            if total_raw_weight <= 0.0:
                total_raw_weight = 1.0
                
            for m in bot_metrics:
                m["target_weight"] = (m["raw_weight"] / total_raw_weight) * m["drawdown_penalty"]
                m["target_value"] = total_equity * m["target_weight"]
                m["target_value"] = min(m["target_value"], m["equity"] * getattr(m["bot"], "leverage_limit", 1.0))
                m["target_qty"] = round(m["target_value"] / m["price"], 6)
            
            # Execute rebalancing orders
            actions = []
            for m in bot_metrics:
                bot = m["bot"]
                current_qty = m["qty"]
                target_qty = m["target_qty"]
                diff = target_qty - current_qty
                
                # Threshold of $5 to place trades to avoid dust orders
                if abs(diff) * m["price"] < 5.0:
                    continue
                
                if diff < 0:
                    sell_qty = abs(diff)
                    bot.log(f"[REBALANCE] Risk parity scale down: selling {sell_qty:.6f} {bot.symbol} (Target: {target_qty:.6f}, Vol: {m['vol']*100:.2f}%)")
                    bot.place_market_order("SELL", sell_qty)
                    actions.append(f"Scaled down {bot.symbol} by {sell_qty:.4f}")
                elif diff > 0:
                    buy_qty = min(diff, bot.cash / m["price"])
                    if buy_qty * m["price"] >= 5.0:
                        bot.log(f"[REBALANCE] Risk parity scale up: buying {buy_qty:.6f} {bot.symbol} (Target: {target_qty:.6f}, Vol: {m['vol']*100:.2f}%)")
                        bot.place_market_order("BUY", buy_qty)
                        actions.append(f"Scaled up {bot.symbol} by {buy_qty:.4f}")
            
            if not actions:
                return True, "Portfolio is already risk-balanced."
            
            return True, "Rebalanced: " + ", ".join(actions)

    def _auto_rebalance_loop(self):
        self.log("Auto-rebalance background scheduler thread active.")
        last_rebalance_time = time.time()
        while True:
            time.sleep(10)
            try:
                profile = self.global_risk_profile
                enabled = profile.get("auto_rebalance_enabled", False)
                interval = profile.get("auto_rebalance_interval_minutes", 30)
                if enabled and interval > 0:
                    now = time.time()
                    if now - last_rebalance_time >= interval * 60:
                        self.log("[Auto-Rebalance] Scheduled interval reached. Triggering fleet risk rebalancer...")
                        success, msg = self.rebalance_fleet_due_to_risk()
                        self.log(f"[Auto-Rebalance] Rebalance finished. Success={success} | {msg}")
                        last_rebalance_time = now
            except Exception as e:
                self.log(f"[Auto-Rebalance] Exception in loop: {e}")

    def panic_stop_all(self) -> list[str]:
        """
        Panic switch: stops all active bots and flattens/liquidates 100% of their positions.
        """
        self.log("[PANIC] Global panic triggered! Stopping and liquidating all active bots...")
        with self._lock:
            bot_ids = list(self.bots.keys())
        
        for bid in bot_ids:
            try:
                self.stop_bot(bid, close_pct=1.0)
                self.log(f"[PANIC] Successfully stopped and flattened bot: {bid}")
            except Exception as e:
                self.log(f"[PANIC] Error stopping bot {bid}: {e}")
        return bot_ids

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


    @property
    def is_active(self):
        bot = self.bots.get("default")
        return bot.is_active if bot else False

    def get_state(self):
        if "default" not in self.bots:
            return {
                "bot_id": "default",
                "name": "Manual Trading Bot",
                "is_active": False,
                "symbol": "BTCUSDT",
                "timeframe": "10s",
                "feed_source": "mock",
                "starting_cash": 10000.0,
                "cash": 10000.0,
                "portfolio_value": 10000.0,
                "positions": {},
                "avg_cost": 0.0,
                "realized_pnl": 0.0,
                "unrealized_pnl": 0.0,
                "total_pnl": 0.0,
                "pnl_pct": 0.0,
                "win_rate": 0.0,
                "running_time": "00:00:00",
                "trade_count": 0,
                "trades": [],
                "limit_orders": [],
                "candles": [],
                "active_candle": None,
                "logs": []
            }
        return self.bots["default"].get_state()

    def reset_account(self, starting_cash: float = 10000.0):
        bot = self.bots.get("default")
        if bot:
            bot.stop()
        self.start_bot("default", "Manual Trading Bot", "BTCUSDT", "", "10s",
                       starting_cash, "mock")

    def start_session(self, symbol="BTCUSDT", strategy_code="", timeframe="10s", feed_source="mock",
                      alpaca_key_id="", alpaca_secret_key="", risk_profile=None) -> bool:
        return self.start_bot("default", "Default Bot", symbol, strategy_code, timeframe,
                              starting_cash=10000.0, feed_source=feed_source,
                              alpaca_key_id=alpaca_key_id, alpaca_secret_key=alpaca_secret_key,
                              risk_profile=risk_profile)

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
