import { useState, useEffect } from 'react';
import { Newspaper, Gauge, DollarSign, Activity, Calendar, RefreshCw } from 'lucide-react';


export default function MarketIntelligence() {
  const [loading, setLoading] = useState(true);
  const [fearGreed, setFearGreed] = useState<any[]>([]);
  const [funding, setFunding] = useState<any[]>([]);
  const [openInterest, setOpenInterest] = useState<any>(null);
  const [vix, setVix] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fgRes, fundRes, oiRes, vixRes, calRes] = await Promise.all([
        fetch('/api/market/feargreed').then(r => r.json()),
        fetch(`/api/market/funding?symbol=${selectedSymbol}`).then(r => r.json()),
        fetch(`/api/market/openinterest?symbol=${selectedSymbol}`).then(r => r.json()),
        fetch('/api/market/macro?symbol=^VIX&period=1mo').then(r => r.json()),
        fetch('/api/market/calendar').then(r => r.json())
      ]);

      if (fgRes.status === 'success') setFearGreed(fgRes.data || []);
      if (fundRes.status === 'success') setFunding(fundRes.data || []);
      if (oiRes.status === 'success') setOpenInterest(oiRes.data || null);
      if (vixRes.status === 'success') setVix(vixRes.data || []);
      if (calRes.status === 'success') setCalendar(calRes.events || []);
    } catch (err) {
      console.error('Failed to load market intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSymbol]);

  const latestFG = fearGreed[0] || { value: 50, classification: 'Neutral' };
  const latestVix = vix.length > 0 ? vix[vix.length - 1].close : 16.4;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-cyan-500/20 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Market Intelligence Workspace</h1>
            <p className="text-xs text-gray-400">Macro indicators, funding rates, open interest, Fear & Greed index & economic calendar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-sm font-mono text-cyan-300 outline-none"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Fear & Greed */}
        <div className="glass-panel p-4 border border-amber-500/20 bg-slate-950/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-mono">FEAR & GREED INDEX</span>
            <Gauge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{latestFG.value}</div>
          <div className="text-xs font-medium text-amber-300 mt-1 uppercase tracking-wider">{latestFG.classification}</div>
        </div>

        {/* Funding Rate */}
        <div className="glass-panel p-4 border border-cyan-500/20 bg-slate-950/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-mono">{selectedSymbol} FUNDING RATE</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {funding[0] ? `${funding[0].funding_rate_pct}%` : '+0.0100%'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Per 8-hour period</div>
        </div>

        {/* Open Interest */}
        <div className="glass-panel p-4 border border-purple-500/20 bg-slate-950/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-mono">OPEN INTEREST</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {openInterest ? `${(openInterest.open_interest / 1000).toFixed(1)}k` : 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Active futures contracts</div>
        </div>

        {/* VIX Volatility Index */}
        <div className="glass-panel p-4 border border-rose-500/20 bg-slate-950/80 rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-mono">CBOE VIX INDEX</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{latestVix}</div>
          <div className="text-xs text-gray-400 mt-1">Equity market volatility</div>
        </div>
      </div>

      {/* Main Grid: Funding History & Economic Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Funding Rate History */}
        <div className="glass-panel p-5 border border-gray-800 bg-slate-950/80 rounded-xl">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <span>Funding Rate History ({selectedSymbol})</span>
          </h2>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {funding.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-gray-800 text-xs font-mono">
                <span className="text-gray-400">{item.timestamp}</span>
                <span className={item.funding_rate_pct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {item.funding_rate_pct > 0 ? `+${item.funding_rate_pct}%` : `${item.funding_rate_pct}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Economic Calendar */}
        <div className="glass-panel p-5 border border-gray-800 bg-slate-950/80 rounded-xl">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>High-Impact Macro Calendar</span>
          </h2>
          <div className="space-y-3">
            {calendar.map((ev, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-900/60 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-200">{ev.event}</div>
                  <div className="text-[11px] font-mono text-gray-500 mt-0.5">{ev.date} UTC</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-gray-300">
                    {ev.country}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.impact === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400'}`}>
                    {ev.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
