import { useState } from 'react';
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';


interface ScannerResult {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  pattern: string;
  category: 'Momentum' | 'Mean Reversion' | 'Breakout' | 'Volatility' | 'SMC' | 'Arbitrage';
  confidence: number;
  rrRatio: string;
  probability: number;
  aiScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  volume24h: string;
  fundingRate: string;
  openInterest: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export default function MarketScanner() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const mockResults: ScannerResult[] = [
    {
      symbol: 'BTCUSDT',
      name: 'Bitcoin',
      price: 64250.0,
      change24h: 3.42,
      pattern: 'Bullish Engulfing + VWAP Rebound',
      category: 'Momentum',
      confidence: 88,
      rrRatio: '2.8:1',
      probability: 74,
      aiScore: 92,
      riskLevel: 'LOW',
      volume24h: '$28.4B',
      fundingRate: '+0.010%',
      openInterest: '$12.4B',
      sentiment: 'BULLISH'
    },
    {
      symbol: 'ETHUSDT',
      name: 'Ethereum',
      price: 3450.50,
      change24h: -1.20,
      pattern: 'RSI Oversold Mean Reversion',
      category: 'Mean Reversion',
      confidence: 82,
      rrRatio: '3.1:1',
      probability: 68,
      aiScore: 85,
      riskLevel: 'MEDIUM',
      volume24h: '$14.2B',
      fundingRate: '-0.005%',
      openInterest: '$6.8B',
      sentiment: 'BULLISH'
    },
    {
      symbol: 'SOLUSDT',
      name: 'Solana',
      price: 184.20,
      change24h: 6.85,
      pattern: 'Ascending Triangle Breakout',
      category: 'Breakout',
      confidence: 91,
      rrRatio: '3.5:1',
      probability: 79,
      aiScore: 95,
      riskLevel: 'MEDIUM',
      volume24h: '$4.8B',
      fundingRate: '+0.015%',
      openInterest: '$2.1B',
      sentiment: 'BULLISH'
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      price: 128.40,
      change24h: 2.15,
      pattern: 'Volatility Compression Squeeze',
      category: 'Volatility',
      confidence: 85,
      rrRatio: '2.5:1',
      probability: 71,
      aiScore: 89,
      riskLevel: 'LOW',
      volume24h: '$32.1B',
      fundingRate: 'N/A',
      openInterest: 'N/A',
      sentiment: 'BULLISH'
    },
    {
      symbol: 'AVAXUSDT',
      name: 'Avalanche',
      price: 28.50,
      change24h: -4.10,
      pattern: 'Order Block Liquidity Sweep',
      category: 'SMC',
      confidence: 78,
      rrRatio: '4.0:1',
      probability: 64,
      aiScore: 81,
      riskLevel: 'HIGH',
      volume24h: '$840M',
      fundingRate: '-0.012%',
      openInterest: '$420M',
      sentiment: 'BEARISH'
    }
  ];

  const handleRunScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  };

  const categories = ['ALL', 'Momentum', 'Mean Reversion', 'Breakout', 'Volatility', 'SMC', 'Arbitrage'];

  const filteredResults = mockResults.filter(item => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch = item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-cyan-500/20 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Global Market Scanner</h1>
            <p className="text-xs text-gray-400">Scan multi-asset universes for high-probability quantitative setups & AI signals</p>
          </div>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Universe...' : 'Run Global Scanner'}</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 bg-slate-950/80 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-white bg-slate-900/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol or setup..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-gray-800 rounded-lg text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-500/40"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel border border-gray-800 bg-slate-950/80 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-gray-800 text-[11px] font-mono uppercase text-gray-400">
                <th className="p-3.5">Asset</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">24h</th>
                <th className="p-3.5">Detected Setup</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">R:R Ratio</th>
                <th className="p-3.5">Probability</th>
                <th className="p-3.5">AI Score</th>
                <th className="p-3.5">Risk Level</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
              {filteredResults.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-white">{item.symbol}</div>
                    <div className="text-[10px] text-gray-500 font-sans">{item.name}</div>
                  </td>
                  <td className="p-3.5 font-bold text-gray-200">${item.price.toFixed(2)}</td>
                  <td className={`p-3.5 font-bold ${item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className="flex items-center gap-0.5">
                      {item.change24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {item.change24h > 0 ? `+${item.change24h}%` : `${item.change24h}%`}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-gray-200 font-sans font-medium">{item.pattern}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-gray-700 text-cyan-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-cyan-400">{item.rrRatio}</td>
                  <td className="p-3.5 font-bold text-emerald-400">{item.probability}%</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.aiScore}/100
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.riskLevel === 'LOW' ? 'bg-emerald-500/10 text-emerald-400' : item.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <button className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold hover:bg-cyan-500/30 transition-all">
                      Analyze →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
