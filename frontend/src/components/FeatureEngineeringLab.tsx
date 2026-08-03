import { useState } from 'react';
import { Layers, Database, BarChart2, Download } from 'lucide-react';


export default function FeatureEngineeringLab() {
  const [selectedGroup, setSelectedGroup] = useState<'technicals' | 'volatility' | 'momentum' | 'volume' | 'structure' | 'statistical'>('technicals');

  const featureGroups = [
    { id: 'technicals', label: 'Technical Indicators', count: 12, desc: 'VWAP, ADX, Stochastic, Williams %R, Aroon, Ichimoku, DEMA, TEMA, Keltner' },
    { id: 'volatility', label: 'Volatility Models', count: 5, desc: 'HV20, HV60, Realized Var, Parkinson, Garman-Klass, Volatility Z-Score' },
    { id: 'momentum', label: 'Momentum Oscillators', count: 5, desc: 'ROC-12, PPO, TSI, Coppock Curve, Detrended Price Oscillator' },
    { id: 'volume', label: 'Volume Analytics', count: 6, desc: 'OBV, MFI, Chaikin Money Flow, A/D Line, Force Index, Volume Ratio' },
    { id: 'structure', label: 'Market Structure', count: 5, desc: 'Pivots (Classic, Camarilla, Fib), Swing High/Low, 20-bar Distance' },
    { id: 'statistical', label: 'Statistical & Entropy', count: 5, desc: 'Rolling Z-Score, Percentile Rank, Autocorrelation, Shannon Entropy, Hurst Exponent' }
  ];

  const featureImportance = [
    { name: 'garman_klass_vol', score: 0.182, category: 'Volatility' },
    { name: 'rsi_14', score: 0.145, category: 'Momentum' },
    { name: 'hurst_exponent', score: 0.128, category: 'Statistical' },
    { name: 'cmf_20', score: 0.112, category: 'Volume' },
    { name: 'shannon_entropy', score: 0.098, category: 'Statistical' },
    { name: 'vwap_dist_pct', score: 0.086, category: 'Technicals' },
    { name: 'dist_20b_high', score: 0.074, category: 'Structure' }
  ];

  const correlationMatrix = [
    { name: 'rsi_14', rsi_14: 1.00, macd: 0.78, garman_klass: -0.22, shannon: -0.05 },
    { name: 'macd', rsi_14: 0.78, macd: 1.00, garman_klass: -0.15, shannon: -0.02 },
    { name: 'garman_klass', rsi_14: -0.22, macd: -0.15, garman_klass: 1.00, shannon: 0.65 },
    { name: 'shannon', rsi_14: -0.05, macd: -0.02, garman_klass: 0.65, shannon: 1.00 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-indigo-500/20 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Feature Engineering Laboratory</h1>
            <p className="text-xs text-gray-400">Institutional feature store, correlation analysis & feature importance scoring</p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md">
          <Download className="w-3.5 h-3.5" />
          <span>Export Feature Store (CSV/Parquet)</span>
        </button>
      </div>

      {/* Feature Group Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featureGroups.map((grp) => (
          <div
            key={grp.id}
            onClick={() => setSelectedGroup(grp.id as any)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedGroup === grp.id
                ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900/60 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{grp.label}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300">
                {grp.count} Signals
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{grp.desc}</p>
          </div>
        ))}
      </div>

      {/* Feature Importance & Correlation Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Chart */}
        <div className="glass-panel p-6 border border-gray-800 bg-slate-950/80 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span>Feature Importance Rankings (SHAP / Gini)</span>
          </h3>

          <div className="space-y-3 pt-2">
            {featureImportance.map((feat, idx) => (
              <div key={idx} className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-200 font-bold">{feat.name}</span>
                  <span className="text-indigo-300">{(feat.score * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-gray-800">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${feat.score * 400}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Correlation Matrix */}
        <div className="glass-panel p-6 border border-gray-800 bg-slate-950/80 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Feature Correlation Matrix</span>
          </h3>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-center border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[11px]">
                  <th className="p-2 text-left">Feature</th>
                  <th className="p-2">rsi_14</th>
                  <th className="p-2">macd</th>
                  <th className="p-2">garman_klass</th>
                  <th className="p-2">shannon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {correlationMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-2.5 text-left font-bold text-gray-300">{row.name}</td>
                    <td className={`p-2.5 ${row.rsi_14 === 1 ? 'text-gray-500' : row.rsi_14 > 0.5 ? 'text-emerald-400 font-bold' : 'text-gray-300'}`}>{row.rsi_14.toFixed(2)}</td>
                    <td className={`p-2.5 ${row.macd === 1 ? 'text-gray-500' : row.macd > 0.5 ? 'text-emerald-400 font-bold' : 'text-gray-300'}`}>{row.macd.toFixed(2)}</td>
                    <td className={`p-2.5 ${row.garman_klass === 1 ? 'text-gray-500' : row.garman_klass < 0 ? 'text-rose-400 font-bold' : 'text-gray-300'}`}>{row.garman_klass.toFixed(2)}</td>
                    <td className={`p-2.5 ${row.shannon === 1 ? 'text-gray-500' : row.shannon > 0.5 ? 'text-purple-400 font-bold' : 'text-gray-300'}`}>{row.shannon.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
