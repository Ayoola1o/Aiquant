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
