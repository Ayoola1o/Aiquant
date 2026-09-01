import { useState, useEffect } from 'react';
import { Activity, Gauge, TrendingUp, BarChart2, Layers, Cpu, RefreshCw } from 'lucide-react';

interface FeatureInspectorProps {
  ticker: string;
  period?: string;
  interval?: string;
}

export default function FeatureInspector({ ticker, period = '1mo', interval = '1h' }: FeatureInspectorProps) {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<'technicals' | 'volatility' | 'momentum' | 'volume' | 'market_structure' | 'statistical'>('technicals');

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/features/inspect?ticker=${ticker}&period=${period}&interval=${interval}&index=-1`);
      const data = await res.json();
      if (data.status === 'success' && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch (err) {
      console.error('Failed to fetch feature inspection snapshot:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, [ticker, period, interval]);

  if (loading) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Extracting multi-dimensional feature snapshot for {ticker}...</span>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const { ohlcv, timestamp, technicals, volatility, momentum, volume, market_structure, statistical } = snapshot;

  const categories = [
    { id: 'technicals', label: 'Technicals', icon: Activity, count: Object.keys(technicals || {}).length },
    { id: 'volatility', label: 'Volatility', icon: Gauge, count: Object.keys(volatility || {}).length },
    { id: 'momentum', label: 'Momentum', icon: TrendingUp, count: Object.keys(momentum || {}).length },
    { id: 'volume', label: 'Volume Flow', icon: BarChart2, count: Object.keys(volume || {}).length },
    { id: 'market_structure', label: 'Structure', icon: Layers, count: Object.keys(market_structure || {}).length },
    { id: 'statistical', label: 'Statistical', icon: Cpu, count: Object.keys(statistical || {}).length },
  ];

  const getMetricData = () => {
    switch (activeCategory) {
      case 'technicals':
        return technicals;
      case 'volatility':
        return volatility;
      case 'momentum':
        return momentum;
      case 'volume':
        return volume;
      case 'market_structure':
        return market_structure;
      case 'statistical':
        return statistical;
      default:
        return {};
    }
  };

  return (
    <div className="glass-panel p-5 border border-cyan-500/20 bg-slate-950/80 shadow-2xl rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              FEATURE INSPECTOR
            </span>
            <span className="text-lg font-bold text-white">{ticker}</span>
            <span className="text-xs text-gray-400">({timestamp})</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Multi-dimensional quantitative indicator snapshot per candle</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono bg-slate-900/90 px-3 py-2 rounded-lg border border-gray-800">
          <div><span className="text-gray-500">O:</span> ${ohlcv?.open?.toFixed(2)}</div>
          <div><span className="text-gray-500">H:</span> ${ohlcv?.high?.toFixed(2)}</div>
          <div><span className="text-gray-500">L:</span> ${ohlcv?.low?.toFixed(2)}</div>
          <div><span className="text-cyan-400">C:</span> ${ohlcv?.close?.toFixed(2)}</div>
          <div><span className="text-gray-500">Vol:</span> {ohlcv?.volume?.toLocaleString()}</div>
        </div>

        <button
          onClick={fetchSnapshot}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 transition-colors"
          title="Refresh Features"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 border-b border-gray-800/80 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-gray-400">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
        {Object.entries(getMetricData() || {}).map(([key, val]: [string, any]) => {
          const formattedVal = typeof val === 'boolean' ? (val ? 'TRUE' : 'FALSE') : (typeof val === 'number' ? val.toFixed(4) : String(val));
          return (
            <div key={key} className="bg-slate-900/60 p-3 rounded-lg border border-gray-800/80 hover:border-cyan-500/30 transition-all">
              <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</div>
              <div className={`text-base font-bold font-mono mt-1 ${typeof val === 'boolean' ? (val ? 'text-emerald-400' : 'text-gray-500') : 'text-gray-100'}`}>
                {formattedVal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
