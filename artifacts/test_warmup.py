import sys
import os
import time

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/../backend"))

from trading_engine import TradingBot
from backtest_engine import BaseStrategy

# Simple strategy code string
strat_code = """
class TestStrategy(BaseStrategy):
    def __init__(self, parameters=None):
        super().__init__(parameters)
        
    def on_candle(self, candle, state):
        print(f"--- Strategy evaluated on candle {candle['timestamp']} ---")
        print(f"Close: {candle['close']:.2f} | SMA: {candle.get('sma'):.2f} | RSI: {candle.get('rsi'):.2f}")
        return {"action": "BUY", "qty": 0.05}
"""

bot = TradingBot(
    bot_id="test_warmup_bot",
    name="Test Warmup Bot",
    symbol="BTCUSDT",
    strategy_code=strat_code,
    timeframe="10s",
    starting_cash=10000.0,
    feed_source="mock"
)

print(f"Before warmup, candles count: {len(bot.candles)}")
bot.warmup_candles()
print(f"After warmup, candles count: {len(bot.candles)}")

if len(bot.candles) > 0:
    print(f"First candle timestamp: {bot.candles[0]['timestamp']} | Close: {bot.candles[0]['close']}")
    print(f"Last candle timestamp: {bot.candles[-1]['timestamp']} | Close: {bot.candles[-1]['close']}")

# Now test closing a candle and running the strategy
print("\n--- Simulating closing a live candle ---")
bot.active_candle = {
    "timestamp": "2026-06-29 12:00:00",
    "open": 67000.0,
    "high": 67100.0,
    "low": 66900.0,
    "close": 67050.0,
    "volume": 1.2
}
bot._close_candle(67050.0)

print(f"Trades log size: {len(bot.trades)}")
if len(bot.trades) > 0:
    print(f"Trade triggered: {bot.trades[-1]}")
else:
    print("No trades triggered.")
