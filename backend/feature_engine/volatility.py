import pandas as pd
import numpy as np

def compute_volatility_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes volatility metrics:
    Historical Volatility (20 & 60 period), Realized Variance,
    Parkinson Volatility, Yang-Zhang Volatility, Volatility Z-Score.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    open_p = df["open"].astype(float)

    # 1. Log Returns
    log_ret = np.log(close / close.shift(1).replace(0, np.nan)).fillna(0.0)

    # 2. Historical Volatility (20 & 60 period, annualized assuming 252 bars)
    df["volatility_20"] = log_ret.rolling(window=20, min_periods=2).std().fillna(0.0) * np.sqrt(252) * 100.0
    df["volatility_60"] = log_ret.rolling(window=60, min_periods=2).std().fillna(0.0) * np.sqrt(252) * 100.0

    # 3. Realized Variance (20 period rolling sum of squared returns)
    df["realized_variance"] = (log_ret ** 2).rolling(window=20, min_periods=1).sum()

    # 4. Parkinson Volatility (Uses High/Low prices - handles intraday extremes)
    # Formula: sqrt( 1 / (4 * ln(2)) * ln(H/L)^2 )
    hl_ratio = np.log(high / low.replace(0, np.nan)).fillna(0.0)
    parkinson_var = (hl_ratio ** 2) / (4.0 * np.log(2.0))
    df["parkinson_volatility"] = np.sqrt(parkinson_var.rolling(window=20, min_periods=1).mean().fillna(0.0)) * np.sqrt(252) * 100.0

    # 5. Garman-Klass Volatility (Uses Open, High, Low, Close)
    # Formula: 0.5 * ln(H/L)^2 - (2*ln(2)-1) * ln(C/O)^2
    co_ratio = np.log(close / open_p.replace(0, np.nan)).fillna(0.0)
    gk_var = 0.5 * (hl_ratio ** 2) - (2.0 * np.log(2.0) - 1.0) * (co_ratio ** 2)
    df["garman_klass_volatility"] = np.sqrt(np.maximum(0, gk_var).rolling(window=20, min_periods=1).mean().fillna(0.0)) * np.sqrt(252) * 100.0

    # 6. Volatility Z-Score (Current 20-period vol vs 60-period vol mean & std)
    vol_mean = df["volatility_20"].rolling(window=60, min_periods=10).mean()
    vol_std = df["volatility_20"].rolling(window=60, min_periods=10).std().replace(0, 1e-9)
    df["volatility_zscore"] = ((df["volatility_20"] - vol_mean) / vol_std).fillna(0.0)

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
