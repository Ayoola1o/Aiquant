## Correlation

![pair trading Interface](https://os-engine-eng.com/upload/000/u2/7/2/720de8d7.jpg)

1. What is correlation?

Correlation in trading is a numerical measure of the relationship between different assets and indices. How synchronously two assets move.

The numerical value of correlation can range from +1 to -1, which is very convenient for calculations and using this indicator during trading.

1. +1 means very high synchronicity of assets. High correlation. Candles literally follow each other without deviations.

2. -1 indicates negative correlation. This means that assets move in different directions.

3. Everything between these values needs to be somehow interpreted in the code. Not always in an obvious way. But we will also talk about this.

 

2. Why is it important to know the correlation coefficient in pair trading?

1. Because it greatly influences the overall profitability of robots for pair and other types of arbitrage, in which two assets (or an asset to an index) are compared.

2. Changes in correlation dynamics can themselves provide excellent entry points. You can even not pay much attention to the charts of the instruments. Example:

![Correlation dynamics](https://os-engine-eng.com/upload/000/u2/8/d/8d9eab0e.jpg)

3. How to calculate correlation?

Since this post will be read for the next 5 years, we simply must include formulas for mathematicians here. But that doesn't mean you have to delve into this and get scared) Don't be scared! Everything is much simpler!

Usually it is proposed to do this:

![Correlation formula 1](https://os-engine-eng.com/upload/000/u2/c/7/c794094d.jpg)

where:

X is the price of the first instrument
Y is the price of the second instrument
OR
![Correlation formula 2](https://os-engine-eng.com/upload/000/u2/8/6/cf1688d3.jpg)

where:

Sx is the standard deviation of X
Sy is the standard deviation of Y
n is the number of periods
r is the correlation coefficient

4. Python Implementation:

import pandas as pd
import numpy as np

def calculate_correlation(series1, series2):
    return series1.corr(series2)

Let's test this with some random data:

np.random.seed(42)
data_x = np.random.randn(100).cumsum()
data_y = data_x + np.random.randn(100) * 2

df = pd.DataFrame({'X': data_x, 'Y': data_y})

correlation = calculate_correlation(df['X'], df['Y'])
print(f"Correlation: {correlation:.2f}")

4. In Conclusion

At this point, it is important to understand:

1. Correlation is very important when trading pair arbitrage or an asset to an index.

2. This thing generates trading signals on its own and can serve as a filter for entry. Because very low correlation in the moment may indicate that it is not worth trading on convergence at that moment.

3. You can calculate in any language using standard methods by throwing an array of candles or an array of type double into some class. There is no need to memorize formulas. Focus on trading logic. In OsEngine, everything has already been done for you, and in the pair trading layer, you will always have up-to-date data on correlation at your fingertips.

## Cointegration
Cointegration and stationarity are properties of arrays of values invented by mathematicians in the times of computer absence, meaning that with the presence of cointegration or stationarity, in the context of algorithmic trading in the 21st century, we can profit from the movement of candles within these two arrays, as there is a certain clear pattern in their movements relative to each other.

In the context of algorithmic trading, knowing more is not necessary. And one should not delve into it at all. Since there are no stationary series in trading, there is only temporary cointegration and temporary stationarity on which one can try to make a profit.

You can read more about this on Habr, but it's better not to. It will melt your brain, and you won't gain any money.

What you need to know is the following:

After years of theorizing and paperwork in search of cointegration, mathematicians came up with a graph of the minimum residuals from the difference of two instruments with an optimal multiplier, which will help us make money.


1. Graph of the minimum residuals from the difference of two arrays of candles with an optimal multiplier.

The calculation is as follows:

Paper1 - (Paper2 * Multiplier).

We adjust the multiplier so that the standard deviation is minimal.

![Fig. 1. The location of the graph in the Os Engine](https://os-engine-eng.com/upload/000/u2/6/4/648f25fc.jpg)
Fig. 1. The location of the graph in the Os Engine

Essentially, it is the simplest indicator for two arrays of candles. C# managed to brute-force it in 20 minutes, and now it is included in OsEngine in the general assembly.

This graph allows you to dynamically observe the deviation of one instrument from another and trade around its values.

The two white bands on the graph are calculated as the standard deviation on the same, multiplied by another multiplier:

![alt text](https://os-engine-eng.com/upload/000/u2/d/9/d98de862.jpg)

Fig. 2. Settings for the graph of the minimum residuals from the difference of two arrays of...

1. Deviation for the white lines on the graph.

2. Depth of the graph calculation.

These two settings are the subject of optimization in pair trading.

 

2. How to make sure that a pair is cointegrated or even stationary?

DO YOU NEED TO GRADUATE WITH A PHYSICS DEGREE AND SPEND 5 YEARS IN MATLAB STUDYING FORMULAS? No...

Much faster:

1. Take the free robots from OsEngine that trade based on this graph, or create your own. Then the "Graph of the minimum residuals from the difference of two arrays of candles with an optimal multiplier" will simply be called "Cointegration" in some places. This is not entirely scientific, but writing a lengthy definition of this graph everywhere is even more schizophrenic.

2. Test these robots on different pairs.

3. Experiment with depth and deviation settings.

4. Review robot logs after testing.

5. If the equity curve is going up, then it is often a cointegrated pair (there is some statistically significant regularity present). And if the equity curve is flat or going down, then it is not a cointegrated pair.

 

3. Conclusion.

The essence of this article was to introduce the "Graph of the minimum residuals from the difference of two arrays of candles with an optimal multiplier", which is carelessly labeled as "Cointegration" in OsEngine for brevity.

But the graph is clear, and its essence is clear.

It is already calculated for you. It is calculated dynamically on each candle. It can be accessed from robots, and three examples have already been written for this purpose.

Different uses of this graph in trading logic can help in tests:

1. Pairs for convergence.

2. Pairs for divergence.

3. Other strange patterns on the cointegration graph to profit from the movement of instruments.

# WORK IN PROGRESS

Index arbitrage.
Possible robot algorithms.
Volatility. Trading based on index.
Correlation. Trading from index.
Minimum residuals from the difference of two price series with the optimal multiplier.
Volumes in indexes. Trading from index.

## Active Positions
Real-time unrealized and realized P&L
Entry price, current price, and leverage
Position duration with staleness warnings
Stop-loss and take-profit levels

## Trade History
Complete order log with timestamps
Win rate and average R-multiple
Fees and net profit breakdown

## Performance Analytics
Win rate analysis and R-multiple distribution
Profit factor and strategy comparison
Drawdown analysis and time-based breakdowns
Per-asset performance and risk metrics


## System Arch

┌─────────────────────────────────────────────────────────┐
│ Aiquant Engine &  Trading Agent (AI)                    │
│          DeepSeek V3.2 / Grok 4 / Claude / Gemini       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─── Market Data Analysis
                  ├─── Position Management
                  └─── Trade Execution Decisions

┌─────────────────┴───────────────────────────────────────┐
│wht is your advice here (VoltAgent Core)                 │
│              (Agent Orchestration & Tool Routing)       │
└─────────┬───────────────────────────────────┬───────────┘
          │                                   │
┌─────────┴──────────┐            ┌───────────┴───────────┐
│    Trading Tools   │            │   Exchange API Client  │
│                    │            │                        │
│ - Market Data      │◄───────────┤ - Order Management     │
│ - Account Info     │            │ - Position Query       │
│ - Trade Execution  │            │ - Market Data Stream   │
└─────────┬──────────┘            └────────────────────────┘
          │
┌─────────┴──────────┐
│   Database  │
│                    │
│ - Account History  │
│ - Trade Signals    │
│ - Agent Decisions  │
└────────────────────┘



## Trading Strategies

Choose a strategy that matches your risk tolerance and trading goals:

| Strategy  | Monthly Target | Risk Level | Best For |
| --------- | ----------- | ----------- | ---------- |
| ultra-short | 40%+        | High        | Scalping, high-frequency |
| swing-trend | 40%+        | High        | Multi-day trend capture|
|conservative	| 10–20% | Low | Capital preservation
|balanced ⭐	| 20–40% | Medium | Recommended default
|aggressive	| 40%+ | High | Maximum growth

## Risk Management
implements a multi-layered risk management framework designed to protect capital at every level.

### Scientific Stop-Loss System
ATR-adaptive calculation — Stop distances scale dynamically with market volatility
Server-side execution — Stops are placed as exchange-side conditional orders, surviving application restarts
Pre-entry validation — Positions are only opened when the required stop-loss space is available
Intelligent trailing — Stops trail only in the profitable direction, locking in gains without premature exits
### R-Multiple Partial Take-Profit
Exits are automated at 2R, 3R, and 5R profit targets
After each partial exit, the stop-loss is moved to breakeven or higher
No manual intervention required — the system executes the full plan autonomously
### Traditional Risk Controls
Single-position forced close at −30% loss
Forced position close after 36 hours to avoid overnight exposure compounding
Peak-to-trough drawdown protection at the position level
Account-level stop-loss and take-profit thresholds (ACCOUNT_STOP_LOSS_USDT / ACCOUNT_TAKE_PROFIT_USDT)