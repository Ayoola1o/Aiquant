import sys
import os
import requests
import datetime
import time
import pandas as pd
import json

# Add backend to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backtest_engine import run_historical_backtest

# Load strategy code
with open("teststr.py", "r") as f:
    strategy_code = f.read()

print("Downloading SOLUSDT 1h data from Binance...")

start_str = "2025-01-01"
end_str = "2026-01-01"
start_ts = int(datetime.datetime.strptime(start_str, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)
end_ts = int(datetime.datetime.strptime(end_str, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc).timestamp() * 1000)

url = "https://api.binance.com/api/v3/klines"
all_candles = []

current_ts = start_ts
while current_ts < end_ts:
    params = {
        "symbol": "SOLUSDT",
        "interval": "1h",
        "startTime": current_ts,
        "endTime": end_ts,
        "limit": 1000
    }
    res = requests.get(url, params=params)
    data = res.json()
    if not data or type(data) != list:
        break
        
    all_candles.extend(data)
    current_ts = data[-1][0] + 1
    print(f"Downloaded {len(data)} candles, total: {len(all_candles)}")
    time.sleep(0.1)

if not all_candles:
    print("No data downloaded!")
    sys.exit(1)

df = pd.DataFrame(all_candles, columns=[
    "timestamp", "open", "high", "low", "close", "volume",
    "close_time", "qav", "num_trades", "tbbav", "tbqav", "ignore"
])
df = df[["timestamp", "open", "high", "low", "close", "volume"]]
df = df.astype(float)
# engine expects lowercase columns, timestamp is already ms, but wait, backtest_engine expects pandas datetime!
df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")

print(f"Data shape: {df.shape}")

print("Running backtest...")
result = run_historical_backtest(
    strategy_code=strategy_code,
    df=df,
    starting_capital=10000.0,
    commission_pct=0.001
)

if not result.get("success", False):
    print("Backtest failed!")
    print(json.dumps(result, indent=2))
else:
    metrics = result["kpis"]
    print("\n--- RESULTS ---")
    print(f"Total PNL: ${metrics['pnl']} ({metrics['pnl_pct']}%)")
    print(f"Win rate: {metrics['win_rate']}%")
    print(f"Sharpe ratio: {metrics['sharpe_ratio']}")
    print(f"Max drawdown: {metrics['max_drawdown_pct']}%")
    print(f"Total trades: {metrics['total_trades']}")
    print(f"Starting balance: {metrics['starting_balance']}")
    print(f"Finishing balance: {metrics['finishing_balance']}")
    print(f"Total winning trades: {metrics['total_winning_trades']}")
    print(f"Total losing trades: {metrics['total_losing_trades']}")
    print(f"Longs count: {metrics['longs_count']}")
    print(f"Shorts count: {metrics['shorts_count']}")
    print("--- RAW DICT ---")
    print(json.dumps(metrics, indent=2))
