"""
jesse/utils.py  —  Aiquant shim for Jesse utility functions.

Provides the same function signatures as the real Jesse framework so that
strategy files using `from jesse import utils` work without changes.
"""
from __future__ import annotations
import math


def estimate_risk(entry_price: float, stop_price: float) -> float:
    """Risk per unit = |entry - stop|."""
    return abs(entry_price - stop_price)


def kelly_criterion(win_rate: float, ratio_avg_win_loss: float) -> float:
    """Kelly fraction: W - (1-W)/R."""
    if ratio_avg_win_loss <= 0:
        return 0.0
    return win_rate - (1.0 - win_rate) / ratio_avg_win_loss


def risk_to_qty(
    capital: float,
    risk_per_capital: float,
    entry_price: float,
    stop_loss_price: float,
    precision: int = 8,
    fee_rate: float = 0.0,
) -> float:
    """
    How many units to buy so that a move from entry to stop_loss costs exactly
    `risk_per_capital` percent of `capital`.
    """
    if entry_price <= 0 or stop_loss_price <= 0:
        return 0.0
    risk_amount = capital * (risk_per_capital / 100.0)
    risk_per_unit = abs(entry_price - stop_loss_price)
    if risk_per_unit < 1e-12:
        return 0.0
    qty = risk_amount / risk_per_unit
    # Subtract fee impact
    if fee_rate > 0:
        qty *= 1.0 - fee_rate
    return round(qty, precision)


def risk_to_size(
    capital_size: float,
    risk_percentage: float,
    risk_per_qty: float,
    entry_price: float,
) -> float:
    """Dollar position size derived from risk percentage."""
    if risk_per_qty <= 0 or entry_price <= 0:
        return 0.0
    risk_amount = capital_size * (risk_percentage / 100.0)
    qty = risk_amount / risk_per_qty
    return qty * entry_price


def size_to_qty(
    position_size: float,
    price: float,
    precision: int = 8,
    fee_rate: float = 0.0,
) -> float:
    """Convert dollar position size → quantity at `price`."""
    if price <= 0:
        return 0.0
    qty = position_size / price
    if fee_rate > 0:
        qty *= 1.0 - fee_rate
    return round(qty, precision)


def qty_to_size(qty: float, price: float) -> float:
    """Convert quantity → dollar position size."""
    return qty * price


def limit_stop_loss(
    entry_price: float,
    stop_price: float,
    trade_type: str,
    max_allowed_risk_percentage: float,
) -> float:
    """
    Clamps stop_price so the risk never exceeds max_allowed_risk_percentage
    of the entry_price.
    """
    max_risk = entry_price * (max_allowed_risk_percentage / 100.0)
    if trade_type.lower() == "long":
        min_stop = entry_price - max_risk
        return max(stop_price, min_stop)
    else:
        max_stop = entry_price + max_risk
        return min(stop_price, max_stop)


# ── numpy helpers (imported lazily to avoid hard dependency) ──────────────────
def prices_to_returns(price_series):
    import numpy as np
    arr = np.asarray(price_series, dtype=float)
    return np.diff(arr) / arr[:-1]


def z_score(price_returns):
    import numpy as np
    arr = np.asarray(price_returns, dtype=float)
    mu = arr.mean()
    sigma = arr.std()
    if sigma < 1e-12:
        return arr * 0
    return (arr - mu) / sigma


def are_cointegrated(price_returns_1, price_returns_2, cutoff: float = 0.05) -> bool:
    try:
        from statsmodels.tsa.stattools import coint
        _, p_value, _ = coint(price_returns_1, price_returns_2)
        return p_value < cutoff
    except ImportError:
        return False
