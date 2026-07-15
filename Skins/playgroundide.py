class CustomStrategy(BaseStrategy):
    """
    AI-Generated Quantitative Trading Strategy.
    Prompt: rewrite this prompt i copied "from jesse.strategies import Strategy import jesse.indicators as ta from jesse import utils  class LiquidityTrading(Strategy):     @property     def volume_osc(self):         # Measures volume momentum to identify liquidity spikes         return ta.vosc(self.candles, short_period=2, long_period=5)      @property     def rsi(self):         return ta.rsi(self.candles, period=14)      def should_long(self) -> bool:         # Long when liquidity spikes (vosc > 0) and RSI is gaining strength         return self.volume_osc > 0 and 50 < self.rsi < 70      def should_short(self) -> bool:         # Short when liquidity spikes and RSI is weakening         return self.volume_osc > 0 and 30 < self.rsi < 50      def go_long(self):         qty = utils.risk_to_qty(self.capital, 3, self.price, self.price * 0.95)         self.buy = qty, self.price      def go_short(self):         qty = utils.risk_to_qty(self.capital, 3, self.price, self.price * 1.05)         self.sell = qty, self.price      def should_cancel_entry(self) -> bool:         return True      def update_position(self):         # Exit if liquidity dries up (vosc becomes negative)         if self.volume_osc < 0:             self.liquidate()"
    """
    def __init__(self, parameters=None):
        super().__init__(parameters)
        # Initialize strategy-specific parameters
        self.rsi_oversold = 30
        self.rsi_overbought = 70
        self.stop_loss_pct = 0.02

    def on_candle(self, candle, state):
        """
        Processes a single candle and returns an order execution action.
        candle: dict with keys ['open', 'high', 'low', 'close', 'volume', 'sma', 'ema', 'rsi', 'macd', 'macd_signal']
        state: dict with keys ['cash', 'positions', 'portfolio_value']
        Returns: dict with keys ['action', 'qty', 'type', 'limit_price'] or None
        """
        # Strategy logic:
        close = candle['close']
        rsi = candle.get('rsi', 50)
        active_position = sum(state['positions'].values())
        
        # BUY Condition: RSI is oversold (< 30)
        if rsi < self.rsi_oversold and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
            
        # SELL Condition: RSI is overbought (> 70)
        elif rsi > self.rsi_overbought and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None
