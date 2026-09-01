import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Info, 
  Activity, 
  Zap, 
  BarChart3, 
  ArrowRight, 
  Sparkles, 
  Bell, 
  Cpu, 
  Users, 
  Clock, 
  Radio 
} from 'lucide-react';

interface AssetRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  isUp: boolean;
  history: number[];
  currency?: string;
}

interface IntelligenceItem {
  id: string;
  timeAgo: string;
  headline: string;
  description: string;
  tag: string;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish' | 'Watch';
}

interface ExecutionItem {
  time: string;
  bot: string;
  pair: string;
  side: 'LONG' | 'SHORT';
  pnl: number;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Active Category for Market Overview
  const [marketTab, setMarketTab] = useState<'Indices' | 'Forex' | 'Crypto' | 'Commodities'>('Indices');
  
  // Real-time market overview data
  const [marketData, setMarketData] = useState<Record<string, AssetRow[]>>({
    Indices: [
      { symbol: 'S&P 500', name: 'SPX', price: 5343.22, change: 0.85, isUp: true, history: [5300, 5312, 5325, 5320, 5338, 5343.22] },
      { symbol: 'NASDAQ 100', name: 'NDX', price: 18742.61, change: 1.21, isUp: true, history: [18500, 18580, 18640, 18690, 18720, 18742.61] },
      { symbol: 'DOW JONES', name: 'DJI', price: 38886.92, change: 0.48, isUp: true, history: [38700, 38750, 38810, 38790, 38850, 38886.92] },
      { symbol: 'BTC / USD', name: 'Bitcoin', price: 66842.31, change: 2.35, isUp: true, history: [65200, 65600, 66100, 65900, 66500, 66842.31] },
      { symbol: 'ETH / USD', name: 'Ethereum', price: 3425.67, change: 1.65, isUp: true, history: [3360, 3380, 3405, 3395, 3415, 3425.67] },
      { symbol: 'GOLD', name: 'XAUUSD', price: 2386.45, change: -0.32, isUp: false, history: [2400, 2395, 2390, 2392, 2388, 2386.45] }
    ],
    Forex: [
      { symbol: 'EUR / USD', name: 'Euro / US Dollar', price: 1.0842, change: 0.15, isUp: true, history: [1.082, 1.0825, 1.083, 1.0835, 1.0842] },
      { symbol: 'GBP / USD', name: 'British Pound / US Dollar', price: 1.2915, change: -0.22, isUp: false, history: [1.295, 1.294, 1.293, 1.292, 1.2915] },
      { symbol: 'USD / JPY', name: 'US Dollar / Japanese Yen', price: 154.65, change: 0.42, isUp: true, history: [154.0, 154.2, 154.35, 154.5, 154.65] },
      { symbol: 'USD / CAD', name: 'US Dollar / Canadian Dollar', price: 1.3680, change: -0.10, isUp: false, history: [1.370, 1.3695, 1.369, 1.3685, 1.3680] }
    ],
    Crypto: [
      { symbol: 'BTC / USDT', name: 'Bitcoin Perp', price: 66842.31, change: 2.35, isUp: true, history: [65200, 65800, 66200, 66500, 66842.31] },
      { symbol: 'ETH / USDT', name: 'Ethereum Perp', price: 3425.67, change: 1.65, isUp: true, history: [3350, 3375, 3400, 3410, 3425.67] },
      { symbol: 'SOL / USDT', name: 'Solana Perp', price: 178.40, change: 4.82, isUp: true, history: [168, 171, 174, 176, 178.40] },
      { symbol: 'LINK / USDT', name: 'Chainlink Perp', price: 18.95, change: 3.12, isUp: true, history: [18.2, 18.4, 18.6, 18.8, 18.95] },
      { symbol: 'AVAX / USDT', name: 'Avalanche Perp', price: 32.40, change: -1.05, isUp: false, history: [33.2, 33.0, 32.8, 32.5, 32.40] }
    ],
    Commodities: [
      { symbol: 'GOLD', name: 'XAUUSD', price: 2386.45, change: -0.32, isUp: false, history: [2400, 2395, 2390, 2388, 2386.45] },
      { symbol: 'SILVER', name: 'XAGUSD', price: 31.25, change: 0.95, isUp: true, history: [30.8, 30.9, 31.0, 31.15, 31.25] },
      { symbol: 'CRUDE OIL', name: 'WTI', price: 81.40, change: 1.45, isUp: true, history: [80.1, 80.5, 80.8, 81.1, 81.40] },
      { symbol: 'NATURAL GAS', name: 'NG', price: 2.78, change: -2.10, isUp: false, history: [2.85, 2.83, 2.81, 2.79, 2.78] }
    ]
  });

  // Live Dashboard State connected to Backend
  const [totalEquity, setTotalEquity] = useState(128450.75);
  const [dailyPnl, setDailyPnl] = useState(2450.75);
  const [realizedPnl, setRealizedPnl] = useState(1850.30);
  const [unrealizedPnl, setUnrealizedPnl] = useState(600.45);
  const [winRate, setWinRate] = useState(64.82);
  const [tradesCount, setTradesCount] = useState(482);
  const [winsCount, setWinsCount] = useState(312);
  const [lossesCount, setLossesCount] = useState(170);
  const [runningBots, setRunningBots] = useState(8);
  const [idleBots, setIdleBots] = useState(2);
  const [stoppedBots, setStoppedBots] = useState(2);
  const [fearGreedIndex, setFearGreedIndex] = useState(68);
  const [marketRegime, setMarketRegime] = useState('Risk-On');
  const [aiConfidence, setAiConfidence] = useState(78);

  // AI Intelligence Feed items
  const [intelligenceFeed, setIntelligenceFeed] = useState<IntelligenceItem[]>([
    {
      id: '1',
      timeAgo: '12m ago',
      headline: 'Bullish momentum detected on BTC',
      description: 'Price breaking above key resistance with high volume',
      tag: '~BTC',
      sentiment: 'Bullish'
    },
    {
      id: '2',
      timeAgo: '24m ago',
      headline: 'Funding rate turning positive',
      description: 'Market sentiment shifting to long bias',
      tag: 'DERIVATIVES',
      sentiment: 'Neutral'
    },
    {
      id: '3',
      timeAgo: '35m ago',
      headline: 'Tech sector strength increasing',
      description: 'Relative strength vs SPY improving',
      tag: 'MARKET',
      sentiment: 'Bullish'
    },
    {
      id: '4',
      timeAgo: '1h ago',
      headline: 'High volatility expected',
      description: 'Upcoming CPI data may increase volatility',
      tag: 'MACRO',
      sentiment: 'Watch'
    },
    {
      id: '5',
      timeAgo: '2h ago',
      headline: 'AI Strategy Signal: MOMENTUM-01',
      description: 'Long setup triggered on SOL/USDT',
      tag: 'STRATEGY',
      sentiment: 'Bullish'
    }
  ]);

  // Recent Executions
  const [executions, setExecutions] = useState<ExecutionItem[]>([
    { time: '12:45:12', bot: 'MOMENTUM-01', pair: 'BTC/USDT', side: 'LONG', pnl: 124.50 },
    { time: '12:42:33', bot: 'MEANREVERT-02', pair: 'ETH/USDT', side: 'SHORT', pnl: 85.30 },
    { time: '12:41:08', bot: 'BREAKOUT-03', pair: 'SOL/USDT', side: 'LONG', pnl: -32.10 },
    { time: '12:39:55', bot: 'SCALPER-01', pair: 'BTC/USDT', side: 'LONG', pnl: 45.20 },
    { time: '12:38:21', bot: 'AI-ALPHA', pair: 'LINK/USDT', side: 'LONG', pnl: 67.80 }
  ]);

  // Fetch live market intelligence & fleet status from backend
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const [botsRes, fgRes, newsRes] = await Promise.allSettled([
          fetch('/api/live/bots'),
          fetch('/api/market/feargreed'),
          fetch('/api/news?ticker=BTC')
        ]);

        if (botsRes.status === 'fulfilled' && botsRes.value.ok) {
          const botsData = await botsRes.value.json();
          const activeBots = Object.values(botsData.bots || {}) as any[];
          if (activeBots.length > 0) {
            let running = 0;
            let stopped = 0;
            let sumEq = 0;
            let sumPnl = 0;
            const allTrades: ExecutionItem[] = [];

            activeBots.forEach((b: any) => {
              if (b.is_running || b.status === 'running' || b.status === 'active') {
                running++;
              } else {
                stopped++;
              }
              sumEq += (b.portfolio_value || b.starting_cash || 10000);
              sumPnl += (b.pnl || 0);

              if (b.trades && Array.isArray(b.trades)) {
                b.trades.slice(-5).forEach((t: any) => {
                  allTrades.push({
                    time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'Just now',
                    bot: b.name || b.bot_id || 'AI BOT',
                    pair: `${b.symbol || 'BTCUSDT'} Perp`,
                    side: t.side?.toUpperCase() === 'SELL' ? 'SHORT' : 'LONG',
                    pnl: t.pnl || 0
                  });
                });
              }
            });

            setRunningBots(running);
            setStoppedBots(stopped);
            setIdleBots(Math.max(0, activeBots.length - running - stopped));
            if (sumEq > 0) setTotalEquity(sumEq);
            setDailyPnl(sumPnl);
            setRealizedPnl(sumPnl * 0.75);
            setUnrealizedPnl(sumPnl * 0.25);

            if (allTrades.length > 0) {
              setExecutions(allTrades.slice(0, 10));
              const wins = allTrades.filter(t => t.pnl > 0).length;
              const total = allTrades.length;
              setTradesCount(total);
              setWinsCount(wins);
              setLossesCount(total - wins);
              setWinRate(total > 0 ? (wins / total) * 100 : 64.82);
            }
          }
        }

        if (fgRes.status === 'fulfilled' && fgRes.value.ok) {
          const fgData = await fgRes.value.json();
          if (fgData.data && fgData.data.length > 0) {
            const currentScore = parseInt(fgData.data[0].value, 10) || 68;
            setFearGreedIndex(currentScore);
            setMarketRegime(currentScore >= 60 ? 'Risk-On' : currentScore <= 40 ? 'Risk-Off' : 'Neutral');
            setAiConfidence(Math.min(95, Math.max(60, currentScore + 8)));
          }
        }

        if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
          const newsData = await newsRes.value.json();
          if (newsData.articles && Array.isArray(newsData.articles) && newsData.articles.length > 0) {
            setIntelligenceFeed(newsData.articles.slice(0, 5).map((a: any, idx: number) => ({
              id: String(idx + 1),
              timeAgo: a.published_at ? `${Math.floor((Date.now() - new Date(a.published_at).getTime()) / 60000)}m ago` : '15m ago',
              headline: a.title || 'Market Update',
              description: a.summary || a.description || 'AI analyzed sentiment snapshot.',
              tag: a.ticker ? `~${a.ticker}` : 'MARKET',
              sentiment: (a.sentiment_label === 'POSITIVE' || a.sentiment > 0.2) ? 'Bullish' : (a.sentiment_label === 'NEGATIVE' || a.sentiment < -0.2) ? 'Bearish' : 'Neutral'
            })));
          }
        }
      } catch (err) {
        console.warn("Dashboard live data fetch error:", err);
      }
    };

    fetchLiveStats();
    const pollInterval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Live simulation ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(cat => {
          next[cat] = next[cat].map(item => {
            const delta = (Math.random() - (item.isUp ? 0.48 : 0.52)) * (item.price * 0.0004);
            const newPrice = Math.max(0.01, item.price + delta);
            const pctDelta = (delta / item.price) * 100;
            const newChange = item.change + pctDelta;
            const newHist = [...item.history.slice(1), newPrice];
            return {
              ...item,
              price: newPrice,
              change: newChange,
              isUp: newChange >= 0,
              history: newHist
            };
          });
        });
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const totalBotsCount = runningBots + idleBots + stoppedBots;

  return (
    <div className="space-y-6 pb-6 text-slate-200">
      
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">Operator</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            AI-Powered. Data-Driven. Precision Execution.
          </p>
        </div>
      </div>

      {/* 1. TOP KPI METRICS ROW (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Equity */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">TOTAL EQUITY</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
              ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[9px] text-slate-500 font-semibold uppercase">24H CHANGE</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                +${(dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-medium">+1.95%</span>
              </div>
            </div>
            <MiniSparkline color="#10B981" data={[30, 35, 32, 45, 42, 55, 50, 65]} width={64} height={26} />
          </div>
        </div>

        {/* Daily P&L */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">DAILY P&L</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
              ${dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3 text-xs">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">REALIZED</span>
                <span className="font-bold text-slate-200 text-xs">${realizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">UNREALIZED</span>
                <span className="font-bold text-emerald-400 text-xs">${unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <MiniSparkline color="#10B981" data={[20, 25, 40, 35, 48, 42, 58, 62]} width={64} height={26} />
          </div>
        </div>

        {/* Total Return */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">TOTAL RETURN</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
              $28,450.75 <span className="text-xs font-bold text-emerald-400">+28.45%</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[9px] text-slate-500 font-semibold uppercase">ALL TIME</div>
              <div className="text-[11px] font-medium text-slate-400">Since Jan 1, 2025</div>
            </div>
            <MiniSparkline color="#A855F7" data={[15, 22, 28, 26, 38, 44, 49, 60]} width={64} height={26} />
          </div>
        </div>

        {/* Win Rate */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">WIN RATE</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-2xl font-extrabold text-white tracking-tight">{winRate.toFixed(1)}%</div>
              <div className="text-xs font-bold text-emerald-400">+5.21%</div>
            </div>
            <DonutWinRate percentage={winRate} />
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">TRADES</span>
              <span className="font-bold text-slate-200 text-xs">{tradesCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-semibold block uppercase">WIN / LOSS</span>
              <span className="font-bold text-slate-200 text-xs">{winsCount} / {lossesCount}</span>
            </div>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">SHARPE RATIO</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
              2.48 <span className="text-xs font-bold text-emerald-400">+0.38</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex gap-4">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">SORTINO</span>
                <span className="font-bold text-slate-200 text-xs">3.61</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">CALMAR</span>
                <span className="font-bold text-slate-200 text-xs">2.21</span>
              </div>
            </div>
            <MiniSparkline color="#38BDF8" data={[25, 30, 28, 42, 38, 46, 52, 58]} width={64} height={26} />
          </div>
        </div>

      </div>

      {/* 2. MIDDLE OPERATIONAL & INTELLIGENCE ROW (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Market Regime */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">MARKET REGIME</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-1">
            <div className="text-xl font-extrabold text-emerald-400 glow-text-green">{marketRegime}</div>
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mt-0.5">BULLISH MOMENTUM</div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">Market conditions favor long exposure</div>
          </div>
          <div className="flex items-center justify-center py-1">
            <RadarChartWidget />
          </div>
        </div>

        {/* Risk Exposure */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">RISK EXPOSURE</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <RadialRiskGauge percentage={fearGreedIndex} />
          </div>
          <div className="space-y-1 pt-2 border-t border-white/5 text-[10px]">
            <div className="flex justify-between text-slate-400">
              <span>MAX RISK LIMIT</span>
              <span className="font-bold text-slate-200">100%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>CURRENT EXPOSURE</span>
              <span className="font-bold text-slate-200">{fearGreedIndex}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>AVAILABLE RISK</span>
              <span className="font-bold text-emerald-400">{100 - fearGreedIndex}%</span>
            </div>
          </div>
        </div>

        {/* Active Bots */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">ACTIVE BOTS</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-1 flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold text-white">
                {totalBotsCount} <span className="text-xs font-normal text-slate-400">of 20</span>
              </div>
              <div className="text-[10px] text-slate-400">{Math.round((totalBotsCount / 20) * 100)}% Capacity</div>
            </div>
            <BotsDonutChart running={runningBots} idle={idleBots} stopped={stoppedBots} />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                Running
              </span>
              <span className="font-bold text-white text-[11px]">{runningBots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                Idle
              </span>
              <span className="font-bold text-white text-[11px]">{idleBots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                Stopped
              </span>
              <span className="font-bold text-white text-[11px]">{stoppedBots}</span>
            </div>
          </div>
        </div>

        {/* Portfolio Health */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">PORTFOLIO HEALTH</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="flex flex-col items-center justify-center my-1">
            <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-xs font-bold text-emerald-400 mt-1.5 tracking-wide uppercase">HEALTHY</div>
            <div className="text-[9px] text-slate-400">All systems normal</div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-white/5">
            <div>
              <div className="text-[8px] text-slate-500 font-semibold uppercase">Drawdown</div>
              <div className="text-[11px] font-bold text-slate-200">4.35%</div>
            </div>
            <div>
              <div className="text-[8px] text-slate-500 font-semibold uppercase">VaR (95%)</div>
              <div className="text-[11px] font-bold text-slate-200">2.21%</div>
            </div>
            <div>
              <div className="text-[8px] text-slate-500 font-semibold uppercase">Exposure</div>
              <div className="text-[11px] font-bold text-slate-200">{fearGreedIndex}.00%</div>
            </div>
          </div>
        </div>

        {/* AI Confidence */}
        <div className="glass-panel p-4 bg-[#0d111d]/90 border border-white/5 rounded-2xl flex flex-col justify-between hover:border-indigo-500/30 transition-all shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400">AI CONFIDENCE</span>
            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
          </div>
          <div className="my-0.5">
            <div className="text-2xl font-extrabold text-white tracking-tight">{aiConfidence}%</div>
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">HIGH CONFIDENCE</div>
          </div>
          <div className="py-1">
            <EqualizerBars />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
            <div>
              <span className="text-slate-500 font-semibold block uppercase text-[9px]">SIGNALS TODAY</span>
              <span className="font-bold text-slate-200 text-xs">24</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold block uppercase text-[9px]">AVG CONFIDENCE</span>
              <span className="font-bold text-slate-200 text-xs">{aiConfidence}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. LOWER MAIN CONTENT (3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Market Overview (4 cols) */}
        <div className="lg:col-span-4 glass-panel bg-[#0d111d]/90 border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-xl shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">MARKET OVERVIEW</h2>
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 mb-4">
              {(['Indices', 'Forex', 'Crypto', 'Commodities'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMarketTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    marketTab === tab 
                      ? 'bg-indigo-600/40 text-white border border-indigo-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-white/5">
              <div className="col-span-5">ASSET</div>
              <div className="col-span-3 text-right">PRICE</div>
              <div className="col-span-2 text-right">24H</div>
              <div className="col-span-2 text-right">CHART</div>
            </div>

            {/* Asset Rows */}
            <div className="divide-y divide-white/5">
              {marketData[marketTab]?.map((asset, i) => (
                <div key={i} className="grid grid-cols-12 items-center py-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-1">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[9px] font-bold text-indigo-300 shrink-0">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{asset.symbol}</div>
                      <div className="text-[10px] text-slate-500 truncate">{asset.name}</div>
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-mono text-xs font-semibold text-slate-200">
                    {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[11px] font-bold">
                    <span className={asset.isUp ? 'text-emerald-400' : 'text-red-400'}>
                      {asset.isUp ? '+' : ''}{asset.change.toFixed(2)}%
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <MiniSparkline color={asset.isUp ? '#10B981' : '#EF4444'} data={asset.history} width={42} height={18} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: AI Intelligence Feed (4 cols) */}
        <div className="lg:col-span-4 glass-panel bg-[#0d111d]/90 border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-xl shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">AI INTELLIGENCE FEED</h2>
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
              </div>
            </div>

            {/* Feed List */}
            <div className="space-y-3">
              {intelligenceFeed.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">{item.timeAgo}</span>
                      <span className="text-xs font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer">
                        {item.headline}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    {item.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5 uppercase">
                      {item.tag}
                    </span>
                    <span className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      item.sentiment === 'Bullish' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : item.sentiment === 'Watch'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-300 border border-white/5'
                    }`}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {item.sentiment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => navigate('/market')}
            className="w-full mt-4 py-2.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-colors group"
          >
            View all intelligence
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Column 3: Recent Executions (4 cols) */}
        <div className="lg:col-span-4 glass-panel bg-[#0d111d]/90 border border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-xl shadow-black/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">RECENT EXECUTIONS</h2>
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-pointer" />
              </div>
              <button 
                onClick={() => navigate('/history')}
                className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                View all
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-white/5">
              <div className="col-span-2">TIME</div>
              <div className="col-span-4">BOT / STRATEGY</div>
              <div className="col-span-3">PAIR</div>
              <div className="col-span-1">SIDE</div>
              <div className="col-span-2 text-right">P&L</div>
            </div>

            {/* Execution Rows */}
            <div className="divide-y divide-white/5">
              {executions.map((exec, i) => (
                <div key={i} className="grid grid-cols-12 items-center py-3 text-xs hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-2 text-[11px] text-slate-400 font-mono">
                    {exec.time}
                  </div>
                  <div className="col-span-4 font-bold text-white text-xs truncate pr-1">
                    {exec.bot}
                  </div>
                  <div className="col-span-3 text-[11px] text-slate-300 font-mono">
                    {exec.pair}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-[10px] font-extrabold ${exec.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {exec.side}
                    </span>
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold text-xs">
                    <span className={exec.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {exec.pnl >= 0 ? '+' : ''}${exec.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900/30 border border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Live Order Routing Active
            </span>
            <span className="font-mono text-[11px] text-slate-300 font-semibold">100% Filled</span>
          </div>
        </div>

      </div>

      {/* 4. BOTTOM TELEMETRY STATUS BAR */}
      <div className="glass-panel bg-[#0d111d]/95 border border-white/5 rounded-2xl px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xl shadow-black/40">
        
        {/* Data Feeds */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">DATA FEEDS</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              128 <span className="text-emerald-400 text-[10px] font-semibold">Live</span>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">ACTIVE ALERTS</div>
            <div className="font-bold text-white flex items-center gap-2">
              7 <button onClick={() => navigate('/market')} className="text-[10px] text-indigo-400 hover:underline">View all</button>
            </div>
          </div>
        </div>

        {/* API Latency */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">API LATENCY</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              42ms <span className="text-emerald-400 text-[10px] font-semibold">Excellent</span>
            </div>
          </div>
        </div>

        {/* Models Online */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">MODELS ONLINE</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              8 / 8 <span className="text-emerald-400 text-[10px] font-semibold">Healthy</span>
            </div>
          </div>
        </div>

        {/* Agents Online */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">AGENTS ONLINE</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              12 / 12 <span className="text-emerald-400 text-[10px] font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">UPTIME</div>
            <div className="font-bold text-white flex items-center gap-1.5">
              15d 7h 32m <span className="text-slate-400 text-[10px]">99.98%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// --- SUB-COMPONENTS FOR CHARTS & VISUALIZATIONS ---

/** Mini SVG Sparkline Component */
function MiniSparkline({ data, color, width = 64, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/** Donut Win Rate Ring */
function DonutWinRate({ percentage = 64.82 }: { percentage: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="4"
          fill="transparent"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke="#A855F7"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out shadow-[0_0_10px_#A855F7]"
        />
      </svg>
    </div>
  );
}

/** 6-Axis Radar Chart Widget with crisp labels matching mockup */
function RadarChartWidget() {
  const axes = [
    { label: 'Momentum', val: 78, angle: -90, labelX: 100, labelY: 14, align: 'middle' },
    { label: 'Volatility', val: 42, angle: -30, labelX: 172, labelY: 48, align: 'start' },
    { label: 'Liquidity', val: 85, angle: 30, labelX: 172, labelY: 112, align: 'start' },
    { label: 'Trend Strength', val: 72, angle: 90, labelX: 100, labelY: 144, align: 'middle' },
    { label: 'Risk Appetite', val: 81, angle: 150, labelX: 28, labelY: 112, align: 'end' },
    { label: 'Volume', val: 68, angle: 210, labelX: 28, labelY: 48, align: 'end' }
  ];

  const cx = 100;
  const cy = 76;
  const maxR = 44;

  const points = axes.map(a => {
    const rad = (a.angle * Math.PI) / 180;
    const r = (a.val / 100) * maxR;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg width="200" height="150" viewBox="0 0 200 150" className="overflow-visible select-none">
        {/* Background Web Polygons */}
        {[0.35, 0.7, 1].map((scale, idx) => {
          const webPoints = axes.map(a => {
            const rad = (a.angle * Math.PI) / 180;
            const r = scale * maxR;
            const x = cx + r * Math.cos(rad);
            const y = cy + r * Math.sin(rad);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          return (
            <polygon
              key={idx}
              points={webPoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="1"
            />
          );
        })}

        {/* Web Axes Lines */}
        {axes.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const x = cx + maxR * Math.cos(rad);
          const y = cy + maxR * Math.sin(rad);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon */}
        <polygon
          points={points}
          fill="rgba(16, 185, 129, 0.22)"
          stroke="#10B981"
          strokeWidth="1.5"
          className="shadow-[0_0_12px_rgba(16,185,129,0.4)]"
        />

        {/* Vertex Dots */}
        {axes.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          const r = (a.val / 100) * maxR;
          const x = cx + r * Math.cos(rad);
          const y = cy + r * Math.sin(rad);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill="#10B981"
              stroke="#080b14"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Labels & Values */}
        {axes.map((a, i) => (
          <text
            key={i}
            x={a.labelX}
            y={a.labelY}
            textAnchor={a.align as any}
            className="fill-slate-400 text-[8px] font-medium"
          >
            {a.label} <tspan className="fill-emerald-400 font-bold">{a.val}</tspan>
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Semi-circular Radial Risk Gauge */
function RadialRiskGauge({ percentage = 38 }: { percentage: number }) {
  const r = 36;
  const cx = 50;
  const cy = 44;
  const strokeW = 7;
  const circ = Math.PI * r;
  const offset = circ - (percentage / 100) * circ;

  return (
    <div className="relative w-32 h-18 flex flex-col items-center justify-end">
      <svg width="100" height="50" viewBox="0 0 100 50" className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Active arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeW}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="text-center -mt-3.5">
        <div className="text-lg font-extrabold text-white leading-none">{percentage}%</div>
        <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">MODERATE</div>
      </div>
    </div>
  );
}

/** Multi-segment Bots Donut Chart */
function BotsDonutChart({ running = 8, idle = 2, stopped = 2 }: { running?: number; idle?: number; stopped?: number }) {
  const total = running + idle + stopped || 1;
  const circ = 2 * Math.PI * 18; // ~113.1

  const runPct = running / total;
  const idlePct = idle / total;
  const stopPct = stopped / total;

  const runOffset = circ * (1 - runPct);
  const idleOffset = circ * (1 - idlePct);
  const stopOffset = circ * (1 - stopPct);

  const idleAngle = runPct * 360;
  const stopAngle = (runPct + idlePct) * 360;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 transform -rotate-90">
        {/* Running Segment */}
        {running > 0 && (
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="#10B981"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={runOffset}
          />
        )}
        {/* Idle Segment */}
        {idle > 0 && (
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="#38BDF8"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={idleOffset}
            transform={`rotate(${idleAngle} 24 24)`}
          />
        )}
        {/* Stopped Segment */}
        {stopped > 0 && (
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="#EF4444"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={stopOffset}
            transform={`rotate(${stopAngle} 24 24)`}
          />
        )}
      </svg>
    </div>
  );
}

/** AI Confidence Equalizer Bars */
function EqualizerBars() {
  const bars = [35, 50, 65, 80, 60, 85, 70, 90, 75, 65, 80, 85, 55, 70, 75, 60];

  return (
    <div className="flex items-end justify-between gap-1 h-10 px-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t bg-gradient-to-t from-indigo-600 to-purple-400 opacity-90 hover:opacity-100 transition-all duration-300"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
