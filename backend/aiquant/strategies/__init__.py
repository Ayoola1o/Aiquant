"""
aiquant.strategies  —  Native Aiquant Strategy library compatible with Jesse's API.
"""
from __future__ import annotations
import numpy as np
import math
from functools import wraps


def cached(func):
    """
    Caches the results of a function. 
    In backtests, the Aiquant engine will clear the strategy's _cache dictionary every new candle.
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if not hasattr(self, '_cache'):
            self._cache = {}
        
        # Simple key based on function name (since most use cases are parameter-less properties)
        key = func.__name__
        if key not in self._cache:
            self._cache[key] = func(self, *args, **kwargs)
        return self._cache[key]
    return wrapper


class Position:
    """Mirrors the Jesse Position object that strategies read via self.position."""
    def __init__(self):
        self.qty: float = 0.0
        self.entry_price: float = 0.0
        self.current_price: float = 0.0
        self.opened_at: int | None = None

    @property
    def value(self) -> float:
        return abs(self.qty * self.current_price)

    @property
    def type(self) -> str:
        if self.qty > 0:
            return 'long'
        elif self.qty < 0:
            return 'short'
        return 'close'

    @property
    def pnl(self) -> float:
        if self.qty == 0 or self.entry_price == 0:
            return 0.0
        if self.type == 'long':
            return (self.current_price - self.entry_price) * self.qty
        else:
            return (self.entry_price - self.current_price) * abs(self.qty)

    @property
    def pnl_percentage(self) -> float:
        if self.qty == 0 or self.entry_price == 0:
            return 0.0
        if self.type == 'long':
            return (self.current_price - self.entry_price) / self.entry_price * 100.0
        else:
            return (self.entry_price - self.current_price) / self.entry_price * 100.0

    @property
    def is_open(self) -> bool:
        return abs(self.qty) > 1e-10

    @property
    def is_close(self) -> bool:
        return not self.is_open

    def __repr__(self):
        return f"<Position type={self.type} qty={self.qty:.6f} entry={self.entry_price:.4f} pnl={self.pnl:.4f}>"


class Order:
    def __init__(self, side: str, qty: float, price: float, is_take_profit: bool = False, is_stop_loss: bool = False):
        self.side = side
        self.qty = qty
        self.price = price
        self.is_take_profit = is_take_profit
        self.is_stop_loss = is_stop_loss

    def __repr__(self):
        return f"<Order {self.side} qty={self.qty:.6f} @ {self.price:.4f}>"


class CompletedTrade:
    """Placeholder for trade metrics."""
    pass


class Strategy:
    """
    Aiquant Native Strategy base class compatible with the Jesse API.
    """
    
    # ── internal engine fields ──
    _candles: np.ndarray
    _balance: float
    _available_margin: float
    _position: Position
    _commission_pct: float
    _cache: dict
    
    # ── user-settable order fields ──
    buy = None            
    sell = None           
    stop_loss = None      
    take_profit = None    

    # ── internal flags & states ──
    _liquidate_flag: bool = False
    _index: int = 0
    _last_trade_index: int = -1

    def __init__(self):
        self._candles = np.empty((0, 6))
        self._position = Position()
        self._balance = 10_000.0
        self._available_margin = 10_000.0
        self._commission_pct = 0.001
        self.hp: dict = {}           
        self.shared_vars: dict = {}
        self.vars: dict = {}
        
        self.buy = None
        self.sell = None
        self.stop_loss = None
        self.take_profit = None
        self._liquidate_flag = False
        self._cache = {}
        self.fee_rate = 0.001

        
        # internal tracking
        self._index = 0
        self._last_trade_index = -1
        self._orders = []
        self._trades = []

    # ── candle convenience properties ──
    @property
    def candles(self) -> np.ndarray:
        return self._candles

    @candles.setter
    def candles(self, value: np.ndarray):
        self._candles = value

    @property
    def price(self) -> float:
        return self.close

    @property
    def close(self) -> float:
        return float(self._candles[-1, 2]) if len(self._candles) > 0 else 0.0

    @property
    def open(self) -> float:
        return float(self._candles[-1, 1]) if len(self._candles) > 0 else 0.0

    @property
    def high(self) -> float:
        return float(self._candles[-1, 3]) if len(self._candles) > 0 else 0.0

    @property
    def low(self) -> float:
        return float(self._candles[-1, 4]) if len(self._candles) > 0 else 0.0

    @property
    def volume(self) -> float:
        return float(self._candles[-1, 5]) if len(self._candles) > 0 else 0.0

    @property
    def time(self) -> int:
        return int(self._candles[-1, 0]) if len(self._candles) > 0 else 0

    @property
    def current_candle(self) -> np.ndarray:
        return self._candles[-1] if len(self._candles) > 0 else np.zeros(6)

    # ── account / position properties ──
    @property
    def position(self) -> Position:
        return self._position

    @property
    def all_positions(self) -> dict:
        # In a multi-route setup, this would return a dict of route_name -> Position.
        # Since Aiquant currently simulates single-route heavily, we return a mock dict.
        return {"DEFAULT": self._position}

    @property
    def balance(self) -> float:
        return self._balance

    @property
    def available_margin(self) -> float:
        return self._available_margin

    @property
    def is_long(self) -> bool:
        return self._position.qty > 0

    @property
    def is_short(self) -> bool:
        return self._position.qty < 0

    @property
    def is_open(self) -> bool:
        return self._position.is_open

    @property
    def is_close(self) -> bool:
        return self._position.is_close

    # ── Environment Context ──
    @property
    def is_backtesting(self) -> bool:
        return True

    @property
    def is_livetrading(self) -> bool:
        return False

    @property
    def is_papertrading(self) -> bool:
        return False

    @property
    def is_live(self) -> bool:
        return self.is_livetrading or self.is_papertrading

    @property
    def is_spot_trading(self) -> bool:
        return True

    @property
    def is_futures_trading(self) -> bool:
        return False

    @property
    def exchange_type(self) -> str:
        return "spot" if self.is_spot_trading else "futures"

    @property
    def leverage(self) -> int:
        return 1

    @property
    def liquidation_price(self) -> float:
        return 0.0  # N/A for spot
        
    @property
    def mark_price(self) -> float:
        return self.price
        
    @property
    def funding_rate(self) -> float:
        return 0.0

    @property
    def next_funding_timestamp(self) -> int | None:
        return None

    @property
    def exchange(self) -> str:
        return "ALPACA"

    @property
    def symbol(self) -> str:
        return "ASSET"

    @property
    def timeframe(self) -> str:
        return "1m"


    # ── Tracking metrics ──
    @property
    def index(self) -> int:
        return self._index

    @property
    def last_trade_index(self) -> int:
        return self._last_trade_index

    @property
    def has_long_entry_orders(self) -> bool:
        return self.buy is not None

    @property
    def has_short_entry_orders(self) -> bool:
        return self.sell is not None

    @property
    def orders(self) -> list[Order]:
        return self._orders

    @property
    def trades(self) -> list[CompletedTrade]:
        return self._trades
        
    @property
    def metrics(self) -> dict | None:
        if len(self._trades) == 0:
            return None
        return {}  # Mock implementation for backtester engine to fill

    @property
    def reduced_count(self) -> int:
        # A mock value for now. 
        return 0

    # ── methods users override ──
    def before(self):
        pass

    def after(self):
        pass

    def should_long(self) -> bool:
        return False

    def should_short(self) -> bool:
        return False

    def go_long(self):
        pass

    def go_short(self):
        pass

    def update_position(self):
        pass

    def should_cancel_entry(self) -> bool:
        return False

    def filters(self) -> list[bool]:
        return []

    # ── events ──
    def on_open_position(self, order: Order):
        pass

    def on_close_position(self, order: Order):
        pass

    def on_increased_position(self, order: Order):
        pass

    def on_reduced_position(self, order: Order):
        pass

    def on_cancel(self):
        pass

    def on_route_open_position(self, order: Order):
        pass

    def on_route_close_position(self, order: Order):
        pass

    def on_route_increased_position(self, order: Order):
        pass

    def on_route_reduced_position(self, order: Order):
        pass

    def on_route_canceled(self, route):
        pass

    # ── utility helpers ──
    def liquidate(self):
        self._liquidate_flag = True

    def log(self, msg: str, log_type: str = 'info', send_notification: bool = False, webhook: str = None):
        print(f"[Strategy {log_type.upper()}] {msg}")

    def watch_list(self) -> list:
        return []

    def get_candles(self, exchange: str = None, symbol: str = None, timeframe: str = None) -> np.ndarray:
        """Returns self.candles, resampled for 4h or 1D if necessary."""
        if not timeframe or timeframe == '1h' or len(self._candles) == 0:
            return self._candles
            
        if timeframe not in ('4h', '1D', '1d'):
            return self._candles
            
        group_size = 4 if timeframe == '4h' else 24
        group_ms = group_size * 3600000
        
        ts = self._candles[:, 0]
        blocks = (ts // group_ms)
        
        changes = np.where(np.diff(blocks) != 0)[0] + 1
        if len(changes) == 0:
            s = self._candles
            return np.array([[s[0, 0], s[0, 1], s[-1, 2], np.max(s[:, 3]), np.min(s[:, 4]), np.sum(s[:, 5])]])
            
        splits = np.split(self._candles, changes)
        res = np.empty((len(splits), 6))
        for i, s in enumerate(splits):
            res[i, 0] = s[0, 0]
            res[i, 1] = s[0, 1]
            res[i, 2] = s[-1, 2]
            res[i, 3] = np.max(s[:, 3])
            res[i, 4] = np.min(s[:, 4])
            res[i, 5] = np.sum(s[:, 5])
            
        return res
