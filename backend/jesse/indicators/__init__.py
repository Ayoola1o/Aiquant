"""
jesse/indicators/__init__.py  —  Aiquant shim for Jesse indicators.

This module proxies all indicator calls to the Aiquant native indicators library.
When a strategy uses `from jesse import indicators as ta` or `import jesse.indicators as ta`,
it will resolve to this file, which exposes the Aiquant indicators.
"""
from aiquant.indicators import *
import aiquant.indicators

def __getattr__(name: str):
    # Delegate undefined attributes to aiquant.indicators which implements the fallback
    return getattr(aiquant.indicators, name)

