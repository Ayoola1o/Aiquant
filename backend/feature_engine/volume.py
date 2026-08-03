import pandas as pd
import numpy as np

def compute_volume_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes volume indicators:
    OBV (On-Balance Volume), MFI (Money Flow Index), Chaikin Money Flow (CMF),
    Accumulation/Distribution (A/D) Line, Force Index, Volume Ratio.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    volume = df["volume"].astype(float) if "volume" in df.columns else pd.Series(1.0, index=df.index)

    # 1. On-Balance Volume (OBV)
    direction = np.sign(close.diff().fillna(0.0))
    df["obv"] = (direction * volume).fillna(0.0).cumsum()

    # 2. Money Flow Index (MFI 14)
    tp = (high + low + close) / 3.0
    raw_money_flow = tp * volume
    pos_flow = np.where(tp > tp.shift(1), raw_money_flow, 0.0)
    neg_flow = np.where(tp < tp.shift(1), raw_money_flow, 0.0)
    pos_mf = pd.Series(pos_flow, index=df.index).rolling(window=14, min_periods=1).sum()
    neg_mf = pd.Series(neg_flow, index=df.index).rolling(window=14, min_periods=1).sum()
    mfr = pos_mf / neg_mf.replace(0, 1e-9)
    df["mfi"] = (100.0 - (100.0 / (1.0 + mfr))).fillna(50.0)

    # 3. Chaikin Money Flow (CMF 20)
    mf_multiplier = ((close - low) - (high - close)) / (high - low + 1e-9)
    mf_volume = mf_multiplier * volume
    df["cmf"] = (mf_volume.rolling(window=20, min_periods=1).sum() / volume.rolling(window=20, min_periods=1).sum().replace(0, 1e-9)).fillna(0.0)

    # 4. Accumulation / Distribution Line (A/D)
    df["ad_line"] = (mf_multiplier * volume).fillna(0.0).cumsum()

    # 5. Force Index (13 period EMA of (Close - Close_prev) * Volume)
    fi_raw = close.diff().fillna(0.0) * volume
    df["force_index"] = fi_raw.ewm(span=13, adjust=False).mean().fillna(0.0)

    # 6. Volume Moving Average Ratio (Current Vol vs 20-period Vol SMA)
    vol_sma = volume.rolling(window=20, min_periods=1).mean()
    df["volume_ratio"] = (volume / vol_sma.replace(0, 1e-9)).fillna(1.0)

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
