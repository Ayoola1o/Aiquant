import re

# Base Strategy Template that all generated strategies inherit from
BASE_STRATEGY_TEMPLATE = """class CustomStrategy(BaseStrategy):
    \"\"\"
    AI-Generated Quantitative Trading Strategy.
    Prompt: {prompt}
    \"\"\"
    def __init__(self, parameters=None):
        super().__init__(parameters)
        # Initialize strategy-specific parameters
{init_params}

    def on_candle(self, candle, state):
        \"\"\"
        Processes a single candle and returns an order execution action.
        candle: dict with keys ['open', 'high', 'low', 'close', 'volume', 'sma', 'ema', 'rsi', 'macd', 'macd_signal']
        state: dict with keys ['cash', 'positions', 'portfolio_value']
        Returns: dict with keys ['action', 'qty', 'type', 'limit_price'] or None
        \"\"\"
        # Strategy logic:
{strategy_logic}
"""


def generate_strategy_script(prompt: str) -> str:
    """
    Parses a user natural language prompt and generates a fully functioning Python Strategy class.
    """
    prompt_lower = prompt.lower()
    
    # Default parameters
    init_params = "        self.short_window = 9\n        self.long_window = 21\n        self.rsi_oversold = 30\n        self.rsi_overbought = 70\n        self.stop_loss_pct = 0.02"
    
    # 1. Golden Cross / Moving Average Crossover
    if "gold" in prompt_lower or "cross" in prompt_lower or "sma" in prompt_lower or "moving average" in prompt_lower:
        short_w = 50 if "golden" in prompt_lower else 9
        long_w = 200 if "golden" in prompt_lower else 21
        
        init_params = f"        self.short_window = {short_w}\n        self.long_window = {long_w}\n        self.stop_loss_pct = 0.02"
        strategy_logic = f"""        close = candle['close']
        sma_short = candle.get('sma', close) # using default SMA indicator in candle
        ema_long = candle.get('ema', close) # using EMA as long benchmark
        
        # Check current positions for the active symbol (e.g. BTC)
        active_position = sum(state['positions'].values())
        
        # BUY Condition: short average crosses above long average
        if sma_short > ema_long and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close # Use 95% of cash
            return {{"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}}
            
        # SELL Condition: short average crosses below long average
        elif sma_short < ema_long and active_position > 0:
            return {{"action": "SELL", "qty": active_position, "type": "MARKET"}}
            
        return None"""

    # 2. RSI Mean Reversion
    elif "rsi" in prompt_lower or "oversold" in prompt_lower or "overbought" in prompt_lower or "mean reversion" in prompt_lower:
        init_params = "        self.rsi_oversold = 30\n        self.rsi_overbought = 70\n        self.stop_loss_pct = 0.02"
        strategy_logic = """        close = candle['close']
        rsi = candle.get('rsi', 50)
        active_position = sum(state['positions'].values())
        
        # BUY Condition: RSI is oversold (< 30)
        if rsi < self.rsi_oversold and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
            
        # SELL Condition: RSI is overbought (> 70)
        elif rsi > self.rsi_overbought and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None"""

    # 3. MACD Trend Follower
    elif "macd" in prompt_lower or "momentum" in prompt_lower:
        init_params = "        self.stop_loss_pct = 0.03"
        strategy_logic = """        close = candle['close']
        macd = candle.get('macd', 0)
        macd_signal = candle.get('macd_signal', 0)
        active_position = sum(state['positions'].values())
        
        # BUY Condition: MACD line crosses above Signal line
        if macd > macd_signal and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
            
        # SELL Condition: MACD line crosses below Signal line
        elif macd < macd_signal and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None"""
        
    # 4. Bollinger Band Breakout (Simulated with SMA + Volatility deviation)
    elif "breakout" in prompt_lower or "bollinger" in prompt_lower or "band" in prompt_lower:
        init_params = "        self.dev_multiplier = 2.0\n        self.stop_loss_pct = 0.02"
        strategy_logic = """        close = candle['close']
        sma = candle.get('sma', close)
        
        # Estimate standard deviation from indicator delta
        volatility = abs(candle.get('high', close) - candle.get('low', close)) * 0.5
        upper_band = sma + (self.dev_multiplier * volatility)
        lower_band = sma - (self.dev_multiplier * volatility)
        active_position = sum(state['positions'].values())
        
        # BUY Condition: price breaks below lower band (mean reversion buy)
        if close < lower_band and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
            
        # SELL Condition: price breaks above upper band (mean reversion sell)
        elif close > upper_band and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None"""
        
    # 5. Default General Strategy
    else:
        strategy_logic = """        close = candle['close']
        sma = candle.get('sma', close)
        active_position = sum(state['positions'].values())
        
        # Simple trend filter
        if close > sma and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
        elif close < sma and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None"""
        
    return BASE_STRATEGY_TEMPLATE.format(
        prompt=prompt,
        init_params=init_params,
        strategy_logic=strategy_logic
    )


def refine_strategy_script(code: str, adjustment: str) -> str:
    """
    Refines a given Python strategy script based on user adjustments (e.g. adding stop-loss, changing sizes).
    """
    adj_lower = adjustment.lower()
    
    # 1. Inject Stop-Loss logic if requested
    if "stop loss" in adj_lower or "stop-loss" in adj_lower or "risk management" in adj_lower:
        # Extract stop loss percent
        sl_match = re.search(r'(\d+)%', adj_lower)
        sl_pct = float(sl_match.group(1)) / 100.0 if sl_match else 0.02
        
        # Add stop loss parameter to init
        if "self.stop_loss_pct" not in code:
            code = re.sub(
                r'(def __init__\(self, parameters=None\):[\s\S]*?super\(\)\.__init__\(parameters\))',
                r'\1\n        self.stop_loss_pct = ' + str(sl_pct) + '\n        self.entry_price = 0.0',
                code
            )
        
        # Add stop loss check to on_candle
        stop_loss_check = f"""        # Stop-loss check
        if active_position > 0 and self.entry_price > 0:
            if close <= self.entry_price * (1.0 - self.stop_loss_pct):
                self.entry_price = 0.0
                return {{"action": "SELL", "qty": active_position, "type": "MARKET"}}"""
                
        # Insert check at start of on_candle
        code = re.sub(
            r'(def on_candle\(self, candle, state\):[\s\S]*?active_position = sum\(state\[\'positions\'\].values\(\)\))',
            r'\1\n' + stop_loss_check,
            code
        )
        
        # Capture entry price on BUY orders
        buy_capture = """        # Track entry price
        order = None
        # Original buy logic follows:"""
        # Inject entry_price tracking on buy
        code = code.replace(
            'return {"action": "BUY"',
            'self.entry_price = close\n            return {"action": "BUY"'
        )
        code = code.replace(
            'return {"action": "SELL"',
            'self.entry_price = 0.0\n            return {"action": "SELL"'
        )

    # 2. Modify default parameters if requested
    elif "window" in adj_lower or "period" in adj_lower:
        val_match = re.search(r'(\d+)', adj_lower)
        if val_match:
            new_val = int(val_match.group(1))
            if "short" in adj_lower:
                code = re.sub(r'self.short_window = \d+', f'self.short_window = {new_val}', code)
            elif "long" in adj_lower:
                code = re.sub(r'self.long_window = \d+', f'self.long_window = {new_val}', code)
                
    return code


def get_news_sentiment(ticker: str) -> list:
    """
    Returns simulated real-time news articles with computed AI sentiments.
    """
    clean_ticker = ticker.upper().replace("-USD", "").replace("USDT", "")
    
    # Database of template headlines
    templates = [
        {"headline": "Analyst Upgrades {ticker} Following Strong Q1 Volatility Indices", "impact": 0.8, "source": "Wall Street Journal"},
        {"headline": "{ticker} Encounters Technical Support Line as Volume Expands", "impact": 0.6, "source": "Bloomberg"},
        {"headline": "Regulatory Headwinds Loom for {ticker} Ecosystem Traders", "impact": -0.7, "source": "Reuters"},
        {"headline": "Retail Inflow to {ticker} Reaches Multi-Month Peak", "impact": 0.9, "source": "CoinDesk"},
        {"headline": "Whale Distribution Triggers Selloff in {ticker} Trading Pairs", "impact": -0.5, "source": "Financial Times"}
    ]
    
    news_feed = []
    for i, t in enumerate(templates):
        headline = t["headline"].format(ticker=clean_ticker)
        sentiment_score = t["impact"]
        
        if sentiment_score > 0.5:
            lbl = "Bullish"
            confidence = int(sentiment_score * 100)
        elif sentiment_score < -0.5:
            lbl = "Bearish"
            confidence = int(abs(sentiment_score) * 100)
        else:
            lbl = "Neutral"
            confidence = 50
            
        news_feed.append({
            "id": i + 1,
            "headline": headline,
            "source": t["source"],
            "sentiment": lbl,
            "score": float(sentiment_score),
            "confidence": confidence,
            "timestamp": "Just now" if i == 0 else f"{i*2}h ago"
        })
        
    return news_feed
