import pandas as pd
import numpy as np

def compute_market_structure_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes market structure indicators:
    Pivot Points (Classic, Camarilla, Fibonacci), Swing Highs/Lows,
    Distance to Support & Resistance.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)

    # 1. Classic Pivot Points (using previous bar P, R1, S1, R2, S2)
    prev_h = high.shift(1).fillna(high)
    prev_l = low.shift(1).fillna(low)
    prev_c = close.shift(1).fillna(close)

    pivot = (prev_h + prev_l + prev_c) / 3.0
    r1 = (2.0 * pivot) - prev_l
    s1 = (2.0 * pivot) - prev_h
    r2 = pivot + (prev_h - prev_l)
    s2 = pivot - (prev_h - prev_l)

    df["pivot"] = pivot
    df["pivot_r1"] = r1
    df["pivot_s1"] = s1
    df["pivot_r2"] = r2
    df["pivot_s2"] = s2

    # 2. Camarilla Pivot Points
    range_hl = prev_h - prev_l
    df["camarilla_r3"] = prev_c + (range_hl * 1.1 / 4.0)
    df["camarilla_s3"] = prev_c - (range_hl * 1.1 / 4.0)
    df["camarilla_r4"] = prev_c + (range_hl * 1.1 / 2.0)
    df["camarilla_s4"] = prev_c - (range_hl * 1.1 / 2.0)

    # 3. Fibonacci Pivot Points
    df["fib_r1"] = pivot + (0.382 * range_hl)
    df["fib_s1"] = pivot - (0.382 * range_hl)
    df["fib_r2"] = pivot + (0.618 * range_hl)
    df["fib_s2"] = pivot - (0.618 * range_hl)

    # 4. Swing High / Swing Low Flags (5-bar window: 2 before, 2 after)
    is_swing_high = (high > high.shift(1)) & (high > high.shift(2)) & (high > high.shift(-1)) & (high > high.shift(-2))
    is_swing_low = (low < low.shift(1)) & (low < low.shift(2)) & (low < low.shift(-1)) & (low < low.shift(-2))

    df["is_swing_high"] = is_swing_high.astype(int)
    df["is_swing_low"] = is_swing_low.astype(int)

    # 5. Distance to 20-period High / Low
    high_20 = high.rolling(window=20, min_periods=1).max()
    low_20 = low.rolling(window=20, min_periods=1).min()

    df["dist_to_20h_pct"] = ((high_20 - close) / close.replace(0, 1e-9) * 100.0).fillna(0.0)
    df["dist_to_20l_pct"] = ((close - low_20) / close.replace(0, 1e-9) * 100.0).fillna(0.0)

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
