import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aiquant.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the local SQLite database and creates the necessary tables.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Account snapshots
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS account_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            equity REAL NOT NULL,
            cash REAL NOT NULL,
            buying_power REAL NOT NULL
        )
    """)

    # 2. Current positions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            symbol TEXT PRIMARY KEY,
            qty REAL NOT NULL,
            market_value REAL NOT NULL,
            cost_basis REAL NOT NULL,
            unrealized_pl REAL NOT NULL,
            unrealized_plpc REAL NOT NULL,
            avg_entry_price REAL NOT NULL,
            current_price REAL NOT NULL,
            change_today REAL NOT NULL
        )
    """)

    # 3. Orders history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            type TEXT NOT NULL,
            qty REAL NOT NULL,
            filled_qty REAL NOT NULL,
            filled_avg_price REAL,
            status TEXT NOT NULL,
            submitted_at TEXT NOT NULL
        )
    """)

    # 4. FIFO matched trades
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS matched_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            qty REAL NOT NULL,
            entry_price REAL NOT NULL,
            exit_price REAL NOT NULL,
            entry_date TEXT NOT NULL,
            exit_date TEXT NOT NULL,
            pnl REAL NOT NULL,
            r_multiple REAL NOT NULL,
            fees REAL NOT NULL,
            net_pnl REAL NOT NULL
        )
    """)

    # 5. Tracked X handles
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS x_handles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            handle TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Seed default handles if empty
    cursor.execute("SELECT COUNT(*) FROM x_handles")
    if cursor.fetchone()[0] == 0:
        default_handles = ["@Nairametrics", "@StatiSense", "@wealthcoachomi"]
        for h in default_handles:
            cursor.execute("INSERT INTO x_handles (handle) VALUES (?)", (h,))

    # 6. Bot Sessions History
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bot_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id TEXT NOT NULL,
            strategy_name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            start_cash REAL NOT NULL,
            end_cash REAL NOT NULL,
            pnl REAL NOT NULL,
            total_trades INTEGER NOT NULL,
            wins INTEGER NOT NULL,
            losses INTEGER NOT NULL,
            trades_json TEXT NOT NULL,
            last_alpha_rationale TEXT DEFAULT '',
            custom_charts_json TEXT DEFAULT ''
        )
    """)
    
    # Check if custom_charts_json column exists (migration for existing db)
    try:
        cursor.execute("SELECT custom_charts_json FROM bot_sessions LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE bot_sessions ADD COLUMN custom_charts_json TEXT DEFAULT ''")

    # 7. Active Bots (for crash recovery / state restoration)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS active_bots (
            bot_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            strategy_code TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            starting_cash REAL NOT NULL,
            feed_source TEXT NOT NULL,
            alpaca_key_id TEXT,
            alpaca_secret_key TEXT,
            hyperliquid_private_key TEXT,
            risk_profile_json TEXT,
            agentic_mode INTEGER NOT NULL DEFAULT 0,
            agent_attitude TEXT,
            gemini_api_key TEXT,
            tech_agent_key TEXT,
            sentiment_agent_key TEXT,
            tradingview_agent_key TEXT,
            hyperliquid_agent_key TEXT,
            firecrawl_agent_key TEXT,
            leverage_limit REAL DEFAULT 1.0,
            current_cash REAL,
            positions_json TEXT,
            trades_json TEXT,
            avg_cost REAL,
            realized_pnl REAL,
            start_time TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("Local database initialized successfully.")

def save_bot_session(bot_id: str, strategy_name: str, symbol: str, start_time: str, end_time: str, 
                     start_cash: float, end_cash: float, pnl: float, total_trades: int, 
                     wins: int, losses: int, trades_json: str, last_alpha_rationale: str = "",
                     custom_charts_json: str = ""):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO bot_sessions (
                bot_id, strategy_name, symbol, start_time, end_time, 
                start_cash, end_cash, pnl, total_trades, wins, losses, trades_json, last_alpha_rationale, custom_charts_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bot_id, strategy_name, symbol, start_time, end_time, 
            start_cash, end_cash, pnl, total_trades, wins, losses, trades_json, last_alpha_rationale, custom_charts_json
        ))
        conn.commit()
    finally:
        conn.close()

def get_bot_sessions():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bot_sessions ORDER BY id DESC")
        rows = cursor.fetchall()
        
        sessions = []
        import json
        for r in rows:
            # Safely get custom_charts
            custom_charts = {}
            if "custom_charts_json" in r.keys() and r["custom_charts_json"]:
                try:
                    custom_charts = json.loads(r["custom_charts_json"])
                except Exception:
                    pass

            sessions.append({
                "id": r["id"],
                "bot_id": r["bot_id"],
                "strategy_name": r["strategy_name"],
                "symbol": r["symbol"],
                "start_time": r["start_time"],
                "end_time": r["end_time"],
                "start_cash": r["start_cash"],
                "end_cash": r["end_cash"],
                "pnl": r["pnl"],
                "total_trades": r["total_trades"],
                "wins": r["wins"],
                "losses": r["losses"],
                "trades_json": json.loads(r["trades_json"]),
                "last_alpha_rationale": r["last_alpha_rationale"],
                "custom_charts": custom_charts
            })
        return sessions
    finally:
        conn.close()

def save_account_snapshot(equity: float, cash: float, buying_power: float):
    """
    Inserts a new portfolio account snapshot.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO account_snapshots (timestamp, equity, cash, buying_power)
        VALUES (?, ?, ?, ?)
    """, (now_str, equity, cash, buying_power))
    conn.commit()
    conn.close()

def get_account_snapshots(limit: int = 100):
    """
    Retrieves historical account snapshots.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp, equity, cash, buying_power 
        FROM account_snapshots 
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    # Reverse to keep chronological order
    result = [dict(row) for row in rows]
    result.reverse()
    return result

def update_positions(positions_list: list):
    """
    Syncs the current active positions list with the positions table.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear existing positions
    cursor.execute("DELETE FROM positions")
    
    # Insert new positions
    for p in positions_list:
        cursor.execute("""
            INSERT INTO positions (
                symbol, qty, market_value, cost_basis, unrealized_pl, 
                unrealized_plpc, avg_entry_price, current_price, change_today
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p.get("symbol"),
            p.get("qty", 0.0),
            p.get("market_value", 0.0),
            p.get("cost_basis", 0.0),
            p.get("unrealized_pl", 0.0),
            p.get("unrealized_plpc", 0.0),
            p.get("avg_entry_price", 0.0),
            p.get("current_price", 0.0),
            p.get("change_today", 0.0)
        ))
    conn.commit()
    conn.close()

def get_positions():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM positions")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_orders(orders_list: list):
    """
    Syncs the latest orders list.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    for o in orders_list:
        cursor.execute("""
            INSERT OR REPLACE INTO orders (
                order_id, symbol, side, type, qty, filled_qty, 
                filled_avg_price, status, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            o.get("id"),
            o.get("symbol"),
            o.get("side"),
            o.get("type"),
            float(o.get("qty", 0) or 0),
            float(o.get("filled_qty", 0) or 0),
            float(o.get("filled_avg_price", 0) or 0) if o.get("filled_avg_price") else None,
            o.get("status"),
            o.get("submitted_at") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))
    conn.commit()
    conn.close()

def get_orders(limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders ORDER BY submitted_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_matched_trades(trades_list: list):
    """
    Saves matched trades to the local database, avoiding duplicates.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Clear and insert fresh records to maintain single source of truth
    cursor.execute("DELETE FROM matched_trades")
    
    for t in trades_list:
        cursor.execute("""
            INSERT INTO matched_trades (
                symbol, side, qty, entry_price, exit_price, 
                entry_date, exit_date, pnl, r_multiple, fees, net_pnl
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t.get("symbol"),
            t.get("side"),
            t.get("qty", 0.0),
            t.get("entry_price", 0.0),
            t.get("exit_price", 0.0),
            t.get("entry_date"),
            t.get("exit_date"),
            t.get("pnl", 0.0),
            t.get("r_multiple", 0.0),
            t.get("fees", 0.0),
            t.get("net_pnl", 0.0)
        ))
    conn.commit()
    conn.close()

def get_matched_trades(limit: int = 100):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matched_trades ORDER BY exit_date DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_x_handles():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT handle FROM x_handles ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [row["handle"] for row in rows]

def add_x_handle(handle: str) -> bool:
    handle = handle.strip()
    if not handle:
        return False
    if not handle.startswith("@"):
        handle = "@" + handle
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO x_handles (handle) VALUES (?)", (handle,))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        return False

def delete_x_handle(handle: str) -> bool:
    handle = handle.strip()
    if not handle.startswith("@"):
        handle = "@" + handle
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM x_handles WHERE handle = ?", (handle,))
    rowcount = cursor.rowcount
    conn.commit()
    conn.close()
    return rowcount > 0

def save_active_bot(
    bot_id: str, name: str, symbol: str, strategy_code: str, timeframe: str,
    starting_cash: float, feed_source: str, alpaca_key_id: str, alpaca_secret_key: str,
    hyperliquid_private_key: str, risk_profile_json: str, agentic_mode: int,
    agent_attitude: str, gemini_api_key: str, tech_agent_key: str, sentiment_agent_key: str,
    tradingview_agent_key: str, hyperliquid_agent_key: str, firecrawl_agent_key: str,
    leverage_limit: float, current_cash: float, positions_json: str, trades_json: str,
    avg_cost: float, realized_pnl: float, start_time: str
):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO active_bots (
                bot_id, name, symbol, strategy_code, timeframe, starting_cash, feed_source,
                alpaca_key_id, alpaca_secret_key, hyperliquid_private_key, risk_profile_json,
                agentic_mode, agent_attitude, gemini_api_key, tech_agent_key, sentiment_agent_key,
                tradingview_agent_key, hyperliquid_agent_key, firecrawl_agent_key, leverage_limit,
                current_cash, positions_json, trades_json, avg_cost, realized_pnl, start_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bot_id, name, symbol, strategy_code, timeframe, starting_cash, feed_source,
            alpaca_key_id, alpaca_secret_key, hyperliquid_private_key, risk_profile_json,
            agentic_mode, agent_attitude, gemini_api_key, tech_agent_key, sentiment_agent_key,
            tradingview_agent_key, hyperliquid_agent_key, firecrawl_agent_key, leverage_limit,
            current_cash, positions_json, trades_json, avg_cost, realized_pnl, start_time
        ))
        conn.commit()
    finally:
        conn.close()

def delete_active_bot(bot_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM active_bots WHERE bot_id = ?", (bot_id,))
        conn.commit()
    finally:
        conn.close()

def get_active_bots() -> list:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM active_bots")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
