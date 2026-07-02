import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Clock, Zap, BookOpen, Activity,
  ShieldCheck, ChevronDown, XCircle, RefreshCw, AlertTriangle,
  DollarSign, BarChart2, ArrowUpRight, ArrowDownRight, CheckCircle2,
} from 'lucide-react';

interface AlpacaTradingProps {
  alpacaKeyId: string;
  alpacaSecretKey: string;
  defaultSymbol?: string;
}

type OrderTab = 'trade' | 'orders' | 'activities' | 'margin' | 'history';
type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
type TIF = 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
type HistoryPeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1A';

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  FILL: 'Trade Fill', DIV: 'Dividend', JNLC: 'Journal (Cash)',
  PTC: 'Pass-Through Charge', REORG: 'Corp. Reorg', SSO: 'Stock Split (Open)',
  SSP: 'Stock Split (Proc.)', TRANS: 'Transfer', '': 'All Types',
};

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: 'Market', limit: 'Limit', stop: 'Stop',
  stop_limit: 'Stop Limit', trailing_stop: 'Trailing Stop',
};

const STATUS_COLOR: Record<string, string> = {
  filled: 'text-emerald-400', partially_filled: 'text-amber-400',
  accepted: 'text-sky-400', pending_new: 'text-sky-400',
  new: 'text-sky-400', canceled: 'text-slate-500',
  expired: 'text-slate-500', rejected: 'text-red-400',
};

export default function AlpacaTrading({
  alpacaKeyId, alpacaSecretKey, defaultSymbol = 'AAPL',
}: AlpacaTradingProps) {
  const hasKeys = alpacaKeyId.length > 4 && alpacaSecretKey.length > 4;
  const [activeTab, setActiveTab] = useState<OrderTab>('trade');

  // ── Market Clock ─────────────────────────────────────────────────
  const [clock, setClock] = useState<any>(null);
  const fetchClock = useCallback(async () => {
    if (!hasKeys) return;
    try {
      const res = await fetch('/api/alpaca/market/clock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) setClock(await res.json());
    } catch {}
  }, [alpacaKeyId, alpacaSecretKey, hasKeys]);

  // ── Quick Trade Form ──────────────────────────────────────────────
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [useNotional, setUseNotional] = useState(false);
  const [qty, setQty] = useState('');
  const [notional, setNotional] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailPrice, setTrailPrice] = useState('');
  const [trailPercent, setTrailPercent] = useState('');
  const [tif, setTif] = useState<TIF>('gtc');
  const [extHours, setExtHours] = useState(false);
  const [tpLimit, setTpLimit] = useState('');
  const [slStop, setSlStop] = useState('');
  const [slLimit, setSlLimit] = useState('');
  const [assetInfo, setAssetInfo] = useState<any>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeResult, setTradeResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchAssetInfo = useCallback(async (sym: string) => {
    if (!hasKeys || !sym) return;
    try {
      const res = await fetch(`/api/alpaca/assets/${sym.toUpperCase()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) setAssetInfo(await res.json()); else setAssetInfo(null);
    } catch { setAssetInfo(null); }
  }, [alpacaKeyId, alpacaSecretKey, hasKeys]);

  const fetchOrders = useCallback(async () => {
    if (!hasKeys) return;
    setOrdersLoading(true);
    try {
      const url = `/api/alpaca/orders?alpaca_key_id=${alpacaKeyId}&alpaca_secret_key=${alpacaSecretKey}&status=${ordersStatus}&limit=30`;
      const res = await fetch(url);
      if (res.ok) { const data = await res.json(); setOrders(data.orders || []); }
    } catch {} finally { setOrdersLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alpacaKeyId, alpacaSecretKey, hasKeys]);

  const placeTrade = async () => {
    if (!hasKeys) return;
    setTradeLoading(true);
    setTradeResult(null);
    try {
      const body: any = {
        alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey,
        symbol: symbol.toUpperCase(), side, order_type: orderType,
        time_in_force: tif, extended_hours: extHours,
      };
      if (useNotional && notional) body.notional = parseFloat(notional);
      else if (qty) body.qty = parseFloat(qty);
      if (['limit', 'stop_limit'].includes(orderType) && limitPrice) body.limit_price = parseFloat(limitPrice);
      if (['stop', 'stop_limit'].includes(orderType) && stopPrice) body.stop_price = parseFloat(stopPrice);
      if (orderType === 'trailing_stop') {
        if (trailPrice) body.trail_price = parseFloat(trailPrice);
        else if (trailPercent) body.trail_percent = parseFloat(trailPercent);
      }
      if (tpLimit) body.take_profit_limit = parseFloat(tpLimit);
      if (slStop) body.stop_loss_stop = parseFloat(slStop);
      if (slLimit) body.stop_loss_limit = parseFloat(slLimit);

      const res = await fetch('/api/alpaca/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setTradeResult({ ok: true, msg: `Order submitted — ID: ${data.order_id?.slice(0, 8)}…  Status: ${data.status}` });
        fetchOrders();
      } else {
        setTradeResult({ ok: false, msg: data.detail || 'Order rejected.' });
      }
    } catch (e: any) {
      setTradeResult({ ok: false, msg: `Network error: ${e.message}` });
    } finally { setTradeLoading(false); }
  };

  // ── Orders ───────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<'open' | 'all'>('open');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const res = await fetch(
        `/api/alpaca/orders/${orderId}?alpaca_key_id=${alpacaKeyId}&alpaca_secret_key=${alpacaSecretKey}`,
        { method: 'DELETE' }
      );
      if (res.ok) fetchOrders();
    } catch {} finally { setCancellingId(null); }
  };

  // ── Activities ───────────────────────────────────────────────────
  const [activities, setActivities] = useState<any[]>([]);
  const [activityType, setActivityType] = useState('');
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!hasKeys) return;
    setActivitiesLoading(true);
    try {
      const body: any = { alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey, page_size: 50, direction: 'desc' };
      if (activityType) body.activity_type = activityType;
      const res = await fetch('/api/alpaca/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { const data = await res.json(); setActivities(data.activities || []); }
    } catch {} finally { setActivitiesLoading(false); }
  }, [alpacaKeyId, alpacaSecretKey, hasKeys, activityType]);

  // ── Portfolio History ────────────────────────────────────────────
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('1M');
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [historyBase, setHistoryBase] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!hasKeys) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/alpaca/portfolio/history', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey, period: historyPeriod }),
      });
      if (res.ok) { const data = await res.json(); setPortfolioHistory(data.history || []); setHistoryBase(data.base_value || 0); }
    } catch {} finally { setHistoryLoading(false); }
  }, [alpacaKeyId, alpacaSecretKey, hasKeys, historyPeriod]);

  // ── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasKeys) return;
    fetchClock(); fetchOrders(); fetchActivities(); fetchHistory();
    const t = setInterval(fetchClock, 60000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKeys]);

  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, fetchOrders]);
  useEffect(() => { if (activeTab === 'activities') fetchActivities(); }, [activeTab, fetchActivities]);
  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab, fetchHistory]);
  useEffect(() => {
    if (symbol.length >= 1) { const t = setTimeout(() => fetchAssetInfo(symbol), 600); return () => clearTimeout(t); }
  }, [symbol, fetchAssetInfo]);

  // ── Derived ──────────────────────────────────────────────────────
  const historyReturn = portfolioHistory.length > 1
    ? ((portfolioHistory[portfolioHistory.length - 1]?.equity - historyBase) / (historyBase || 1)) * 100 : 0;
  const historyColor = historyReturn >= 0 ? '#10b981' : '#f43f5e';
  const histChart = portfolioHistory.map((h) => ({
    label: new Date(h.timestamp * 1000).toLocaleDateString(),
    equity: h.equity ? parseFloat(h.equity.toFixed(2)) : 0,
  }));

  const TABS: { key: OrderTab; label: string; Icon: any }[] = [
    { key: 'trade', label: 'Quick Trade', Icon: Zap },
    { key: 'orders', label: 'Order Book', Icon: BookOpen },
    { key: 'activities', label: 'Activities', Icon: Activity },
    { key: 'margin', label: 'Margin Info', Icon: ShieldCheck },
    { key: 'history', label: 'Portfolio History', Icon: BarChart2 },
  ];

  if (!hasKeys) {
    return (
      <div className="glass-panel p-6 flex items-center gap-4 border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-400">Alpaca API Keys Required</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Add your Alpaca Paper API keys in Settings to use the trading panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Market Clock */}
      <div className="glass-panel px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-300">Market Clock</span>
        </div>
        {clock ? (
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${clock.is_open ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${clock.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {clock.is_open ? 'Market Open' : 'Market Closed'}
            </span>
            {!clock.is_open && clock.next_open && <span className="text-[10px] text-slate-500 font-mono">Opens: {new Date(clock.next_open).toLocaleString()}</span>}
            {clock.is_open && clock.next_close && <span className="text-[10px] text-slate-500 font-mono">Closes: {new Date(clock.next_close).toLocaleString()}</span>}
          </div>
        ) : <span className="text-[10px] text-slate-500 animate-pulse">Fetching market status…</span>}
        <button onClick={fetchClock} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"><RefreshCw className="w-3 h-3" /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-panel p-1">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold flex-1 justify-center transition-all cursor-pointer ${activeTab === key ? 'bg-indigo-600/80 text-white border border-indigo-500/50 shadow-lg shadow-indigo-900/30' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* QUICK TRADE */}
      {activeTab === 'trade' && (
        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Place Order</h3>
            {assetInfo && (
              <div className="flex items-center gap-2 text-[10px]">
                {assetInfo.fractionable && <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-semibold">Fractional</span>}
                {assetInfo.shortable && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-semibold">Shortable</span>}
                {assetInfo.marginable && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full font-semibold">Marginable</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Symbol</label>
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL"
                className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Order Type</label>
              <div className="relative">
                <select value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-indigo-500/50">
                  {Object.entries(ORDER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setSide('buy')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${side === 'buy' ? 'bg-emerald-600/80 text-white border-emerald-500/50 shadow-lg shadow-emerald-900/30' : 'bg-slate-900/40 text-slate-400 border-white/10 hover:border-emerald-500/30'}`}>
              <ArrowUpRight className="w-4 h-4" /> Buy
            </button>
            <button onClick={() => setSide('sell')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${side === 'sell' ? 'bg-red-600/80 text-white border-red-500/50 shadow-lg shadow-red-900/30' : 'bg-slate-900/40 text-slate-400 border-white/10 hover:border-red-500/30'}`}>
              <ArrowDownRight className="w-4 h-4" /> Sell / Short
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setUseNotional(false)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${!useNotional ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-900/30 text-slate-500 border-white/10 hover:border-white/20'}`}>
              Shares (qty)
            </button>
            <button onClick={() => setUseNotional(true)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${useNotional ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-900/30 text-slate-500 border-white/10 hover:border-white/20'}`}>
              Dollar Amount ($)
            </button>
          </div>

          {useNotional ? (
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Dollar Amount (Fractional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input type="number" value={notional} onChange={(e) => setNotional(e.target.value)} placeholder="50.00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Fractional order — uses market type with time_in_force=day</p>
            </div>
          ) : (
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Quantity (Shares)</label>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1"
                className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {['limit', 'stop_limit'].includes(orderType) && (
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Limit Price</label>
                <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-amber-500/20 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50" />
              </div>
            )}
            {['stop', 'stop_limit'].includes(orderType) && (
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Stop Price</label>
                <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-red-500/20 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500/50" />
              </div>
            )}
            {orderType === 'trailing_stop' && (
              <>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Trail $ Amount</label>
                  <input type="number" value={trailPrice} onChange={(e) => setTrailPrice(e.target.value)} placeholder="5.00"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Trail % Amount</label>
                  <input type="number" value={trailPercent} onChange={(e) => setTrailPercent(e.target.value)} placeholder="2.0"
                    className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-1.5">Time in Force</label>
              <div className="relative">
                <select value={tif} onChange={(e) => setTif(e.target.value as TIF)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-indigo-500/50">
                  {(['day', 'gtc', 'opg', 'cls', 'ioc', 'fok'] as TIF[]).map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={extHours} onChange={(e) => setExtHours(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                <span className="text-[11px] text-slate-400 font-semibold">Extended Hours</span>
              </label>
            </div>
          </div>

          <details className="group">
            <summary className="text-[10px] text-indigo-400 font-semibold cursor-pointer list-none flex items-center gap-1 hover:text-indigo-300">
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              Bracket Order Legs (Take Profit / Stop Loss)
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-emerald-400 font-semibold block mb-1">Take Profit Limit</label>
                <input type="number" value={tpLimit} onChange={(e) => setTpLimit(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-emerald-500/20 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-red-400 font-semibold block mb-1">SL Stop Price</label>
                <input type="number" value={slStop} onChange={(e) => setSlStop(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-red-500/20 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-red-400 font-semibold block mb-1">SL Limit Price</label>
                <input type="number" value={slLimit} onChange={(e) => setSlLimit(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-red-500/20 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500/50" />
              </div>
            </div>
          </details>

          <button onClick={placeTrade} disabled={tradeLoading}
            className={`w-full py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-900/40' : 'bg-red-600 hover:bg-red-500 text-white border-red-400/50 shadow-lg shadow-red-900/40'} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {tradeLoading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</>
              : <>{side === 'buy' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {side === 'buy' ? 'Buy' : 'Sell / Short'} {symbol.toUpperCase()} — {useNotional ? `$${notional || '0'}` : `${qty || '0'} shares`}</>
            }
          </button>

          {tradeResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-[11px] ${tradeResult.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {tradeResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              {tradeResult.msg}
            </div>
          )}
        </div>
      )}

      {/* ORDER BOOK */}
      {activeTab === 'orders' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Order Book</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {(['open', 'all'] as const).map((s) => (
                  <button key={s} onClick={() => setOrdersStatus(s)}
                    className={`px-3 py-1 text-[10px] font-semibold capitalize cursor-pointer transition-all ${ordersStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>{s}</button>
                ))}
              </div>
              <button onClick={fetchOrders} disabled={ordersLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-300 cursor-pointer disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${ordersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-xs">{ordersLoading ? 'Loading orders…' : `No ${ordersStatus} orders found.`}</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between bg-slate-900/60 rounded-xl px-4 py-3 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.side === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{o.side?.toUpperCase()}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{o.symbol}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {o.notional ? `$${parseFloat(o.notional).toFixed(2)} notional` : `${o.qty} shares`} · {o.type} · {o.time_in_force?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-[11px] font-bold ${STATUS_COLOR[o.status] || 'text-slate-400'}`}>{o.status}</p>
                      {o.filled_qty && <p className="text-[9px] text-slate-600 font-mono">{o.filled_qty} filled</p>}
                    </div>
                    {['new', 'accepted', 'pending_new'].includes(o.status) && (
                      <button onClick={() => cancelOrder(o.id)} disabled={cancellingId === o.id}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer disabled:opacity-50 transition-all">
                        {cancellingId === o.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Account Activities</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select value={activityType} onChange={(e) => setActivityType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900/60 border border-white/10 rounded-lg text-[10px] text-slate-300 appearance-none cursor-pointer focus:outline-none pr-6">
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
              <button onClick={fetchActivities} disabled={activitiesLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-300 cursor-pointer disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${activitiesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-xs">{activitiesLoading ? 'Loading activities…' : 'No activities found. Trade history will appear after your first fill.'}</div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {activities.map((a, i) => {
                const isFill = a.activity_type === 'FILL';
                return (
                  <div key={a.id || i} className="flex items-center justify-between bg-slate-900/60 rounded-xl px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${isFill && a.side === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : isFill ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        {a.activity_type?.slice(0, 2) || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type}{a.symbol && ` — ${a.symbol}`}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {a.date ? new Date(a.date).toLocaleString() : ''}
                          {a.qty && ` · ${a.qty} shares`}{a.price && ` @ $${parseFloat(a.price).toFixed(4)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {a.net_amount != null && (
                        <p className={`text-sm font-bold font-mono ${parseFloat(a.net_amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(a.net_amount) >= 0 ? '+' : ''}${Math.abs(parseFloat(a.net_amount)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MARGIN INFO */}
      {activeTab === 'margin' && <MarginInfoPanel alpacaKeyId={alpacaKeyId} alpacaSecretKey={alpacaSecretKey} />}

      {/* PORTFOLIO HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Portfolio Equity History</h3>
              {portfolioHistory.length > 0 && (
                <p className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${historyReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {historyReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {historyReturn >= 0 ? '+' : ''}{historyReturn.toFixed(2)}% over period
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {(['1D', '1W', '1M', '3M', '6M', '1A'] as HistoryPeriod[]).map((p) => (
                  <button key={p} onClick={() => setHistoryPeriod(p)}
                    className={`px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all ${historyPeriod === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}>{p}</button>
                ))}
              </div>
              <button onClick={fetchHistory} disabled={historyLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-300 cursor-pointer disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {historyLoading ? (
            <div className="h-52 flex items-center justify-center text-slate-600 text-xs animate-pulse">Loading history…</div>
          ) : histChart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-slate-600 text-xs text-center">
              No portfolio history data available.<br />Start trading to see your equity curve here.
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={histChart} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={historyColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={historyColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Equity']} />
                  <Area type="monotone" dataKey="equity" stroke={historyColor} fill="url(#histGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {historyBase > 0 && <p className="text-[10px] text-slate-600 font-mono">Base value: ${historyBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>}
        </div>
      )}
    </div>
  );
}

// ── Margin Info Sub-component ────────────────────────────────────────────────
function MarginInfoPanel({ alpacaKeyId, alpacaSecretKey }: { alpacaKeyId: string; alpacaSecretKey: string }) {
  const [acct, setAcct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/alpaca/account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
    }).then((r) => r.json()).then((d) => setAcct(d.account)).catch(() => {}).finally(() => setLoading(false));
  }, [alpacaKeyId, alpacaSecretKey]);

  if (loading) return <div className="glass-panel p-8 text-center text-slate-600 text-xs animate-pulse">Loading margin data…</div>;
  if (!acct) return <div className="glass-panel p-8 text-center text-slate-600 text-xs">Unable to load margin info. Check your API keys.</div>;

  const rows = [
    { label: 'Account Status', value: acct.status?.toUpperCase(), color: acct.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Currency', value: acct.currency || 'USD', color: 'text-white' },
    { label: 'Portfolio Equity', value: `$${Number(acct.equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-white' },
    { label: 'Cash', value: `$${Number(acct.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-slate-300' },
    { label: 'Buying Power', value: `$${Number(acct.buying_power || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-indigo-400' },
    { label: 'Long Market Value', value: `$${Number(acct.long_market_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-emerald-400' },
    { label: 'Short Market Value', value: `$${Number(acct.short_market_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-red-400' },
    { label: 'Initial Margin', value: `$${Number(acct.initial_margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-amber-400' },
    { label: 'Maintenance Margin', value: `$${Number(acct.maintenance_margin || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-amber-400' },
    { label: 'SMA (Excess Margin)', value: `$${Number(acct.sma || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-purple-400' },
    { label: 'Day Trade Count', value: acct.day_trade_count ?? 0, color: (acct.day_trade_count ?? 0) >= 3 ? 'text-red-400' : 'text-white' },
    { label: 'Pattern Day Trader', value: acct.pattern_day_trader ? 'YES' : 'NO', color: acct.pattern_day_trader ? 'text-red-400 font-bold' : 'text-emerald-400' },
    { label: 'Shorting Enabled', value: acct.shorting_enabled ? 'YES' : 'NO', color: acct.shorting_enabled ? 'text-emerald-400' : 'text-slate-500' },
    { label: 'Trading Blocked', value: acct.trading_blocked ? 'BLOCKED' : 'OK', color: acct.trading_blocked ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400' },
  ];

  return (
    <div className="glass-panel p-5 space-y-3">
      <h3 className="text-sm font-bold text-white">Margin & Account Details</h3>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/50 rounded-xl px-4 py-3 border border-white/5">
            <p className="text-[10px] text-slate-500 font-semibold">{label}</p>
            <p className={`text-sm font-mono mt-0.5 ${color}`}>{String(value)}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2">Paper trading account — margin values reflect simulated amounts.</p>
    </div>
  );
}
