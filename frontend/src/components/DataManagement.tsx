import { Database, RefreshCw } from 'lucide-react';


export default function DataManagement() {
  const datasets = [
    { name: 'Binance Futures OHLCV (1m - 1d)', type: 'Historical Candle Data', size: '12.4 GB', rows: '48,200,000', status: 'ACTIVE', updated: 'Real-time' },
    { name: 'Alpaca US Equities Trades', type: 'Tick & Minute Bar Data', size: '8.2 GB', rows: '32,100,000', status: 'ACTIVE', updated: '5 mins ago' },
    { name: 'Feature Store Matrix', type: 'Engine Features', size: '3.6 GB', rows: '14,500,000', status: 'READY', updated: '10 mins ago' },
    { name: 'Macro & VIX Volatility Series', type: 'Economic Indicators', size: '420 MB', rows: '1,200,000', status: 'ACTIVE', updated: 'Hourly' },
    { name: 'Crypto On-Chain & Funding Rates', type: 'Alternative Data', size: '890 MB font-mono', rows: '4,800,000', status: 'ACTIVE', updated: 'Real-time' },
    { name: 'Quantitative Experiment Database', type: 'Backtest Run Logs', size: '150 MB', rows: '840 experiments', status: 'SYNCED', updated: 'Just now' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-emerald-500/20 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Data Lake & Management Hub</h1>
            <p className="text-xs text-gray-400">Inspect live data pipelines, historical feeds, feature stores & experiment databases</p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Data Lakes</span>
        </button>
      </div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((ds, idx) => (
          <div key={idx} className="p-5 rounded-xl border border-gray-800 bg-slate-950/80 space-y-3 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {ds.status}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{ds.updated}</span>
            </div>

            <div>
              <h3 className="font-bold text-white text-sm">{ds.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{ds.type}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 bg-slate-900/60 rounded-lg border border-gray-800">
              <div>
                <span className="text-gray-500 text-[10px] block">Disk Size</span>
                <span className="text-gray-200 font-bold">{ds.size}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">Record Count</span>
                <span className="text-emerald-300 font-bold">{ds.rows}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
