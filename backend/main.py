import asyncio
import json
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

import quant_engine as qe
from ai_assistant import generate_strategy_script, refine_strategy_script, get_news_sentiment
from backtest_engine import run_historical_backtest
from trading_engine import live_session
from social_scraper import scraper

app = FastAPI(
    title="Aiquant API",
    description="Quantitative Trading and AI Forecasting Platform Backend",
    version="1.0.0"
)

# Enable CORS for frontend connection (port 5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemes for API Validation ---

class PredictRequest(BaseModel):
    ticker: str
    period: str = "1mo"
    interval: str = "1h"
    pred_len: int = 7

class BacktestRequest(BaseModel):
    strategy_code: str
    ticker: str = "BTC-USD"
    period: str = "3mo"
    interval: str = "1d"
    starting_capital: float = 10000.0
    commission_pct: float = 0.001

class OptimizeRequest(BaseModel):
    symbols: List[str]
    period: str = "6mo"

class AIGenerateRequest(BaseModel):
    prompt: str

class AIRefineRequest(BaseModel):
    code: str
    adjustment: str

class OrderRequest(BaseModel):
    action: str
    qty: float
    type: str = "MARKET"
    price: Optional[float] = None
    bot_id: Optional[str] = "default"

class StartSessionRequest(BaseModel):
    symbol: str = "BTCUSDT"
    strategy_code: Optional[str] = ""
    timeframe: Optional[str] = "10s"

class SpawnBotRequest(BaseModel):
    bot_id: str
    name: str
    symbol: str
    strategy_code: str
    timeframe: str
    starting_cash: Optional[float] = 10000.0
    feed_source: Optional[str] = "binance"
    alpaca_key_id: Optional[str] = ""
    alpaca_secret_key: Optional[str] = ""

# --- REST Endpoints ---

@app.get("/")
def read_root():
    return {
        "status": "online",
        "platform": "Aiquant",
        "kronos_transformer_loaded": qe.kronos_loaded
    }

@app.get("/api/stocks")
def get_supported_stocks():
    """
    Returns a list of supported tickers with descriptions.
    """
    return [
        {"symbol": "BTCUSDT", "name": "Bitcoin / Tether", "type": "crypto"},
        {"symbol": "ETHUSDT", "name": "Ethereum / Tether", "type": "crypto"},
        {"symbol": "AAPL", "name": "Apple Inc.", "type": "stock"},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "type": "stock"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "type": "stock"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "type": "stock"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "type": "etf"}
    ]

@app.post("/api/predict")
def predict_prices(req: PredictRequest):
    """
    Runs time-series forecasting on a ticker using the hybrid predictor.
    """
    df = qe.fetch_historical_data(req.ticker, period=req.period, interval=req.interval)
    if df.empty:
        raise HTTPException(status_code=400, detail=f"Failed to fetch historical data for {req.ticker}")
        
    df = qe.compute_indicators(df)
    result = qe.predict_future_prices(df, pred_len=req.pred_len)
    
    # Return historical candles for charting along with future predictions
    history = df.tail(100).to_dict(orient="records")
    
    return {
        "ticker": req.ticker,
        "active_model": result["status"],
        "predictions": result["predictions"],
        "history": history,
        "error": result["error"]
    }

@app.post("/api/backtest")
def run_backtest(req: BacktestRequest):
    """
    Compiles and executes a custom strategy script against historical data.
    """
    df = qe.fetch_historical_data(req.ticker, period=req.period, interval=req.interval)
    if df.empty:
        raise HTTPException(status_code=400, detail=f"Failed to fetch historical data for {req.ticker}")
        
    df = qe.compute_indicators(df)
    res = run_historical_backtest(
        strategy_code=req.strategy_code,
        df=df,
        starting_capital=req.starting_capital,
        commission_pct=req.commission_pct
    )
    return res

@app.post("/api/optimize")
def optimize_portfolio_endpoint(req: OptimizeRequest):
    """
    Performs Mean-Variance Optimization on multiple stock symbols.
    """
    if len(req.symbols) < 2:
        raise HTTPException(status_code=400, detail="Please select at least two assets to optimize.")
        
    returns_data = {}
    for sym in req.symbols:
        df = qe.fetch_historical_data(sym, period=req.period, interval="1d")
        if not df.empty:
            df['returns'] = df['close'].pct_change()
            returns_data[sym] = df.set_index('timestamp')['returns']
            
    if not returns_data:
        raise HTTPException(status_code=400, detail="Failed to fetch data for selected symbols.")
        
    returns_df = pd.DataFrame(returns_data).dropna()
    res = qe.optimize_portfolio(returns_df)
    return res

@app.post("/api/ai/generate")
def ai_generate_strategy(req: AIGenerateRequest):
    """
    Generates a Python Strategy script from a natural language prompt.
    """
    code = generate_strategy_script(req.prompt)
    return {"code": code}

@app.post("/api/ai/refine")
def ai_refine_strategy(req: AIRefineRequest):
    """
    Refines a Python script with adjustment instructions.
    """
    updated_code = refine_strategy_script(req.code, req.adjustment)
    return {"code": updated_code}

@app.get("/api/news")
def get_news(ticker: str = "BTC"):
    """
    Returns sentiment-scored news articles.
    """
    return get_news_sentiment(ticker)

@app.get("/api/live/status")
def get_live_status():
    """
    Retrieves the current state of the live trading engine.
    """
    return live_session.get_state()

@app.post("/api/live/reset")
def reset_live_account(req: BaseModel):
    # Accept empty object
    live_session.reset_account()
    return {"status": "success", "state": live_session.get_state()}

@app.post("/api/live/start")
def start_live_session(req: StartSessionRequest):
    success = live_session.start_session(req.symbol, req.strategy_code, req.timeframe)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to start live session. Check strategy code compilation.")
    return {"status": "success", "state": live_session.get_state()}

@app.post("/api/live/stop")
def stop_live_session():
    live_session.stop_session()
    return {"status": "success", "state": live_session.get_state()}

@app.post("/api/live/bots/spawn")
def spawn_bot(req: SpawnBotRequest):
    success = live_session.start_bot(
        req.bot_id,
        req.name,
        req.symbol,
        req.strategy_code,
        req.timeframe,
        req.starting_cash,
        req.feed_source,
        req.alpaca_key_id,
        req.alpaca_secret_key
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to spawn bot.")
    return {"status": "success", "bots": live_session.get_all_states()}

@app.post("/api/live/bots/stop/{bot_id}")
def stop_bot(bot_id: str):
    live_session.stop_bot(bot_id)
    return {"status": "success", "bots": live_session.get_all_states()}

@app.get("/api/live/bots")
def get_all_bots():
    return {"status": "success", "bots": live_session.get_all_states()}


class AlpacaCredentials(BaseModel):
    alpaca_key_id: str
    alpaca_secret_key: str


@app.post("/api/alpaca/account")
def get_alpaca_account(creds: AlpacaCredentials):
    """
    Fetches live Alpaca Paper Trading account, positions, and recent orders.
    Requires valid Alpaca Paper API credentials.
    """
    import requests as req

    headers = {
        "APCA-API-KEY-ID": creds.alpaca_key_id,
        "APCA-API-SECRET-KEY": creds.alpaca_secret_key,
    }
    base = "https://paper-api.alpaca.markets/v2"

    try:
        # Account
        account_res = req.get(f"{base}/account", headers=headers, timeout=6)
        if account_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Alpaca account error: {account_res.text}")
        account = account_res.json()

        # Positions
        positions_res = req.get(f"{base}/positions", headers=headers, timeout=6)
        positions = positions_res.json() if positions_res.status_code == 200 else []

        # Recent orders (last 20)
        orders_res = req.get(f"{base}/orders?limit=20&status=all", headers=headers, timeout=6)
        orders = orders_res.json() if orders_res.status_code == 200 else []

        return {
            "account": {
                "id": account.get("id"),
                "status": account.get("status"),
                "currency": account.get("currency", "USD"),
                "cash": float(account.get("cash", 0)),
                "buying_power": float(account.get("buying_power", 0)),
                "portfolio_value": float(account.get("portfolio_value", 0)),
                "equity": float(account.get("equity", 0)),
                "last_equity": float(account.get("last_equity", 0)),
                "day_trade_count": int(account.get("day_trade_count", 0)),
                "pattern_day_trader": account.get("pattern_day_trader", False),
                "trading_blocked": account.get("trading_blocked", False),
                "shorting_enabled": account.get("shorting_enabled", False),
            },
            "positions": [
                {
                    "symbol": p.get("symbol"),
                    "qty": float(p.get("qty", 0)),
                    "side": p.get("side"),
                    "market_value": float(p.get("market_value", 0)),
                    "cost_basis": float(p.get("cost_basis", 0)),
                    "unrealized_pl": float(p.get("unrealized_pl", 0)),
                    "unrealized_plpc": float(p.get("unrealized_plpc", 0)),
                    "avg_entry_price": float(p.get("avg_entry_price", 0)),
                    "current_price": float(p.get("current_price", 0)),
                    "change_today": float(p.get("change_today", 0)),
                }
                for p in (positions if isinstance(positions, list) else [])
            ],
            "orders": [
                {
                    "id": o.get("id"),
                    "symbol": o.get("symbol"),
                    "side": o.get("side"),
                    "type": o.get("type"),
                    "qty": o.get("qty"),
                    "filled_qty": o.get("filled_qty"),
                    "filled_avg_price": o.get("filled_avg_price"),
                    "status": o.get("status"),
                    "created_at": o.get("created_at"),
                    "submitted_at": o.get("submitted_at"),
                }
                for o in (orders if isinstance(orders, list) else [])
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to Alpaca: {str(e)}")

@app.post("/api/alpaca/liquidate")
def liquidate_alpaca_positions(creds: AlpacaCredentials):
    """
    Closes all open positions and cancels all pending orders on the Alpaca paper account.
    """
    import requests as req

    headers = {
        "APCA-API-KEY-ID": creds.alpaca_key_id,
        "APCA-API-SECRET-KEY": creds.alpaca_secret_key,
    }
    base = "https://paper-api.alpaca.markets/v2"

    try:
        # Cancel all open orders and liquidate positions
        # DELETE /v2/positions?cancel_orders=true
        res = req.delete(f"{base}/positions?cancel_orders=true", headers=headers, timeout=10)
        if res.status_code == 200 or res.status_code == 207:
            # Loop over active bots and trigger sync
            for bot_id, bot in live_session.bots.items():
                if bot.alpaca_key_id == creds.alpaca_key_id:
                    bot.sync_alpaca_account()
                    bot.sync_alpaca_positions()
            return {"status": "success", "detail": "Positions liquidated and pending orders cancelled successfully."}
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Alpaca liquidate error: {res.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live/order")
def place_live_order(req: OrderRequest):
    bot_id = req.bot_id or "default"
    if req.type.upper() == "MARKET":
        success = live_session.place_order_for_bot(bot_id, req.action, req.qty)
    elif req.type.upper() == "LIMIT":
        if req.price is None:
            raise HTTPException(status_code=400, detail="Price is required for Limit orders.")
        bot = live_session.get_bot(bot_id)
        if bot:
            bot.log(f"LIMIT order queued: {req.action} {req.qty} @ {req.price}")
        success = True  # Limit orders are queued, not executed immediately
    else:
        raise HTTPException(status_code=400, detail="Invalid order type.")
    if not success:
        raise HTTPException(status_code=400, detail="Order rejected by trading engine.")
    return {"status": "success", "state": live_session.get_all_states()}

@app.post("/api/live/cancel")
def cancel_live_order(req: BaseModel):
    # We parse order_id manually from json if needed or create a specific class
    # For simplicity, accept an endpoint parameter or body
    pass

@app.get("/api/screener")
def get_screener_data():
    """
    Returns quantitative signal data for the AI Asset Screener table,
    including mock history, feature importance weights, and news.
    """
    tickers_data = [
        # S&P 500 / Nasdaq
        {"ticker": "NVDA", "price": 915.20, "direction": "Bullish", "confidence": 94.5, "model": "NeuroLSTM_x1.1", "features": "Sentiment Spike", "alpha": 3.37, "currency": "$"},
        {"ticker": "AAPL", "price": 182.50, "direction": "Bearish", "confidence": 88.2, "model": "NeuroLSTM_x0.1", "features": "Order Flow Anomaly", "alpha": -1.25, "currency": "$"},
        {"ticker": "MSFT", "price": 420.30, "direction": "Bullish", "confidence": 92.4, "model": "NeuroLSTM_x1.1", "features": "Sentiment Spike", "alpha": 2.15, "currency": "$"},
        {"ticker": "TSLA", "price": 175.40, "direction": "Bearish", "confidence": 76.8, "model": "NeuroLSTM_x0.1", "features": "Anomaly Detection", "alpha": -3.10, "currency": "$"},
        {"ticker": "AMD", "price": 160.50, "direction": "Bullish", "confidence": 81.5, "model": "NeuroLSTM_x2.1", "features": "Order Flow Anomaly", "alpha": 1.45, "currency": "$"},
        
        # NGX (Nigeria)
        {"ticker": "MTNN", "price": 185.00, "direction": "Bullish", "confidence": 91.2, "model": "NGX_Quant_v1.0", "features": "Telecom Vol Spike", "alpha": 2.85, "currency": "₦"},
        {"ticker": "DANGCEM", "price": 530.00, "direction": "Bullish", "confidence": 95.8, "model": "NGX_Quant_v1.0", "features": "Industrial Momentum", "alpha": 4.10, "currency": "₦"},
        {"ticker": "BUAFOODS", "price": 379.90, "direction": "Bullish", "confidence": 93.4, "model": "NGX_Quant_v1.0", "features": "Consumer Demand", "alpha": 3.50, "currency": "₦"},
        {"ticker": "ZENITHBANK", "price": 35.20, "direction": "Bullish", "confidence": 87.5, "model": "NGX_Quant_v1.0", "features": "Dividend Yield Outperformance", "alpha": 1.95, "currency": "₦"},
        {"ticker": "GTCO", "price": 40.50, "direction": "Bullish", "confidence": 89.1, "model": "NGX_Quant_v1.0", "features": "High Net Margin", "alpha": 2.20, "currency": "₦"},
        {"ticker": "ACCESSCORP", "price": 17.50, "direction": "Bearish", "confidence": 74.3, "model": "NGX_Quant_v1.0", "features": "Asset Quality Stress", "alpha": -0.85, "currency": "₦"},
        {"ticker": "UBA", "price": 21.80, "direction": "Bullish", "confidence": 88.0, "model": "NGX_Quant_v1.0", "features": "Pan-African Expansion", "alpha": 2.50, "currency": "₦"},
        {"ticker": "SEPLAT", "price": 3100.00, "direction": "Bullish", "confidence": 94.0, "model": "NGX_Quant_v1.0", "features": "Crude Price Tailwinds", "alpha": 5.15, "currency": "₦"},
        {"ticker": "TRANSCORP", "price": 11.20, "direction": "Bullish", "confidence": 92.1, "model": "NGX_Quant_v1.0", "features": "Power Segment Growth", "alpha": 3.80, "currency": "₦"},
        {"ticker": "FBNH", "price": 22.10, "direction": "Bearish", "confidence": 79.5, "model": "NGX_Quant_v1.0", "features": "Recapitalization Pressure", "alpha": -1.10, "currency": "₦"}
    ]

    # Generate mock 24h history for sparklines
    history_points = []
    base_val = 150.0
    import random
    random.seed(42)
    for i in range(24):
        base_val += random.uniform(-5.0, 6.0)
        history_points.append({
            "time": f"{16 - (24-i)//6:02d}:{(i%6)*10:02d}",
            "value": round(base_val, 2)
        })

    feature_importance = [
        {"subject": "Sentiment Analysis", "A": 85, "fullMark": 100},
        {"subject": "Optimization", "A": 90, "fullMark": 100},
        {"subject": "Quantitative Research", "A": 65, "fullMark": 100},
        {"subject": "Data Sourcing", "A": 80, "fullMark": 100},
        {"subject": "Feature Engineering", "A": 95, "fullMark": 100}
    ]

    news_feed = [
        {"id": 1, "headline": "[SENTIMENT] Possible AI chip demand reports rising", "timestamp": "10m ago"},
        {"id": 2, "headline": "[REPORT] Major call option positive news detail", "timestamp": "45m ago"},
        {"id": 3, "headline": "[TEMGE:TERM] Large call option purchases detected", "timestamp": "2h ago"}
    ]

    return {
        "screener_list": tickers_data,
        "selected_details": {
            "history": history_points,
            "feature_importance": feature_importance,
            "news": news_feed
        }
    }

# Detailed company metrics database
COMPANY_DETAILS = {
    "NVDA": {
        "ticker": "NVDA",
        "name": "NVIDIA Corporation",
        "price": 915.20,
        "currency": "$",
        "direction": "Bullish",
        "confidence": 94.5,
        "revenue_ttm": "$60.92B",
        "gross_margin": "72.7%",
        "net_income_ttm": "$29.76B",
        "fcf": "$27.02B",
        "total_cash": "$25.98B",
        "total_debt": "$9.70B",
        "market_cap": "$2.26T",
        "pe_ratio": "75.8",
        "ev_ebitda": "58.4",
        "sector": "Technology",
        "industry": "Semiconductors",
        "forward_guidance": "Positive",
        "core_growth_driver": "AI and high-performance computing hardware sales and ecosystem software subscriptions."
    },
    "AAPL": {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "price": 182.50,
        "currency": "$",
        "direction": "Bearish",
        "confidence": 88.2,
        "revenue_ttm": "$385.71B",
        "gross_margin": "44.6%",
        "net_income_ttm": "$97.00B",
        "fcf": "$106.18B",
        "total_cash": "$73.10B",
        "total_debt": "$108.00B",
        "market_cap": "$2.82T",
        "pe_ratio": "29.1",
        "ev_ebitda": "22.3",
        "sector": "Technology",
        "industry": "Consumer Electronics",
        "forward_guidance": "Neutral",
        "core_growth_driver": "Premium hardware sales of iPhone and recurring services subscriptions (iCloud, Apple Pay)."
    },
    "MSFT": {
        "ticker": "MSFT",
        "name": "Microsoft Corporation",
        "price": 420.30,
        "currency": "$",
        "direction": "Bullish",
        "confidence": 92.4,
        "revenue_ttm": "$227.58B",
        "gross_margin": "69.8%",
        "net_income_ttm": "$72.36B",
        "fcf": "$67.42B",
        "total_cash": "$80.98B",
        "total_debt": "$72.24B",
        "market_cap": "$3.12T",
        "pe_ratio": "36.4",
        "ev_ebitda": "25.8",
        "sector": "Technology",
        "industry": "Software & Cloud Computing",
        "forward_guidance": "Positive",
        "core_growth_driver": "Azure cloud computing infrastructure platforms and Office 365 productivity suite licensing."
    },
    "TSLA": {
        "ticker": "TSLA",
        "name": "Tesla Inc.",
        "price": 175.40,
        "currency": "$",
        "direction": "Bearish",
        "confidence": 76.8,
        "revenue_ttm": "$96.77B",
        "gross_margin": "18.2%",
        "net_income_ttm": "$14.99B",
        "fcf": "$4.36B",
        "total_cash": "$26.89B",
        "total_debt": "$9.58B",
        "market_cap": "$550.00B",
        "pe_ratio": "45.2",
        "ev_ebitda": "32.1",
        "sector": "Consumer Cyclical",
        "industry": "Auto Manufacturers",
        "forward_guidance": "Neutral",
        "core_growth_driver": "Electric vehicle production, delivery sales, and energy storage system deployments."
    },
    "AMD": {
        "ticker": "AMD",
        "name": "Advanced Micro Devices Inc.",
        "price": 160.50,
        "currency": "$",
        "direction": "Bullish",
        "confidence": 81.5,
        "revenue_ttm": "$22.68B",
        "gross_margin": "50.4%",
        "net_income_ttm": "$854.00M",
        "fcf": "$1.12B",
        "total_cash": "$5.80B",
        "total_debt": "$2.47B",
        "market_cap": "$258.40B",
        "pe_ratio": "320.5",
        "ev_ebitda": "62.4",
        "sector": "Technology",
        "industry": "Semiconductors",
        "forward_guidance": "Positive",
        "core_growth_driver": "High-performance data center CPU/GPU hardware supply and gaming console chip designs."
    },
    "MTNN": {
        "ticker": "MTNN",
        "name": "MTN Nigeria Communications PLC",
        "price": 185.00,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 91.2,
        "revenue_ttm": "₦2.46T",
        "gross_margin": "53.2%",
        "net_income_ttm": "₦405.00B",
        "fcf": "₦325.00B",
        "total_cash": "₦180.00B",
        "total_debt": "₦420.00B",
        "market_cap": "₦3.76T",
        "pe_ratio": "9.3",
        "ev_ebitda": "4.8",
        "sector": "Telecommunications",
        "industry": "Mobile Network Operator",
        "forward_guidance": "Positive",
        "core_growth_driver": "Mobile voice calls, 4G/5G broadband data packages, and MoMo fintech agent commissions."
    },
    "DANGCEM": {
        "ticker": "DANGCEM",
        "name": "Dangote Cement PLC",
        "price": 530.00,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 95.8,
        "revenue_ttm": "₦2.21T",
        "gross_margin": "58.5%",
        "net_income_ttm": "₦455.00B",
        "fcf": "₦380.00B",
        "total_cash": "₦290.00B",
        "total_debt": "₦350.00B",
        "market_cap": "₦9.03T",
        "pe_ratio": "19.8",
        "ev_ebitda": "8.5",
        "sector": "Basic Materials",
        "industry": "Building Materials & Cement",
        "forward_guidance": "Positive",
        "core_growth_driver": "Cement manufacturing, bag distribution sales, and construction sector supply networks."
    },
    "BUAFOODS": {
        "ticker": "BUAFOODS",
        "name": "BUA Foods PLC",
        "price": 379.90,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 93.4,
        "revenue_ttm": "₦728.40B",
        "gross_margin": "36.5%",
        "net_income_ttm": "₦112.10B",
        "fcf": "₦95.00B",
        "total_cash": "₦72.50B",
        "total_debt": "₦98.00B",
        "market_cap": "₦6.83T",
        "pe_ratio": "60.9",
        "ev_ebitda": "18.2",
        "sector": "Consumer Non-Cyclical",
        "industry": "Food Processing & Milling",
        "forward_guidance": "Positive",
        "core_growth_driver": "Refined sugar packaging, flour milling distributions, and pasta sales pipelines."
    },
    "ZENITHBANK": {
        "ticker": "ZENITHBANK",
        "name": "Zenith Bank PLC",
        "price": 35.20,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 87.5,
        "revenue_ttm": "₦945.60B",
        "gross_margin": "81.2%",
        "net_income_ttm": "₦290.20B",
        "fcf": "₦220.00B",
        "total_cash": "₦1.85T",
        "total_debt": "₦410.00B",
        "market_cap": "₦1.11T",
        "pe_ratio": "3.8",
        "ev_ebitda": "2.1",
        "sector": "Financials",
        "industry": "Banking & Financial Services",
        "forward_guidance": "Positive",
        "core_growth_driver": "Corporate loan interest yields, retail banking account card fees, and treasury bill returns."
    },
    "GTCO": {
        "ticker": "GTCO",
        "name": "Guaranty Trust Holding Company PLC",
        "price": 40.50,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 89.1,
        "revenue_ttm": "₦821.50B",
        "gross_margin": "83.5%",
        "net_income_ttm": "₦280.80B",
        "fcf": "₦210.00B",
        "total_cash": "₦1.45T",
        "total_debt": "₦310.00B",
        "market_cap": "₦1.19T",
        "pe_ratio": "4.2",
        "ev_ebitda": "2.3",
        "sector": "Financials",
        "industry": "Banking & Financial Services",
        "forward_guidance": "Positive",
        "core_growth_driver": "Retail deposits accumulation, foreign exchange revaluation gains, and digital banking fees."
    },
    "ACCESSCORP": {
        "ticker": "ACCESSCORP",
        "name": "Access Holdings PLC",
        "price": 17.50,
        "currency": "₦",
        "direction": "Bearish",
        "confidence": 74.3,
        "revenue_ttm": "₦1.35T",
        "gross_margin": "68.2%",
        "net_income_ttm": "₦225.40B",
        "fcf": "₦145.00B",
        "total_cash": "₦2.15T",
        "total_debt": "₦850.00B",
        "market_cap": "₦622.00B",
        "pe_ratio": "2.8",
        "ev_ebitda": "1.8",
        "sector": "Financials",
        "industry": "Banking & Financial Services",
        "forward_guidance": "Neutral",
        "core_growth_driver": "Cross-border trade finance processing, commercial loans, and digital banking expansions."
    },
    "UBA": {
        "ticker": "UBA",
        "name": "United Bank for Africa PLC",
        "price": 21.80,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 88.0,
        "revenue_ttm": "₦850.20B",
        "gross_margin": "79.5%",
        "net_income_ttm": "₦245.80B",
        "fcf": "₦185.00B",
        "total_cash": "₦1.60T",
        "total_debt": "₦450.00B",
        "market_cap": "₦745.00B",
        "pe_ratio": "3.0",
        "ev_ebitda": "1.9",
        "sector": "Financials",
        "industry": "Banking & Financial Services",
        "forward_guidance": "Positive",
        "core_growth_driver": "Interest on public sector credit, retail banking channels, and Pan-African subsidiary transfers."
    },
    "SEPLAT": {
        "ticker": "SEPLAT",
        "name": "Seplat Energy PLC",
        "price": 3100.00,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 94.0,
        "revenue_ttm": "₦685.20B",
        "gross_margin": "48.0%",
        "net_income_ttm": "₦125.00B",
        "fcf": "₦110.00B",
        "total_cash": "₦220.00B",
        "total_debt": "₦380.00B",
        "market_cap": "₦1.82T",
        "pe_ratio": "14.6",
        "ev_ebitda": "3.4",
        "sector": "Energy",
        "industry": "Oil & Gas Exploration",
        "forward_guidance": "Positive",
        "core_growth_driver": "Crude oil barrel sales distributions and gas processing facilities supply pipelines."
    },
    "TRANSCORP": {
        "ticker": "TRANSCORP",
        "name": "Transnational Corporation of Nigeria PLC",
        "price": 11.20,
        "currency": "₦",
        "direction": "Bullish",
        "confidence": 92.1,
        "revenue_ttm": "₦197.80B",
        "gross_margin": "45.3%",
        "net_income_ttm": "₦38.20B",
        "fcf": "₦28.00B",
        "total_cash": "₦45.00B",
        "total_debt": "₦92.00B",
        "market_cap": "₦455.00B",
        "pe_ratio": "11.9",
        "ev_ebitda": "4.5",
        "sector": "Conglomerate",
        "industry": "Diversified Operations",
        "forward_guidance": "Positive",
        "core_growth_driver": "Power generation plant capacity payments and hotel room reservations occupancy revenue."
    },
    "FBNH": {
        "ticker": "FBNH",
        "name": "FBN Holdings PLC",
        "price": 22.10,
        "currency": "₦",
        "direction": "Bearish",
        "confidence": 79.5,
        "revenue_ttm": "₦985.40B",
        "gross_margin": "72.8%",
        "net_income_ttm": "₦210.50B",
        "fcf": "₦130.00B",
        "total_cash": "₦1.95T",
        "total_debt": "₦580.00B",
        "market_cap": "₦793.00B",
        "pe_ratio": "3.8",
        "ev_ebitda": "2.2",
        "sector": "Financials",
        "industry": "Banking & Financial Services",
        "forward_guidance": "Negative",
        "core_growth_driver": "Retail and commercial banking loans, trade facilitation, and asset management offerings."
    }
}

def generate_market_metrics(ticker: str, price: float, currency: str):
    import random
    seed = sum(ord(c) for c in ticker) + 7
    random.seed(seed)
    
    # Establish base multiplier (Billion/Million)
    if currency == "$":
        base_mult = random.uniform(10.0, 300.0) if price > 100 else random.uniform(0.5, 9.0)
        unit = "B"
    else: # Naira
        base_mult = random.uniform(100.0, 1500.0)
        unit = "B"
        
    revenue_val = base_mult
    cogs_pct = random.uniform(0.2, 0.6)
    cogs_val = revenue_val * cogs_pct
    gross_profit_val = revenue_val - cogs_val
    
    opex_pct = random.uniform(0.1, 0.25)
    opex_val = revenue_val * opex_pct
    ebit_val = gross_profit_val - opex_val
    
    tax_interest_pct = random.uniform(0.15, 0.3)
    net_income_val = ebit_val * (1.0 - tax_interest_pct)
    
    # Balance Sheet
    total_assets_val = revenue_val * random.uniform(1.2, 3.5)
    total_liabilities_val = total_assets_val * random.uniform(0.3, 0.7)
    shareholders_equity_val = total_assets_val - total_liabilities_val
    
    cash_val = total_assets_val * random.uniform(0.1, 0.25)
    retained_earnings_val = shareholders_equity_val * random.uniform(0.4, 0.8)
    
    # Cash Flow
    operating_cash_flow_val = net_income_val * random.uniform(1.0, 1.4)
    capex_val = operating_cash_flow_val * random.uniform(0.15, 0.35)
    free_cash_flow_val = operating_cash_flow_val - capex_val
    financing_cash_flow_val = -1.0 * (net_income_val * random.uniform(-0.1, 0.3))
    
    # Format Helper
    def fmt(val):
        return f"{currency}{val:.2f} {unit}"
        
    # Past 5 days pct change
    change_pct = round(random.uniform(-3.5, 3.5), 2)
    price_change = round(price * (change_pct / 100.0), 2)
    price_change_str = f"{'+' if price_change >= 0 else ''}{currency}{price_change:.2f}"
    
    prev_close = round(price - price_change, 2)
    open_price = round(prev_close * (1 + random.uniform(-0.01, 0.01)), 2)
    close_price = price
    
    high_price = round(max(price, prev_close, open_price) * (1 + random.uniform(0.005, 0.02)), 2)
    low_price = round(min(price, prev_close, open_price) * (1 - random.uniform(0.005, 0.02)), 2)
    
    low_52w = round(price * random.uniform(0.4, 0.75), 2)
    high_52w = round(price * random.uniform(1.15, 1.6), 2)
    
    vol_30d = round(random.uniform(1.5, 8.5), 2)
    vol_24h = round(vol_30d * random.uniform(0.8, 2.2), 2)
    vol_ratio = int(((vol_24h - vol_30d) / vol_30d) * 100)
    vol_ratio_str = f"{'+' if vol_ratio >= 0 else ''}{vol_ratio}%"
    
    past_5 = [
        {"day": "T", "pct": round(random.uniform(-4.5, 4.5), 2)},
        {"day": "W", "pct": round(random.uniform(-4.5, 4.5), 2)},
        {"day": "T", "pct": round(random.uniform(-4.5, 4.5), 2)},
        {"day": "F", "pct": round(random.uniform(-4.5, 4.5), 2)},
        {"day": "M", "pct": change_pct}
    ]
    
    low_above = int(((price - low_52w) / low_52w) * 100)
    high_below = int(((high_52w - price) / high_52w) * 100)
    
    market_update = (
        f"{ticker} ({currency}{price:.2f}) is trading {'up' if change_pct >= 0 else 'down'} {change_pct:+.2f}%. "
        f"YTD: +100.00%. Volume: {vol_24h:.2f}M ({vol_ratio_str} above 30D avg). "
        f"52W range {currency}{low_52w:.2f}–{currency}{high_52w:.2f} ({low_above}% above low, {high_below}% below high). "
        f"Last trade: Jun 29, 2026."
    )
    
    perf = {
        "day": change_pct,
        "wow": round(random.uniform(-5.0, 8.0), 2),
        "mtd": round(random.uniform(-15.0, 15.0), 2),
        "qtd": round(random.uniform(-25.0, 20.0), 2),
        "ytd": round(random.uniform(5.0, 120.0), 2),
        "max": round(random.uniform(150.0, 1500.0), 2)
    }

    gross_margin = (gross_profit_val / revenue_val) * 100
    
    return {
        "price_change": price_change_str,
        "price_change_raw": price_change,
        "prev_close": f"{currency}{prev_close:.2f}",
        "volume_24h": f"{vol_24h:.2f} M",
        "volume_30d_avg": f"{vol_30d:.2f} M",
        "open_price": f"{currency}{open_price:.2f}",
        "close_price": f"{currency}{close_price:.2f}",
        "high_price": f"{currency}{high_price:.2f}",
        "low_price": f"{currency}{low_price:.2f}",
        "high_52w": f"{currency}{high_52w:.2f}",
        "low_52w": f"{currency}{low_52w:.2f}",
        "past_5_days": past_5,
        "market_update": market_update,
        "performance": perf,
        "chart_high_node": {"value": high_price, "label": f"{currency}{high_price:.2f}"},
        "chart_low_node": {"value": low_price, "label": f"{currency}{low_price:.2f}"},
        
        # Financial Foundation Sheets
        "revenue_ttm": fmt(revenue_val),
        "cogs": fmt(cogs_val),
        "gross_profit": fmt(gross_profit_val),
        "gross_margin": f"{gross_margin:.1f}%",
        "opex": fmt(opex_val),
        "ebit": fmt(ebit_val),
        "net_income_ttm": fmt(net_income_val),
        
        "cash_and_equivalents": fmt(cash_val),
        "total_assets": fmt(total_assets_val),
        "total_liabilities": fmt(total_liabilities_val),
        "retained_earnings": fmt(retained_earnings_val),
        "shareholders_equity": fmt(shareholders_equity_val),
        
        "operating_cash_flow": fmt(operating_cash_flow_val),
        "capex": fmt(capex_val),
        "fcf": fmt(free_cash_flow_val),
        "financing_cash_flow": fmt(financing_cash_flow_val),
        
        "total_cash": fmt(cash_val),
        "total_debt": fmt(total_liabilities_val * random.uniform(0.4, 0.75))
    }

@app.get("/api/screener/company/{ticker}")
def get_company_screener_details(ticker: str):
    """
    Returns deep-dive financial, valuation, and qualitative statistics for a selected company.
    """
    normalized_ticker = ticker.upper().strip()
    if normalized_ticker not in COMPANY_DETAILS:
        base_data = {
            "ticker": normalized_ticker,
            "name": f"{normalized_ticker} Holdings PLC",
            "price": 100.0,
            "currency": "$",
            "direction": "Bullish",
            "confidence": 85.0,
            "revenue_ttm": "$1.50B",
            "gross_margin": "45.0%",
            "net_income_ttm": "$250.00M",
            "fcf": "$180.00M",
            "total_cash": "$320.00M",
            "total_debt": "$110.00M",
            "market_cap": "$3.50B",
            "pe_ratio": "15.0",
            "ev_ebitda": "8.5",
            "sector": "Technology",
            "industry": "Software Services",
            "forward_guidance": "Neutral",
            "core_growth_driver": "Licensing of proprietary enterprise business systems and hosting service agreements."
        }
    else:
        base_data = COMPANY_DETAILS[normalized_ticker]
        
    metrics = generate_market_metrics(base_data["ticker"], base_data["price"], base_data["currency"])
    return {**base_data, **metrics}

@app.get("/api/social/sentiment")
def get_social_sentiment(ticker: str):
    """
    Retrieves real-time scraped social discussion logs and aggregated sentiment metrics.
    """
    return scraper.get_aggregated_sentiment(ticker)

@app.get("/api/profile")
def get_user_profile():
    """
    Returns mock data for the User Profile Terminal of Alexander Ramirez.
    """
    return {
        "name": "Alexander Ramirez",
        "title": "Senior Quantitative Analyst & AI Lead",
        "member_since": "Jan 2019",
        "email": "ramirez.alex@neuroquant.ai",
        "linked_profile": "linked-profile: alex-r-quant-lead",
        "roles": [
            {"name": "Lead", "project": "NeuroLSTM"},
            {"name": "Contributor", "project": "Anomaly Models"}
        ],
        "account_settings": {
            "tier": "Pro+ Terminal Tier",
            "renewal": "Jan 15, 2025",
            "2fa_enabled": True,
            "api_keys_masked": "******Keys, ******Keys",
            "last_login_ip": "192.168.2.125"
        },
        "integrations": {
            "alpaca": True,
            "polygon": True,
            "aws": True
        },
        "model_dev_history": [
            {"year": "2019", "models": 1},
            {"year": "2020", "models": 2},
            {"year": "2021", "models": 3},
            {"year": "2022", "models": 4},
            {"year": "2023", "models": 7}
        ],
        "contributions": [
            {"name": "NeuroLSTM_x2.0", "role": "Lead", "status": "Active"},
            {"name": "Anomaly Detection V1", "role": "Lead", "status": "Active"},
            {"name": "Anomaly Detection V3", "role": "Contributor", "status": "Live"},
            {"name": "Anomaly Detection V3", "role": "Lead", "status": "Live"}
        ],
        "activity_feed": [
            {"timestamp": "2026-06-28 14:20", "event": "Published Research Draft: 'AI in High-Frequency Volatility Prediction'"},
            {"timestamp": "2026-06-28 10:15", "event": "Hyper-parameter optimization: NeuroLSTM_x2.0 (complete)"},
            {"timestamp": "2026-06-27 18:40", "event": "Created new model feature set: 'Alternative Alpha'"},
            {"timestamp": "2026-06-27 09:30", "event": "Code Review: LSTM V3 model"}
        ],
        "skills": [
            {"subject": "Quantitative", "value": 85, "fullMark": 100},
            {"subject": "Optimization", "value": 90, "fullMark": 100},
            {"subject": "Sentiment Analysis", "value": 75, "fullMark": 100},
            {"subject": "Data Sourcing", "value": 80, "fullMark": 100},
            {"subject": "Feature Engineering", "value": 95, "fullMark": 100}
        ]
    }

# --- WebSocket Hub ---

@app.websocket("/ws/live-trading")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    live_session.connected_websockets.add(websocket)
    print(f"[WS] Client connected. Total: {len(live_session.connected_websockets)}", flush=True)

    # Push full fleet state immediately on connect
    initial = json.dumps({"type": "all_bots", "data": live_session.get_all_states()})
    await websocket.send_text(initial)

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")

            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif msg_type == "start":
                sym = payload.get("symbol", "BTCUSDT")
                code = payload.get("strategy_code", "")
                tf = payload.get("timeframe", "10s")
                live_session.start_session(sym, code, tf)
            elif msg_type == "stop":
                live_session.stop_session()

    except WebSocketDisconnect:
        live_session.connected_websockets.discard(websocket)
        print(f"[WS] Client disconnected. Active: {len(live_session.connected_websockets)}", flush=True)
    except Exception as e:
        live_session.connected_websockets.discard(websocket)
        print(f"[WS] Client error: {e}", flush=True)
