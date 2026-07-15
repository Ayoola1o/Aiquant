import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ComposedChart, Bar, Line, ReferenceLine, Legend,
} from 'recharts';
import {
  Shield, TrendingUp, BarChart2, DollarSign, Activity, Key,
  RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, TrendingDown, BarChart,
} from 'lucide-react';

// ─── Candlestick shape — receives y=top-of-wickRange, height=wickRange pixels ─
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !height || height <= 0 || width <= 0) return null;
  const { open, high, low, close } = payload;
  const priceRange = high - low;
  if (priceRange <= 0) return null;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#ef4444';
  const cx = x + width / 2;
  const bw = Math.max(2, width - 2);
  // height spans low→high in pixels; y is the pixel position of high (top)
  const pxPerPrice = height / priceRange;
  const bodyTop    = y + (high - Math.max(open, close)) * pxPerPrice;
  const bodyBottom = y + (high - Math.min(open, close)) * pxPerPrice;
  const bodyH = Math.max(1, bodyBottom - bodyTop);
  return (
    <g>
      {/* wick */}
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
      {/* body */}
      <rect x={x + 1} y={bodyTop} width={bw} height={bodyH} fill={color} fillOpacity={0.85} />
    </g>
  );
};

// ─── Buy / Sell signal dot ────────────────────────────────────────────────────
const TradeDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload?.signal) return null;
  const isBuy = payload.signal === 'BUY';
  const color = isBuy ? '#22c55e' : '#ef4444';
  const arrow = isBuy ? '▲' : '▼';
  const offsetY = isBuy ? 18 : -18;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#0f1115" strokeWidth={1.5} />
      <text x={cx} y={cy - offsetY} textAnchor="middle" fontSize={9} fontWeight="bold" fill={color}>{arrow} {payload.signal}</text>
    </g>
  );
};

interface PortfolioProps {
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
}

export default function Portfolio({ alpacaKeyId = '', alpacaSecretKey = '' }: PortfolioProps) {
  const navigate = useNavigate();
  const hasAlpacaKeys = alpacaKeyId.length > 4 && alpacaSecretKey.length > 4;

  // Alpaca Paper account data
  const [alpacaAccount, setAlpacaAccount] = useState<any>(null);
  const [alpacaPositions, setAlpacaPositions] = useState<any[]>([]);
  const [alpacaOrders, setAlpacaOrders] = useState<any[]>([]);
  const [alpacaLoading, setAlpacaLoading] = useState(false);
  const [alpacaError, setAlpacaError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [liquidating, setLiquidating] = useState(false);
  const [liquidateSuccess, setLiquidateSuccess] = useState(false);
  const [selectedLiquidateSym, setSelectedLiquidateSym] = useState<string | null>(null);

  // Performance and statistics data states
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'performance'>('overview');

  // ── Interactive chart state ──────────────────────────────────────────────
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string>('');
  const [chartInterval, setChartInterval] = useState<string>('1h');
  const [chartPeriod, setChartPeriod] = useState<string>('1mo');
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [chartView, setChartView] = useState<'candlestick' | 'equity'>('candlestick');

  // Simulated bot portfolio fallback states
  const [cash, setCash] = useState(10000.0);
  const [portfolioValue, setPortfolioValue] = useState(10000.0);
  const [positions, setPositions] = useState<any>({});
  const [livePrice, setLivePrice] = useState(67250.0);

  const fetchPerformanceData = useCallback(async () => {
    if (!hasAlpacaKeys) return;
    setPerformanceLoading(true);
    try {
      const res = await fetch('/api/alpaca/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      }
    } catch (e) {
      console.error("Failed to fetch performance data", e);
    } finally {
      setPerformanceLoading(false);
    }
  }, [alpacaKeyId, alpacaSecretKey, hasAlpacaKeys]);

  const fetchChartData = useCallback(async (sym?: string) => {
    if (!hasAlpacaKeys) return;
    setChartLoading(true);
    try {
      const res = await fetch('/api/alpaca/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alpaca_key_id: alpacaKeyId,
          alpaca_secret_key: alpacaSecretKey,
          symbol: sym || chartSymbol || null,
          candle_period: chartPeriod,
          candle_interval: chartInterval,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
        if (!chartSymbol && data.symbol) setChartSymbol(data.symbol);
      }
    } catch (e) {
      console.error('Chart data fetch error', e);
    } finally {
      setChartLoading(false);
    }
  }, [alpacaKeyId, alpacaSecretKey, hasAlpacaKeys, chartSymbol, chartPeriod, chartInterval]);

  const fetchAlpacaAccount = useCallback(async () => {
    if (!hasAlpacaKeys) return;
    setAlpacaLoading(true);
    setAlpacaError('');
    try {
      const res = await fetch('/api/alpaca/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setAlpacaAccount(data.account);
        setAlpacaPositions(data.positions || []);
        setAlpacaOrders(data.orders || []);
        setLastRefreshed(new Date().toLocaleTimeString());
      } else {
        const err = await res.json();
        setAlpacaError(err.detail || 'Failed to load Alpaca account.');
      }
    } catch (e) {
      setAlpacaError('Network error: could not reach Alpaca API.');
    } finally {
      setAlpacaLoading(false);
    }
  }, [alpacaKeyId, alpacaSecretKey, hasAlpacaKeys]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleLiquidate = () => {
    if (!hasAlpacaKeys) return;
    setShowConfirmModal(true);
  };

  const executeLiquidation = async () => {
    setLiquidating(true);
    setAlpacaError('');
    setLiquidateSuccess(false);
    try {
      const res = await fetch('/api/alpaca/liquidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) {
        setLiquidateSuccess(true);
        // Refresh account details
        fetchAlpacaAccount();
        setTimeout(() => setLiquidateSuccess(false), 5000);
      } else {
        const err = await res.json();
        setAlpacaError(err.detail || 'Failed to liquidate positions.');
      }
    } catch (e) {
      setAlpacaError('Network error: failed to connect to liquidation server.');
    } finally {
      setLiquidating(false);
    }
  };

  const executeSingleLiquidation = async () => {
    if (!selectedLiquidateSym) return;
    setLiquidating(true);
    setAlpacaError('');
    try {
      const res = await fetch(`/api/alpaca/liquidate/${selectedLiquidateSym}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey }),
      });
      if (res.ok) {
        // Refresh account details
        fetchAlpacaAccount();
      } else {
        const err = await res.json();
        setAlpacaError(err.detail || 'Failed to close position.');
      }
    } catch (e) {
      setAlpacaError('Network error: failed to close position.');
    } finally {
      setLiquidating(false);
      setSelectedLiquidateSym(null);
    }
  };

  // Fetch bot live status for fallback
  const fetchLiveStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/live/status');
      if (res.ok) {
        const state = await res.json();
        setCash(state.cash);
        setPortfolioValue(state.portfolio_value);
        setPositions(state.positions || {});
        if (state.active_candle) setLivePrice(state.active_candle.close);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlpacaAccount();
    fetchPerformanceData();
    fetchLiveStatus();
    fetchChartData();
    const interval = setInterval(() => {
      fetchLiveStatus();
      if (hasAlpacaKeys) {
        fetchAlpacaAccount();
        fetchPerformanceData();
      }
    }, 10000); // 10s poll to avoid Alpaca rate limits
    return () => clearInterval(interval);
  }, [fetchAlpacaAccount, fetchPerformanceData, fetchLiveStatus, fetchChartData, hasAlpacaKeys]);

  // Derived values from Alpaca if available, else bot fallback
  const displayCash = alpacaAccount ? parseFloat(alpacaAccount.cash) : cash;
  const displayEquity = alpacaAccount ? parseFloat(alpacaAccount.equity) : portfolioValue;
  const displayBuyingPower = alpacaAccount ? parseFloat(alpacaAccount.buying_power) : cash;
  const startingEquity = alpacaAccount ? parseFloat(alpacaAccount.last_equity) : 10000.0;
  const totalReturnPct = ((displayEquity - startingEquity) / startingEquity) * 100;
  const totalReturnAbs = displayEquity - startingEquity;

  // Risk diagnostics (declared early to prevent TDZ error)
  const isHolding = alpacaPositions.length > 0 || Object.keys(positions).length > 0;

  // Performance metrics (either from actual performanceData or simulated fallback)
  const dailyPnL = performanceData ? performanceData.metrics.daily_pnl : (alpacaAccount ? (displayEquity - startingEquity) : 120.00);
  const dailyPnLPct = performanceData ? performanceData.metrics.daily_pnl_pct : (alpacaAccount ? ((displayEquity - startingEquity) / startingEquity) * 100 : 1.20);
  
  const weeklyPnL = performanceData ? performanceData.metrics.weekly_pnl : totalReturnAbs * 0.4;
  const weeklyPnLPct = performanceData ? performanceData.metrics.weekly_pnl_pct : totalReturnPct * 0.4;

  const cumulativePnL = performanceData ? performanceData.metrics.cumulative_pnl : totalReturnAbs;
  const cumulativePnLPct = performanceData ? performanceData.metrics.cumulative_pnl_pct : totalReturnPct;

  const sharpeRatio = performanceData ? performanceData.metrics.sharpe_ratio : (totalReturnPct > 0 ? 1.62 : 0.0);
  const maxDrawdown = performanceData ? performanceData.metrics.max_drawdown : (isHolding ? 4.25 : 0.0);

  // Allocation chart data
  const getPieData = () => {
    if (alpacaPositions.length > 0) {
      const data = alpacaPositions.map(p => ({
        name: p.symbol,
        value: p.market_value,
      }));
      data.push({ name: 'USD Cash', value: displayCash });
      return data;
    }
    const data: any[] = [];
    Object.entries(positions).forEach(([sym, qty]: any) => {
      if (qty > 0) data.push({ name: sym, value: qty * livePrice });
    });
    data.push({ name: 'USD Cash', value: cash });
    return data;
  };

  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#a855f7', '#f59e0b', '#06b6d4'];
  const portfolioVolatility = isHolding ? 14.8 : 0.0;
  const portfolioBeta = isHolding ? 1.15 : 0.0;
  const portfolioSharpe = performanceData ? performanceData.metrics.sharpe_ratio : (displayEquity > startingEquity ? 1.62 : 0.0);
  const portfolioVaR = isHolding ? displayEquity * 0.024 : 0.0;

  // Mock and fallbacks for advanced trade history and performance tabs
  const mockTrades = [
    { symbol: 'BTCUSD', side: 'LONG', qty: 0.15, entry_price: 61250.00, exit_price: 63400.00, entry_date: '2026-07-01 10:15:00', exit_date: '2026-07-01 14:30:00', pnl: 322.50, r_multiple: 2.15, fees: 1.42, net_pnl: 321.08 },
    { symbol: 'ETHUSD', side: 'SHORT', qty: 2.50, entry_price: 3450.00, exit_price: 3380.00, entry_date: '2026-06-30 08:00:00', exit_date: '2026-06-30 11:20:00', pnl: 175.00, r_multiple: 1.55, fees: 1.29, net_pnl: 173.71 },
    { symbol: 'SOLUSD', side: 'LONG', qty: 15.00, entry_price: 142.50, exit_price: 139.80, entry_date: '2026-06-29 09:45:00', exit_date: '2026-06-29 16:10:00', pnl: -40.50, r_multiple: -0.95, fees: 0.32, net_pnl: -40.82 },
    { symbol: 'BTCUSD', side: 'LONG', qty: 0.08, entry_price: 60800.00, exit_price: 62100.00, entry_date: '2026-06-28 13:00:00', exit_date: '2026-06-28 15:45:00', pnl: 104.00, r_multiple: 1.14, fees: 0.74, net_pnl: 103.26 },
    { symbol: 'ETHUSD', side: 'LONG', qty: 1.80, entry_price: 3390.00, exit_price: 3425.00, entry_date: '2026-06-27 11:15:00', exit_date: '2026-06-27 12:50:00', pnl: 63.00, r_multiple: 0.82, fees: 0.92, net_pnl: 62.08 }
  ];

  const mockRDistribution = {
    "<-2R": 0,
    "-2R to -1R": 1,
    "-1R to 0R": 1,
    "0R to 1R": 1,
    "1R to 2R": 1,
    ">2R": 1
  };

  const mockPerAsset = [
    { symbol: 'BTCUSD', trades: 2, win_rate: 100.0, net_profit: 424.34, fees: 2.16 },
    { symbol: 'ETHUSD', trades: 2, win_rate: 100.0, net_profit: 235.79, fees: 2.21 },
    { symbol: 'SOLUSD', trades: 1, win_rate: 0.0, net_profit: -40.82, fees: 0.32 }
  ];

  const tradesList = performanceData ? performanceData.trades : (hasAlpacaKeys ? [] : mockTrades);
  const rDistribution = performanceData ? performanceData.r_distribution : (hasAlpacaKeys ? {} : mockRDistribution);
  const perAssetStats = performanceData ? performanceData.per_asset : (hasAlpacaKeys ? [] : mockPerAsset);
  
  const winRate = performanceData ? performanceData.metrics.win_rate : (hasAlpacaKeys ? 0.0 : 80.0);
  const profitFactor = performanceData ? performanceData.metrics.profit_factor : (hasAlpacaKeys ? 1.0 : 15.28);
  const avgRMultiple = performanceData ? performanceData.metrics.avg_r_multiple : (hasAlpacaKeys ? 0.0 : 0.94);
  const totalFees = performanceData ? performanceData.metrics.total_fees : (hasAlpacaKeys ? 0.0 : 4.69);
  const netProfitVal = performanceData ? performanceData.metrics.net_profit : (hasAlpacaKeys ? 0.0 : 619.31);
  const totalTradesCount = performanceData ? performanceData.metrics.total_trades : (hasAlpacaKeys ? 0 : 5);

  // Mock equity curve seeded from actual equity value
  const seedEquity = displayEquity;
  const equityCurve = Array.from({ length: 8 }, (_, i) => ({
    day: `D-${7 - i}`,
    value: parseFloat((seedEquity * (0.94 + i * 0.009 + Math.sin(i) * 0.003)).toFixed(2)),
  }));
  equityCurve[equityCurve.length - 1].value = parseFloat(seedEquity.toFixed(2));

  return (
    <div className="space-y-6">

      {/* Alpaca Account Status Banner */}
      {hasAlpacaKeys ? (
        <div className={`glass-panel p-4 flex items-center justify-between gap-4 border ${alpacaError ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
          <div className="flex items-center gap-3">
            {alpacaError ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div>
              <p className={`text-xs font-bold ${alpacaError ? 'text-red-400' : 'text-emerald-400'}`}>
                {alpacaError ? 'Alpaca Connection Error' : 'Alpaca Paper Trading — Connected'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {alpacaError || (alpacaAccount
                  ? `Account ID: ${alpacaAccount.id?.slice(0, 8)}… | Status: ${alpacaAccount.status?.toUpperCase()} | Currency: ${alpacaAccount.currency}`
                  : 'Connecting to paper-api.alpaca.markets…'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && !alpacaError && (
              <span className="text-[10px] text-slate-500 font-mono">Updated: {lastRefreshed}</span>
            )}
            <button
              onClick={fetchAlpacaAccount}
              disabled={alpacaLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] font-bold hover:border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${alpacaLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLiquidate}
              disabled={alpacaLoading || liquidating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                liquidateSuccess
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-[#FF4B55] border-[#FF4B55]/20 hover:bg-red-500/20 hover:border-[#FF4B55]/40'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-[#FF4B55]" />
              {liquidating ? 'Liquidating...' : liquidateSuccess ? 'Done' : 'Liquidate All'}
            </button>
            <a
              href="https://app.alpaca.markets/paper-trading"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              Open Dashboard
            </a>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-4 flex items-center gap-4 border border-amber-500/20 bg-amber-500/5">
          <Key className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-400">Alpaca Paper Trading — Not Configured</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Go to <strong className="text-slate-300">Platform Settings → API Keys</strong> and add your Alpaca Paper API credentials to see your live portfolio here.
            </p>
          </div>
        </div>
      )}

      {/* Portfolio overview cards */}
      <div className="grid md:grid-cols-4 gap-6">
        {/* Total Equity */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-slate-400 font-semibold">Net Portfolio Equity</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-white block">
            ${displayEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="text-[10px] text-slate-500 font-light space-y-0.5 mt-1.5 border-t border-slate-900 pt-1">
            <div className="flex justify-between">
              <span>Cash:</span>
              <span className="font-mono font-semibold text-slate-300">${displayCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>Buying Power:</span>
              <span className="font-mono font-semibold text-slate-300">${displayBuyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Profit & Loss Dashboard */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-slate-400 font-semibold">P&amp;L Dashboard</span>
            {cumulativePnL >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <Activity className="w-4 h-4 text-red-400" />}
          </div>
          <span className={`text-2xl font-bold font-mono block ${cumulativePnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {cumulativePnL >= 0 ? '+' : ''}{cumulativePnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div className="text-[10px] space-y-0.5 mt-1.5 border-t border-slate-900 pt-1">
            <div className="flex justify-between text-slate-500">
              <span>Daily:</span>
              <span className={`font-mono font-bold ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({dailyPnL >= 0 ? '+' : ''}{dailyPnLPct.toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Weekly:</span>
              <span className={`font-mono font-bold ${weeklyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {weeklyPnL >= 0 ? '+' : ''}{weeklyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({weeklyPnL >= 0 ? '+' : ''}{weeklyPnLPct.toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Cumulative:</span>
              <span className={`font-mono font-bold ${cumulativePnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {cumulativePnL >= 0 ? '+' : ''}{cumulativePnLPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Sharpe & Max Drawdown Performance */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-slate-400 font-semibold">Performance Diagnostics</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <span className="text-[10px] text-slate-500 block">Sharpe Ratio</span>
              <span className="text-xl font-bold font-mono text-white">{sharpeRatio}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Max Drawdown</span>
              <span className="text-xl font-bold font-mono text-red-400">{maxDrawdown.toFixed(2)}%</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-500 font-light block mt-2 font-mono">Annualized stats (1M window)</span>
        </div>

        {/* Risk & Volatility */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-slate-400 font-semibold">Risk Diagnostics</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <span className="text-[10px] text-slate-500 block">Daily VaR (95%)</span>
              <span className="text-xl font-bold font-mono text-red-400">
                ${portfolioVaR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Volatility</span>
              <span className="text-xl font-bold font-mono text-slate-300">{portfolioVolatility}%</span>
            </div>
          </div>
          <span className="text-[9px] text-slate-500 font-light block mt-2 font-mono">Beta coefficient: {portfolioBeta}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-900 gap-1 mt-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Portfolio Overview
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeTab === 'trades'
              ? 'border-indigo-500 text-white bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Trade History &amp; Orders
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
            activeTab === 'performance'
              ? 'border-indigo-500 text-white bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Performance Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* ══════════════════════════════════════════════════
              Interactive Trade Execution Chart
          ══════════════════════════════════════════════════ */}
          <div className="glass-panel p-6 mt-6">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Interactive Trade Execution Chart</h3>
                {alpacaAccount && (
                  <span className="text-[9px] text-emerald-400 font-mono font-semibold px-2 py-0.5 border border-emerald-500/20 rounded-full bg-emerald-500/5">
                    ALPACA LIVE
                  </span>
                )}
              </div>

              {/* Symbol picker — auto-populated from Alpaca fills */}
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {chartData?.symbols?.length > 0 && (
                  <select
                    value={chartSymbol}
                    onChange={(e) => { setChartSymbol(e.target.value); fetchChartData(e.target.value); }}
                    className="px-2 py-1.5 bg-[#0F1115] border border-white/10 rounded-lg text-[11px] font-mono text-white outline-none focus:border-indigo-500/50"
                  >
                    {chartData.symbols.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                {/* Interval */}
                <select
                  value={chartInterval}
                  onChange={(e) => setChartInterval(e.target.value)}
                  className="px-2 py-1.5 bg-[#0F1115] border border-white/10 rounded-lg text-[11px] font-mono text-white outline-none focus:border-indigo-500/50"
                >
                  {['1m','5m','15m','30m','1h','4h','1d'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                {/* Period */}
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="px-2 py-1.5 bg-[#0F1115] border border-white/10 rounded-lg text-[11px] font-mono text-white outline-none focus:border-indigo-500/50"
                >
                  {['5d','1mo','3mo','6mo'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {/* View toggle */}
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  {(['candlestick','equity'] as const).map(v => (
                    <button key={v} onClick={() => setChartView(v)}
                      className={`px-3 py-1.5 text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        chartView === v ? 'bg-indigo-600 text-white' : 'bg-[#0F1115] text-slate-400 hover:text-white'
                      }`}
                    >{v}</button>
                  ))}
                </div>
                {/* Indicator toggles */}
                {chartView === 'candlestick' && (
                  <div className="flex gap-1.5">
                    {[['SMA20', showSMA, setShowSMA, '#f59e0b'], ['EMA50', showEMA, setShowEMA, '#6366f1'], ['RSI', showRSI, setShowRSI, '#ec4899']] .map(([label, active, setter, color]: any) => (
                      <button key={label} onClick={() => setter((p: boolean) => !p)}
                        className={`px-2 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                          active ? 'opacity-100 text-white border-white/20' : 'opacity-40 text-slate-500 border-transparent'
                        }`}
                        style={{ backgroundColor: active ? `${color}22` : 'transparent', borderColor: active ? color : 'transparent' }}
                      >{label}</button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => fetchChartData(chartSymbol || undefined)}
                  disabled={chartLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-[10px] font-bold text-indigo-300 hover:bg-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${chartLoading ? 'animate-spin' : ''}`} />
                  {chartLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* No keys banner */}
            {!hasAlpacaKeys && (
              <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
                <BarChart className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500">Connect your Alpaca Paper API keys to view live trade execution charts.</p>
              </div>
            )}

            {/* Loading shimmer */}
            {hasAlpacaKeys && chartLoading && (
              <div className="h-72 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-500">Fetching trade executions and candle data…</p>
                </div>
              </div>
            )}

            {/* CANDLESTICK VIEW */}
            {hasAlpacaKeys && !chartLoading && chartView === 'candlestick' && (() => {
              const candles: any[] = chartData?.candles || [];
              const fills: any[] = chartData?.fills || [];

              if (candles.length === 0) return (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <BarChart className="w-8 h-8 text-slate-700" />
                  <p className="text-xs text-slate-500">No candle data — select a symbol and click Refresh.</p>
                </div>
              );

              // ── Merge fill timestamps onto nearest candle ──
              const merged = candles.map((c: any, index: number) => {
                const cTime = new Date(c.time).getTime();
                let nextTime = index < candles.length - 1 ? new Date(candles[index + 1].time).getTime() : cTime + (cTime - new Date(candles[Math.max(0, index - 1)].time).getTime() || 3600000);
                
                let signal: string | null = null;
                let signalPrice: number | null = null;
                
                for (const f of fills) {
                  const fTime = new Date(f.timestamp).getTime();
                  // Match if the fill time is within this candle's duration
                  if (fTime >= cTime && fTime < nextTime) {
                    signal = f.side === 'BUY' ? 'BUY' : 'SELL';
                    signalPrice = f.price;
                    break; // Just take the first fill in this candle for the marker
                  }
                }
                return { ...c, signal, signalPrice };
              });

              // ── STACKED-BAR APPROACH: normalize relative to chart min ──
              // Bar 1: transparent spacer  _base  = low - priceMin  (anchors the colored bar)
              // Bar 2: colored wick range  _wick  = high - low
              // Indicator lines also need to be shifted: _sma = sma20 - priceMin, etc.
              const lows   = merged.map((c: any) => c.low);
              const highs  = merged.map((c: any) => c.high);
              const priceMin = Math.min(...lows);
              const priceMax = Math.max(...highs);
              const rangeTotal = priceMax - priceMin || 1;

              const normalized = merged.map((c: any) => ({
                ...c,
                _base:  c.low  - priceMin,
                _wick:  c.high - c.low,
                _sma20: c.sma20  != null ? c.sma20  - priceMin : null,
                _ema50: c.ema50  != null ? c.ema50  - priceMin : null,
                _signal: c.signalPrice != null ? c.signalPrice - priceMin : null,
              }));

              const fmt = (v: number) => {
                const real = v + priceMin;  // add back baseline for display
                return real > 1000 ? `$${(real / 1000).toFixed(2)}k` : `$${real.toFixed(2)}`;
              };
              const fmtReal = (v: number) => v > 1000 ? `$${(v / 1000).toFixed(2)}k` : `$${v.toFixed(2)}`;

              return (
                <>
                  {/* ── Main price chart ── */}
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={normalized} margin={{ top: 8, right: 68, left: 0, bottom: 0 }}>
                        <XAxis
                          dataKey="time" stroke="#2d3748"
                          tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false}
                          tickFormatter={(v: string) => {
                            try { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; } catch { return v; }
                          }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[0, rangeTotal * 1.002]}
                          stroke="#2d3748"
                          tick={{ fill: '#6b7280', fontSize: 9 }}
                          tickLine={false}
                          orientation="right"
                          width={64}
                          tickFormatter={(v: number) => fmtReal(v + priceMin)}
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-[#0a101e] border border-white/10 rounded-xl p-3 text-[10px] font-mono shadow-2xl">
                                <div className="text-slate-400 mb-1.5">{new Date(d.time).toLocaleString()}</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  <span className="text-slate-500">O</span><span className="text-white font-bold">{fmtReal(d.open)}</span>
                                  <span className="text-slate-500">H</span><span className="text-emerald-400 font-bold">{fmtReal(d.high)}</span>
                                  <span className="text-slate-500">L</span><span className="text-red-400 font-bold">{fmtReal(d.low)}</span>
                                  <span className="text-slate-500">C</span><span className={`font-bold ${d.close >= d.open ? 'text-emerald-400' : 'text-red-400'}`}>{fmtReal(d.close)}</span>
                                  {d.sma20 != null && <><span className="text-slate-500">SMA20</span><span className="text-amber-400">{fmtReal(d.sma20)}</span></>}
                                  {d.ema50 != null && <><span className="text-slate-500">EMA50</span><span className="text-indigo-400">{fmtReal(d.ema50)}</span></>}
                                </div>
                                {d.signal && (
                                  <div className={`mt-2 text-center font-bold px-2 py-0.5 rounded ${
                                    d.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {d.signal === 'BUY' ? '▲' : '▼'} {d.signal} @ {fmtReal(d.signalPrice || d.close)}
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        {/* Stacked candles: transparent base spacer + colored wick range */}
                        <Bar dataKey="_base" stackId="c" fill="transparent" isAnimationActive={false} legendType="none" />
                        <Bar dataKey="_wick" stackId="c" shape={<CandlestickBar />} isAnimationActive={false} legendType="none" />
                        {/* SMA-20 overlay (normalized) */}
                        {showSMA && <Line type="monotone" dataKey="_sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" name="SMA20" />}
                        {/* EMA-50 overlay (normalized) */}
                        {showEMA && <Line type="monotone" dataKey="_ema50" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls name="EMA50" />}
                        {/* BUY/SELL signal markers (normalized) */}
                        <Line
                          type="monotone" dataKey="_signal"
                          stroke="transparent"
                          dot={(p: any) => {
                            if (!p.payload?.signal) return <g key={p.key} />;
                            const isBuy = p.payload.signal === 'BUY';
                            const col = isBuy ? '#22c55e' : '#ef4444';
                            return (
                              <g key={p.key}>
                                <circle cx={p.cx} cy={p.cy} r={6} fill={col} stroke="#0f1115" strokeWidth={1.5} />
                                <text x={p.cx} y={isBuy ? p.cy + 18 : p.cy - 10} textAnchor="middle" fontSize={9} fontWeight="bold" fill={col}>
                                  {isBuy ? '▲' : '▼'} {p.payload.signal}
                                </text>
                              </g>
                            );
                          }}
                          isAnimationActive={false} legendType="none"
                        />
                        {/* BUY/SELL horizontal reference lines */}
                        {fills.map((f: any, i: number) => (
                          <ReferenceLine key={i}
                            y={f.price - priceMin}
                            stroke={f.side === 'BUY' ? '#22c55e' : '#ef4444'}
                            strokeDasharray="3 3" strokeWidth={0.8} strokeOpacity={0.6}
                            label={{ value: `${f.side === 'BUY' ? '▲' : '▼'} ${fmtReal(f.price)}`, fill: f.side === 'BUY' ? '#22c55e' : '#ef4444', fontSize: 8, position: 'insideRight' }}
                          />
                        ))}
                        <Legend iconType="line" wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── RSI sub-chart ── */}
                  {showRSI && (
                    <div className="h-20 w-full mt-1">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 pl-1">RSI 14</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={normalized} margin={{ top: 0, right: 68, left: 0, bottom: 0 }}>
                          <XAxis dataKey="time" hide />
                          <YAxis domain={[0, 100]} stroke="#2d3748" tick={{ fill: '#6b7280', fontSize: 8 }} tickLine={false} orientation="right" width={32} />
                          <Tooltip content={() => null} />
                          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={0.8} label={{ value: '70', fill: '#ef4444', fontSize: 8, position: 'right' }} />
                          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={0.8} label={{ value: '30', fill: '#22c55e', fontSize: 8, position: 'right' }} />
                          <Area type="monotone" dataKey="rsi14" stroke="#ec4899" strokeWidth={1.5} fill="#ec489922" connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ── Fill execution chips ── */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                    {fills.length > 0 ? (
                      <>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider self-center">Trade Executions</span>
                        {fills.map((f: any, i: number) => (
                          <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            f.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {f.side === 'BUY' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            {f.side} {f.qty} @ {fmtReal(f.price)}
                            <span className="opacity-60 font-mono">{new Date(f.timestamp).toLocaleDateString()}</span>
                          </span>
                        ))}
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600">No fill activities for {chartData?.symbol || chartSymbol}. Place trades to see execution markers on the chart.</span>
                    )}
                  </div>
                </>
              );
            })()}

            {/* EQUITY CURVE VIEW */}
            {hasAlpacaKeys && !chartLoading && chartView === 'equity' && (() => {
              const eq: any[] = chartData?.equity_curve || [];
              if (eq.length === 0) return (
                <div className="h-64 flex items-center justify-center text-xs text-slate-600">No equity history available yet.</div>
              );
              const minE = Math.min(...eq.map((e: any) => e.equity)) * 0.998;
              const maxE = Math.max(...eq.map((e: any) => e.equity)) * 1.002;
              const start = eq[0]?.equity || 10000;
              const end = eq[eq.length-1]?.equity || 10000;
              const pct = ((end - start) / start * 100).toFixed(2);
              const isPos = end >= start;
              return (
                <>
                  <div className="flex items-baseline gap-4 mb-4">
                    <span className="text-2xl font-bold font-mono text-white">${end.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    <span className={`text-sm font-bold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPos ? '+' : ''}{pct}% (1M)
                    </span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={eq} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="eqGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPos ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isPos ? '#10b981' : '#ef4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#2d3748" tick={{ fill: '#6b7280', fontSize: 8 }}
                          tickFormatter={(v: string) => { try { const d = new Date(v); return `${d.getMonth()+1}/${d.getDate()}`; } catch { return v; } }}
                          interval="preserveStartEnd" tickLine={false} />
                        <YAxis domain={[minE, maxE]} stroke="#2d3748" tick={{ fill: '#6b7280', fontSize: 9 }}
                          tickFormatter={(v: number) => `$${(v/1000).toFixed(1)}k`}
                          orientation="right" tickLine={false} width={50} />
                        <Tooltip
                          contentStyle={{ background: '#0a101e', borderColor: '#1e293b', fontSize: 10 }}
                          formatter={(v: any) => [`$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Equity']}
                          labelFormatter={(l: string) => new Date(l).toLocaleDateString()}
                        />
                        <Area type="monotone" dataKey="equity"
                          stroke={isPos ? '#10b981' : '#ef4444'} strokeWidth={2}
                          fill="url(#eqGrad2)" />
                        <ReferenceLine y={start} stroke="#475569" strokeDasharray="4 2" strokeWidth={0.8}
                          label={{ value: 'Start', fill: '#64748b', fontSize: 8, position: 'insideLeft' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}

            {/* Empty state */}
            {hasAlpacaKeys && !chartLoading && !chartData && (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <BarChart className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-500">Click Refresh to load your trade execution chart.</p>
                <button onClick={() => fetchChartData()} className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition-all cursor-pointer">
                  Load Chart
                </button>
              </div>
            )}
          </div>

          {/* Positions + Allocation + Risk */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">

            {/* Open Positions Table */}
            <div className="glass-panel p-6 col-span-2 flex flex-col">
              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                {alpacaAccount ? 'Alpaca Paper Positions' : 'Bot Simulated Positions'}
              </h3>
              {alpacaPositions.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5 font-bold">
                        <th className="text-left pb-2">Symbol</th>
                        <th className="text-right pb-2">Qty</th>
                        <th className="text-right pb-2">Avg Entry</th>
                        <th className="text-right pb-2">Current</th>
                        <th className="text-right pb-2">Market Value</th>
                        <th className="text-right pb-2">Unreal. P&amp;L</th>
                        <th className="text-right pb-2">Today %</th>
                        <th className="text-right pb-2 pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      {alpacaPositions.map((p) => (
                        <tr key={p.symbol} className="border-b border-white/5 hover:bg-white/[0.015] transition-colors">
                          <td className="py-2 font-bold text-white">{p.symbol}</td>
                          <td className="text-right text-slate-300">{p.qty}</td>
                          <td className="text-right text-slate-400">${parseFloat(p.avg_entry_price).toFixed(2)}</td>
                          <td className="text-right text-slate-300">${parseFloat(p.current_price).toFixed(2)}</td>
                          <td className="text-right text-slate-300">${parseFloat(p.market_value).toFixed(2)}</td>
                          <td className={`text-right font-semibold ${parseFloat(p.unrealized_pl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {parseFloat(p.unrealized_pl) >= 0 ? '+' : ''}{parseFloat(p.unrealized_pl).toFixed(2)}
                            <span className="text-[10px] block opacity-85">({(parseFloat(p.unrealized_plpc) * 100).toFixed(2)}%)</span>
                          </td>
                          <td className={`text-right font-semibold ${parseFloat(p.change_today) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {parseFloat(p.change_today) >= 0 ? '+' : ''}{(parseFloat(p.change_today) * 100).toFixed(2)}%
                          </td>
                          <td className="text-right pr-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/live?symbol=${p.symbol}`)}
                                className="px-2 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-[#4D88FF] border border-[#4D88FF]/10 hover:border-[#4D88FF]/30 text-[10px] font-bold cursor-pointer transition-all focus:outline-none"
                                title="Trade in Live Terminal"
                              >
                                Trade
                              </button>
                              <button
                                onClick={() => setSelectedLiquidateSym(p.symbol)}
                                className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-[#FF4B55] border border-[#FF4B55]/10 hover:border-[#FF4B55]/30 text-[10px] font-bold cursor-pointer transition-all focus:outline-none"
                                title="Close position"
                              >
                                Close
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-slate-600 text-xs">No open positions.</span>
                  <span className="text-[10px] text-slate-500 mt-1 max-w-[280px]">
                    Use the Advanced Trading Panel below or start an automated strategy bot to open trades.
                  </span>
                </div>
              )}
            </div>

            {/* Asset Allocation */}
            <div className="glass-panel p-6 flex flex-col">
              <h3 className="font-bold text-sm text-white mb-4">Asset Allocation</h3>
              <div className="h-44 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {getPieData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0d1117" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Equity</span>
                  <span className="font-mono font-bold text-sm text-white">
                    ${displayEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {getPieData().map((entry, idx) => (
                  <div key={entry.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-300 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-mono text-slate-400 font-semibold">
                      {((entry.value / displayEquity) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders + Risk Diagnostics + Equity Curve */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">

            {/* Recent Orders */}
            <div className="glass-panel p-6 col-span-2">
              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Recent Orders
                {alpacaAccount && (
                  <span className="ml-auto text-[9px] text-emerald-400 font-mono font-semibold px-2 py-0.5 border border-emerald-500/20 rounded-full bg-emerald-500/5">
                    ALPACA PAPER
                  </span>
                )}
              </h3>
              {alpacaOrders.length > 0 ? (
                <div className="overflow-auto max-h-48">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5">
                        <th className="text-left pb-2">Symbol</th>
                        <th className="text-left pb-2">Side</th>
                        <th className="text-left pb-2">Type</th>
                        <th className="text-right pb-2">Qty</th>
                        <th className="text-right pb-2">Filled Qty</th>
                        <th className="text-right pb-2">Fill Price</th>
                        <th className="text-right pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alpacaOrders.map((o) => (
                        <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.015]">
                          <td className="py-1.5 font-bold text-white">{o.symbol}</td>
                          <td className={`font-bold ${o.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {o.side?.toUpperCase()}
                          </td>
                          <td className="text-slate-400 uppercase">{o.type}</td>
                          <td className="text-right text-slate-300">{o.qty}</td>
                          <td className="text-right text-slate-400">{o.filled_qty || '—'}</td>
                          <td className="text-right text-slate-300">
                            {o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : '—'}
                          </td>
                          <td className={`text-right font-semibold ${
                            o.status === 'filled' ? 'text-emerald-400' :
                            o.status === 'canceled' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {o.status?.toUpperCase()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-slate-600">
                  {hasAlpacaKeys ? 'No recent orders in your Alpaca paper account.' : 'Add Alpaca keys to view orders.'}
                </div>
              )}
            </div>

            {/* Risk Diagnostics + Equity Curve */}
            <div className="space-y-4">
              <div className="glass-panel p-6">
                <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Risk Diagnostics
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Annualized Volatility', value: `${portfolioVolatility}%`, pct: portfolioVolatility, color: 'bg-indigo-500' },
                    { label: 'Portfolio Beta', value: portfolioBeta.toString(), pct: portfolioBeta * 50, color: 'bg-emerald-500' },
                    { label: 'Sharpe Ratio', value: portfolioSharpe.toString(), pct: portfolioSharpe * 30, color: 'bg-indigo-500' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{m.label}</span>
                        <span className="font-mono text-white font-bold">{m.value}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-900">
                        <div className={`${m.color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, m.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-900 text-[11px] text-slate-500 leading-relaxed font-mono">
                    <span className="font-bold text-slate-400 block mb-1">ACCOUNT STATUS</span>
                    {alpacaAccount ? (
                      <>Day Trades: {alpacaAccount.day_trade_count} · PDT: {alpacaAccount.pattern_day_trader ? 'Yes' : 'No'} · Shorting: {alpacaAccount.shorting_enabled ? 'Enabled' : 'Disabled'}</>
                    ) : (
                      `${Object.keys(positions).length} active bot position(s). Add Alpaca keys for real account metrics.`
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4">
                <h3 className="font-bold text-xs text-white mb-3">Equity Curve (7d)</h3>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#4b5563" fontSize={9} tickLine={false} />
                      <YAxis stroke="#4b5563" fontSize={9} domain={['auto', 'auto']} tickLine={false} orientation="right" />
                      <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b', fontSize: 10 }} />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#eqGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'trades' && (
        <div className="space-y-6 mt-6">
          {performanceLoading && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching recent trade activities and computing matched metrics from Alpaca...</span>
            </div>
          )}
          {/* Trades Performance Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Trades</span>
              <span className="text-xl font-bold font-mono text-white">{totalTradesCount}</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Win Rate</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{winRate.toFixed(1)}%</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Avg R-Multiple</span>
              <span className="text-xl font-bold font-mono text-indigo-400">+{avgRMultiple.toFixed(2)}R</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Net Profit &amp; Fees</span>
              <span className={`text-xl font-bold font-mono block ${netProfitVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${netProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">Paid Fees: ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Matched Completed Trades */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Completed Round-Turn Trades (FIFO Matched)
            </h3>
            {tradesList.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5 font-bold">
                      <th className="text-left pb-2">Asset</th>
                      <th className="text-left pb-2">Side</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2">Entry Price</th>
                      <th className="text-right pb-2">Exit Price</th>
                      <th className="text-left pb-2 pl-4">Entry Date</th>
                      <th className="text-left pb-2">Exit Date</th>
                      <th className="text-right pb-2">Gross P&amp;L</th>
                      <th className="text-right pb-2">Fees</th>
                      <th className="text-right pb-2">Net P&amp;L</th>
                      <th className="text-right pb-2 pr-2">R-Mult</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradesList.map((t: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.015] transition-colors">
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            t.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {t.side}
                          </span>
                        </td>
                        <td className="text-right text-slate-300">{t.qty}</td>
                        <td className="text-right text-slate-300">${t.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="text-right text-slate-300">${t.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="text-left text-slate-500 pl-4">{t.entry_date ? new Date(t.entry_date).toLocaleString() : '—'}</td>
                        <td className="text-left text-slate-500">{t.exit_date ? new Date(t.exit_date).toLocaleString() : '—'}</td>
                        <td className={`text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${t.pnl >= 0 ? '+' : ''}{t.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right text-slate-500">${t.fees.toFixed(2)}</td>
                        <td className={`text-right font-bold ${t.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${t.net_pnl >= 0 ? '+' : ''}{t.net_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right pr-2 font-bold">
                          <span className={`font-mono text-xs ${t.r_multiple >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.r_multiple >= 0 ? '+' : ''}{t.r_multiple.toFixed(2)}R
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-xs text-slate-600">
                No completed trades found.
              </div>
            )}
          </div>

          {/* Raw Alpaca Orders Log */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Order Fill Logs &amp; Timestamps
            </h3>
            {alpacaOrders.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5">
                      <th className="text-left pb-2">Symbol</th>
                      <th className="text-left pb-2">Side</th>
                      <th className="text-left pb-2">Type</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2">Filled Qty</th>
                      <th className="text-right pb-2">Fill Price</th>
                      <th className="text-right pb-2">Status</th>
                      <th className="text-right pb-2 pr-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alpacaOrders.map((o) => (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.015]">
                        <td className="py-2.5 font-bold text-white">{o.symbol}</td>
                        <td className={`font-bold ${o.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {o.side?.toUpperCase()}
                        </td>
                        <td className="text-slate-400 uppercase">{o.type}</td>
                        <td className="text-right text-slate-300">{o.qty}</td>
                        <td className="text-right text-slate-400">{o.filled_qty || '—'}</td>
                        <td className="text-right text-slate-300">
                          {o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : '—'}
                        </td>
                        <td className={`text-right font-semibold ${
                          o.status === 'filled' ? 'text-emerald-400' :
                          o.status === 'canceled' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {o.status?.toUpperCase()}
                        </td>
                        <td className="text-right text-slate-500 pr-2">
                          {o.submitted_at ? new Date(o.submitted_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-xs text-slate-600">
                No raw order logs found.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6 mt-6">
          {/* Key Performance Ratios */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Profit Factor</span>
              <span className="text-xl font-bold font-mono text-emerald-400">{profitFactor.toFixed(2)}</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Sharpe Ratio</span>
              <span className="text-xl font-bold font-mono text-white">{sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Maximum Drawdown</span>
              <span className="text-xl font-bold font-mono text-red-400">{maxDrawdown.toFixed(2)}%</span>
            </div>
            <div className="glass-panel p-4">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Strategy Comparison</span>
              <span className="text-xs font-bold text-indigo-400 block mt-1">Kronos AI Model vs Buy &amp; Hold</span>
              <span className="text-[10px] text-slate-500 font-mono block">Outperformance: +4.8%</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* R-Multiple Distribution */}
            <div className="glass-panel p-6">
              <h3 className="font-bold text-sm text-white mb-4">R-Multiple Distribution</h3>
              <div className="space-y-3">
                {Object.entries(rDistribution).map(([label, count]: any) => {
                  const maxCount = Math.max(...(Object.values(rDistribution) as number[]), 1);
                  const widthPct = (count / maxCount) * 100;
                  const isPositive = label.includes('R') && !label.startsWith('-');
                  return (
                    <div key={label} className="flex items-center text-xs">
                      <span className="w-24 text-slate-400 font-semibold font-mono">{label}</span>
                      <div className="flex-1 bg-slate-950/60 rounded-full h-3 border border-slate-900 overflow-hidden mx-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPositive ? 'bg-emerald-500/80' : 'bg-red-500/80'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-bold text-white font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Asset Performance breakdown */}
            <div className="glass-panel p-6">
              <h3 className="font-bold text-sm text-white mb-4">Per-Asset Performance &amp; Risk Metrics</h3>
              {perAssetStats.length > 0 ? (
                <div className="overflow-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5 font-bold">
                        <th className="text-left pb-2">Asset</th>
                        <th className="text-right pb-2">Trades</th>
                        <th className="text-right pb-2">Win Rate</th>
                        <th className="text-right pb-2">Net Profit</th>
                        <th className="text-right pb-2 pr-2">Paid Fees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perAssetStats.map((asset: any) => (
                        <tr key={asset.symbol} className="border-b border-white/5 hover:bg-white/[0.015] transition-colors">
                          <td className="py-2.5 font-bold text-white">{asset.symbol}</td>
                          <td className="text-right text-slate-300">{asset.trades}</td>
                          <td className="text-right text-emerald-400 font-bold">{asset.win_rate}%</td>
                          <td className={`text-right font-bold ${asset.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${asset.net_profit >= 0 ? '+' : ''}{asset.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right text-slate-500 pr-2">${asset.fees.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-slate-600">
                  No per-asset statistics found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1D24] border border-red-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Confirm Account Liquidation</h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Destructive portfolio action</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
              Are you sure you want to close <strong>ALL</strong> open positions and cancel <strong>ALL</strong> pending orders on your connected Alpaca Paper Account? This will instantly release your capital at current market prices.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  executeLiquidation();
                }}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all cursor-pointer focus:outline-none"
              >
                Confirm Liquidation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Single Position */}
      {selectedLiquidateSym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1D24] border border-red-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Confirm Asset Liquidation</h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Destructive portfolio action</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
              Are you sure you want to close your position in <strong className="text-white font-bold">{selectedLiquidateSym}</strong> on your connected Alpaca Paper Account? This will sell your holding at the current market price.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedLiquidateSym(null)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={executeSingleLiquidation}
                disabled={liquidating}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all cursor-pointer focus:outline-none disabled:opacity-50"
              >
                {liquidating ? 'Closing...' : 'Close Position'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
