import pandas as pd
import numpy as np

def compute_momentum_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes momentum indicators:
    ROC (Rate of Change), PPO (Percentage Price Oscillator),
    TSI (True Strength Index), Coppock Curve, DPO (Detrended Price Oscillator).
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)

    # 1. Rate of Change (ROC 12 period)
    df["roc_12"] = ((close - close.shift(12)) / close.shift(12).replace(0, np.nan) * 100.0).fillna(0.0)

    # 2. Percentage Price Oscillator (PPO 12, 26, 9)
    ema12 = close.ewm(span=12, min_periods=1, adjust=False).mean()
    ema26 = close.ewm(span=26, min_periods=1, adjust=False).mean()
    df["ppo"] = ((ema12 - ema26) / ema26.replace(0, np.nan) * 100.0).fillna(0.0)
    df["ppo_signal"] = df["ppo"].ewm(span=9, min_periods=1, adjust=False).mean().fillna(0.0)
    df["ppo_hist"] = df["ppo"] - df["ppo_signal"]

    # 3. True Strength Index (TSI 25, 13)
    diff = close.diff().fillna(0.0)
    abs_diff = diff.abs()
    smoothed_diff = diff.ewm(span=25, adjust=False).mean().ewm(span=13, adjust=False).mean()
    smoothed_abs_diff = abs_diff.ewm(span=25, adjust=False).mean().ewm(span=13, adjust=False).mean()
    df["tsi"] = (100.0 * (smoothed_diff / smoothed_abs_diff.replace(0, 1e-9))).fillna(0.0)

    # 4. Coppock Curve (11, 14 WMA of ROC 14 + ROC 11)
    roc14 = ((close - close.shift(14)) / close.shift(14).replace(0, np.nan) * 100.0).fillna(0.0)
    roc11 = ((close - close.shift(11)) / close.shift(11).replace(0, np.nan) * 100.0).fillna(0.0)
    coppock_raw = roc14 + roc11
    # 10-period WMA approximation via EWM
    df["coppock_curve"] = coppock_raw.ewm(span=10, adjust=False).mean().fillna(0.0)

    # 5. Detrended Price Oscillator (DPO 20 period)
    # DPO = Close(t/2 + 1) - SMA(n)
    sma20 = close.rolling(window=20, min_periods=1).mean()
    df["dpo"] = (close.shift(11) - sma20).fillna(0.0)

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
