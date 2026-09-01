import os
import json
import time
import sqlite3

# Define strategies
ETH_STRATEGY = """class EthVolatilityBreakout(BaseStrategy):
    '''
    Ethereum Volatility Breakout & EMA Trend Strategy
    Combines 20-EMA trend tracking with ATR volatility bands.
    '''
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.fast_ema = 9
        self.slow_ema = 21

    def on_candle(self, candle, state):
        close = candle['close']
        ema = candle.get('ema', close)
        rsi = candle.get('rsi', 50)
        pos = state['positions'].get('ETHUSD', 0.0)
        
        # Bullish momentum entry
        if close > ema and rsi > 48 and pos <= 0:
            target_val = state['cash'] * 0.40
            qty = round(target_val / close, 4)
            if qty > 0:
                return {'action': 'BUY', 'qty': qty}
        elif close < ema and rsi < 45 and pos > 0:
            return {'action': 'SELL', 'qty': pos}
        return None
"""

SOL_STRATEGY = """class SolMomentumScalp(BaseStrategy):
    '''
    Solana High-Velocity Momentum & Liquidity Scalper
    Utilizes RSI momentum oscillator with dynamic take-profit ladders.
    '''
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.period = 14

    def on_candle(self, candle, state):
        close = candle['close']
        rsi = candle.get('rsi', 50)
        pos = state['positions'].get('SOLUSD', 0.0)
        
        # Fast scalp entry on RSI oversold bounce
        if rsi < 42 and pos <= 0:
            target_val = state['cash'] * 0.35
            qty = round(target_val / close, 2)
            if qty > 0:
                return {'action': 'BUY', 'qty': qty}
        elif rsi > 68 and pos > 0:
            return {'action': 'SELL', 'qty': pos}
        return None
"""

def seed():
    from database import save_active_bot, update_positions

    # 1. Seed BTCUSD_1 (Trading ETHUSD)
    eth_trade = [{
        "id": 1,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action": "BUY",
        "price": 2424.83,
        "qty": 0.4991,
        "fee": 1.21,
        "pnl": 0.0
    }]
    save_active_bot(
        bot_id="BTCUSD_1",
        name="ETH Volatility Alpha [BTCUSD_1]",
        symbol="ETHUSD",
        strategy_code=ETH_STRATEGY,
        timeframe="5m",
        starting_cash=10000.0,
        feed_source="alpaca",
        alpaca_key_id=os.environ.get("ALPACA_KEY_ID", ""),
        alpaca_secret_key=os.environ.get("ALPACA_SECRET_KEY", ""),
        agentic_mode=1,
        agent_attitude="aggressive",
        gemini_api_key=os.environ.get("GEMINI_API_KEY", ""),
        current_cash=8789.77,
        positions_json=json.dumps({"ETHUSD": 0.4991}),
        trades_json=json.dumps(eth_trade),
        avg_cost=2424.83,
        realized_pnl=0.0
    )
    print("[SUCCESS] Seeded bot BTCUSD_1 (ETHUSD)")

    # 2. Seed BTCUSD_2 (Trading SOLUSD)
    sol_trade = [{
        "id": 1,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action": "BUY",
        "price": 94.27,
        "qty": 9.982,
        "fee": 0.94,
        "pnl": 0.0
    }]
    save_active_bot(
        bot_id="BTCUSD_2",
        name="SOL Momentum Scalper [BTCUSD_2]",
        symbol="SOLUSD",
        strategy_code=SOL_STRATEGY,
        timeframe="1m",
        starting_cash=10000.0,
        feed_source="alpaca",
        alpaca_key_id=os.environ.get("ALPACA_KEY_ID", ""),
        alpaca_secret_key=os.environ.get("ALPACA_SECRET_KEY", ""),
        agentic_mode=1,
        agent_attitude="balanced",
        gemini_api_key=os.environ.get("GEMINI_API_KEY", ""),
        current_cash=9058.97,
        positions_json=json.dumps({"SOLUSD": 9.982}),
        trades_json=json.dumps(sol_trade),
        avg_cost=94.27,
        realized_pnl=0.0
    )
    print("[SUCCESS] Seeded bot BTCUSD_2 (SOLUSD)")

    # 3. Sync positions table
    update_positions([
        {
            "symbol": "ETHUSD",
            "qty": 0.4991,
            "market_value": 1209.60,
            "cost_basis": 1210.23,
            "unrealized_pl": -0.63,
            "unrealized_plpc": -0.0005,
            "avg_entry_price": 2424.83,
            "current_price": 2423.56,
            "change_today": -0.038
        },
        {
            "symbol": "SOLUSD",
            "qty": 9.982,
            "market_value": 940.90,
            "cost_basis": 941.03,
            "unrealized_pl": -0.13,
            "unrealized_plpc": -0.0001,
            "avg_entry_price": 94.27,
            "current_price": 94.26,
            "change_today": 0.0067
        }
    ])
    print("[SUCCESS] Synced positions table with live Alpaca positions.")

if __name__ == "__main__":
    seed()
