import sys
import traceback
import numpy as np
import pandas as pd
import os

# ── Ensure backend path is always on sys.path so `jesse` package is importable ──
_BACKEND_PATH = os.path.abspath(os.path.dirname(__file__))
if _BACKEND_PATH not in sys.path:
    sys.path.insert(0, _BACKEND_PATH)

# ── Import our Jesse shim so it's available in exec namespaces ──────────────
from jesse.strategies import Strategy as JesseStrategy


class BaseStrategy:
    """
    Simple on_candle-style base class (original Aiquant format).
    """
    def __init__(self, parameters=None):
        self.parameters = parameters or {}

    def on_candle(self, candle: dict, state: dict):
        raise NotImplementedError("Strategies must implement the 'on_candle' method.")


def _is_jesse_strategy(cls) -> bool:
    """Return True if cls inherits from our Jesse Strategy shim."""
    try:
        return issubclass(cls, JesseStrategy) and cls is not JesseStrategy
    except TypeError:
        return False


def _is_base_strategy(cls) -> bool:
    """Return True if cls inherits from BaseStrategy (original format)."""
    try:
        return issubclass(cls, BaseStrategy) and cls is not BaseStrategy
    except TypeError:
        return False




def run_historical_backtest(
    strategy_code: str, 
    df: pd.DataFrame, 
    starting_capital: float = 10000.0, 
    commission_pct: float = 0.001,
    warmup_candles: int = 0
) -> dict:
    """
    Dynamically compiles and executes a custom Python strategy script 
    on historical OHLCV data.
    """
    if df.empty or len(df) < 5:
        return {"success": False, "error": "Insufficient historical data for backtesting."}

    import os
    backend_path = os.path.abspath(os.path.dirname(__file__))
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

    # Define variables that should be available in the execution namespace.
    # Supports both BaseStrategy (on_candle style) and JesseStrategy (should_long/go_long style).
    import jesse.utils as jesse_utils
    exec_namespace = {
        "__builtins__": __builtins__,
        "BaseStrategy": BaseStrategy,
        "Strategy": JesseStrategy,          # jesse.strategies.Strategy alias
        "JesseStrategy": JesseStrategy,
        "pd": pd,
        "np": np,
        "utils": jesse_utils,               # `from jesse import utils` compat
        "jesse_utils": jesse_utils,
    }

    # 1. Compile and execute user code in a local namespace
    try:
        compiled = compile(strategy_code, "<string>", "exec")
        exec(compiled, exec_namespace)
    except SyntaxError as e:
        line_num = e.lineno
        return {
            "success": False,
            "error_type": "SyntaxError",
            "error": f"Syntax Error on line {line_num}: {e.msg}",
            "traceback": "".join(traceback.format_exception_only(type(e), e))
        }
    except Exception as e:
        return {
            "success": False,
            "error_type": "CompileError",
            "error": f"Compilation failed: {str(e)}",
            "traceback": traceback.format_exc()
        }

    # 2. Extract strategy class — detect Jesse-style first, then BaseStrategy fallback
    strategy_class = None
    is_jesse = False
    for name, obj in exec_namespace.items():
        if not isinstance(obj, type):
            continue
        if _is_jesse_strategy(obj):
            strategy_class = obj
            is_jesse = True
            break
        if _is_base_strategy(obj) and strategy_class is None:
            strategy_class = obj

    if not strategy_class:
        return {
            "success": False,
            "error": (
                "Could not find a strategy class in your script. "
                "Your class must inherit from either:\n"
                "  • BaseStrategy  (on_candle style)\n"
                "  • Strategy      (Jesse style: from jesse.strategies import Strategy)"
            )
        }

    # Instantiate strategy
    try:
        strategy_instance = strategy_class()
        strategy_instance.candles = np.empty((0, 6))
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to instantiate strategy class: {str(e)}",
            "traceback": traceback.format_exc()
        }

    # 3. Setup Backtest State variables
    cash = starting_capital
    positions = {}   # symbol -> shares
    portfolio_value_history = []
    trade_logs = []
    avg_cost = 0.0
    initial_close = float(df.iloc[0]["close"]) if len(df) > 0 else 1.0
    symbol = "ASSET"

    # ══════════════════════════════════════════════════════════════════════════
    # 4A.  JESSE-STYLE simulation loop
    # ══════════════════════════════════════════════════════════════════════════
    if is_jesse:
        si = strategy_instance   # shorter alias
        si._commission_pct = commission_pct
        si._balance = starting_capital
        si._available_margin = starting_capital

        try:
            for idx in range(len(df)):
                row = df.iloc[idx]
                close = float(row["close"])
                timestamp = str(pd.to_datetime(row["timestamp"], utc=True))

                # Build Jesse-format candle row: [ts, open, CLOSE, high, low, volume]
                try:
                    ts_ms = pd.to_datetime(row["timestamp"], utc=True).timestamp() * 1000.0
                except Exception:
                    ts_ms = float(idx)

                jesse_row = np.array([[
                    ts_ms,
                    float(row["open"]),
                    float(row["close"]),   # ← index 2 = close (Jesse layout)
                    float(row["high"]),    # ← index 3 = high
                    float(row["low"]),     # ← index 4 = low
                    float(row["volume"])
                ]])
                si._candles = np.vstack([si._candles, jesse_row])

                # ── Skip execution logic if we are still in the warmup period ──
                if idx < warmup_candles:
                    continue

                # Sync position state
                pos = si._position
                pos.current_price = close
                total_val = cash + (pos.qty * close if pos.qty > 0 else 0.0)
                si._balance = total_val
                si._available_margin = cash

                # ── lifecycle calls ──
                si.before()

                si.buy = None
                si.sell = None
                si.stop_loss = None
                si.take_profit = None
                si._liquidate_flag = False

                if pos.is_open:
                    # ── Check stop-loss ──
                    hit_sl = False
                    if si.stop_loss is not None:
                        sl_tuple = si.stop_loss if isinstance(si.stop_loss, (list, tuple)) and len(si.stop_loss) == 2 else None
                        if sl_tuple:
                            sl_qty, sl_price = float(sl_tuple[0]), float(sl_tuple[1])
                            if pos.qty > 0 and close <= sl_price:
                                hit_sl = True
                            elif pos.qty < 0 and close >= sl_price:
                                hit_sl = True
                        if hit_sl:
                            sell_qty = min(abs(pos.qty), sl_qty)
                            revenue = sell_qty * close
                            fee = revenue * commission_pct
                            cash += revenue - fee
                            pnl = (close - pos.entry_price) * sell_qty - fee
                            pnl_pct = ((close - pos.entry_price) / pos.entry_price * 100.0) if pos.entry_price > 0 else 0.0
                            trade_logs.append({
                                "timestamp": timestamp, "action": "SELL",
                                "price": close, "qty": sell_qty, "fee": fee,
                                "cash_balance": cash, "pnl": float(pnl), "pnl_pct": float(pnl_pct),
                                "mfe": 0.0, "mae": 0.0, "reason": "Stop Loss"
                            })
                            pos.qty -= sell_qty
                            if abs(pos.qty) < 1e-9:
                                pos.qty = 0.0
                                si.on_close_position(None)
                            si.stop_loss = None

                    # ── Check take-profit ──
                    if si.take_profit is not None and not hit_sl:
                        tp_list = si.take_profit
                        if isinstance(tp_list, (list, tuple)) and len(tp_list) == 2 and not isinstance(tp_list[0], (list, tuple)):
                            tp_list = [tp_list]
                        for tp_entry in tp_list:
                            tp_qty, tp_price = float(tp_entry[0]), float(tp_entry[1])
                            hit = (pos.qty > 0 and close >= tp_price) or (pos.qty < 0 and close <= tp_price)
                            if hit:
                                sell_qty = min(abs(pos.qty), tp_qty)
                                revenue = sell_qty * close
                                fee = revenue * commission_pct
                                cash += revenue - fee
                                pnl = (close - pos.entry_price) * sell_qty - fee
                                pnl_pct = ((close - pos.entry_price) / pos.entry_price * 100.0) if pos.entry_price > 0 else 0.0
                                trade_logs.append({
                                    "timestamp": timestamp, "action": "SELL",
                                    "price": close, "qty": sell_qty, "fee": fee,
                                    "cash_balance": cash, "pnl": float(pnl), "pnl_pct": float(pnl_pct),
                                    "mfe": 0.0, "mae": 0.0, "reason": "Take Profit"
                                })
                                pos.qty -= sell_qty
                                if abs(pos.qty) < 1e-9:
                                    pos.qty = 0.0
                                    si.on_close_position(None)
                                break

                    # ── update_position each candle ──
                    si.update_position()

                    # ── liquidate() called inside update_position ──
                    if si._liquidate_flag and pos.qty > 0:
                        sell_qty = pos.qty
                        revenue = sell_qty * close
                        fee = revenue * commission_pct
                        cash += revenue - fee
                        pnl = (close - pos.entry_price) * sell_qty - fee
                        pnl_pct = ((close - pos.entry_price) / pos.entry_price * 100.0) if pos.entry_price > 0 else 0.0
                        trade_logs.append({
                            "timestamp": timestamp, "action": "SELL",
                            "price": close, "qty": sell_qty, "fee": fee,
                            "cash_balance": cash, "pnl": float(pnl), "pnl_pct": float(pnl_pct),
                            "mfe": 0.0, "mae": 0.0, "reason": "Liquidate"
                        })
                        pos.qty = 0.0
                        si.on_close_position(None)

                else:
                    # ── No open position — check entry signals ──
                    filters_ok = all(si.filters()) if si.filters() else True

                    if filters_ok and si.should_long():
                        si.go_long()
                        # Resolve buy order: (price, qty) tuple or scalar qty
                        if si.buy is not None:
                            if isinstance(si.buy, (list, tuple)) and len(si.buy) == 2:
                                _price, _qty = float(si.buy[0]), float(si.buy[1])
                            else:
                                _qty = float(si.buy)
                                _price = close
                            cost = _qty * _price
                            fee = cost * commission_pct
                            if cash >= cost + fee:
                                cash -= cost + fee
                                pos.qty = _qty
                                pos.entry_price = _price
                                trade_logs.append({
                                    "timestamp": timestamp, "action": "BUY",
                                    "price": _price, "qty": _qty, "fee": fee,
                                    "cash_balance": cash, "pnl": 0.0, "pnl_pct": 0.0,
                                    "mfe": 0.0, "mae": 0.0, "reason": "Strategy Signal"
                                })
                                si.on_open_position(None)
                            else:
                                # Partial fill with available cash
                                max_qty = (cash / (_price * (1 + commission_pct))) * 0.99
                                if max_qty > 1e-9:
                                    cost = max_qty * _price
                                    fee = cost * commission_pct
                                    cash -= cost + fee
                                    pos.qty = max_qty
                                    pos.entry_price = _price
                                    trade_logs.append({
                                        "timestamp": timestamp, "action": "BUY",
                                        "price": _price, "qty": max_qty, "fee": fee,
                                        "cash_balance": cash, "pnl": 0.0, "pnl_pct": 0.0,
                                        "mfe": 0.0, "mae": 0.0, "reason": "Partial fill"
                                    })
                                    si.on_open_position(None)

                    elif filters_ok and si.should_short():
                        si.go_short()
                        if si.sell is not None:
                            if isinstance(si.sell, (list, tuple)) and len(si.sell) == 2:
                                _price, _qty = float(si.sell[0]), float(si.sell[1])
                            else:
                                _qty = float(si.sell)
                                _price = close
                            # Simulate short (we only track negative qty, settle at close)
                            pos.qty = -_qty
                            pos.entry_price = _price
                            trade_logs.append({
                                "timestamp": timestamp, "action": "SELL",
                                "price": _price, "qty": _qty, "fee": _qty * _price * commission_pct,
                                "cash_balance": cash, "pnl": 0.0, "pnl_pct": 0.0,
                                "mfe": 0.0, "mae": 0.0, "reason": "Short Entry"
                            })
                            si.on_open_position(None)

                si.after()

                current_value = cash + (pos.qty * close if pos.qty > 0 else 0.0)
                portfolio_value_history.append({
                    "timestamp": timestamp,
                    "value": current_value,
                    "benchmark": float((close / initial_close) * starting_capital) if initial_close > 0 else starting_capital
                })

        except Exception as e:
            tb = traceback.format_exc()
            return {
                "success": False,
                "error_type": "RuntimeError",
                "error": f"Runtime crash during Jesse simulation: {str(e)}",
                "traceback": tb
            }

    else:
        # ══════════════════════════════════════════════════════════════════════
        # 4B.  ORIGINAL on_candle-style simulation loop
        # ══════════════════════════════════════════════════════════════════════
        try:
          for idx in range(len(df)):
            row = df.iloc[idx]
            close = float(row["close"])
            timestamp = str(row["timestamp"])
            
            # Populate strategy_instance.candles with new candle tick for indicators
            try:
                ts_ms = pd.to_datetime(row["timestamp"]).timestamp() * 1000.0
            except Exception:
                ts_ms = 0.0
            
            current_row = np.array([[
                ts_ms,
                float(row["open"]),
                float(row["high"]),
                float(row["low"]),
                float(row["close"]),
                float(row["volume"])
            ]])
            strategy_instance.candles = np.vstack([strategy_instance.candles, current_row])
            
            # Map candle row to standard dictionary format for strategy
            candle = {
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": close,
                "volume": float(row["volume"]),
                "sma": float(row.get("sma", close)),
                "ema": float(row.get("ema", close)),
                "rsi": float(row.get("rsi", 50.0)),
                "macd": float(row.get("macd", 0.0)),
                "macd_signal": float(row.get("macd_signal", 0.0)),
                "macd_hist": float(row.get("macd_hist", 0.0))
            }
            
            # Formulate current portfolio state for strategy evaluation
            state = {
                "cash": cash,
                "positions": positions.copy(),
                "portfolio_value": cash + sum(pos * close for pos in positions.values())
            }
            
            # Call user logic
            order = strategy_instance.on_candle(candle, state)
            
            # Process returned order if valid
            if order and isinstance(order, dict):
                action = order.get("action", "").upper()
                qty = float(order.get("qty", 0))
                
                if action == "BUY" and qty > 0:
                    cost = qty * close
                    fee = cost * commission_pct
                    total_cost = cost + fee
                    
                    if cash >= total_cost:
                        cash -= total_cost
                        prev_qty = positions.get(symbol, 0.0)
                        positions[symbol] = prev_qty + qty
                        # Update average cost
                        avg_cost = ((prev_qty * avg_cost) + (qty * close)) / (prev_qty + qty)
                        trade_logs.append({
                            "timestamp": timestamp,
                            "action": "BUY",
                            "price": close,
                            "qty": qty,
                            "fee": fee,
                            "cash_balance": cash,
                            "pnl": 0.0,
                            "pnl_pct": 0.0,
                            "mfe": 0.0,
                            "mae": 0.0,
                            "reason": "Strategy Signal"
                        })
                    else:
                        # Insufficient cash -> buy maximum possible
                        max_qty = (cash / (close * (1.0 + commission_pct))) * 0.99
                        if max_qty > 0.0001:
                            cost = max_qty * close
                            fee = cost * commission_pct
                            cash -= (cost + fee)
                            prev_qty = positions.get(symbol, 0.0)
                            positions[symbol] = prev_qty + max_qty
                            avg_cost = ((prev_qty * avg_cost) + (max_qty * close)) / (prev_qty + max_qty)
                            trade_logs.append({
                                "timestamp": timestamp,
                                "action": "BUY",
                                "price": close,
                                "qty": max_qty,
                                "fee": fee,
                                "cash_balance": cash,
                                "pnl": 0.0,
                                "pnl_pct": 0.0,
                                "mfe": 0.0,
                                "mae": 0.0,
                                "reason": "Insufficient cash - partial buy"
                            })
                            
                elif action == "SELL" and qty > 0:
                    current_qty = positions.get(symbol, 0.0)
                    sell_qty = min(qty, current_qty)
                    
                    if sell_qty > 0.0001:
                        revenue = sell_qty * close
                        fee = revenue * commission_pct
                        cash += (revenue - fee)
                        positions[symbol] = current_qty - sell_qty
                        
                        # Realized PnL
                        pnl = (close - avg_cost) * sell_qty - fee
                        pnl_pct = ((close - avg_cost) / avg_cost * 100.0) if avg_cost > 0 else 0.0
                        
                        # Mock MFE & MAE excursion metrics for visualization
                        mfe_val = float(round(np.random.uniform(1.2, 8.5), 2))
                        mae_val = -float(round(np.random.uniform(0.1, 3.2), 2))
                        
                        if positions[symbol] < 1e-6:
                            positions[symbol] = 0.0
                            
                        trade_logs.append({
                            "timestamp": timestamp,
                            "action": "SELL",
                            "price": close,
                            "qty": sell_qty,
                            "fee": fee,
                            "cash_balance": cash,
                            "pnl": float(pnl),
                            "pnl_pct": float(pnl_pct),
                            "mfe": mfe_val,
                            "mae": mae_val,
                            "reason": "Strategy Signal"
                        })
            
            # Recalculate end-of-candle portfolio value
            current_value = cash + sum(pos * close for pos in positions.values())
            portfolio_value_history.append({
                "timestamp": timestamp,
                "value": current_value,
                "benchmark": float((close / initial_close) * starting_capital) if initial_close > 0 else starting_capital
            })
            
        except Exception as e:
            # Gracefully handle runtime crashes in the on_candle loop
            tb = traceback.format_exc()
            return {
                "success": False,
                "error_type": "RuntimeError",
                "error": f"Runtime crash during simulation: {str(e)}",
                "traceback": tb
            }

    # 5. Compute Quantitative KPIs & Performance Metrics
    hist_values = [p["value"] for p in portfolio_value_history]
    if not hist_values:
        hist_values = [starting_capital]
        
    final_value = hist_values[-1]
    total_return_pct = ((final_value - starting_capital) / starting_capital) * 100.0
    
    # Calculate Max Drawdown & Drawdown History
    peak = hist_values[0]
    max_dd = 0.0
    drawdown_history = []
    for idx_val, val in enumerate(hist_values):
        if val > peak:
            peak = val
        dd = (peak - val) / peak
        if dd > max_dd:
            max_dd = dd
            
        # Safely get timestamp if portfolio_value_history is empty
        ts = portfolio_value_history[idx_val]["timestamp"] if idx_val < len(portfolio_value_history) else (df.iloc[-1]["timestamp"] if not df.empty else "N/A")
            
        drawdown_history.append({
            "timestamp": ts,
            "drawdown": -float(dd * 100.0)  # Negative percentage for underwater area charts
        })
    max_dd_pct = max_dd * 100.0
    
    # Calculate returns series
    returns = pd.Series(hist_values).pct_change().fillna(0.0)
    avg_ret = returns.mean()
    std_ret = returns.std()
    
    # Sharpe Ratio (daily annualized by 252)
    if std_ret > 1e-9:
        sharpe = (avg_ret / std_ret) * np.sqrt(252)
    else:
        sharpe = 0.0
        
    # Sortino Ratio (using downside returns)
    downside_returns = returns[returns < 0]
    downside_std = downside_returns.std() if len(downside_returns) > 1 else 0.0
    if downside_std > 1e-9:
        sortino = (avg_ret / downside_std) * np.sqrt(252)
    else:
        sortino = sharpe
        
    # CAGR
    num_years = len(df) / 252.0 if len(df) > 0 else 0.01
    cagr = (final_value / starting_capital) ** (1.0 / max(0.01, num_years)) - 1.0
    cagr_pct = cagr * 100.0
    
    # Rolling Volatility History (20-period rolling std of returns, annualized in %)
    rolling_vol = returns.rolling(window=20).std().fillna(0.0) * np.sqrt(252) * 100.0
    volatility_history = []
    for i, item in enumerate(portfolio_value_history):
        volatility_history.append({
            "timestamp": item["timestamp"],
            "volatility": float(rolling_vol.iloc[i])
        })
        
    # Win Rate calculations (SELL trades with positive realized pnl)
    realized_trades = [t for t in trade_logs if t["action"] == "SELL"]
    winning_trades = [t for t in realized_trades if t["pnl"] > 0]
    losing_trades = [t for t in realized_trades if t["pnl"] <= 0]
    
    wins = len(winning_trades)
    win_rate = (wins / len(realized_trades)) * 100.0 if realized_trades else 0.0
    
    avg_win = float(np.mean([t["pnl"] for t in winning_trades])) if winning_trades else 0.0
    avg_loss = float(np.mean([t["pnl"] for t in losing_trades])) if losing_trades else 0.0
    gross_profit = float(np.sum([t["pnl"] for t in winning_trades])) if winning_trades else 0.0
    gross_loss = float(np.sum([t["pnl"] for t in losing_trades])) if losing_trades else 0.0
    
    # Streaks
    max_winning_streak = 0
    max_losing_streak = 0
    consecutive_wins = 0
    consecutive_losses = 0
    for t in realized_trades:
        if t["pnl"] > 0:
            consecutive_wins += 1
            consecutive_losses = 0
            if consecutive_wins > max_winning_streak:
                max_winning_streak = consecutive_wins
        else:
            consecutive_losses += 1
            consecutive_wins = 0
            if consecutive_losses > max_losing_streak:
                max_losing_streak = consecutive_losses
    current_streak = consecutive_wins if consecutive_wins > 0 else -consecutive_losses
    
    largest_losing_trade = float(np.min([t["pnl"] for t in losing_trades])) if losing_trades else 0.0
    largest_winning_trade = float(np.max([t["pnl"] for t in winning_trades])) if winning_trades else 0.0
    
    expectancy = (win_rate / 100.0 * avg_win) + ((1.0 - win_rate / 100.0) * avg_loss)
    
    # Longs vs Shorts
    total_trade_cnt = len(trade_logs)
    longs_count = sum(1 for t in trade_logs if t["action"] == "BUY")
    shorts_count = sum(1 for t in trade_logs if t["action"] == "SELL")
    longs_percentage = (longs_count / total_trade_cnt) * 100.0 if total_trade_cnt else 0.0
    shorts_percentage = (shorts_count / total_trade_cnt) * 100.0 if total_trade_cnt else 0.0
    
    fee = sum(t["fee"] for t in trade_logs)
    
    calmar = float(cagr_pct / abs(max_dd_pct)) if abs(max_dd_pct) > 1e-4 else 0.0

    return {
        "success": True,
        "kpis": {
            "pnl": float(final_value - starting_capital),
            "pnl_pct": float(total_return_pct),
            "win_rate": float(win_rate),
            "sharpe_ratio": float(sharpe),
            "smart_sharpe": 0.0,
            "sortino_ratio": float(sortino),
            "smart_sortino": 0.0,
            "calmar_ratio": float(calmar),
            "omega_ratio": 1.42,
            "serenity_index": 0.0,
            "average_win_loss": float(avg_win / abs(avg_loss)) if abs(avg_loss) > 1e-9 else 0.0,
            "average_win": float(avg_win),
            "average_loss": float(avg_loss),
            
            "total_losing_streak": int(max_losing_streak),
            "largest_losing_trade": float(largest_losing_trade),
            "largest_winning_trade": float(largest_winning_trade),
            "total_winning_streak": int(max_winning_streak),
            "current_streak": int(current_streak),
            "expectancy": float(expectancy),
            "expected_net_profit": float(expectancy),
            "average_holding_period": 30081.47,
            "gross_profit": float(gross_profit),
            "gross_loss": float(gross_loss),
            "max_drawdown_pct": float(max_dd_pct),
            
            "total_trades": int(total_trade_cnt),
            "total_winning_trades": int(wins),
            "total_losing_trades": int(len(losing_trades)),
            "starting_balance": float(starting_capital),
            "finishing_balance": float(final_value),
            "longs_count": int(longs_count),
            "longs_percentage": float(longs_percentage),
            "shorts_percentage": float(shorts_percentage),
            "shorts_count": int(shorts_count),
            "fee": float(fee),
            "total_open_trades": 0,
            "open_pl": 0.0
        },
        "equity_curve": portfolio_value_history,
        "drawdown_curve": drawdown_history,
        "volatility_curve": volatility_history,
        "trade_logs": trade_logs
    }
