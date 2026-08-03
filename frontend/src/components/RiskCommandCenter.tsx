import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Zap, Flame } from 'lucide-react';


export default function RiskCommandCenter() {
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [stressScenario, setStressScenario] = useState<'2008_crash' | '2020_flash' | 'crypto_cascade'>('2020_flash');

  const stressResults = {
    '2008_crash': { pnlImpact: '-28.4%', maxDrawdown: '34.2%', var95: '$14,200', var99: '$22,500' },
    '2020_flash': { pnlImpact: '-14.8%', maxDrawdown: '18.5%', var95: '$8,400', var99: '$12,800' },
    'crypto_cascade': { pnlImpact: '-38.2%', maxDrawdown: '42.1%', var95: '$19,800', var99: '$31,000' }
  };

  const currentStress = stressResults[stressScenario];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-rose-500/30 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Risk Command Center & Stress Lab</h1>
            <p className="text-xs text-gray-400">Institutional VaR, CVaR, correlation monitoring & emergency capital defense controls</p>
          </div>
        </div>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={() => setKillSwitchTriggered(!killSwitchTriggered)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xl ${
            killSwitchTriggered
              ? 'bg-emerald-600 text-white animate-pulse'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>{killSwitchTriggered ? 'KILL SWITCH ACTIVE (Positions Flattened)' : 'TRIGGER EMERGENCY KILL SWITCH'}</span>
        </button>
      </div>

      {/* Top Risk Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 bg-slate-950/80 border border-gray-800 rounded-xl">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Value at Risk (VaR 95%)</div>
          <div className="text-xl font-bold text-rose-400 font-mono mt-1">$4,850.00</div>
          <div className="text-[10px] text-gray-500 mt-1">Daily 95% Confidence Limit</div>
        </div>

        <div className="glass-panel p-4 bg-slate-950/80 border border-gray-800 rounded-xl">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Conditional VaR (CVaR 99%)</div>
          <div className="text-xl font-bold text-rose-500 font-mono mt-1">$8,240.00</div>
          <div className="text-[10px] text-gray-500 mt-1">Expected Shortfall Tail Risk</div>
        </div>

        <div className="glass-panel p-4 bg-slate-950/80 border border-gray-800 rounded-xl">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Margin Capacity Used</div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">32.4%</div>
          <div className="text-[10px] text-gray-500 mt-1">$32,400 / $100,000 Allocated</div>
        </div>

        <div className="glass-panel p-4 bg-slate-950/80 border border-gray-800 rounded-xl">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Portfolio Correlation</div>
          <div className="text-xl font-bold text-cyan-300 font-mono mt-1">0.42 (Moderate)</div>
          <div className="text-[10px] text-gray-500 mt-1">Cross-Asset Diversification Score</div>
        </div>
      </div>

      {/* Stress Testing Engine & AI Risk Advisor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stress Testing Engine */}
        <div className="lg:col-span-2 glass-panel p-6 border border-gray-800 bg-slate-950/80 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Historical Stress Test Engine</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStressScenario('2020_flash')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  stressScenario === '2020_flash' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900 text-gray-400'
                }`}
              >
                2020 Flash Crash
              </button>
              <button
                onClick={() => setStressScenario('2008_crash')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  stressScenario === '2008_crash' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-900 text-gray-400'
                }`}
              >
                2008 GFC Crash
              </button>
              <button
                onClick={() => setStressScenario('crypto_cascade')}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                  stressScenario === 'crypto_cascade' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-900 text-gray-400'
                }`}
              >
                Crypto De-leveraging
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-900/60 rounded-xl border border-gray-800 text-xs font-mono">
            <div>
              <span className="text-gray-400 block text-[10px]">Simulated PnL Impact</span>
              <span className="text-base font-bold text-rose-400">{currentStress.pnlImpact}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Max Drawdown</span>
              <span className="text-base font-bold text-rose-500">{currentStress.maxDrawdown}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Stressed VaR (95%)</span>
              <span className="text-base font-bold text-amber-400">{currentStress.var95}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Stressed VaR (99%)</span>
              <span className="text-base font-bold text-rose-400">{currentStress.var99}</span>
            </div>
          </div>
        </div>

        {/* AI Risk Advisor */}
        <div className="glass-panel p-6 border border-rose-500/20 bg-slate-950/80 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>AI Risk Advisor Stream</span>
          </h3>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <span className="font-bold block mb-1">⚠️ Correlation Warning</span>
              High correlation detected between BTC and ETH positions (+0.84). Suggest reducing ETH exposure by 15%.
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <span className="font-bold block mb-1">⚡ Volatility Expansion</span>
              Garman-Klass volatility on SOL exceeds 65th percentile threshold. Trailing stops automatically tightened to 2.5 ATR.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
