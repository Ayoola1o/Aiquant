import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart2, Globe, Radio } from 'lucide-react';

interface NewsItem {
  id: number;
  headline: string;
  source: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  score: number;
  confidence: number;
  timestamp: string;
}

interface StockMove {
  symbol: string;
  name: string;
  price: number;
  change: number;
  isUp: boolean;
}

export default function Dashboard() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState('BTC');
  
  // Real-world simulated index values
  const [indices, setIndices] = useState({
    spx: { value: 5432.20, change: 0.45 },
    ixic: { value: 17654.50, change: 0.88 },
    dji: { value: 39120.10, change: -0.12 },
    vix: { value: 12.85, change: -4.20 }
  });

  const [movers, setMovers] = useState<StockMove[]>([
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 67240.50, change: 2.45, isUp: true },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 3512.20, change: 1.88, isUp: true },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 212.40, change: 0.65, isUp: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 184.20, change: -1.75, isUp: false },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 127.40, change: 4.88, isUp: true },
    { symbol: 'MSFT', name: 'Microsoft', price: 442.10, change: -0.32, isUp: false }
  ]);

  const [sectors] = useState([
    { name: 'Technology', change: 2.15, class: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
    { name: 'Finance', change: 0.35, class: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' },
    { name: 'Healthcare', change: -0.12, class: 'bg-red-500/5 border-red-500/20 text-red-500' },
    { name: 'Energy', change: -1.45, class: 'bg-red-500/10 border-red-500/30 text-red-400' }
  ]);

  const fetchNews = async (ticker: string) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/news?ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (e) {
      console.error('Error fetching news:', e);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedTicker);
  }, [selectedTicker]);

  // Simulate tick updates to indexes and movers
  useEffect(() => {
    const interval = setInterval(() => {
      // Small index changes
      setIndices(prev => {
        const d_spx = (Math.random() - 0.48) * 2;
        const d_ixic = (Math.random() - 0.45) * 6;
        const d_dji = (Math.random() - 0.52) * 10;
        const d_vix = (Math.random() - 0.50) * 0.15;
        
        return {
          spx: { value: prev.spx.value + d_spx, change: prev.spx.change + (d_spx / 50) },
          ixic: { value: prev.ixic.value + d_ixic, change: prev.ixic.change + (d_ixic / 170) },
          dji: { value: prev.dji.value + d_dji, change: prev.dji.change + (d_dji / 390) },
          vix: { value: Math.max(8, prev.vix.value + d_vix), change: prev.vix.change + (d_vix / 0.1) }
        };
      });

      // Small stock mover changes
      setMovers(prev => 
        prev.map(item => {
          const tick = (Math.random() - (item.isUp ? 0.48 : 0.52)) * (item.price * 0.0005);
          const newPrice = Math.max(1, item.price + tick);
          const pctDiff = (tick / item.price) * 100;
          const newChange = item.change + pctDiff;
          return {
            ...item,
            price: newPrice,
            change: newChange,
            isUp: newChange >= 0
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Ticker Tape */}
      <div className="ticker-wrap glass-panel rounded-xl border border-white/5">
        <div className="ticker-content">
          {[...movers, ...movers].map((item, idx) => (
            <div key={idx} className="ticker-item border-r border-white/5">
              <span className="font-bold text-white">{item.symbol}</span>
              <span className="text-slate-300 font-mono">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`flex items-center text-xs ${item.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {item.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Indices, Sectors & Heatmaps */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Indices Card */}
        <div className="glass-panel p-6 col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Global Market Indices
            </h3>
            <span className="text-slate-500 text-xs flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE FEED
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* SPX */}
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">S&P 500</span>
              <span className="text-lg font-bold font-mono text-white">
                {indices.spx.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-xs mt-1 ${indices.spx.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {indices.spx.change >= 0 ? '+' : ''}{indices.spx.change.toFixed(2)}%
              </span>
            </div>

            {/* NASDAQ */}
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">NASDAQ</span>
              <span className="text-lg font-bold font-mono text-white">
                {indices.ixic.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-xs mt-1 ${indices.ixic.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {indices.ixic.change >= 0 ? '+' : ''}{indices.ixic.change.toFixed(2)}%
              </span>
            </div>

            {/* DOW JONES */}
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">DOW JONES</span>
              <span className="text-lg font-bold font-mono text-white">
                {indices.dji.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-xs mt-1 ${indices.dji.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {indices.dji.change >= 0 ? '+' : ''}{indices.dji.change.toFixed(2)}%
              </span>
            </div>

            {/* VIX */}
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-semibold block mb-1">CBOE VIX</span>
              <span className="text-lg font-bold font-mono text-white">
                {indices.vix.value.toFixed(2)}
              </span>
              <span className={`flex items-center text-xs mt-1 ${indices.vix.change < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {indices.vix.change.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Sectors Performance */}
        <div className="glass-panel p-6">
          <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            Sector Performance
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {sectors.map((sec, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-3 flex flex-col justify-center items-center text-center ${sec.class}`}
              >
                <span className="text-xs font-semibold text-slate-300 block mb-1">{sec.name}</span>
                <span className="text-sm font-bold font-mono">
                  {sec.change >= 0 ? '+' : ''}{sec.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticker Movers & AI Sentiment News */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Top Movers List */}
        <div className="glass-panel p-6 col-span-1">
          <h3 className="font-bold text-lg text-white mb-6">Platform Core Tickers</h3>
          <div className="space-y-4">
            {movers.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const baseSymbol = item.symbol.replace("USDT", "").replace("-USD", "");
                  setSelectedTicker(baseSymbol);
                }}
                className={`flex justify-between items-center p-3 rounded-xl border border-slate-900 bg-slate-950/20 hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all cursor-pointer ${
                  selectedTicker === item.symbol.replace("USDT", "").replace("-USD", "") ? 'border-indigo-500/40 bg-indigo-500/5' : ''
                }`}
              >
                <div>
                  <span className="font-bold text-sm block text-white">{item.symbol}</span>
                  <span className="text-[11px] text-slate-400">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm block text-white">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-flex items-center text-xs font-semibold ${item.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.isUp ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI News Feed */}
        <div className="glass-panel p-6 col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-400" />
              AI News & Sentiment Feed ({selectedTicker})
            </h3>
            <button
              onClick={() => fetchNews(selectedTicker)}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingNews ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingNews ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              <span className="animate-pulse">Analyzing article semantics...</span>
            </div>
          ) : (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {news.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 flex flex-col md:flex-row justify-between gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                        {item.source}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>
                    <p className="font-bold text-sm text-white leading-normal">{item.headline}</p>
                  </div>

                  <div className="flex md:flex-col items-start justify-center md:items-end gap-2 md:w-32 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        item.sentiment === 'Bullish'
                          ? 'sentiment-bullish'
                          : item.sentiment === 'Bearish'
                          ? 'sentiment-bearish'
                          : 'sentiment-neutral'
                      }`}
                    >
                      {item.sentiment}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Confidence: <span className="text-white font-bold">{item.confidence}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
