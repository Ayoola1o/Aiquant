import pandas as pd
from typing import List, Optional

from .technical import compute_technical_features
from .volatility import compute_volatility_features
from .momentum import compute_momentum_features
from .volume import compute_volume_features
from .market_structure import compute_market_structure_features
from .statistical import compute_statistical_features

class FeatureEngine:
    """
    Unified Feature Engine for AI Quant Operating System (AIQOS).
    Transforms raw OHLCV candle data into rich multi-dimensional feature sets.
    """

    MODULE_MAP = {
        "technical": compute_technical_features,
        "volatility": compute_volatility_features,
        "momentum": compute_momentum_features,
        "volume": compute_volume_features,
        "market_structure": compute_market_structure_features,
        "statistical": compute_statistical_features,
    }

    @classmethod
    def calculate(cls, df: pd.DataFrame, modules: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Calculates requested feature modules on the provided DataFrame.
        If modules is None or empty, all modules are computed by default.
        """
        if df.empty or len(df) < 2:
            return df

        result_df = df.copy()

        target_modules = modules if modules else list(cls.MODULE_MAP.keys())

        for mod_name in target_modules:
            mod_func = cls.MODULE_MAP.get(mod_name.lower())
            if mod_func:
                try:
                    result_df = mod_func(result_df)
                except Exception as e:
                    print(f"[FeatureEngine Error] Module '{mod_name}' failed: {e}", flush=True)

        return result_df

    @classmethod
    def get_feature_inspector_snapshot(cls, df: pd.DataFrame, index: int = -1) -> dict:
        """
        Returns a detailed feature inspection snapshot dictionary for a specific candle index
        (used by the AIQOS Feature Inspector UI panel).
        """
        enriched_df = cls.calculate(df)
        if enriched_df.empty:
            return {}

        target_row = enriched_df.iloc[index]
        snapshot = {
            "timestamp": str(target_row.get("timestamp", "")),
            "ohlcv": {
                "open": float(target_row.get("open", 0.0)),
                "high": float(target_row.get("high", 0.0)),
                "low": float(target_row.get("low", 0.0)),
                "close": float(target_row.get("close", 0.0)),
                "volume": float(target_row.get("volume", 0.0)),
            },
            "technicals": {
                "vwap": float(target_row.get("vwap", 0.0)),
                "adx": float(target_row.get("adx", 0.0)),
                "cci": float(target_row.get("cci", 0.0)),
                "stoch_k": float(target_row.get("stoch_k", 0.0)),
                "stoch_d": float(target_row.get("stoch_d", 0.0)),
                "williams_r": float(target_row.get("williams_r", 0.0)),
                "ichimoku_tenkan": float(target_row.get("ichimoku_tenkan", 0.0)),
                "ichimoku_kijun": float(target_row.get("ichimoku_kijun", 0.0)),
            },
            "volatility": {
                "volatility_20": float(target_row.get("volatility_20", 0.0)),
                "volatility_60": float(target_row.get("volatility_60", 0.0)),
                "parkinson_volatility": float(target_row.get("parkinson_volatility", 0.0)),
                "volatility_zscore": float(target_row.get("volatility_zscore", 0.0)),
            },
            "momentum": {
                "roc_12": float(target_row.get("roc_12", 0.0)),
                "ppo": float(target_row.get("ppo", 0.0)),
                "tsi": float(target_row.get("tsi", 0.0)),
                "coppock_curve": float(target_row.get("coppock_curve", 0.0)),
            },
            "volume": {
                "obv": float(target_row.get("obv", 0.0)),
                "mfi": float(target_row.get("mfi", 0.0)),
                "cmf": float(target_row.get("cmf", 0.0)),
                "force_index": float(target_row.get("force_index", 0.0)),
                "volume_ratio": float(target_row.get("volume_ratio", 0.0)),
            },
            "market_structure": {
                "pivot": float(target_row.get("pivot", 0.0)),
                "pivot_r1": float(target_row.get("pivot_r1", 0.0)),
                "pivot_s1": float(target_row.get("pivot_s1", 0.0)),
                "is_swing_high": bool(target_row.get("is_swing_high", False)),
                "is_swing_low": bool(target_row.get("is_swing_low", False)),
            },
            "statistical": {
                "zscore_20": float(target_row.get("zscore_20", 0.0)),
                "percentile_rank_50": float(target_row.get("percentile_rank_50", 0.0)),
                "autocorr_lag1": float(target_row.get("autocorr_lag1", 0.0)),
                "rolling_entropy_30": float(target_row.get("rolling_entropy_30", 0.0)),
                "hurst_exponent": float(target_row.get("hurst_exponent", 0.5)),
            }
        }
        return snapshot
