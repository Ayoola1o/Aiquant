import numpy as np
import pandas as pd
from typing import List, Dict, Any

def run_monte_carlo_simulation(
    trade_pnls: List[float],
    starting_capital: float = 10000.0,
    n_paths: int = 1000,
    n_trades: int = None
) -> Dict[str, Any]:
    """
    Runs a Monte Carlo simulation on backtest trade PnLs.
    Resamples trade sequences to project probability distributions of portfolio outcomes.
    
    Returns:
      - percentiles: {5th, 25th, 50th, 75th, 95th} equity path curves
      - metrics: probability_of_ruin, median_final_equity, max_expected_drawdown, best_case, worst_case
    """
    if not trade_pnls or len(trade_pnls) < 3:
        # Fallback for empty or insufficient trade history
        empty_curve = [starting_capital] * 50
        return {
            "success": False,
            "error": "Insufficient trades for Monte Carlo simulation (minimum 3 required).",
            "percentiles": {
                "p5": empty_curve,
                "p25": empty_curve,
                "p50": empty_curve,
                "p75": empty_curve,
                "p95": empty_curve
            },
            "metrics": {
                "probability_of_ruin": 0.0,
                "median_final_equity": starting_capital,
                "max_expected_drawdown": 0.0,
                "best_case_equity": starting_capital,
                "worst_case_equity": starting_capital,
                "n_paths": n_paths,
                "n_trades": 0
            }
        }

    pnls_array = np.array(trade_pnls, dtype=float)
    num_trades = n_trades or len(pnls_array)
    num_trades = max(10, num_trades)

    # Matrix of random trade samples: shape (n_paths, num_trades)
    sampled_indices = np.random.choice(len(pnls_array), size=(n_paths, num_trades), replace=True)
    sampled_pnls = pnls_array[sampled_indices]

    # Calculate equity curves: shape (n_paths, num_trades + 1)
    equity_paths = np.zeros((n_paths, num_trades + 1), dtype=float)
    equity_paths[:, 0] = starting_capital

    for step in range(num_trades):
        equity_paths[:, step + 1] = equity_paths[:, step] + sampled_pnls[:, step]

    # Calculate ruin instances (balance drops <= 50% of starting capital or <= 0)
    min_equity_per_path = np.min(equity_paths, axis=1)
    ruined_paths = np.sum(min_equity_per_path <= (starting_capital * 0.5))
    prob_ruin = (ruined_paths / n_paths) * 100.0

    # Calculate Max Drawdown per path
    peak_per_step = np.maximum.accumulate(equity_paths, axis=1)
    drawdowns_per_step = (peak_per_step - equity_paths) / peak_per_step
    max_dd_per_path = np.max(drawdowns_per_step, axis=1) * 100.0
    avg_max_dd = float(np.mean(max_dd_per_path))

    # Calculate Percentile Curves across trade steps
    p5_curve = np.percentile(equity_paths, 5, axis=0).tolist()
    p25_curve = np.percentile(equity_paths, 25, axis=0).tolist()
    p50_curve = np.percentile(equity_paths, 50, axis=0).tolist()
    p75_curve = np.percentile(equity_paths, 75, axis=0).tolist()
    p95_curve = np.percentile(equity_paths, 95, axis=0).tolist()

    final_equities = equity_paths[:, -1]

    return {
        "success": True,
        "percentiles": {
            "p5": [float(v) for v in p5_curve],
            "p25": [float(v) for v in p25_curve],
            "p50": [float(v) for v in p50_curve],
            "p75": [float(v) for v in p75_curve],
            "p95": [float(v) for v in p95_curve]
        },
        "metrics": {
            "probability_of_ruin": float(round(prob_ruin, 2)),
            "median_final_equity": float(round(np.median(final_equities), 2)),
            "max_expected_drawdown": float(round(avg_max_dd, 2)),
            "best_case_equity": float(round(np.max(final_equities), 2)),
            "worst_case_equity": float(round(np.min(final_equities), 2)),
            "n_paths": n_paths,
            "n_trades": num_trades
        }
    }
