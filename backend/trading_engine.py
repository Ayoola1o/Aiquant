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
            "max_heartbeat_stale_seconds": 30
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
                 alpaca_key_id="", alpaca_secret_key="", hyperliquid_private_key="", risk_profile=None):
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
        
        self.risk_manager = RiskManager(risk_profile)
        self.last_tick_time = time.time()

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
                acc_res = requests.get("https://paper-api.alpaca.markets/v2/account", headers=self._alpaca_headers(), timeout=5)
                if acc_res.status_code == 200:
                    acc_info = acc_res.json()
                    shorting_enabled = acc_info.get("shorting_enabled", False)
                    if acc_info.get("trading_blocked", False):
                        self.log("[Alpaca] Order rejected: Account is blocked from trading.")
                        return False

                    if action == "BUY" and notional <= 0 and current_price > 0:
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
                    pos_res = requests.get("https://paper-api.alpaca.markets/v2/positions", headers=self._alpaca_headers(), timeout=5)
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
            if notional > 0:
                payload = {
                    "symbol": alpaca_sym,
                    "notional": str(round(notional, 2)),
                    "side": action.lower(),
                    "type": "market",
                    "time_in_force": "day",  # notional orders require TIF=day
                }
                self.log(f"[Alpaca] Sending FRACTIONAL MARKET {action} ${notional:.2f} of {alpaca_sym}…")
            else:
                payload = {
                    "symbol": alpaca_sym,
                    "qty": str(qty),
                    "side": action.lower(),
                    "type": "market",
                    "time_in_force": "gtc",
                }
                self.log(f"[Alpaca] Sending MARKET {action} {qty} {alpaca_sym}…")

            try:
                r = requests.post("https://paper-api.alpaca.markets/v2/orders",
                                  headers={**self._alpaca_headers(), "Content-Type": "application/json"},
                                  json=payload, timeout=6)
                if r.status_code in (200, 201):
                    order = r.json()
                    fill_price = float(order.get("filled_avg_price") or 0)
                    if fill_price == 0 and self.active_candle:
                        fill_price = self.active_candle["close"]
                    actual_qty = float(order.get("filled_qty") or qty)
                    self.log(f"[Alpaca] Order accepted — id: {order.get('id')} | status: {order.get('status')}")
                    time.sleep(1)
                    old_cost = self.avg_cost
                    self.sync_alpaca_account()
                    self.sync_alpaca_positions()
                    pnl = (fill_price - old_cost) * actual_qty if action == "SELL" and old_cost else 0.0
                    self.realized_pnl += pnl
                    self._record_trade(action, fill_price, actual_qty, 0.0, pnl)
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
                
                action = action.upper()
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
                "last_alpha_status": self.last_alpha_status,
                "last_alpha_rationale": self.last_alpha_rationale,
            }

    # ------------------------------------------------------------------
    # Candle helpers
    # ------------------------------------------------------------------
    def _update_active_candle(self, price: float, qty: float):
        now = time.time()
        self.last_tick_time = now
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

    def stop(self, close_pct: float = 1.0):
        with self._lock:
            if not self.is_active:
                return
            
            # --- Flatten Book on Stop ---
            try:
                pos_qty = self.positions.get(self.symbol, 0.0)
                qty_to_close = pos_qty * close_pct
                if qty_to_close > 0.0001:
                    self.log(f"Closing open position of {qty_to_close} ({(close_pct*100):.1f}%) {self.symbol} before shutting down...")
                    self.place_market_order("SELL", qty_to_close)
                elif qty_to_close < -0.0001:
                    self.log(f"Closing short position of {abs(qty_to_close)} ({(close_pct*100):.1f}%) {self.symbol} before shutting down...")
                    self.place_market_order("BUY", abs(qty_to_close))
            except Exception as e:
                self.log(f"Failed to close position on shutdown: {e}")
            # ---------------------------

            # Save session to history ledger
            try:
                from database import save_bot_session
                import json
                
                start_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(self.start_time)) if self.start_time else "Unknown"
                end_str = time.strftime('%Y-%m-%d %H:%M:%S')
                
                trades_json = []
                wins = 0
                losses = 0
                
                for t in self.trades:
                    net_pnl = t.get("pnl", 0.0) - t.get("fee", 0.0)
                    if t["action"] == "SELL" and t.get("pnl", 0.0) != 0.0:
                        if net_pnl > 0:
                            wins += 1
                        else:
                            losses += 1
                            
                    t_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t["timestamp"]))
                    
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
                
                pnl = self.cash - self.starting_cash
                if len(self.trades) > 0:
                    pnl = sum(t.get("pnl", 0.0) - t.get("fee", 0.0) for t in self.trades)
                
                bot_name = getattr(self, "strategy_name", f"AI Agent ({self.timeframe})")
                
                save_bot_session(
                    bot_id=self.bot_id,
                    strategy_name=bot_name,
                    symbol=self.symbol,
                    start_time=start_str,
                    end_time=end_str,
                    start_cash=self.starting_cash,
                    end_cash=self.cash,
                    pnl=pnl,
                    total_trades=len(self.trades),
                    wins=wins,
                    losses=losses,
                    trades_json=json.dumps(trades_json),
                    last_alpha_rationale=self.last_alpha_rationale or ""
                )
                self.log("Session saved to History Ledger.")
            except Exception as e:
                self.log(f"Failed to save session history: {e}")
                
            self.is_active = False
            self.start_time = None
        if self.loop and not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self.loop.stop)
        self.log("Bot stopped and positions flattened.")

# ======================================================================
# AgenticLiveBot (Autonomous Mode)
# ======================================================================

class AgenticLiveBot(TradingBot):
    def __init__(self, bot_id, name, symbol, strategy_code, timeframe,
                 starting_cash=10000.0, feed_source="binance", alpaca_key_id="",
                 alpaca_secret_key="", hyperliquid_private_key="", risk_profile=None, agent_keys=None):
        super().__init__(bot_id, name, symbol, strategy_code, timeframe,
                         starting_cash, feed_source, alpaca_key_id, alpaca_secret_key, hyperliquid_private_key,
                         risk_profile)
        self.agent_keys = agent_keys or {}

    def update_agent_keys(self, new_keys: dict):
        """Hot-swap the ADK keys for this bot without restarting."""
        self.agent_keys.update(new_keys)
        self.log("Agent API keys successfully hot-swapped.")

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
        Background loop that polls the Multi-Agent ADK every 60 seconds for cognitive trade validation.
        """
        from adk_agent import run_adk_validation
        import json
        self.log("Autonomous Agentic Loop Started.")
        
        while self.is_active:
            await asyncio.sleep(60) # Demo polling frequency
            self.log(f"Triggering ADK Daily Alpha Brief for {self.symbol}...")
            
            try:
                pos_qty = self.positions.get(self.symbol, 0.0)
                price = self.active_candle['close'] if self.active_candle else 0.0
                port_val = self.cash + (pos_qty * price)
                
                # Extract account profile (positions, balance, etc.)
                account_profile = {
                    "balance": self.cash,
                    "positions": {self.symbol: pos_qty},
                    "unrealized_pnl": (pos_qty * price) - (pos_qty * getattr(self, 'entry_price', price)),
                    "drawdown_limit": getattr(self.risk_manager, 'max_drawdown_pct', 5.0) if hasattr(self, 'risk_manager') else 5.0,
                    "max_allocation_pct": getattr(self.risk_manager, 'max_position_pct', 2.0) if hasattr(self, 'risk_manager') else 2.0
                }
                
                res = await run_adk_validation(self.symbol, self.agent_keys, account_profile)
                
                status = res.get("status", "REJECTED")
                rationale = res.get("risk_assessment", "")
                
                # Append raw tool thoughts (Senpi/Hyperliquid actions) to the Alpha Brief
                thoughts = res.get("thoughts", [])
                if thoughts:
                    thoughts_str = "\n".join(f"- {t}" for t in thoughts if t.strip())
                    rationale = f"{rationale}\n\n**Agent Actions (Senpi/Hyperliquid):**\n{thoughts_str}"
                
                self.last_alpha_status = status
                self.last_alpha_rationale = rationale

                self.log(f"[Agentic] Alpha Brief Evaluation Status: {status}")
                self.log(f"[Agentic] Rationale: {rationale}")
                
                order = res.get("validated_order")
                if status == "APPROVED" and order:
                    direction = order.get("direction", "")
                    if direction == "BUY" and pos_qty <= 0:
                        qty = (port_val * (account_profile["max_allocation_pct"]/100)) / price if price > 0 else 0.1
                        self.log(f"[Agentic->BUY] Executing autonomously based on Alpha Brief. Qty: {qty:.4f}")
                        self.place_market_order("BUY", qty)
                    elif direction == "SELL" and pos_qty > 0:
                        exit_pct = getattr(self.risk_manager, 'profile', {}).get("exit_size_pct", 100.0)
                        if order.get("exit_size_pct"):
                            exit_pct = float(order["exit_size_pct"])
                            
                        qty_to_sell = pos_qty * (exit_pct / 100.0)
                        self.log(f"[Agentic->SELL] Executing autonomously based on Alpha Brief. Qty: {qty_to_sell:.4f} ({exit_pct}% exit)")
                        self.place_market_order("SELL", qty_to_sell)
                    else:
                        self.log(f"[Agentic] Signal '{direction}' ignored: already in desired state (pos={pos_qty}).")
                        
            except Exception as e:
                self.log(f"[Agentic Error] Failed to run ADK evaluation: {e}")

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
        self.global_risk_profile: dict = {}
        self._lock = threading.Lock()

    def log(self, message: str):
        print(f"[LiveSessionManager] {message}", flush=True)

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
                  agentic_mode=False, gemini_api_key="", tech_agent_key="",
                  sentiment_agent_key="", tradingview_agent_key="",
                  hyperliquid_agent_key="", firecrawl_agent_key="") -> bool:
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
                                     risk_profile=profile_to_use, agent_keys=agent_keys)
            else:
                bot = TradingBot(bot_id, name, symbol, strategy_code, timeframe,
                                 starting_cash, feed_source, alpaca_key_id, alpaca_secret_key,
                                 hyperliquid_private_key=hyperliquid_private_key,
                                 risk_profile=profile_to_use)
            self.bots[bot_id] = bot
        bot.start()
        return True

    def stop_bot(self, bot_id: str, close_pct: float = 1.0):
        with self._lock:
            bot = self.bots.pop(bot_id, None)
        if bot:
            bot.stop(close_pct=close_pct)

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
