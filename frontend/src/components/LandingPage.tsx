import { Shield, Cpu, Activity, TrendingUp, CpuIcon, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-xl text-black shadow-lg shadow-indigo-500/20">
            AQ
          </div>
          <span className="font-extrabold text-2xl tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AIQUANT
          </span>
        </div>
        
        <button
          onClick={onLaunch}
          className="relative group overflow-hidden px-6 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-indigo-500 to-emerald-500 text-black shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:animate-shine" />
          Launch Terminal
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center text-center relative">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-8 animate-fade-in shadow-inner">
          <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
          AAAI 2026 Foundation Time-Series Model Integrated
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6 max-w-4xl">
          AI-Powered Quantitative Trading. <br/>
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Reimagined for Web3.
          </span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed">
          Unify machine learning, time-series foundation transformers, and dynamic Python strategy scripts. Backtest instantly and execute live simulated sessions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center">
          <button
            onClick={onLaunch}
            className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300"
          >
            Launch Free Terminal
          </button>
          <a
            href="https://github.com/shiyu-coder/Kronos"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 rounded-xl font-bold border border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-900 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4 text-indigo-400" />
            Explore Kronos Model
          </a>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-4 gap-6 w-full max-w-6xl mt-12">
          {/* Card 1 */}
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:scale-103 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-4">
              <CpuIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Kronos-mini AI</h3>
            <p className="text-slate-400 text-sm font-light">
              State-of-the-art transformer predicting 7-day OHLCV intervals directly from market context.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:scale-103 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Strategy Lab</h3>
            <p className="text-slate-400 text-sm font-light">
              Write custom Python scripts or prompt the AI Strategy Generator to write and refine codes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:scale-103 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Live Streaming</h3>
            <p className="text-slate-400 text-sm font-light">
              WebSockets aggregate Binance ticks into 10s candles, matching orders in real time.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:scale-103 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Risk Diagnostics</h3>
            <p className="text-slate-400 text-sm font-light">
              Portfolio allocations, Sharpe ratios, drawdowns, and Value at Risk (VaR) stats.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center border-t border-slate-900 text-slate-500 text-xs">
        <p>© 2026 Aiquant Inc. Quant engine grounded in real-world market structures.</p>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <a href="#" className="hover:text-indigo-400">Terms</a>
          <a href="#" className="hover:text-indigo-400">Privacy</a>
          <a href="#" className="hover:text-indigo-400">Model Zoo</a>
        </div>
      </footer>
    </div>
  );
}
