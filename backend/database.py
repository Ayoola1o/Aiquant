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

    conn.commit()
    conn.close()
    print("Local database initialized successfully.")

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
