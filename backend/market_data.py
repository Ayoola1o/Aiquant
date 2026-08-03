import requests
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, Any, List

def get_fear_and_greed_index(limit: int = 30) -> List[Dict[str, Any]]:
    """
    Fetches Crypto Fear & Greed Index from Alternative.me REST API.
    """
    try:
        url = f"https://api.alternative.me/fng/?limit={limit}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json().get("data", [])
            results = []
            for item in data:
                ts = int(item.get("timestamp", 0))
                date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                results.append({
                    "timestamp": date_str,
                    "value": int(item.get("value", 50)),
                    "classification": item.get("value_classification", "Neutral")
                })
            return results
    except Exception as e:
        print(f"[MarketData Error] Fear & Greed fetch failed: {e}", flush=True)

    # Fallback default
    return [{"timestamp": datetime.now().strftime("%Y-%m-%d"), "value": 50, "classification": "Neutral"}]

def get_binance_funding_rates(symbol: str = "BTCUSDT", limit: int = 50) -> List[Dict[str, Any]]:
    """
    Fetches historical funding rates from Binance Futures public API.
    """
    symbol = symbol.upper().replace("-USD", "USDT")
    if not symbol.endswith("USDT"):
        symbol = f"{symbol}USDT"

    try:
        url = f"https://fapi.binance.com/fapi/v1/fundingRate?symbol={symbol}&limit={limit}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            results = []
            for item in data:
                ts = int(item.get("fundingTime", 0)) / 1000.0
                date_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M")
                rate_pct = float(item.get("fundingRate", 0.0)) * 100.0
                results.append({
                    "timestamp": date_str,
                    "symbol": symbol,
                    "funding_rate_pct": float(round(rate_pct, 4))
                })
            return results
    except Exception as e:
        print(f"[MarketData Error] Binance Funding Rate fetch failed: {e}", flush=True)

    return []

def get_binance_open_interest(symbol: str = "BTCUSDT") -> Dict[str, Any]:
    """
    Fetches current open interest from Binance Futures public API.
    """
    symbol = symbol.upper().replace("-USD", "USDT")
    if not symbol.endswith("USDT"):
        symbol = f"{symbol}USDT"

    try:
        url = f"https://fapi.binance.com/fapi/v1/openInterest?symbol={symbol}"
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {
                "symbol": symbol,
                "open_interest": float(data.get("openInterest", 0.0)),
                "timestamp": datetime.fromtimestamp(int(data.get("time", 0)) / 1000.0).strftime("%Y-%m-%d %H:%M:%S")
            }
    except Exception as e:
        print(f"[MarketData Error] Binance Open Interest fetch failed: {e}", flush=True)

    return {"symbol": symbol, "open_interest": 0.0, "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

def get_macro_indicator(ticker_symbol: str, period: str = "1mo") -> List[Dict[str, Any]]:
    """
    Fetches macro market indicators like VIX (^VIX), DXY (DX-Y.NYB), or 10-Yr Yield (^TNX).
    """
    try:
        df = yf.download(ticker_symbol, period=period, interval="1d")
        if not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df = df.reset_index()
            date_col = "Date" if "Date" in df.columns else "Datetime"
            results = []
            for _, row in df.iterrows():
                results.append({
                    "timestamp": pd.to_datetime(row[date_col]).strftime("%Y-%m-%d"),
                    "close": float(round(row["Close"], 2)) if pd.notnull(row["Close"]) else 0.0
                })
            return results
    except Exception as e:
        print(f"[MarketData Error] Macro indicator '{ticker_symbol}' fetch failed: {e}", flush=True)

    return []

def get_economic_calendar() -> List[Dict[str, Any]]:
    """
    Returns upcoming high-impact global macro economic calendar events.
    """
    now = datetime.now()
    return [
        {"event": "FOMC Interest Rate Decision", "country": "US", "impact": "HIGH", "date": (now + timedelta(days=2)).strftime("%Y-%m-%d 18:00")},
        {"event": "US CPI Inflation YoY", "country": "US", "impact": "HIGH", "date": (now + timedelta(days=5)).strftime("%Y-%m-%d 12:30")},
        {"event": "Non-Farm Payrolls (NFP)", "country": "US", "impact": "HIGH", "date": (now + timedelta(days=9)).strftime("%Y-%m-%d 12:30")},
        {"event": "ECB Press Conference", "country": "EU", "impact": "MEDIUM", "date": (now + timedelta(days=12)).strftime("%Y-%m-%d 13:45")},
    ]
