import sys
import os
import pandas as pd
import numpy as np

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backtest_engine import run_historical_backtest

strategy_code = """
import numpy as np
import jesse.indicators as ta
from jesse.strategies import Strategy
from jesse import utils


class MtfMomo2xA(Strategy):
    \"\"\"Dual-anchor (4h+1D agreement) 1h momentum. Concrete params from SOL optimum (train 1.39).\"\"\"
    ENTRY_LB = 26
    EMA_EXIT = 35
    EMA_4H = 21
    EMA_1D = 16
    STOP_ATR = 3.295829874337854
    TP_ATR = 8.681332636811806
    RISK_PCT = 2.0

    @property
    def _atr(self):
        a = ta.atr(self.candles, period=14)
        if a is None or not np.isfinite(a) or a <= 0:
            return None
        return a

    @property
    def _ema_exit(self):
        return ta.ema(self.candles, period=self.EMA_EXIT)

    @property
    def _dc(self):
        return ta.donchian(self.candles[:-1], period=self.ENTRY_LB)

    def _dir(self, tf, period):
        ac = self.get_candles(self.exchange, self.symbol, tf)
        if len(ac) < period + 4:
            return 0
        en = ta.ema(ac, period=period)
        ep = ta.ema(ac[:-2], period=period)
        if not (np.isfinite(en) and np.isfinite(ep)):
            return 0
        c = ac[-1, 2]
        if c > en and en > ep:
            return 1
        if c < en and en < ep:
            return -1
        return 0

    def _agree(self):
        d4 = self._dir('4h', self.EMA_4H)
        d1 = self._dir('1D', self.EMA_1D)
        return d4 if (d4 != 0 and d4 == d1) else 0

    def should_long(self) -> bool:
        if len(self.candles) < 60:
            return False
        return self._agree() == 1 and self.close > self._dc.upperband

    def should_short(self) -> bool:
        if len(self.candles) < 60:
            return False
        return self._agree() == -1 and self.close < self._dc.lowerband

    def go_long(self):
        atr = self._atr
        if atr is None:
            return
        entry = self.price
        stop = entry - self.STOP_ATR * atr
        qty = utils.risk_to_qty(self.available_margin, self.RISK_PCT, entry, stop, fee_rate=self.fee_rate)
        if qty <= 0:
            return
        self.buy = qty, entry

    def go_short(self):
        atr = self._atr
        if atr is None:
            return
        entry = self.price
        stop = entry + self.STOP_ATR * atr
        qty = utils.risk_to_qty(self.available_margin, self.RISK_PCT, entry, stop, fee_rate=self.fee_rate)
        if qty <= 0:
            return
        self.sell = qty, entry

    def should_cancel_entry(self) -> bool:
        return True

    def on_open_position(self, order):
        atr = self._atr
        if atr is None:
            return
        if self.is_long:
            self.stop_loss = self.position.qty, self.position.entry_price - self.STOP_ATR * atr
            self.take_profit = self.position.qty, self.position.entry_price + self.TP_ATR * atr
        elif self.is_short:
            self.stop_loss = self.position.qty, self.position.entry_price + self.STOP_ATR * atr
            self.take_profit = self.position.qty, self.position.entry_price - self.TP_ATR * atr

    def update_position(self):
        ema = self._ema_exit
        if not np.isfinite(ema):
            return
        if self.is_long and self.close < ema:
            self.liquidate()
        elif self.is_short and self.close > ema:
            self.liquidate()
"""

# Dummy data
np.random.seed(42)
idx = pd.date_range('2023-01-01', periods=100, freq='1h')
df = pd.DataFrame({
    'timestamp': idx,
    'open': np.random.randn(100).cumsum() + 100,
    'high': np.random.randn(100).cumsum() + 105,
    'low': np.random.randn(100).cumsum() + 95,
    'close': np.random.randn(100).cumsum() + 100,
    'volume': np.random.randint(100, 1000, 100)
})

res = run_historical_backtest(strategy_code, df)
print(res)
