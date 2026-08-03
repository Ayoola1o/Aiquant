import os
import re
import json
import time
import asyncio
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents import Agent, ParallelAgent, SequentialAgent
from google.adk.tools.function_tool import FunctionTool
from google.genai import types

import quant_engine as qe
from social_scraper import SocialScraper
from senpi_skills import load_senpi_skills

# Instantiate the social scraper module
scraper = SocialScraper()

class AnalystSignal(BaseModel):
    source: str = Field(..., description="The name of the analyst (e.g., Fundamental, Technical, Sentiment).")
    signal_type: str = Field(..., description="Bullish, Bearish, or Neutral.")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0.")
    summary: str = Field(..., description="A short summary of the findings.")
    key_metrics: Dict[str, Any] = Field(default_factory=dict, description="Key data points supporting the signal.")

class DebateThesis(BaseModel):
    perspective: str = Field(..., description="Bull or Bear.")
    thesis: str = Field(..., description="The comprehensive argument supporting this perspective.")
    key_risks: List[str] = Field(..., description="Risks that could invalidate this thesis.")

class MarketView(BaseModel):
    consensus_direction: str = Field(..., description="Bullish, Bearish, or Neutral based on the debate.")
    narrative: str = Field(..., description="Synthesized narrative weighing both bull and bear arguments.")
    probability_of_success: float = Field(..., description="Overall probability score (0.0 to 1.0).")

class AgentProposal(BaseModel):
    ticker: str = Field(..., description="The symbol of the asset to trade.")
    direction: str = Field(..., description="Trade direction: 'BUY' or 'SELL'.")
    entry_price: float = Field(..., description="Target entry price boundary.")
    stop_loss: float = Field(..., description="The protective exit stop price.")
    take_profit: float = Field(..., description="The target take-profit exit price.")
    confidence: float = Field(..., description="Trader's confidence score between 0.0 and 1.0.")
    exit_size_pct: Optional[float] = Field(100.0, description="Percentage to exit if this is a closing trade.")
    rationale: str = Field(..., description="Reasoning backing up the order based on the MarketView.")

class SupervisorDecision(BaseModel):
    status: str = Field(..., description="Risk status: 'APPROVED' or 'REJECTED'.")
    risk_assessment: str = Field(..., description="Detailed explanation of the risk review critique.")
    max_position_size_usd: float = Field(..., description="Maximum allowable position size in USD.")
    validated_order: Optional[AgentProposal] = Field(None, description="The validated proposal, or null if rejected.")

class PortfolioDecision(BaseModel):
    final_action: str = Field(..., description="'EXECUTE' or 'ABORT'.")
    allocation_pct: float = Field(..., description="Percentage of available capital to allocate.")
    execution_notes: str = Field(..., description="Notes for the execution engine.")
    approved_order: Optional[AgentProposal] = Field(None, description="The final order to send to the broker.")


# --- Deterministic Mathematical Tools ---

def calculate_technical_indicators(ticker: str) -> str:
    """
    Computes technical indicators (EMA, RSI, MACD, Bollinger Bands, ATR) for a given symbol.
    """
    try:
        # Fetch historical hourly data for 1 month
        df = qe.fetch_historical_data(ticker=ticker, period="1mo", interval="1d")
        if df.empty:
            return f"Error: No historical data found for {ticker}."
        
        df_ind = qe.compute_indicators(df)
        if df_ind.empty:
            return f"Error: Failed to compute indicators for {ticker}."
            
        last_row = df_ind.iloc[-1]
        
        return (
            f"Technical indicators for {ticker}:\n"
            f"Last Close: {last_row.get('close'):.2f}\n"
            f"SMA: {last_row.get('sma'):.2f}\n"
            f"EMA: {last_row.get('ema'):.2f}\n"
            f"RSI (14): {last_row.get('rsi'):.2f}\n"
            f"MACD: {last_row.get('macd'):.4f}\n"
            f"MACD Signal: {last_row.get('macd_signal'):.4f}\n"
            f"Bollinger Upper: {last_row.get('bb_upper'):.2f}\n"
            f"Bollinger Lower: {last_row.get('bb_lower'):.2f}\n"
            f"ATR: {last_row.get('atr'):.2f}"
        )
    except Exception as e:
        return f"Error computing technical indicators: {str(e)}"

def get_social_news_sentiment(ticker: str) -> str:
    """
    Scrapes discussion boards and X (Twitter) handles for public sentiment and news about a symbol.
    """
    try:
        # Scrape stocktwits, reddit, and twitter scaffold
        st_posts = scraper.scrape_stocktwits(ticker)
        re_posts = scraper.scrape_reddit(ticker)
        tw_posts = scraper.scrape_twitter_scaffold(ticker)
        
        all_posts = st_posts + re_posts + tw_posts
        if not all_posts:
            return f"No recent social sentiment data found for {ticker}."
            
        # Analyze sentiment
        bullish = sum(1 for p in all_posts if p["sentiment"] == "Bullish")
        bearish = sum(1 for p in all_posts if p["sentiment"] == "Bearish")
        neutral = sum(1 for p in all_posts if p["sentiment"] == "Neutral")
        
        total = len(all_posts)
        bullish_pct = (bullish / total) * 100 if total > 0 else 0.0
        
        sample_texts = "\n".join([f"- [{p['username']}]: {p['text']}" for p in all_posts[:3]])
        
        return (
            f"Social News Sentiment summary for {ticker}:\n"
            f"Total posts analyzed: {total}\n"
            f"Bullish: {bullish_pct:.1f}%\n"
            f"Bearish: {((bearish/total)*100):.1f}%\n"
            f"Neutral: {((neutral/total)*100):.1f}%\n"
            f"Sample recent items:\n{sample_texts}"
        )
    except Exception as e:
        return f"Error fetching social sentiment: {str(e)}"

def get_tradingview_technical_analysis(ticker: str) -> str:
    """
    Computes TradingView-style technical ratings (Strong Buy, Buy, Neutral, Sell, Strong Sell)
    by scoring real indicator values fetched from Yahoo Finance via quant_engine.
    Evaluates Moving Averages and Oscillators separately, then produces an overall consensus.
    Free data source — no TradingView API key required.
    """
    try:
        df = qe.fetch_historical_data(ticker=ticker, period="3mo", interval="1d")
        if df.empty:
            return f"No historical data available for {ticker} to compute ratings."

        df_ind = qe.compute_indicators(df)
        if df_ind.empty or len(df_ind) < 20:
            return f"Insufficient indicator data for {ticker} (need at least 20 bars)."

        last = df_ind.iloc[-1]
        prev = df_ind.iloc[-2] if len(df_ind) > 1 else last
        close = float(last.get("close", 0))
        sma = float(last.get("sma", close))
        ema = float(last.get("ema", close))
        rsi = float(last.get("rsi", 50))
        macd = float(last.get("macd", 0))
        macd_signal = float(last.get("macd_signal", 0))
        bb_upper = float(last.get("bb_upper", close))
        bb_lower = float(last.get("bb_lower", close))
        atr = float(last.get("atr", 0))

        # --- Moving Average Scoring ---
        ma_buy = 0
        ma_sell = 0
        ma_neutral = 0

        # SMA-20 signal
        if close > sma * 1.005:
            ma_buy += 1
        elif close < sma * 0.995:
            ma_sell += 1
        else:
            ma_neutral += 1

        # EMA-12 signal
        if close > ema * 1.005:
            ma_buy += 1
        elif close < ema * 0.995:
            ma_sell += 1
        else:
            ma_neutral += 1

        # EMA-26 (approximate from MACD relationship)
        ema26_approx = close - macd  # MACD = EMA12 - EMA26
        if close > ema26_approx * 1.003:
            ma_buy += 1
        elif close < ema26_approx * 0.997:
            ma_sell += 1
        else:
            ma_neutral += 1

        ma_total = ma_buy + ma_sell + ma_neutral
        if ma_buy > ma_sell:
            ma_rating = "Buy" if ma_buy >= 2 else "Neutral"
        elif ma_sell > ma_buy:
            ma_rating = "Sell" if ma_sell >= 2 else "Neutral"
        else:
            ma_rating = "Neutral"

        # --- Oscillator Scoring ---
        osc_buy = 0
        osc_sell = 0
        osc_neutral = 0

        # RSI
        if rsi < 30:
            osc_buy += 1  # Oversold = potential buy
        elif rsi > 70:
            osc_sell += 1  # Overbought = potential sell
        elif rsi < 45:
            osc_buy += 1
        elif rsi > 55:
            osc_sell += 1
        else:
            osc_neutral += 1

        # MACD vs Signal
        if macd > macd_signal:
            osc_buy += 1
        elif macd < macd_signal:
            osc_sell += 1
        else:
            osc_neutral += 1

        # Bollinger Band position
        bb_range = bb_upper - bb_lower if bb_upper != bb_lower else 1.0
        bb_pct = (close - bb_lower) / bb_range
        if bb_pct < 0.2:
            osc_buy += 1  # Near lower band = oversold
        elif bb_pct > 0.8:
            osc_sell += 1  # Near upper band = overbought
        else:
            osc_neutral += 1

        osc_total = osc_buy + osc_sell + osc_neutral
        if osc_buy > osc_sell:
            osc_rating = "Buy" if osc_buy >= 2 else "Neutral"
        elif osc_sell > osc_buy:
            osc_rating = "Sell" if osc_sell >= 2 else "Neutral"
        else:
            osc_rating = "Neutral"

        # --- Overall Consensus ---
        total_buy = ma_buy + osc_buy
        total_sell = ma_sell + osc_sell
        total_all = ma_total + osc_total

        if total_buy >= 4:
            overall = "Strong Buy"
        elif total_buy > total_sell:
            overall = "Buy"
        elif total_sell >= 4:
            overall = "Strong Sell"
        elif total_sell > total_buy:
            overall = "Sell"
        else:
            overall = "Neutral"

        return (
            f"Technical Analysis Rating for {ticker}:\n"
            f"Overall Rating: {overall}\n"
            f"Moving Averages: {ma_rating} (Buy: {ma_buy}, Sell: {ma_sell}, Neutral: {ma_neutral})\n"
            f"Oscillators: {osc_rating} (Buy: {osc_buy}, Sell: {osc_sell}, Neutral: {osc_neutral})\n"
            f"Key Levels — Close: {close:.2f} | SMA: {sma:.2f} | EMA: {ema:.2f}\n"
            f"RSI: {rsi:.1f} | MACD: {macd:.4f} vs Signal: {macd_signal:.4f}\n"
            f"BB%: {bb_pct:.2f} (0=lower band, 1=upper band) | ATR: {atr:.2f}\n"
            f"Source: Real-time Yahoo Finance data scored with TradingView-style methodology"
        )
    except Exception as e:
        return f"Error computing technical analysis ratings: {str(e)}"

def get_hyperliquid_activity(ticker: str) -> str:
    """
    Fetches real-time Hyperliquid Perpetual exchange data, funding rates, L1 context, and Whale order book liquidity.
    """
    try:
        import requests
        url = "https://api.hyperliquid.xyz/info"
        headers = {"Content-Type": "application/json"}
        
        # Get metaAndAssetCtxs (contains funding, OI, etc)
        ctx_res = requests.post(url, headers=headers, json={"type": "metaAndAssetCtxs"})
        if ctx_res.status_code != 200:
            return "Error: Hyperliquid API ctx request failed."
            
        data = ctx_res.json()
        clean_ticker = ticker.upper().replace("USDT", "").replace("USD", "")
        
        l1_data = ""
        if isinstance(data, list) and len(data) > 1:
            universe = data[0].get("universe", [])
            asset_ctxs = data[1]
            for i, asset in enumerate(universe):
                if asset.get("name") == clean_ticker:
                    ctx = asset_ctxs[i]
                    funding = float(ctx.get("funding", 0)) * 100
                    oi = float(ctx.get("openInterest", 0))
                    vol = float(ctx.get("dayNtlVlm", 0))
                    mark = float(ctx.get("markPx", 0))
                    oracle = float(ctx.get("oraclePx", 0))
                    premium = float(ctx.get("premium", 0))
                    
                    l1_data = (
                        f"Live Hyperliquid Perp Data for {clean_ticker}:\n"
                        f"Mark Price: ${mark:,.2f} (Oracle: ${oracle:,.2f})\n"
                        f"Premium to Oracle: {premium:.6f}\n"
                        f"Funding Rate (8h): {funding:.6f}%\n"
                        f"Open Interest (OI): {oi:,.2f} contracts\n"
                        f"24h Volume: ${vol:,.2f}\n"
                    )
                    break
        
        if not l1_data:
            return f"Hyperliquid: Ticker {clean_ticker} not found on the exchange."
            
        # Get L2 Orderbook for Whale liquidity
        ob_res = requests.post(url, headers=headers, json={"type": "l2Book", "coin": clean_ticker})
        ob_data = ob_res.json()
        
        whale_data = ""
        if "levels" in ob_data and len(ob_data["levels"]) == 2:
            bids = ob_data["levels"][0]
            asks = ob_data["levels"][1]
            
            # Find largest bid (Whale Buy Wall) and largest ask (Whale Sell Wall)
            if bids and asks:
                max_bid = max(bids, key=lambda x: float(x['sz']))
                max_ask = max(asks, key=lambda x: float(x['sz']))
                
                max_bid_sz_usd = float(max_bid['sz']) * float(max_bid['px'])
                max_ask_sz_usd = float(max_ask['sz']) * float(max_ask['px'])
                
                whale_data = (
                    f"Whale Liquidity (Orderbook Walls):\n"
                    f"Largest Bid Wall: {float(max_bid['sz']):.2f} {clean_ticker} (${max_bid_sz_usd:,.0f}) at ${float(max_bid['px']):,.2f}\n"
                    f"Largest Ask Wall: {float(max_ask['sz']):.2f} {clean_ticker} (${max_ask_sz_usd:,.0f}) at ${float(max_ask['px']):,.2f}\n"
                )
                
        return l1_data + whale_data + "Source: Hyperliquid API (Live)"
        
    except Exception as e:
        return f"Error fetching Hyperliquid data: {str(e)}"

def firecrawl_scrape_news(ticker: str) -> str:
    """
    Scrapes real-time financial news headlines for the ticker using Yahoo Finance RSS feed.
    Falls back to yfinance news if available. Free data source — no API key required.
    """
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        news_items = t.news if hasattr(t, 'news') else []
        
        if not news_items or len(news_items) == 0:
            return f"No recent news articles found for {ticker} via Yahoo Finance."
        
        headlines = []
        for item in news_items[:6]:
            title = item.get("title", item.get("content", {}).get("title", "Unknown"))
            publisher = item.get("publisher", item.get("content", {}).get("provider", {}).get("displayName", "Unknown"))
            headlines.append(f"- [{publisher}] {title}")
        
        return (
            f"Real-time News Headlines for {ticker}:\n"
            + "\n".join(headlines)
            + "\nSource: Yahoo Finance News Feed (Real Data)"
        )
    except Exception as e:
        return f"Error scraping news: {str(e)}"

def get_onchain_metrics(ticker: str) -> str:
    """
    Fetches on-chain and volume flow data for the ticker.
    For crypto assets: queries CoinGecko free API for market cap, volume, and supply data.
    For stocks: uses Yahoo Finance volume analysis as a proxy for institutional flow.
    """
    try:
        import requests
        # Try CoinGecko free API for crypto assets first
        coin_id_map = {
            "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin",
            "XRP": "ripple", "ADA": "cardano", "AVAX": "avalanche-2", "DOT": "polkadot",
            "MATIC": "matic-network", "LINK": "chainlink", "UNI": "uniswap", "AAVE": "aave",
            "LTC": "litecoin", "ATOM": "cosmos", "APT": "aptos", "ARB": "arbitrum",
            "OP": "optimism", "SUI": "sui", "HYPE": "hyperliquid", "PEPE": "pepe",
        }
        clean = ticker.replace("-USD", "").replace("USDT", "").replace("/USD", "").upper()
        coin_id = coin_id_map.get(clean)
        
        if coin_id:
            resp = requests.get(
                f"https://api.coingecko.com/api/v3/coins/{coin_id}",
                params={"localization": "false", "tickers": "false", "community_data": "false", "developer_data": "false"},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                md = data.get("market_data", {})
                price = md.get("current_price", {}).get("usd", 0)
                mcap = md.get("market_cap", {}).get("usd", 0)
                vol_24h = md.get("total_volume", {}).get("usd", 0)
                circ_supply = md.get("circulating_supply", 0)
                total_supply = md.get("total_supply", 0)
                price_change_24h = md.get("price_change_percentage_24h", 0)
                price_change_7d = md.get("price_change_percentage_7d", 0)
                
                vol_to_mcap = (vol_24h / mcap * 100) if mcap > 0 else 0
                supply_pct = (circ_supply / total_supply * 100) if total_supply and total_supply > 0 else 0
                
                # Volume flow analysis
                flow_signal = "Accumulation" if vol_to_mcap > 10 and price_change_24h > 0 else \
                              "Distribution" if vol_to_mcap > 10 and price_change_24h < 0 else "Neutral"
                
                return (
                    f"On-chain metrics for {ticker} ({coin_id}):\n"
                    f"Price: ${price:,.2f} | 24h Change: {price_change_24h:+.2f}% | 7d Change: {price_change_7d:+.2f}%\n"
                    f"Market Cap: ${mcap/1e9:.2f}B\n"
                    f"24h Volume: ${vol_24h/1e6:.1f}M | Vol/MCap Ratio: {vol_to_mcap:.2f}%\n"
                    f"Circulating Supply: {circ_supply/1e6:.1f}M / {total_supply/1e6:.1f}M ({supply_pct:.1f}%)\n"
                    f"Flow Signal: {flow_signal}\n"
                    f"Source: CoinGecko API (Real Data)"
                )
        
        # Fallback: Use Yahoo Finance volume data for stocks/non-mapped crypto
        import yfinance as yf
        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist.empty:
            return f"No volume data available for {ticker}."
        
        avg_vol = hist["Volume"].mean()
        last_vol = hist["Volume"].iloc[-1]
        vol_ratio = last_vol / avg_vol if avg_vol > 0 else 1.0
        
        flow_signal = "Institutional Inflow" if vol_ratio > 1.5 else \
                      "Institutional Outflow" if vol_ratio < 0.5 else "Normal Flow"
        
        return (
            f"Volume flow metrics for {ticker}:\n"
            f"Latest Volume: {last_vol:,.0f}\n"
            f"5-Day Avg Volume: {avg_vol:,.0f}\n"
            f"Volume Ratio: {vol_ratio:.2f}x (1.0 = average)\n"
            f"Flow Signal: {flow_signal}\n"
            f"Source: Yahoo Finance Volume Analysis (Real Data)"
        )
    except Exception as e:
        return f"Error fetching on-chain/volume metrics: {str(e)}"

def get_fundamental_metrics(ticker: str) -> str:
    """
    Fetches real fundamental data from Yahoo Finance — P/E ratio, earnings growth, market cap,
    dividend yield, sector, and institutional ownership. For crypto, fetches CoinGecko market data.
    Free data source — no API key required.
    """
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        info = t.info or {}
        
        if not info or info.get("regularMarketPrice") is None:
            # Possibly a crypto ticker — return what we can
            return (
                f"Fundamental data for {ticker}:\n"
                f"Asset type: Cryptocurrency / Unknown equity\n"
                f"Note: No traditional fundamentals available. Use on-chain metrics instead.\n"
                f"Source: Yahoo Finance (No fundamental data returned)"
            )
        
        pe = info.get("trailingPE") or info.get("forwardPE") or 0
        eps = info.get("trailingEps", 0)
        market_cap = info.get("marketCap", 0)
        revenue = info.get("totalRevenue", 0)
        profit_margin = info.get("profitMargins", 0)
        dividend_yield = info.get("dividendYield", 0)
        sector = info.get("sector", "N/A")
        industry = info.get("industry", "N/A")
        beta = info.get("beta", 0)
        fifty_two_high = info.get("fiftyTwoWeekHigh", 0)
        fifty_two_low = info.get("fiftyTwoWeekLow", 0)
        current_price = info.get("regularMarketPrice") or info.get("currentPrice", 0)
        target_price = info.get("targetMeanPrice", 0)
        rec = info.get("recommendationKey", "N/A")
        inst_pct = info.get("heldPercentInstitutions", 0)
        
        # Compute distance from 52-week range
        range_pct = ((current_price - fifty_two_low) / (fifty_two_high - fifty_two_low) * 100) if fifty_two_high != fifty_two_low else 50
        
        # Format market cap
        if market_cap >= 1e12:
            mcap_str = f"${market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:
            mcap_str = f"${market_cap/1e9:.2f}B"
        elif market_cap >= 1e6:
            mcap_str = f"${market_cap/1e6:.1f}M"
        else:
            mcap_str = f"${market_cap:,.0f}"
        
        return (
            f"Fundamental metrics for {ticker}:\n"
            f"Sector: {sector} | Industry: {industry}\n"
            f"Market Cap: {mcap_str}\n"
            f"P/E Ratio: {pe:.2f} | EPS: ${eps:.2f}\n"
            f"Profit Margin: {profit_margin*100:.1f}%\n"
            f"Dividend Yield: {dividend_yield*100:.2f}%\n"
            f"Beta: {beta:.2f}\n"
            f"52-Week Range: ${fifty_two_low:.2f} – ${fifty_two_high:.2f} (Currently at {range_pct:.0f}%)\n"
            f"Analyst Target: ${target_price:.2f} | Recommendation: {rec.upper()}\n"
            f"Institutional Ownership: {inst_pct*100:.1f}%\n"
            f"Source: Yahoo Finance (Real Data)"
        )
    except Exception as e:
        return f"Error fetching fundamental metrics: {str(e)}"

# --- Tool Instantiation ---
tech_tool = FunctionTool(calculate_technical_indicators)
sentiment_tool = FunctionTool(get_social_news_sentiment)
tradingview_tool = FunctionTool(get_tradingview_technical_analysis)
hyperliquid_tool = FunctionTool(get_hyperliquid_activity)
firecrawl_tool = FunctionTool(firecrawl_scrape_news)
onchain_tool = FunctionTool(get_onchain_metrics)
fundamental_tool = FunctionTool(get_fundamental_metrics)

# Load dynamic senpi skills
dynamic_skills = load_senpi_skills()


# --- Orchestrated Multi-Agent Pipeline Factory ---

def build_trading_pipeline(agent_keys: dict):
    from google.adk.models.google_llm import Gemini
    import os
    
    # Fallback to main key or environment variable
    main_key = agent_keys.get("gemini") or os.environ.get("GEMINI_API_KEY", "")
    
    # Use gemini-2.0-flash to reduce quota burn — lighter model, faster, cheaper per-call.
    _model_name = os.environ.get("AIQUANT_AGENT_MODEL", "gemini-2.0-flash")
    
    def _make_model(key: str):
        """Create a Gemini model instance with the given API key."""
        return Gemini(model=_model_name, client_kwargs={"api_key": key}) if key else _model_name
    
    # Per-agent keys — each sub-agent can use its own key to distribute rate limits.
    # Falls back to main_key when the per-agent key is empty.
    tech_key       = agent_keys.get("tech") or main_key
    sentiment_key  = agent_keys.get("sentiment") or main_key
    tradingview_key = agent_keys.get("tradingview") or main_key
    hyperliquid_key = agent_keys.get("hyperliquid") or main_key
    firecrawl_key  = agent_keys.get("firecrawl") or main_key
    
    # --- 1. The Analysts ---
    fundamental_analyst = Agent(
        name="FundamentalAnalyst",
        model=_make_model(main_key),
        instruction=(
            "You are a Fundamental Analyst. Use the fundamental_tool to fetch data. "
            "Output a structured AnalystSignal assessing the fundamental health of the asset."
        ),
        tools=[fundamental_tool],
        output_schema=AnalystSignal
    )

    sentiment_analyst = Agent(
        name="SentimentAnalyst",
        model=_make_model(sentiment_key),
        instruction=(
            "You are a Sentiment & News Analyst. Use sentiment_tool and firecrawl_tool. "
            "Detect public consensus and breaking news. Output a structured AnalystSignal."
        ),
        tools=[sentiment_tool, firecrawl_tool] + dynamic_skills,
        output_schema=AnalystSignal
    )

    technical_analyst = Agent(
        name="TechnicalAnalyst",
        model=_make_model(tech_key),
        instruction=(
            "You are a Technical Analyst. Use tech_tool, tradingview_tool, hyperliquid_tool, and onchain_tool. "
            "Analyze charts, order books, and indicators. Output a structured AnalystSignal."
        ),
        tools=[tech_tool, tradingview_tool, hyperliquid_tool, onchain_tool] + dynamic_skills,
        output_schema=AnalystSignal
    )

    analysis_layer = ParallelAgent(
        name="AnalysisLayer",
        sub_agents=[fundamental_analyst, sentiment_analyst, technical_analyst]
    )

    # --- 2. The Researchers ---
    bull_researcher = Agent(
        name="BullResearcher",
        model=_make_model(tradingview_key),
        instruction=(
            "You are the Bull Researcher. Read the signals from the AnalysisLayer. "
            "Your job is to build the strongest possible BULLISH thesis for the asset. "
            "Ignore bearish signals or frame them as 'priced in'. Output a DebateThesis."
        ),
        output_schema=DebateThesis
    )

    bear_researcher = Agent(
        name="BearResearcher",
        model=_make_model(hyperliquid_key),
        instruction=(
            "You are the Bear Researcher. Read the signals from the AnalysisLayer. "
            "Your job is to build the strongest possible BEARISH thesis for the asset. "
            "Find flaws in the bull case. Output a DebateThesis."
        ),
        output_schema=DebateThesis
    )

    debate_layer = ParallelAgent(
        name="DebateLayer",
        sub_agents=[bull_researcher, bear_researcher]
    )

    research_manager = Agent(
        name="ResearchManager",
        model=_make_model(firecrawl_key),
        instruction=(
            "You are the Research Manager (The Judge). Read the DebateTheses from the Bull and Bear. "
            "Synthesize the arguments impartially. Output a MarketView determining the true consensus direction "
            "and probability of success."
        ),
        output_schema=MarketView
    )

    # --- 3. The Execution & Safety Layer ---
    trader_agent = Agent(
        name="TraderAgent",
        model=_make_model(main_key),
        instruction=(
            "You are the Trader (Execution Planner). Read the MarketView. "
            "Formulate a specific AgentProposal (Entry, Stop Loss, Take Profit, Direction). "
            "If the MarketView is Neutral or probability is low, you may propose a Neutral/No-trade stance "
            "(but you must still output the schema)."
        ),
        output_schema=AgentProposal
    )

    risk_manager = Agent(
        name="RiskManager",
        model=_make_model(main_key),
        instruction=(
            "You are the Risk Manager (The Firewall). Read the Trader's AgentProposal. "
            "Check against risk rules (e.g. SL must be below entry for BUY). "
            "Set the max allowable position size in USD based on confidence and risk. "
            "Output a SupervisorDecision."
        ),
        output_schema=SupervisorDecision
    )

    portfolio_manager = Agent(
        name="PortfolioManager",
        model=_make_model(main_key),
        instruction=(
            "You are the Portfolio Manager. Read the SupervisorDecision. "
            "Finalize the allocation percentage. "
            "If the Supervisor rejected it, final_action must be 'ABORT'. "
            "Otherwise, set final_action to 'EXECUTE'. Output a PortfolioDecision."
        ),
        output_schema=PortfolioDecision
    )

    def before_agent_callback(callback_context):
        logging.info(f"[ADK Pipeline] Sub-agent '{callback_context.agent_name}' starting execution.")

    def after_agent_callback(callback_context):
        logging.info(f"[ADK Pipeline] Sub-agent '{callback_context.agent_name}' finished execution.")

    for sa in [fundamental_analyst, sentiment_analyst, technical_analyst, bull_researcher, bear_researcher, research_manager, trader_agent, risk_manager, portfolio_manager]:
        sa.before_agent_callback = before_agent_callback
        sa.after_agent_callback = after_agent_callback

    execution_layer = SequentialAgent(
        name="ExecutionLayer",
        sub_agents=[research_manager, trader_agent, risk_manager, portfolio_manager]
    )

    trading_desk_pipeline = SequentialAgent(
        name="TradingDeskPipeline",
        sub_agents=[analysis_layer, debate_layer, execution_layer],
        output_schema=PortfolioDecision
    )
    
    return trading_desk_pipeline


# --- Execution Wrapper ---

async def run_adk_validation(
    ticker: str,
    gemini_api_key: str = None,
    account_profile: Dict[str, Any] = None,
    agent_keys: dict = None,
    agent_attitude: str = "balanced"
) -> Dict[str, Any]:
    """
    Runs the multi-agent cognitive validation loop for a given ticker symbol.
    """
    from google.adk.sessions.database_session_service import DatabaseSessionService

    agent_keys = agent_keys or {}
    if gemini_api_key and "gemini" not in agent_keys:
        agent_keys["gemini"] = gemini_api_key
    
    main_key = agent_keys.get("gemini") or os.environ.get("GEMINI_API_KEY", "")
    if main_key:
        os.environ["GEMINI_API_KEY"] = main_key

    account_profile = account_profile or {}

    # Dynamically build pipeline with keys
    pipeline = build_trading_pipeline(agent_keys)

    # Initialize persistent Database session storage using SQLite
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        current_dir = os.path.abspath(os.getcwd())
        
    db_path = os.path.join(current_dir, "adk_sessions.db")
    session_service = DatabaseSessionService(
        db_url=f"sqlite+aiosqlite:///{db_path}"
    )
    
    # Initialize ADK Runner for the pipeline
    runner = Runner(
        agent=pipeline,
        session_service=session_service,
        app_name="aiquant",
        auto_create_session=True
    )
    
    # Formulate input message detailing the request
    input_msg = (
        f"Perform cognitive trade audit for ticker: {ticker.upper()}\n"
        f"Please analyze the technical indicators, sentiment data, and check against risk rules. "
        f"Attitude/risk mode is: {agent_attitude.upper()}."
    )
    
    # Build the state namespace payload
    state_delta = {
        "user:available_balance": float(account_profile.get('balance', 10000.0)),
        "user:drawdown_limit": float(account_profile.get('drawdown_limit', 5.0)),
        "user:max_allocation_pct": float(account_profile.get('max_allocation_pct', 2.0)),
        "session:agent_attitude": agent_attitude
    }
    
    thoughts = []
    final_json = {}

    def extract_json_from_text(text: str) -> dict:
        try:
            return json.loads(text)
        except Exception:
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
            if match:
                try: return json.loads(match.group(1))
                except: pass
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                try: return json.loads(match.group(1))
                except: pass
        return {}

    def _is_rate_limit_error(err: Exception) -> bool:
        """Check if an exception is a Gemini 429 rate-limit error."""
        err_str = str(err).lower()
        return any(kw in err_str for kw in ["429", "rate limit", "quota", "resource exhausted", "too many requests"])

    # ── Retry with exponential backoff for rate limits ──────────────────
    max_retries = 3
    base_delay = 30  # seconds
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            thoughts = []
            final_json = {}
            async for event in runner.run_async(
                user_id="default_user",
                session_id=f"session_{ticker.lower()}",
                new_message=types.Content(role="user", parts=[types.Part(text=input_msg)]),
                state_delta=state_delta
            ):
                if event.content and event.content.parts:
                    event_text = ''.join(p.text or '' for p in event.content.parts)
                    if event_text:
                        thoughts.append(event_text)
                        parsed = extract_json_from_text(event_text)
                        if parsed:
                            final_json = parsed

                if getattr(event, "output", None) is not None:
                    out = event.output
                    if isinstance(out, dict):
                        final_json = out
                    elif hasattr(out, "model_dump"):
                        final_json = out.model_dump()
                    else:
                        final_json = getattr(out, "__dict__", {})

            last_error = None
            break  # success — exit retry loop
        except Exception as e:
            import traceback
            traceback.print_exception(type(e), e, e.__traceback__)
            last_error = e
            if _is_rate_limit_error(e) and attempt < max_retries:
                wait = base_delay * (2 ** (attempt - 1))  # 30s, 60s, 120s
                logging.warning(f"[ADK] Gemini 429 rate limit on attempt {attempt}/{max_retries}. Retrying in {wait}s...")
                await asyncio.sleep(wait)
                # Rebuild runner with clean session service state to avoid locking
                session_service = DatabaseSessionService(
                    db_url=f"sqlite+aiosqlite:///{db_path}"
                )
                runner = Runner(
                    agent=pipeline,
                    session_service=session_service,
                    app_name="aiquant",
                    auto_create_session=True
                )
                continue
            else:
                # Non-rate-limit error or final attempt — give up
                break

    if last_error:
        err_str = str(last_error)
        if _is_rate_limit_error(last_error):
            msg = (f"Gemini API rate limit exceeded after {max_retries} retries. "
                   f"Your API key quota is exhausted — wait 1-2 minutes or upgrade your plan at https://aistudio.google.com")
        else:
            msg = f"ADK engine error during run execution: {err_str}"
        return {
            "final_action": "ABORT",
            "allocation_pct": 0.0,
            "execution_notes": msg,
            "approved_order": None,
            "thoughts": thoughts
        }
        
    if not isinstance(final_json, dict):
        final_json = {}

    if not final_json:
        for thought in reversed(thoughts):
            if "final_action" in thought and ("EXECUTE" in thought or "ABORT" in thought):
                parsed = extract_json_from_text(thought)
                if parsed:
                    final_json = parsed
                    break
                    
    if not final_json:
        try:
            with open("adk_debug_thoughts.txt", "w") as f:
                f.write("\n\n---\n\n".join(thoughts))
        except: pass
        
        if not thoughts:
            risk_msg = "Gemini API returned no response. Possible rate limit — the agent will automatically retry with backoff next cycle."
        else:
            risk_msg = "Failure to extract validated JSON output schema from LLM. Check adk_debug_thoughts.txt"
            
        final_json = {
            "final_action": "ABORT",
            "allocation_pct": 0.0,
            "execution_notes": risk_msg,
            "approved_order": None
        }
        
    final_json["thoughts"] = thoughts
    return final_json
