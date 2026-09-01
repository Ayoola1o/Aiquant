import { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Info, 
  Download, 
  ArrowRight, 
  RefreshCw,
  X,
  Shield
} from 'lucide-react';

interface PortfolioProps {
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
}

// Mini Sparkline component for KPI cards
const MiniSparkline = ({ data, color, width = 55, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Radial Gauge Component for Risk Exposure
const RadialRiskGauge = ({ percentage = 38 }: { percentage: number }) => {
  const strokeWidth = 10;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center">
        <span className="text-xl font-black text-white font-mono">{percentage}%</span>
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">MODERATE</span>
      </div>
    </div>
  );
};

export default function Portfolio({
  alpacaKeyId = '',
  alpacaSecretKey = ''
}: PortfolioProps) {
  const [timeRange, setTimeRange] = useState('1D');
  const [posTab, setPosTab] = useState<'Positions' | 'Exposure'>('Positions');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isAlpacaConnected, setIsAlpacaConnected] = useState(false);
  const [dailyPnl, setDailyPnl] = useState(0.0);
  const [dailyPnlPct, setDailyPnlPct] = useState(0.0);
  const [alpacaError, setAlpacaError] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Portfolio Totals State
  const [equity, setEquity] = useState(0.0);
  const [cash, setCash] = useState(0.0);
  const [buyingPower, setBuyingPower] = useState(0.0);
  const [totalPnl, setTotalPnl] = useState(0.0);

  // Equity Curve Timeline
  const equityHistory = [
    { date: 'Aug 15', val: 98000 },
    { date: 'Aug 16', val: 104000 },
    { date: 'Aug 17', val: 101000 },
    { date: 'Aug 18', val: 112000 },
    { date: 'Aug 19', val: 119000 },
    { date: 'Aug 20', val: 122000 },
    { date: 'Aug 21', val: 128450.75 }
  ];

  // Positions Data
  const [positions, setPositions] = useState<any[]>([]);

  const fetchBotsFallback = async () => {
    try {
      const botsRes = await fetch('/api/live/bots');
      if (botsRes.ok) {
        const botsData = await botsRes.json();
        const allBots = Object.values(botsData.bots || {}) as any[];
        if (allBots.length > 0) {
          const sumEquity = allBots.reduce((acc, b) => acc + (b.portfolio_value || b.starting_cash || 10000), 0);
          const sumPnl = allBots.reduce((acc, b) => acc + (b.pnl || 0), 0);
          setEquity(sumEquity);
          setTotalPnl(sumPnl);
        }
      }
    } catch {}
  };

  // Fetch live Alpaca account if configured or sync from bots
  const fetchLivePortfolio = async () => {
    setIsLoading(true);
    setAlpacaError(null);

    const effectiveKeyId = alpacaKeyId || localStorage.getItem('neuroquant_alpaca_key_id') || '';
    const effectiveSecretKey = alpacaSecretKey || localStorage.getItem('neuroquant_alpaca_secret_key') || '';

    try {
      if (effectiveKeyId && effectiveSecretKey) {
        const res = await fetch('/api/alpaca/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alpaca_key_id: effectiveKeyId,
            alpaca_secret_key: effectiveSecretKey
          })
        });

        if (res.ok) {
          const data = await res.json();
          setIsAlpacaConnected(true);
          if (data.account) {
            setAccountDetails(data.account);
            const currentEq = parseFloat(data.account.equity) || 0;
            const lastEq = parseFloat(data.account.last_equity) || currentEq;
            const dayPl = currentEq - lastEq;
            const dayPlPct = lastEq > 0 ? (dayPl / lastEq) * 100 : 0;

            setEquity(currentEq);
            setCash(parseFloat(data.account.cash) || 0);
            setBuyingPower(parseFloat(data.account.buying_power) || 0);
            setDailyPnl(dayPl);
            setDailyPnlPct(dayPlPct);
          }
          if (data.orders && Array.isArray(data.orders)) {
            setRecentOrders(data.orders);
          }
          if (data.positions && Array.isArray(data.positions)) {
            const totalPosPl = data.positions.reduce((sum: number, p: any) => sum + (parseFloat(p.unrealized_pl) || 0), 0);
            setTotalPnl(totalPosPl);

            if (data.positions.length > 0) {
              const totalEq = data.account?.equity || 1;
              setPositions(data.positions.map((p: any) => {
                const qty = parseFloat(p.qty) || 0;
                const entry = parseFloat(p.avg_entry_price) || 0;
                const mark = parseFloat(p.current_price) || entry;
                const mktVal = parseFloat(p.market_value) || (qty * mark);
                const pl = parseFloat(p.unrealized_pl) || 0;
                const plpc = parseFloat(p.unrealized_plpc) || 0;
                const alloc = totalEq > 0 ? (mktVal / totalEq) * 100 : 0;

                return {
                  asset: p.symbol,
                  icon: p.symbol.substring(0, 4),
                  type: (p.symbol.includes('USD') || p.symbol.includes('USDT')) ? 'Crypto' : 'Equity',
                  size: `${qty.toLocaleString()} ${p.symbol}`,
                  entry: entry,
                  mark: mark,
                  pnl: pl,
                  pnlPct: plpc * 100,
                  dir: (p.side?.toUpperCase() === 'SHORT' || qty < 0) ? 'SHORT' : 'LONG',
                  alloc: parseFloat(alloc.toFixed(2))
                };
              }));
            } else {
              setPositions([]);
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setAlpacaError(errData.detail || 'Alpaca account query returned error.');
          setIsAlpacaConnected(false);
          await fetchBotsFallback();
        }
      } else {
        setIsAlpacaConnected(false);
        await fetchBotsFallback();
      }
    } catch (err) {
      console.warn("Portfolio live sync error:", err);
      setAlpacaError("Network error communicating with Alpaca backend.");
      await fetchBotsFallback();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePortfolio();
  }, [alpacaKeyId, alpacaSecretKey]);

  // Liquidate specific position
  const handleLiquidate = async (symbol: string) => {
    if (!window.confirm(`Liquidate and close position for ${symbol}?`)) return;

    if (alpacaKeyId && alpacaSecretKey) {
      try {
        const res = await fetch(`/api/alpaca/liquidate/${symbol}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alpaca_key_id: alpacaKeyId,
            alpaca_secret_key: alpacaSecretKey
          })
        });
        if (res.ok) {
          setActionMessage(`Position ${symbol} liquidated successfully.`);
          fetchLivePortfolio();
        } else {
          setActionMessage(`Failed to liquidate ${symbol}.`);
        }
      } catch (e) {
        setActionMessage(`Network error liquidating ${symbol}.`);
      }
    } else {
      setPositions(prev => prev.filter(p => p.asset !== symbol));
      setActionMessage(`Position ${symbol} closed.`);
    }

    setTimeout(() => setActionMessage(null), 4000);
  };

  const exportPortfolioCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Asset,Type,Size,Entry,Mark,PnL,PnL_Pct,Allocation"]
      .concat(positions.map(p => `${p.asset},${p.type},${p.size},${p.entry},${p.mark},${p.pnl},${p.pnlPct},${p.alloc}`))
      .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `portfolio_overview_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-200">
      
      {/* Top Controls Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Portfolio Overview
            </h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
              isAlpacaConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isAlpacaConnected ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
              <span>{isAlpacaConnected ? 'Alpaca Paper Live' : 'Sandbox Fleet'}</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            Real-time multi-asset portfolio accounting, risk parameters and live Alpaca paper execution.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchLivePortfolio}
            className="p-2 rounded-xl bg-[#0c101d] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Sync</span>
          </button>

          <div className="flex bg-[#0c101d] p-1 rounded-xl border border-white/5 text-xs">
            {(['1D', '7D', '30D', '90D', 'YTD', 'ALL'] as const).map(tr => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                  timeRange === tr ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tr}
              </button>
            ))}
          </div>

          <button 
            onClick={exportPortfolioCSV}
            className="p-2 rounded-xl bg-[#0c101d] border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer" 
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alpacaError && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
          <span>⚠️ {alpacaError}</span>
          <button onClick={() => setAlpacaError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {actionMessage && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between animate-fadeIn">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 1. TOP 5 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Equity */}
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">TOTAL EQUITY</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white tracking-tight">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-semibold">USD</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[9px] text-slate-500 font-semibold uppercase">24H CHANGE</div>
              <div className={`text-xs font-bold ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-medium">({dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%)</span>
              </div>
            </div>
            <MiniSparkline color={dailyPnl >= 0 ? "#10B981" : "#F43F5E"} data={[30, 35, 42, 48, 55, 65]} width={55} height={20} />
          </div>
        </div>

        {/* Total P&L */}
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">UNREALIZED P&L</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="my-2">
            <div className={`text-2xl font-black tracking-tight ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">STATUS</span>
              <span className="font-bold text-slate-200">{isAlpacaConnected ? 'Live Paper' : 'Local'}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">DAILY P&L</span>
              <span className={`font-bold ${dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dailyPnl >= 0 ? '+' : ''}${dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Available Balance */}
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">AVAILABLE BALANCE</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white tracking-tight">
              ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">CASH</span>
              <span className="font-bold text-slate-200">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">UNREALIZED PNL</span>
              <span className={`font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Buying Power */}
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">BUYING POWER</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white tracking-tight">
              ${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">MARGIN USED</span>
              <span className="font-bold text-slate-200">
                ${equity > cash ? (equity - cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">LEVERAGE</span>
              <span className="font-bold text-slate-200 font-mono">
                {cash > 0 ? (equity / cash).toFixed(2) : '1.00'}x
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase text-[10px] tracking-wider">PORTFOLIO VALUE</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-white tracking-tight">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[9px] text-slate-500 font-semibold uppercase">TOTAL RETURN</div>
              <div className={`text-xs font-bold ${dailyPnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dailyPnlPct >= 0 ? '+' : ''}{dailyPnlPct.toFixed(2)}%
              </div>
            </div>
            <MiniSparkline color="#A855F7" data={[20, 25, 38, 42, 50, 60]} width={55} height={20} />
          </div>
        </div>

      </div>

      {/* 2. MIDDLE ROW: EQUITY CURVE + ASSET ALLOCATION + RISK EXPOSURE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Equity Curve (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">EQUITY CURVE</h3>
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityHistory}>
                  <defs>
                    <linearGradient id="portEqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} orientation="left" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d19', borderColor: '#334155', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="val" stroke="#818CF8" strokeWidth={2.5} fill="url(#portEqGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Asset Allocation (3 cols) */}
        <div className="lg:col-span-3 glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">ASSET ALLOCATION</h3>
              <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="h-[180px] w-full flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={positions.length > 0 ? positions.map(p => ({ name: p.asset, value: p.alloc })) : [{ name: 'Cash', value: 100 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(positions.length > 0 ? positions : [{ name: 'Cash', value: 100 }]).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366F1', '#10B981', '#F59E0B', '#A855F7', '#EC4899', '#06B6D4'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px] font-mono">
              {positions.length > 0 ? (
                positions.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ['#6366F1', '#10B981', '#F59E0B'][idx % 3] }} />
                      <span className="text-white font-semibold truncate">{p.asset}</span>
                    </div>
                    <span>{p.alloc}%</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-white font-semibold">Liquid Cash</span>
                  </div>
                  <span>100.0%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Risk Exposure (3 cols) */}
        <div className="lg:col-span-3 glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">RISK EXPOSURE</h3>
              <Info className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="flex flex-col items-center justify-center my-2">
              <RadialRiskGauge percentage={38} />
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span className="text-[11px]">VALUE AT RISK (95%)</span>
                <span className="text-white font-bold">$4,215.30</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="text-[11px]">EXPECTED SHORTFALL</span>
                <span className="text-white font-bold">$2,150.45</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="text-[11px]">MAX DRAWDOWN</span>
                <span className="text-rose-400 font-bold">12.34%</span>
              </div>
            </div>
          </div>

          <button className="w-full mt-4 py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 border-t border-white/5 pt-3">
            View Risk Report <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* 3. LOWER SECTION: POSITIONS TABLE (7 cols) + PERFORMANCE MATRIX (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Positions Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">POSITIONS ({positions.length})</h3>
                <div className="flex bg-[#0c101d] p-0.5 rounded-lg border border-white/5 text-[10px]">
                  <button onClick={() => setPosTab('Positions')} className={`px-2.5 py-1 rounded-md font-bold ${posTab === 'Positions' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Positions</button>
                  <button onClick={() => setPosTab('Exposure')} className={`px-2.5 py-1 rounded-md font-bold ${posTab === 'Exposure' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Exposure</button>
                </div>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-white/5">
              <div className="col-span-3">ASSET</div>
              <div className="col-span-1">TYPE</div>
              <div className="col-span-2">SIZE</div>
              <div className="col-span-2 text-right">ENTRY</div>
              <div className="col-span-2 text-right">UNREALIZED PNL</div>
              <div className="col-span-2 text-right">ACTION</div>
            </div>

            {/* Position Rows */}
            <div className="divide-y divide-white/5">
              {positions.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-white">No Open Positions</div>
                  <div className="text-[11px] text-slate-400 max-w-xs">
                    All capital is liquid and ready to trade (${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available cash).
                  </div>
                </div>
              ) : (
                positions.map((pos, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center py-3 text-xs hover:bg-white/[0.02] transition-colors">
                    <div className="col-span-3 flex items-center gap-2 min-w-0 pr-1">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-indigo-300 shrink-0">
                        {pos.icon.slice(0, 2)}
                      </div>
                      <span className="font-bold text-white text-xs truncate">{pos.asset}</span>
                    </div>
                    <div className="col-span-1 text-[10px] text-slate-400 font-mono">{pos.type}</div>
                    <div className="col-span-2 text-[11px] text-slate-300 font-mono truncate">{pos.size}</div>
                    <div className="col-span-2 text-right font-mono text-xs text-slate-300">${pos.entry.toLocaleString()}</div>
                    <div className={`col-span-2 text-right font-mono font-bold text-xs ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">({pos.pnlPct.toFixed(2)}%)</span>
                    </div>
                    <div className="col-span-2 text-right pl-2">
                      <button 
                        onClick={() => handleLiquidate(pos.asset)}
                        className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Performance Matrix (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">PERFORMANCE</h3>
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            {/* 6 KPI Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">WIN RATE</span>
                <span className="text-base font-extrabold text-white">64.82%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">PROFIT FACTOR</span>
                <span className="text-base font-extrabold text-white">2.48</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">SHARPE RATIO</span>
                <span className="text-base font-extrabold text-white">2.48</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">SORTINO RATIO</span>
                <span className="text-base font-extrabold text-white">3.61</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">CALMAR RATIO</span>
                <span className="text-base font-extrabold text-white">2.21</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c101d] border border-white/5">
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">AVG TRADE</span>
                <span className="text-base font-extrabold text-white">$178.34</span>
              </div>
            </div>

            {/* Monthly Returns Histogram */}
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase mb-2">MONTHLY RETURNS (%)</div>
              <div className="flex items-end justify-between h-20 px-2 pt-2 bg-[#0c101d] border border-white/5 rounded-xl">
                {[
                  { m: 'Jan', val: 20, up: true },
                  { m: 'Feb', val: 8, up: true },
                  { m: 'Mar', val: 10, up: true },
                  { m: 'Apr', val: 10, up: false },
                  { m: 'May', val: 5, up: true },
                  { m: 'Jun', val: 8, up: true },
                  { m: 'Jul', val: 12, up: true },
                  { m: 'Aug', val: 8, up: false }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                    <div 
                      className={`w-4 rounded-t ${item.up ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ height: `${item.val * 2.5}px` }}
                    />
                    <span className="text-[9px] text-slate-500 font-mono">{item.m}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 4. RECENT ORDERS & EXECUTIONS (ALPACA PAPER) */}
      <div className="glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">RECENT TRADES &amp; EXECUTIONS</h3>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold">
              {recentOrders.length} Orders
            </span>
          </div>

          {accountDetails && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Account: <strong className="text-white">{accountDetails.account_number || accountDetails.id}</strong></span>
              <span>•</span>
              <span>Day Trades: <strong className="text-white">{accountDetails.day_trade_count || 0}/3</strong></span>
              <span>•</span>
              <span>PDT: <strong className={accountDetails.pattern_day_trader ? 'text-amber-400' : 'text-emerald-400'}>{accountDetails.pattern_day_trader ? 'YES' : 'NO'}</strong></span>
            </div>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
            <div className="text-xs font-bold text-slate-300">No Recent Order History</div>
            <div className="text-[11px] text-slate-500">Live order executions and fills from Alpaca Paper will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-white/5 pb-2">
                  <th className="py-2">SYMBOL</th>
                  <th className="py-2">SIDE</th>
                  <th className="py-2">TYPE</th>
                  <th className="py-2 text-right">QTY / FILLED</th>
                  <th className="py-2 text-right">AVG FILL PRICE</th>
                  <th className="py-2 text-center">STATUS</th>
                  <th className="py-2 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {recentOrders.slice(0, 15).map((ord: any, idx: number) => {
                  const isBuy = ord.side?.toLowerCase() === 'buy';
                  const isFilled = ord.status?.toLowerCase() === 'filled';
                  const isCanceled = ord.status?.toLowerCase() === 'canceled' || ord.status?.toLowerCase() === 'cancelled';
                  
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {ord.symbol}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {ord.side?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-400 uppercase">{ord.type}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-200">
                        {ord.filled_qty ? `${ord.filled_qty} / ` : ''}{ord.qty}
                      </td>
                      <td className="py-2.5 text-right text-slate-200 font-semibold">
                        {ord.filled_avg_price ? `$${Number(ord.filled_avg_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isFilled 
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                            : isCanceled 
                            ? 'bg-slate-800 text-slate-400' 
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                        }`}>
                          {ord.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[11px] text-slate-500">
                        {ord.submitted_at || ord.created_at ? new Date(ord.submitted_at || ord.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
