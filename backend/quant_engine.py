import os
import sys
import numpy as np
import pandas as pd
import yfinance as yf
import requests
from sklearn.ensemble import RandomForestRegressor
from scipy.optimize import minimize

# Append buildguide to path to load Kronos model
BUILDGUIDE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "buildguide"))
if BUILDGUIDE_PATH not in sys.path:
    sys.path.append(BUILDGUIDE_PATH)

# Global variables for Kronos status
kronos_loaded = False
kronos_predictor = None

try:
    import torch
    from model import Kronos, KronosTokenizer, KronosPredictor
    
    # Load model and tokenizer
    # Using Kronos-Tokenizer-2k and Kronos-mini as requested
    print("Attempting to load Kronos-mini transformer from HuggingFace...")
    tokenizer = KronosTokenizer.from_pretrained("NeoQuasar/Kronos-Tokenizer-2k")
    model = Kronos.from_pretrained("NeoQuasar/Kronos-mini")
    
    # Run on CPU by default to ensure maximum compatibility
    device = torch.device("cpu")
    model = model.to(device)
    model.eval()
    
    # Context length for Kronos-mini is 2048
    kronos_predictor = KronosPredictor(model, tokenizer, max_context=2048)
    kronos_loaded = True
    print("Kronos-mini successfully loaded and initialized.")
except Exception as e:
    print(f"Failed to load Kronos-mini transformer: {e}")
    print("Prediction engine will use local RandomForest fallback.")


def get_alpaca_dates(period: str):
    from datetime import datetime, timedelta
    end_dt = datetime.utcnow()
    
    if "_" in period:
        start_str, end_str = period.split("_")
        try:
            start_dt = datetime.strptime(start_str, "%Y-%m-%d")
            end_dt = datetime.strptime(end_str, "%Y-%m-%d")
        except Exception:
            start_dt = end_dt - timedelta(days=30)
    else:
        days_map = {
            "1d": 1,
            "5d": 5,
            "1mo": 30,
            "3mo": 90,
            "6mo": 180,
            "1y": 365,
            "2y": 730,
            "5y": 1825,
            "10y": 3650
        }
        days = days_map.get(period, 30)
        start_dt = end_dt - timedelta(days=days)
        
    return start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"), end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_alpaca_historical_data(
    ticker: str,
    period: str,
    interval: str,
    key_id: str,
    secret_key: str
) -> pd.DataFrame:
    """
    Fetches historical OHLCV data from Alpaca Market Data API.
    """
    import requests
    from datetime import datetime
    
    # Map interval to Alpaca timeframe
    tf_map = {
        "1m": "1Min",
        "5m": "5Min",
        "15m": "15Min",
        "30m": "30Min",
        "1h": "1Hour",
        "2h": "2Hour",
        "4h": "4Hour",
        "1d": "1Day"
    }
    timeframe = tf_map.get(interval, "1Hour")
    
    # Get start/end dates
    start, end = get_alpaca_dates(period)
    
    # Normalize ticker (e.g. BTC-USD -> BTC/USD)
    alpaca_sym = ticker.upper()
    if alpaca_sym.endswith("USDT"):
        alpaca_sym = alpaca_sym.replace("USDT", "USD")
    elif alpaca_sym.endswith("-USD"):
        alpaca_sym = alpaca_sym.replace("-USD", "USD")
        
    is_crypto = len(alpaca_sym) > 4 and "USD" in alpaca_sym
    
    # Alpaca expects BTC/USD instead of BTCUSD
    if is_crypto and "/" not in alpaca_sym:
        alpaca_sym = f"{alpaca_sym[:-3]}/{alpaca_sym[-3:]}"
        
    url = (
        "https://data.alpaca.markets/v1beta3/crypto/us/bars"
        if is_crypto
        else "https://data.alpaca.markets/v2/stocks/bars"
    )
    
    headers = {
        "APCA-API-KEY-ID": key_id,
        "APCA-API-SECRET-KEY": secret_key
    }
    
    params = {
        "symbols": alpaca_sym,
        "timeframe": timeframe,
        "start": start,
        "end": end,
        "limit": 10000
    }
    
    print(f"Fetching Alpaca historical data for {alpaca_sym} (timeframe={timeframe}, start={start}, end={end})...")
    res = requests.get(url, headers=headers, params=params, timeout=10)
    if res.status_code != 200:
        raise ValueError(f"Alpaca API returned {res.status_code}: {res.text}")
        
    data = res.json()
    bars = data.get("bars", {}).get(alpaca_sym, [])
    if not bars:
        raise ValueError(f"No bars returned from Alpaca for symbol {alpaca_sym}")
        
    # Convert bars to pandas DataFrame
    # Alpaca bar keys: 't' (timestamp), 'o' (open), 'h' (high), 'l' (low), 'c' (close), 'v' (volume)
    records = []
    for b in bars:
        records.append({
            "timestamp": b.get("t"),
            "open": float(b.get("o", 0.0)),
            "high": float(b.get("h", 0.0)),
            "low": float(b.get("l", 0.0)),
            "close": float(b.get("c", 0.0)),
            "volume": float(b.get("v", 0.0))
        })
        
    df = pd.DataFrame(records)
    # Ensure timestamp is formatted as string ISO format
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
    return df


def fetch_historical_data(
    ticker: str,
    period: str = "1mo",
    interval: str = "1h",
    alpaca_key_id: str = "",
    alpaca_secret_key: str = "",
    exchange: str = "yfinance"
) -> pd.DataFrame:
    """
    Fetches real-world historical OHLCV data based on the chosen exchange source.
    """
    exchange_lower = exchange.lower()
    
    # 1. Route to Binance directly if picked
    if exchange_lower == "binance":
        # Translate symbols to standard Binance (e.g. BTCUSD or BTC-USD -> BTCUSDT)
        binance_sym = ticker.upper().replace("-USD", "USDT").replace("USD", "USDT")
        if binance_sym.endswith("USDT") and not binance_sym.endswith("TUSDT"):
            # Clean double T if any
            pass
        # Calculate limit based on period
        limit = 1000
        if period == "1d":
            limit = 100 if interval == "15m" else 50
        elif period == "1mo" or period == "30d":
            limit = 1000 if interval == "15m" else 750
        elif period in ("3mo", "6mo", "1y", "2y", "5y", "max"):
            limit = 1000
        
        df = fetch_binance_history(binance_sym, interval=interval, limit=limit)
        if not df.empty:
            print(f"Successfully fetched {len(df)} candles from Binance for symbol {binance_sym}")
            return df
        # Fall back if Binance failed
        print(f"Binance fetch failed for {binance_sym}. Falling back to Yahoo Finance.")

    # 2. Route to Alpaca directly if picked
    if exchange_lower == "alpaca" and alpaca_key_id and alpaca_secret_key:
        try:
            # Map ticker format for Alpaca (e.g. BTC-USD -> BTCUSD)
            alpaca_sym = ticker.upper().replace("-", "")
            df = fetch_alpaca_historical_data(
                ticker=alpaca_sym,
                period=period,
                interval=interval,
                key_id=alpaca_key_id,
                secret_key=alpaca_secret_key
            )
            if not df.empty:
                print(f"Successfully fetched {len(df)} candles from Alpaca for backtesting.")
                return df
        except Exception as e:
            print(f"Alpaca historical data fetch failed ({e}). Falling back to Yahoo Finance.")

    # 3. Yahoo Finance fallback / default
    try:
        yf_ticker = ticker
        # Resolve tickers to Yahoo Finance standard if needed (e.g. BTCUSDT -> BTC-USD)
        if ticker.endswith("USDT"):
            yf_ticker = ticker.replace("USDT", "-USD")
        elif ticker.endswith("USD") and "-" not in ticker:
            yf_ticker = ticker.replace("USD", "-USD")
        
        # Check if period exceeds 730 days (yfinance limit for intraday/hourly data)
        is_long_period = False
        if "_" in period:
            start_date, end_date = period.split("_")
            from datetime import datetime
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                days_ago = (datetime.now() - start_dt).days
                if days_ago > 730:
                    is_long_period = True
            except Exception:
                pass
        elif period in ["2y", "5y", "10y", "max"]:
            is_long_period = True
            
        if is_long_period and interval in ["15m", "30m", "1h", "90m"]:
            print(f"WARNING: Intraday interval '{interval}' is not available for historical ranges older than 730 days. Automatically falling back to '1d' interval to prevent download failure.")
            interval = "1d"
            
        if "_" in period:
            start_date, end_date = period.split("_")
            print(f"Fetching data for {yf_ticker} (start={start_date}, end={end_date}, interval={interval}) from Yahoo Finance...")
            df = yf.download(yf_ticker, start=start_date, end=end_date, interval=interval)
        else:
            print(f"Fetching data for {yf_ticker} (period={period}, interval={interval}) from Yahoo Finance...")
            df = yf.download(yf_ticker, period=period, interval=interval)
        
        if df.empty:
            raise ValueError("No data returned from Yahoo Finance.")
            
        # Clean multi-index headers if present in newer yfinance versions
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df = df.reset_index()
        # Ensure column names are lowercase
        df.rename(columns={
            "Datetime": "timestamp",
            "Date": "timestamp",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume"
        }, inplace=True)
        
        # Ensure timestamp is formatted as string ISO format
        df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
        return df[["timestamp", "open", "high", "low", "close", "volume"]]
    except Exception as e:
        print(f"Error fetching Yahoo Finance data: {e}")
        # Return empty dataframe
        return pd.DataFrame()


def fetch_binance_history(symbol: str, interval: str = "1h", limit: int = 500) -> pd.DataFrame:
    """
    Alternative connector to fetch real crypto OHLCV historical bars from Binance public REST API.
    Uses fallback mirrors to bypass geoblocking (e.g. US regions).
    """
    hosts = [
        "api.binance.com",
        "api1.binance.com",
        "api2.binance.com",
        "api3.binance.com"
    ]
    params = {
        "symbol": symbol.upper(),
        "interval": interval,
        "limit": limit
    }
    
    last_err = None
    for host in hosts:
        try:
            url = f"https://{host}/api/v3/klines"
            res = requests.get(url, params=params, timeout=5)
            if res.status_code == 200:
                data = res.json()
                df = pd.DataFrame(data, columns=[
                    "open_time", "open", "high", "low", "close", "volume",
                    "close_time", "quote_volume", "count", "taker_buy_volume",
                    "taker_buy_quote_volume", "ignore"
                ])
                
                # Convert types
                df["timestamp"] = pd.to_datetime(df["open_time"], unit="ms").dt.strftime("%Y-%m-%d %H:%M:%S")
                for col in ["open", "high", "low", "close", "volume"]:
                    df[col] = df[col].astype(float)
                    
                return df[["timestamp", "open", "high", "low", "close", "volume"]]
            else:
                last_err = f"Mirror {host} returned HTTP {res.status_code}: {res.text}"
        except Exception as e:
            last_err = f"Mirror {host} failed: {e}"
            
    print(f"[Binance Warmup] Connection info: offline or geoblocked. Activating fallback feeds.")
    return pd.DataFrame()


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates full indicator suite: SMA, EMA, RSI, MACD, Bollinger Bands, ATR.
    Uses min_periods=1 so partial values are computed even with fewer bars.
    """
    if df.empty or len(df) < 2:
        return df

    df = df.copy()
    close  = df["close"].astype(float)
    high   = df["high"].astype(float)
    low    = df["low"].astype(float)

    # ── Moving Averages ──────────────────────────────────────────────────
    sma_period = 20
    ema_span   = 20
    df["sma"] = close.rolling(window=sma_period, min_periods=1).mean()
    df["ema"] = close.ewm(span=ema_span, min_periods=1, adjust=False).mean()

    # ── RSI (14) ─────────────────────────────────────────────────────────
    delta = close.diff()
    gain  = delta.clip(lower=0.0)
    loss  = -delta.clip(upper=0.0)
    # Wilder's smoothing (Running Moving Average, equivalent to ewm with alpha=1/14)
    avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    avg_gain = avg_gain.fillna(gain.rolling(window=14, min_periods=1).mean())
    avg_loss = avg_loss.fillna(loss.rolling(window=14, min_periods=1).mean())
    rs    = avg_gain / (avg_loss + 1e-9)
    df["rsi"] = 100 - (100 / (1 + rs))
    df["rsi"] = df["rsi"].fillna(50.0).clip(0, 100)

    # ── MACD (12, 26, 9) ─────────────────────────────────────────────────
    ema12 = close.ewm(span=12, min_periods=1, adjust=False).mean()
    ema26 = close.ewm(span=26, min_periods=1, adjust=False).mean()
    df["macd"]        = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, min_periods=1, adjust=False).mean()
    df["macd_hist"]   = df["macd"] - df["macd_signal"]

    # ── Bollinger Bands (20, 2σ) ─────────────────────────────────────────
    bb_std = close.rolling(window=20, min_periods=1).std().fillna(0)
    df["bb_upper"] = df["sma"] + 2 * bb_std
    df["bb_lower"] = df["sma"] - 2 * bb_std
    df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / (df["sma"] + 1e-9)

    # ── ATR (14) ─────────────────────────────────────────────────────────
    prev_close = close.shift(1).fillna(close)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low  - prev_close).abs()
    ], axis=1).max(axis=1)
    # Wilder's smoothing for ATR:
    df["atr"] = tr.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    df["atr"] = df["atr"].fillna(tr.rolling(window=14, min_periods=1).mean())

    # ── Fill residual NaNs ───────────────────────────────────────────────
    df.bfill(inplace=True)
    df.fillna(0, inplace=True)
    return df


def detect_candlestick_patterns(df: pd.DataFrame) -> list:
    """
    Detects classic candlestick patterns: Doji, Hammer, and Engulfing.
    Returns a list of dictionaries with index, timestamp, pattern name, and type (Bullish/Bearish).
    """
    patterns = []
    if df.empty or len(df) < 2:
        return patterns
        
    for i in range(1, len(df)):
        open_curr = df.loc[i, "open"]
        close_curr = df.loc[i, "close"]
        high_curr = df.loc[i, "high"]
        low_curr = df.loc[i, "low"]
        timestamp = df.loc[i, "timestamp"]
        
        open_prev = df.loc[i-1, "open"]
        close_prev = df.loc[i-1, "close"]
        
        body_curr = abs(close_curr - open_curr)
        range_curr = high_curr - low_curr
        if range_curr == 0:
            range_curr = 1e-9
            
        upper_wick = high_curr - max(open_curr, close_curr)
        lower_wick = min(open_curr, close_curr) - low_curr
        
        # 1. DOJI (Body size is very small relative to total range)
        if body_curr <= (range_curr * 0.1):
            patterns.append({
                "index": int(i),
                "timestamp": timestamp,
                "pattern": "Doji",
                "type": "Neutral",
                "desc": "Indicates market indecision. Potential reversal."
            })
            continue
            
        # 2. HAMMER (Small body at upper end, long lower wick at least 2x body)
        if lower_wick >= (body_curr * 2.0) and upper_wick <= (body_curr * 0.5):
            patterns.append({
                "index": int(i),
                "timestamp": timestamp,
                "pattern": "Hammer",
                "type": "Bullish",
                "desc": "Bullish reversal pattern, sellers exhausted."
            })
            continue
            
        # 3. SHOOTING STAR (Small body at lower end, long upper wick at least 2x body)
        if upper_wick >= (body_curr * 2.0) and lower_wick <= (body_curr * 0.5):
            patterns.append({
                "index": int(i),
                "timestamp": timestamp,
                "pattern": "Shooting Star",
                "type": "Bearish",
                "desc": "Bearish reversal pattern, buyers exhausted."
            })
            continue
            
        # 4. BULLISH/BEARISH ENGULFING
        body_prev = abs(close_prev - open_prev)
        is_bullish_engulfing = (close_prev < open_prev) and (close_curr > open_curr) and (open_curr <= close_prev) and (close_curr >= open_prev)
        is_bearish_engulfing = (close_prev > open_prev) and (close_curr < open_curr) and (open_curr >= close_prev) and (close_curr <= open_prev)
        
        if is_bullish_engulfing:
            patterns.append({
                "index": int(i),
                "timestamp": timestamp,
                "pattern": "Engulfing",
                "type": "Bullish",
                "desc": "Bullish engulfing. Powerful upward momentum."
            })
        elif is_bearish_engulfing:
            patterns.append({
                "index": int(i),
                "timestamp": timestamp,
                "pattern": "Engulfing",
                "type": "Bearish",
                "desc": "Bearish engulfing. Powerful downward momentum."
            })
            
    return patterns


def predict_future_prices(df: pd.DataFrame, pred_len: int = 7) -> dict:
    """
    Predicts future stock prices using Kronos-mini Transformer.
    If Kronos is unavailable, falls back to a rolling RandomForestRegressor.
    Returns: {
        "status": "kronos" | "fallback",
        "predictions": [{"timestamp": str, "close": float, "high": float, "low": float}],
        "error": str | None
    }
    """
    if df.empty or len(df) < 10:
        return {"status": "error", "predictions": [], "error": "Insufficient historical data"}
        
    global kronos_loaded, kronos_predictor
    
    # Setup future timestamps
    last_ts = pd.to_datetime(df.iloc[-1]["timestamp"])
    # Determine the time difference from last two bars to extrapolate timestamps
    if len(df) >= 2:
        time_diff = pd.to_datetime(df.iloc[-1]["timestamp"]) - pd.to_datetime(df.iloc[-2]["timestamp"])
    else:
        time_diff = pd.Timedelta(hours=1)
        
    future_timestamps = [ (last_ts + time_diff * i).strftime("%Y-%m-%d %H:%M:%S") for i in range(1, pred_len + 1) ]
    
    # Attempt Kronos prediction first
    if kronos_loaded and kronos_predictor is not None:
        try:
            # Prepare inputs for Kronos
            x_df = df[['open', 'high', 'low', 'close', 'volume']].copy()
            # Kronos requires volume to be numeric
            x_df['volume'] = x_df['volume'].astype(float)
            x_df['amount'] = x_df['volume'] * x_df['close'] # Mock amount
            
            x_timestamp = pd.to_datetime(df['timestamp'])
            y_timestamp = pd.to_datetime(future_timestamps)
            
            # Predict
            pred_df = kronos_predictor.predict(
                df=x_df,
                x_timestamp=x_timestamp,
                y_timestamp=y_timestamp,
                pred_len=pred_len,
                T=1.0,
                top_p=0.9,
                sample_count=3
            )
            
            predictions = []
            for i, ts in enumerate(future_timestamps):
                # Safeguard index out of bounds
                idx = pred_df.index[i] if i < len(pred_df) else None
                if idx is not None:
                    row = pred_df.loc[idx]
                    predictions.append({
                        "timestamp": ts,
                        "close": float(row["close"]),
                        "high": float(row["high"]),
                        "low": float(row["low"]),
                        "open": float(row["open"])
                    })
                else:
                    # Extrapolate fallback
                    predictions.append({
                        "timestamp": ts,
                        "close": float(df.iloc[-1]["close"]),
                        "high": float(df.iloc[-1]["high"]),
                        "low": float(df.iloc[-1]["low"]),
                        "open": float(df.iloc[-1]["open"])
                    })
            
            return {
                "status": "kronos",
                "predictions": predictions,
                "error": None
            }
        except Exception as e:
            print(f"Kronos prediction execution failed: {e}. Falling back to RandomForest.")
            
    # RandomForest Fallback prediction
    try:
        # Generate lag features
        lags = 5
        data = df.copy()
        
        for l in range(1, lags + 1):
            data[f"lag_{l}"] = data["close"].shift(l)
            
        data.dropna(inplace=True)
        
        if len(data) < 5:
            raise ValueError("Not enough lag data points.")
            
        X = data[[f"lag_{l}" for l in range(1, lags + 1)]].values
        y = data["close"].values
        
        # Fit model
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)
        
        # Autoregressive forecasting
        current_lags = list(df["close"].values[-lags:])
        predictions = []
        
        # Standard deviation for predictions bounds
        hist_std = float(df["close"].pct_change().std() * df["close"].values[-1])
        
        for i, ts in enumerate(future_timestamps):
            pred_x = np.array(current_lags[-lags:]).reshape(1, -1)
            pred_val = float(model.predict(pred_x)[0])
            
            # Shaded bounds based on historical volatility scale
            vol_scale = np.sqrt(i + 1) * hist_std
            
            predictions.append({
                "timestamp": ts,
                "close": pred_val,
                "high": pred_val + vol_scale,
                "low": pred_val - vol_scale,
                "open": pred_val
            })
            
            # Feed prediction back into lags
            current_lags.append(pred_val)
            
        return {
            "status": "fallback",
            "predictions": predictions,
            "error": None
        }
    except Exception as e:
        return {
            "status": "error",
            "predictions": [],
            "error": f"Fallback predictor failed: {e}"
        }


def optimize_portfolio(returns_df: pd.DataFrame, risk_free_rate: float = 0.02) -> dict:
    """
    Performs Mean-Variance Optimization (Markowitz Efficient Frontier).
    returns_df: DataFrame of asset returns (columns are ticker symbols).
    """
    if returns_df.empty or len(returns_df) < 5:
        return {"error": "Insufficient data for portfolio optimization."}
        
    symbols = list(returns_df.columns)
    num_assets = len(symbols)
    
    # Calculate expected annualized returns and covariance matrix
    # Assuming daily returns, annualized by 252
    expected_returns = returns_df.mean() * 252
    cov_matrix = returns_df.cov() * 252
    
    # Portfolio stats helper
    def portfolio_stats(weights):
        weights = np.array(weights)
        p_ret = np.sum(expected_returns * weights)
        p_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        sharpe = (p_ret - risk_free_rate) / (p_vol + 1e-9)
        return p_ret, p_vol, sharpe
        
    # Objective to minimize for Max Sharpe (negative Sharpe)
    def neg_sharpe(weights):
        return -portfolio_stats(weights)[2]
        
    # Objective to minimize for Min Volatility
    def min_vol(weights):
        return portfolio_stats(weights)[1]
        
    # Constraints: sum of weights = 1, long-only bounds (0, 1)
    constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))
    initial_weights = [1.0 / num_assets] * num_assets
    
    # 1. Max Sharpe Ratio Optimization
    res_sharpe = minimize(neg_sharpe, initial_weights, method="SLSQP", bounds=bounds, constraints=constraints)
    opt_weights_sharpe = list(res_sharpe.x) if res_sharpe.success else initial_weights
    p_ret_sharpe, p_vol_sharpe, sharpe_val = portfolio_stats(opt_weights_sharpe)
    
    # 2. Min Volatility Optimization
    res_vol = minimize(min_vol, initial_weights, method="SLSQP", bounds=bounds, constraints=constraints)
    opt_weights_vol = list(res_vol.x) if res_vol.success else initial_weights
    p_ret_vol, p_vol_vol, vol_val = portfolio_stats(opt_weights_vol)
    
    # 3. Generate Frontier points
    frontier_returns = np.linspace(min(expected_returns), max(expected_returns), 20)
    frontier_vols = []
    
    for target_ret in frontier_returns:
        cons = (
            {"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
            {"type": "eq", "fun": lambda w: np.sum(expected_returns * w) - target_ret}
        )
        res = minimize(min_vol, initial_weights, method="SLSQP", bounds=bounds, constraints=cons)
        if res.success:
            frontier_vols.append(float(res.fun))
        else:
            frontier_vols.append(float(np.sqrt(np.dot(np.array(initial_weights).T, np.dot(cov_matrix, np.array(initial_weights))))))
            
    # Portfolio Risk diagnostics
    # Value at Risk (VaR 95%) assuming normal distribution of returns
    # VaR_95 = portfolio_vol * 1.645 - portfolio_return
    var_sharpe = float(p_vol_sharpe * 1.645 - p_ret_sharpe) / np.sqrt(252) # Convert to daily VaR
    
    return {
        "symbols": symbols,
        "max_sharpe": {
            "weights": {s: float(w) for s, w in zip(symbols, opt_weights_sharpe)},
            "return": float(p_ret_sharpe),
            "volatility": float(p_vol_sharpe),
            "sharpe_ratio": float(sharpe_val),
            "daily_var_95": var_sharpe
        },
        "min_volatility": {
            "weights": {s: float(w) for s, w in zip(symbols, opt_weights_vol)},
            "return": float(p_ret_vol),
            "volatility": float(p_vol_vol),
            "sharpe_ratio": float(vol_val)
        },
        "efficient_frontier": [
            {"volatility": float(v), "return": float(r)} for v, r in zip(frontier_vols, frontier_returns)
        ]
    }
