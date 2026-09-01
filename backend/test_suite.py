import sys
import os
import unittest
import pandas as pd
import numpy as np

# Ensure backend directory is in sys.path
backend_path = os.path.abspath(os.path.dirname(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backtest_engine import run_historical_backtest
from feature_engine.engine import FeatureEngine
from trading_engine import RiskManager
from market_data import get_best_execution_route


class TestAiquantSuite(unittest.TestCase):

    def setUp(self):
        dates = pd.date_range("2026-01-01", periods=100, freq="1h")
        base = 100.0 + np.cumsum(np.random.randn(100) * 0.5)
        self.df = pd.DataFrame({
            "timestamp": dates,
            "open": base,
            "high": base + np.abs(np.random.randn(100) * 1.0),
            "low": base - np.abs(np.random.randn(100) * 1.0),
            "close": base + np.random.randn(100) * 0.2,
            "volume": np.random.randint(100, 1000, size=100)
        })

    def test_feature_engine_calculation(self):
        feat_df = FeatureEngine.calculate(self.df)
        self.assertFalse(feat_df.empty)
        self.assertIn("volatility_20", feat_df.columns)
        self.assertIn("vwap", feat_df.columns)

    def test_backtest_engine_execution(self):
        strategy_code = """
class TestStrat(BaseStrategy):
    def on_candle(self, candle, state):
        return {'action': 'BUY', 'qty': 1.0}
"""
        result = run_historical_backtest(strategy_code, self.df)
        self.assertTrue(result.get("success"), f"Backtest failed: {result.get('error')}")
        self.assertIn("kpis", result)

    def test_risk_manager_telemetry(self):
        rm = RiskManager()
        telemetry = rm.get_telemetry_snapshot()
        self.assertIsInstance(telemetry, dict)
        self.assertIn("current_drawdown_pct", telemetry)
        self.assertIn("heartbeat_ok", telemetry)
        self.assertFalse(telemetry["paused"])

    def test_market_best_execution_router(self):
        route = get_best_execution_route("BTCUSDT")
        self.assertIsInstance(route, dict)
        self.assertEqual(route["symbol"], "BTCUSDT")
        self.assertIn("optimal_venue", route)
        self.assertGreater(len(route["venues"]), 0)


def run_all_tests() -> dict:
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestAiquantSuite)
    runner = unittest.TextTestRunner(stream=open(os.devnull, 'w'), verbosity=0)
    result = runner.run(suite)

    return {
        "tests_run": result.testsRun,
        "was_successful": result.wasSuccessful(),
        "errors_count": len(result.errors),
        "failures_count": len(result.failures),
        "errors": [str(e) for e in result.errors],
        "failures": [str(f) for f in result.failures]
    }


if __name__ == "__main__":
    res = run_all_tests()
    print(f"Test Suite Summary: Run {res['tests_run']}, Successful: {res['was_successful']}")
    if not res["was_successful"]:
        sys.exit(1)
