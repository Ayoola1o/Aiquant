import { useState, useEffect } from 'react';
import { 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Play, 
  Download, 
  AlertCircle
} from 'lucide-react';

interface BacktesterProps {
  strategies?: Array<{ id: string; name: string; code: string }>;
  selectedStrategyId?: string;
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
}

export default function Backtester({
  strategies = [],
  selectedStrategyId = '',
  alpacaKeyId = '',
  alpacaSecretKey = ''
}: BacktesterProps) {
  // Strategy selection
  const [selectedStrategyIdLocal, setSelectedStrategyIdLocal] = useState<string>(
    selectedStrategyId || (strategies.length > 0 ? strategies[0].id : 'sample_strat')
  );
  const [selectedPair, setSelectedPair] = useState('BTC-USD');
  const [timeRange, setTimeRange] = useState('6mo');
  const [interval, setInterval] = useState('1d');
  const [startingCapital, setStartingCapital] = useState(100000);
  const [chartTab, setChartTab] = useState<'Equity Curve' | 'Drawdown' | 'Returns' | 'Monthly' | 'Trades'>('Equity Curve');
  
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hasResults, setHasResults] = useState(false);
  const [kpis, setKpis] = useState({
    totalReturnPct: 0, pnl: 0, benchmarkReturnPct: 0, alpha: 0, beta: 0,
    sharpeRatio: 0, sortinoRatio: 0, maxDrawdownPct: 0, winRate: 0,
    profitFactor: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0,
    avgWin: 0, avgLoss: 0, avgHoldDuration: '—'
  });
  const [equityCurveData, setEquityCurveData] = useState<any[]>([]);
  const [drawdownData, setDrawdownData] = useState<any[]>([]);
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);

  // Sync selectedStrategyId
  useEffect(() => {
    if (selectedStrategyId) {
      setSelectedStrategyIdLocal(selectedStrategyId);
    } else if (strategies.length > 0 && !selectedStrategyIdLocal) {
      setSelectedStrategyIdLocal(strategies[0].id);
    }
  }, [selectedStrategyId, strategies]);

  const currentStrategy = strategies.find(s => s.id === selectedStrategyIdLocal) || null;

  // Run Real Backtest against backend POST /api/backtest
  const handleRunBacktest = async () => {
    if (!currentStrategy?.code?.trim()) {
      setErrorMessage('Select or create a strategy before running a backtest.');
      return;
    }
    if (!Number.isFinite(startingCapital) || startingCapital <= 0) {
      setErrorMessage('Starting capital must be a positive number.');
      return;
    }
    setIsRunning(true);
    setErrorMessage(null);
    setHasResults(false);
    setKpis({ totalReturnPct: 0, pnl: 0, benchmarkReturnPct: 0, alpha: 0, beta: 0, sharpeRatio: 0, sortinoRatio: 0, maxDrawdownPct: 0, winRate: 0, profitFactor: 0, totalTrades: 0, winningTrades: 0, losingTrades: 0, avgWin: 0, avgLoss: 0, avgHoldDuration: '—' });
    setEquityCurveData([]); setDrawdownData([]); setTradeLogs([]);

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_code: currentStrategy.code,
          strategy_name: currentStrategy.name,
          ticker: selectedPair,
          period: timeRange,
          interval: interval,
          starting_capital: Number(startingCapital),
          commission_pct: 0.001,
          slippage_pct: 0.0005,
          spread_pct: 0.0002
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const rawKpis = data.kpis || {};
        setHasResults(true);
        setKpis({
          totalReturnPct: Number(rawKpis.pnl_pct) || 0, pnl: Number(rawKpis.pnl) || 0,
          benchmarkReturnPct: Number(rawKpis.benchmark_pnl_pct) || 0, alpha: Number(rawKpis.alpha) || 0,
          beta: Number(rawKpis.beta) || 0, sharpeRatio: Number(rawKpis.sharpe_ratio) || 0,
          sortinoRatio: Number(rawKpis.sortino_ratio) || 0, maxDrawdownPct: Number(rawKpis.max_drawdown_pct) || 0,
          winRate: Number(rawKpis.win_rate) || 0, profitFactor: Number(rawKpis.profit_factor) || 0,
          totalTrades: Number(rawKpis.total_trades) || 0, winningTrades: Number(rawKpis.winning_trades) || 0,
          losingTrades: Number(rawKpis.losing_trades) || 0, avgWin: Number(rawKpis.avg_win) || 0,
          avgLoss: Number(rawKpis.avg_loss) || 0, avgHoldDuration: rawKpis.avg_hold_duration || '—'
        });

        if (data.equity_curve && data.equity_curve.length > 0) {
          setEquityCurveData(data.equity_curve.map((pt: any) => ({
            date: pt.date ? String(pt.date).substring(5, 10) : pt.timestamp,
            strategy: pt.equity,
            benchmark: Number(pt.benchmark_equity) || 0
          })));
        }

        if (data.drawdown_curve && data.drawdown_curve.length > 0) {
          setDrawdownData(data.drawdown_curve.map((pt: any) => ({
            date: pt.date ? String(pt.date).substring(5, 10) : pt.timestamp,
            dd: pt.drawdown_pct
          })));
        }

        if (Array.isArray(data.trades)) {
          setTradeLogs(data.trades.slice(0, 500).map((t: any, idx: number) => ({
            id: idx + 1,
            date: t.exit_time || t.entry_time || '—',
            type: t.side?.toUpperCase() || 'LONG',
            symbol: selectedPair,
            entry: t.entry_price || 0,
            exit: t.exit_price || 0,
            pnl: t.pnl || 0,
            pnlPct: t.pnl_pct || 0,
            reason: t.exit_reason || 'Signal Exit'
          })));
        }
      } else {
        setErrorMessage(data.error || data.detail || 'Backtest failed to execute.');
      }
    } catch (err: any) {
      console.error('Backtest request failed:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Unable to complete backtest. Please retry.');
      setHasResults(false);
    } finally {
      setIsRunning(false);
    }
  };

  const exportTradeCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Date,Type,Symbol,Entry,Exit,PnL,PnL_Pct,Reason"]
      .concat(tradeLogs.map(t => `${t.id},${t.date},${t.type},${t.symbol},${t.entry},${t.exit},${t.pnl},${t.pnlPct},${t.reason}`))
      .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `backtest_${selectedPair}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-200">
      
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Quantitative Backtester
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            Validate algorithmic strategies, optimize parameters and analyze statistical risk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0c101d] border border-white/10 text-xs">
            <span className="text-[10px] text-slate-500 font-semibold">Engine Status</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Protected
            </span>
          </div>

          <button 
            onClick={handleRunBacktest}
            disabled={isRunning || !currentStrategy?.code?.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Simulation...' : 'Run Backtest'}</span>
          </button>

          <button 
            onClick={exportTradeCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0c101d] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {!hasResults && !errorMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          No backtest results yet. Custom strategy execution remains disabled until an isolated execution worker is available.
        </div>
      )}

      {/* ── 1. STRATEGY & CONFIGURATION BAR ───────────────────────── */}
      <div className="glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-xs">
          
          {/* Strategy Selection */}
          <div className="lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">STRATEGY</label>
            <select 
              value={selectedStrategyIdLocal} 
              onChange={(e) => setSelectedStrategyIdLocal(e.target.value)}
              className="w-full bg-[#0c101d] border border-white/10 rounded-xl px-3 py-2 font-bold text-white outline-none focus:border-indigo-500"
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {strategies.length === 0 && (
                <option value="default">Momentum Pro v2.1</option>
              )}
            </select>
          </div>

          {/* Market / Pair */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MARKET / PAIR</label>
            <select 
              value={selectedPair} 
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full bg-[#0c101d] border border-white/10 rounded-xl px-3 py-2 font-bold text-white outline-none focus:border-indigo-500"
            >
              <option value="BTC-USD">BTC/USD (Crypto)</option>
              <option value="ETH-USD">ETH/USD (Crypto)</option>
              <option value="SOL-USD">SOL/USD (Crypto)</option>
              <option value="AAPL">AAPL (Apple Inc.)</option>
              <option value="NVDA">NVDA (NVIDIA Corp.)</option>
              <option value="TSLA">TSLA (Tesla Inc.)</option>
              <option value="SPY">SPY (S&P 500 ETF)</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TIME RANGE</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-[#0c101d] border border-white/10 rounded-xl px-3 py-2 font-bold text-white outline-none focus:border-indigo-500"
            >
              <option value="1mo">1 Month</option>
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CANDLE INTERVAL</label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full bg-[#0c101d] border border-white/10 rounded-xl px-3 py-2 font-bold text-white outline-none focus:border-indigo-500"
            >
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          {/* Capital */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">STARTING CAPITAL</label>
            <input 
              type="number"
              value={startingCapital}
              onChange={(e) => setStartingCapital(Number(e.target.value))}
              className="w-full bg-[#0c101d] border border-white/10 rounded-xl px-3 py-2 font-bold text-white outline-none focus:border-indigo-500"
            />
          </div>

        </div>
      </div>

      {/* ── 2. KEY PERFORMANCE METRICS CARDS ─────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Return</span>
          <div className={`text-xl font-black mt-1 ${kpis.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasResults ? ((kpis.totalReturnPct >= 0 ? '+' : '') + Number(kpis.totalReturnPct).toFixed(2) + '%') : '—'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{hasResults ? ('$' + Number(kpis.pnl).toLocaleString()) : '—'}</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sharpe Ratio</span>
          <div className="text-xl font-black text-white mt-1">
            {hasResults ? Number(kpis.sharpeRatio).toFixed(2) : '—'}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Sortino: {hasResults ? Number(kpis.sortinoRatio).toFixed(2) : '—'}</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Max Drawdown</span>
          <div className="text-xl font-black text-rose-400 mt-1">
            {hasResults ? '-' + Number(kpis.maxDrawdownPct).toFixed(2) + '%' : '—'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Historical peak-to-trough</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Win Rate</span>
          <div className="text-xl font-black text-white mt-1">
            {hasResults ? Number(kpis.winRate).toFixed(1) + '%' : '—'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{hasResults ? kpis.winningTrades + 'W / ' + kpis.losingTrades + 'L' : '—'}</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Profit Factor</span>
          <div className="text-xl font-black text-indigo-400 mt-1">
            {hasResults ? Number(kpis.profitFactor).toFixed(2) : '—'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Gross Gain / Loss</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Trades</span>
          <div className="text-xl font-black text-white mt-1">
            {hasResults ? kpis.totalTrades : '—'}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Avg hold: {hasResults ? kpis.avgHoldDuration : '—'}</span>
        </div>

      </div>

      {/* ── 3. PERFORMANCE CHARTS & TRADE TABLE ─────────────────────── */}
      <div className="glass-panel p-6 bg-[#090d19]/90 border border-white/5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2">
            {(['Equity Curve', 'Drawdown', 'Trades'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setChartTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white bg-[#0c101d]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {selectedPair} • {timeRange.toUpperCase()} Simulation Window
          </span>
        </div>

        {chartTab === 'Equity Curve' && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="colorStrat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis orientation="right" stroke="#475569" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="strategy" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorStrat)" name="Strategy Equity ($)" />
                <Line type="monotone" dataKey="benchmark" stroke="#64748b" strokeDasharray="3 3" dot={false} name="Benchmark ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartTab === 'Drawdown' && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <defs>
                  <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis orientation="right" stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="dd" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDd)" name="Drawdown (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartTab === 'Trades' && (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">PnL ($)</th>
                  <th className="pb-2">Return (%)</th>
                  <th className="pb-2">Exit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tradeLogs.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 font-mono text-slate-500">{t.id}</td>
                    <td className="py-2.5 font-mono text-slate-400">{t.date}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                    <td className="py-2.5 font-mono text-slate-300">${Number(t.entry).toLocaleString()}</td>
                    <td className="py-2.5 font-mono text-slate-300">${Number(t.exit).toLocaleString()}</td>
                    <td className={`py-2.5 font-mono font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}
                    </td>
                    <td className={`py-2.5 font-mono font-bold ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPct >= 0 ? '+' : ''}{Number(t.pnlPct).toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-slate-400">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
