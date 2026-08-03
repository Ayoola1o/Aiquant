import pandas as pd
import numpy as np

def compute_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes extended technical indicators:
    VWAP, ADX, CCI, Stochastic %K/%D, Williams %R, Aroon,
    Ichimoku Cloud (Tenkan, Kijun, Senkou A, Senkou B), DEMA, TEMA, Hull MA, Keltner Channels.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)
    volume = df["volume"].astype(float) if "volume" in df.columns else pd.Series(1.0, index=df.index)

    # 1. VWAP (Volume Weighted Average Price)
    typical_price = (high + low + close) / 3.0
    cum_vol_price = (typical_price * volume).cumsum()
    cum_vol = volume.cumsum().replace(0, 1e-9)
    df["vwap"] = cum_vol_price / cum_vol

    # 2. ADX (Average Directional Index - 14 period)
    period = 14
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    prev_close = close.shift(1).fillna(close)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)

    atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    plus_di = 100 * (pd.Series(plus_dm, index=df.index).ewm(alpha=1/period, min_periods=period, adjust=False).mean() / (atr + 1e-9))
    minus_di = 100 * (pd.Series(minus_dm, index=df.index).ewm(alpha=1/period, min_periods=period, adjust=False).mean() / (atr + 1e-9))
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di + 1e-9)
    df["adx"] = dx.ewm(alpha=1/period, min_periods=period, adjust=False).mean().fillna(20.0)
    df["plus_di"] = plus_di.fillna(0.0)
    df["minus_di"] = minus_di.fillna(0.0)

    # 3. CCI (Commodity Channel Index - 20 period)
    tp = (high + low + close) / 3.0
    tp_sma = tp.rolling(window=20, min_periods=1).mean()
    mad = tp.rolling(window=20, min_periods=1).apply(lambda x: np.mean(np.abs(x - np.mean(x))), raw=True)
    df["cci"] = (tp - tp_sma) / (0.015 * mad + 1e-9)
    df["cci"] = df["cci"].fillna(0.0)

    # 4. Stochastic Oscillator (%K=14, %D=3)
    low_14 = low.rolling(window=14, min_periods=1).min()
    high_14 = high.rolling(window=14, min_periods=1).max()
    df["stoch_k"] = 100 * (close - low_14) / (high_14 - low_14 + 1e-9)
    df["stoch_d"] = df["stoch_k"].rolling(window=3, min_periods=1).mean().fillna(50.0)

    # 5. Williams %R (14 period)
    df["williams_r"] = -100 * (high_14 - close) / (high_14 - low_14 + 1e-9)

    # 6. Aroon Indicator (25 period)
    aroon_period = 25
    aroon_up = high.rolling(window=aroon_period + 1, min_periods=1).apply(lambda x: float(np.argmax(x)) / aroon_period * 100, raw=True)
    aroon_down = low.rolling(window=aroon_period + 1, min_periods=1).apply(lambda x: float(np.argmin(x)) / aroon_period * 100, raw=True)
    df["aroon_up"] = aroon_up.fillna(50.0)
    df["aroon_down"] = aroon_down.fillna(50.0)

    # 7. Ichimoku Cloud (9, 26, 52)
    high_9 = high.rolling(window=9, min_periods=1).max()
    low_9 = low.rolling(window=9, min_periods=1).min()
    df["ichimoku_tenkan"] = (high_9 + low_9) / 2.0

    high_26 = high.rolling(window=26, min_periods=1).max()
    low_26 = low.rolling(window=26, min_periods=1).min()
    df["ichimoku_kijun"] = (high_26 + low_26) / 2.0

    df["ichimoku_senkou_a"] = ((df["ichimoku_tenkan"] + df["ichimoku_kijun"]) / 2.0).shift(26).fillna(close)

    high_52 = high.rolling(window=52, min_periods=1).max()
    low_52 = low.rolling(window=52, min_periods=1).min()
    df["ichimoku_senkou_b"] = ((high_52 + low_52) / 2.0).shift(26).fillna(close)

    # 8. DEMA & TEMA (Double & Triple Exponential Moving Average)
    ema20 = close.ewm(span=20, min_periods=1, adjust=False).mean()
    ema_of_ema = ema20.ewm(span=20, min_periods=1, adjust=False).mean()
    ema_of_ema_of_ema = ema_of_ema.ewm(span=20, min_periods=1, adjust=False).mean()
    df["dema"] = 2 * ema20 - ema_of_ema
    df["tema"] = 3 * ema20 - 3 * ema_of_ema + ema_of_ema_of_ema

    # 9. Hull Moving Average (HMA 20)
    wma_half = close.rolling(window=10, min_periods=1).mean()
    wma_full = close.rolling(window=20, min_periods=1).mean()
    diff = 2 * wma_half - wma_full
    df["hma"] = diff.rolling(window=4, min_periods=1).mean()

    # 10. Keltner Channels (20 period EMA + 2 * ATR)
    keltner_ema = close.ewm(span=20, min_periods=1, adjust=False).mean()
    df["keltner_upper"] = keltner_ema + 2 * atr
    df["keltner_lower"] = keltner_ema - 2 * atr
    df["keltner_middle"] = keltner_ema

    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df
