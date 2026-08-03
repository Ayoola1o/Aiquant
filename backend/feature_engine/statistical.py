import pandas as pd
import numpy as np

def compute_statistical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes statistical indicators:
    Rolling Z-Score, Percentile Rank, Autocorrelation (lag 1 & 5),
    Rolling Entropy, Hurst Exponent approximation.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)
    returns = close.pct_change().fillna(0.0)

    # 1. Rolling Z-Score of Close Price (20-period window)
    mean_20 = close.rolling(window=20, min_periods=1).mean()
    std_20 = close.rolling(window=20, min_periods=1).std().replace(0, 1e-9)
    df["zscore_20"] = ((close - mean_20) / std_20).fillna(0.0)

    # 2. Rolling Percentile Rank of Price (50-period window)
    def pct_rank(series):
        if len(series) < 2:
            return 50.0
        val = series.iloc[-1]
        return float((series < val).sum() / (len(series) - 1) * 100.0)

    df["percentile_rank_50"] = close.rolling(window=50, min_periods=5).apply(pct_rank, raw=False).fillna(50.0)

    # 3. Autocorrelation (Lag 1 & Lag 5 returns autocorrelation over 20 bars)
    df["autocorr_lag1"] = returns.rolling(window=20, min_periods=5).apply(lambda x: pd.Series(x).autocorr(lag=1), raw=False).fillna(0.0)
    df["autocorr_lag5"] = returns.rolling(window=20, min_periods=5).apply(lambda x: pd.Series(x).autocorr(lag=5), raw=False).fillna(0.0)

    # 4. Rolling Entropy (Shannon Entropy of Return Bins over 30 bars)
    def calculate_entropy(series):
        if len(series) < 5:
            return 0.0
        counts, _ = np.histogram(series, bins=5)
        probs = counts / np.sum(counts)
        probs = probs[probs > 0]
        return float(-np.sum(probs * np.log2(probs)))

    df["rolling_entropy_30"] = returns.rolling(window=30, min_periods=10).apply(calculate_entropy, raw=True).fillna(0.0)

    # 5. Hurst Exponent (Rescaled Range R/S approximation over 50 bars)
    def hurst_exponent(series):
        if len(series) < 20:
            return 0.5
        series_arr = np.asarray(series)
        mean_val = np.mean(series_arr)
        cum_dev = np.cumsum(series_arr - mean_val)
        r = np.max(cum_dev) - np.min(cum_dev)
        s = np.std(series_arr)
        if s == 0 or r == 0:
            return 0.5
        rs = r / s
        n = len(series_arr)
        h = np.log(rs) / np.log(n)
        return float(np.clip(h, 0.0, 1.0))

    df["hurst_exponent"] = close.rolling(window=50, min_periods=20).apply(hurst_exponent, raw=True).fillna(0.5)

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
