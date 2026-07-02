import { useState, useEffect } from 'react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { 
  SlidersHorizontal, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Cpu, 
  Newspaper,
  ChevronLeft,
  Coins,
  Building2,
  BookOpen,
  RefreshCw
} from 'lucide-react';

interface ScreenerItem {
  ticker: string;
  price: number;
  direction: 'Bullish' | 'Bearish';
  confidence: number;
  model: string;
  features: string;
  alpha: number;
  currency?: string;
}

export default function Screener() {
  const [screenerList, setScreenerList] = useState<ScreenerItem[]>([]);
  const [selectedTicker, setSelectedTicker] = useState('MTNN');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [featureImportance, setFeatureImportance] = useState<any[]>([]);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [confidenceRange, setConfidenceRange] = useState<number>(50);
  const [predictedDirection, setPredictedDirection] = useState<string>('All');
  const [strategySource, setStrategySource] = useState<string>('All');
  const [assetUniverse, setAssetUniverse] = useState('NGX (Nigeria)');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);

  // Deep-dive company view states
  const [viewMode, setViewMode] = useState<'matrix' | 'company'>('matrix');
  const [selectedCompanyData, setSelectedCompanyData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedPerfTab, setSelectedPerfTab] = useState('WoW');
  const [selectedFinancialTab, setSelectedFinancialTab] = useState<'income' | 'balance' | 'cashflow'>('income');
  const [socialFeed, setSocialFeed] = useState<any>(null);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const fetchScreener = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/screener');
      if (res.ok) {
        const data = await res.json();
        setScreenerList(data.screener_list);
        setHistoryData(data.selected_details.history);
        setFeatureImportance(data.selected_details.feature_importance);
        setNewsFeed(data.selected_details.news);
      }
    } catch (e) {
      console.error('Error fetching screener data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreener();
  }, []);

  // Filter list
  const filteredList = screenerList.filter(item => {
    const matchesConfidence = item.confidence >= confidenceRange;
    const matchesDirection = predictedDirection === 'All' || item.direction === predictedDirection;
    const matchesStrategy = strategySource === 'All' || 
      (strategySource === 'Anomaly Detection' && item.features.includes('Anomaly')) ||
      (strategySource === 'Sentiment Hub' && item.features.includes('Sentiment'));
    const matchesUniverse = assetUniverse === 'All' || 
      (assetUniverse === 'S&P 500' && ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD'].includes(item.ticker)) ||
      (assetUniverse === 'Nasdaq 100' && ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD'].includes(item.ticker)) ||
      (assetUniverse === 'NGX (Nigeria)' && ['MTNN', 'DANGCEM', 'BUAFOODS', 'ZENITHBANK', 'GTCO', 'ACCESSCORP', 'UBA', 'SEPLAT', 'TRANSCORP', 'FBNH'].includes(item.ticker));
    const matchesSearch = item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesConfidence && matchesDirection && matchesStrategy && matchesUniverse && matchesSearch;
  });

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, confidenceRange, predictedDirection, strategySource, assetUniverse, pageSize]);

  // Auto-select first item when filtered list changes and current selection is not in list
  useEffect(() => {
    if (filteredList.length > 0) {
      const exists = filteredList.some(item => item.ticker === selectedTicker);
      if (!exists) {
        setSelectedTicker(filteredList[0].ticker);
      }
    }
  }, [filteredList, selectedTicker]);

  // Paginated List
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedList = filteredList.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;

  // Dynamic details updates on ticker selection
  useEffect(() => {
    if (!selectedTicker || screenerList.length === 0) return;
    const item = screenerList.find(x => x.ticker === selectedTicker);
    if (!item) return;

    const isNgx = ['MTNN', 'DANGCEM', 'BUAFOODS', 'ZENITHBANK', 'GTCO', 'ACCESSCORP', 'UBA', 'SEPLAT', 'TRANSCORP', 'FBNH'].includes(selectedTicker);

    // Custom News Feed based on the selected ticker
    let tickerNews: any[] = [];
    if (selectedTicker === 'MTNN') {
      tickerNews = [
        { id: 1, headline: "[SENTIMENT] MTN Nigeria expands 5G coverage to 15 new cities", timestamp: "12m ago" },
        { id: 2, headline: "[REPORT] MTNN service revenue shows resilience against currency devaluation", timestamp: "2h ago" },
        { id: 3, headline: "[ALERT] NGX telecom sector volume surges on MTNN block trade", timestamp: "5h ago" }
      ];
    } else if (selectedTicker === 'DANGCEM') {
      tickerNews = [
        { id: 1, headline: "[REPORT] Dangote Cement records double-digit volume growth in Pan-African market", timestamp: "20m ago" },
        { id: 2, headline: "[SENTIMENT] Dangote Cement commissions new alternative fuel facility in Obajana", timestamp: "1h ago" },
        { id: 3, headline: "[NEWS] Cement prices stabilize across major Nigerian distribution hubs", timestamp: "4h ago" }
      ];
    } else if (['ZENITHBANK', 'GTCO', 'UBA', 'FBNH', 'ACCESSCORP'].includes(selectedTicker)) {
      tickerNews = [
        { id: 1, headline: `[REPORT] ${selectedTicker} recapitalization plan receives shareholder approval`, timestamp: "30m ago" },
        { id: 2, headline: `[SENTIMENT] Banking index rises as ${selectedTicker} posts positive Q1 earnings`, timestamp: "3h ago" },
        { id: 3, headline: "[ALERT] Central Bank of Nigeria maintains tight monetary stance on deposits", timestamp: "6h ago" }
      ];
    } else if (selectedTicker === 'SEPLAT') {
      tickerNews = [
        { id: 1, headline: "[REPORT] Seplat Energy increases production guidance following pipeline repair", timestamp: "15m ago" },
        { id: 2, headline: "[SENTIMENT] Seplat domestic gas pricing benefits from regulatory reforms", timestamp: "1h ago" },
        { id: 3, headline: "[ALERT] Oil prices support Seplat net profit margins", timestamp: "3h ago" }
      ];
    } else if (selectedTicker === 'TRANSCORP') {
      tickerNews = [
        { id: 1, headline: "[NEWS] Transcorp Power division adds 150MW to national grid", timestamp: "5m ago" },
        { id: 2, headline: "[REPORT] Transcorp hospitality sector records record occupancy rates", timestamp: "2h ago" },
        { id: 3, headline: "[SENTIMENT] Institutional investors increase stakes in Transcorp Group", timestamp: "4h ago" }
      ];
    } else {
      tickerNews = [
        { id: 1, headline: `[SENTIMENT] Positive AI signals support ${selectedTicker} momentum`, timestamp: "10m ago" },
        { id: 2, headline: `[REPORT] Large institutional blocks active in ${selectedTicker}`, timestamp: "45m ago" },
        { id: 3, headline: "[ALERT] Macro indicators align with target model bounds", timestamp: "2h ago" }
      ];
    }
    setNewsFeed(tickerNews);

    // Custom Feature Importance weight based on selected ticker
    const importance = [
      { subject: "Sentiment Analysis", A: Math.round(50 + (item.confidence * 0.4)), fullMark: 100 },
      { subject: "Macro Outlook", A: isNgx ? 92 : 75, fullMark: 100 },
      { subject: "Volume Velocity", A: Math.round(40 + (Math.abs(item.alpha) * 10)), fullMark: 100 },
      { subject: "Trend Strength", A: isNgx ? 88 : 80, fullMark: 100 },
      { subject: "Order Book Flow", A: isNgx ? 45 : 90, fullMark: 100 }
    ];
    setFeatureImportance(importance);

    // Custom Sparkline Points based on selected ticker
    const base = item.price;
    const pts = [];
    let currentVal = base * 0.95;
    for (let i = 0; i < 24; i++) {
      currentVal = currentVal * (1 + (Math.sin(i / 3) * 0.008) + ((Math.random() - 0.5) * 0.006));
      const hr = Math.floor(12 + i / 2);
      const min = (i % 2 === 0) ? '00' : '30';
      pts.push({
        time: `${hr}:${min}`,
        value: Number(currentVal.toFixed(2))
      });
    }
    setHistoryData(pts);
  }, [selectedTicker, screenerList]);

  const fetchSocialSentiment = async (ticker: string) => {
    setLoadingSocial(true);
    try {
      const res = await fetch(`/api/social/sentiment?ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setSocialFeed(data);
      }
    } catch (e) {
      console.error("Failed to fetch social sentiment:", e);
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleViewCompany = async (ticker: string) => {
    setSelectedTicker(ticker);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/screener/company/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCompanyData(data);
        setViewMode('company');
        fetchSocialSentiment(ticker);
      }
    } catch (e) {
      console.error("Failed to fetch company details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loadingDetails) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-xs text-slate-500 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <span>Loading company metrics &amp; sentiment data...</span>
      </div>
    );
  }

  if (viewMode === 'company' && selectedCompanyData) {
    const data = selectedCompanyData;
    const isUp = data.direction === 'Bullish';

    // Parse cash vs debt weights
    const parseToValue = (valStr: string) => {
      if (!valStr) return 1;
      const clean = valStr.replace(/[^0-9.]/g, '');
      const num = parseFloat(clean);
      if (isNaN(num)) return 1;
      if (valStr.includes('T')) return num * 1000;
      if (valStr.includes('B')) return num;
      if (valStr.includes('M')) return num / 1000;
      return num;
    };
    const cashVal = parseToValue(data.total_cash);
    const debtVal = parseToValue(data.total_debt);
    const totalSum = cashVal + debtVal || 1;
    const cashWeight = Math.round((cashVal / totalSum) * 100);
    const debtWeight = 100 - cashWeight;

    return (
      <div className="flex flex-col gap-6 text-[#E1E3E8] select-none min-h-[calc(100vh-140px)]">
        {/* Navigation Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode('matrix')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Matrix
            </button>
            <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {data.name} <span className="text-xs font-mono font-normal text-[#4D88FF] bg-[#4D88FF]/10 px-2 py-0.5 rounded-full">{data.ticker}</span>
              </h2>
              <span className="text-[10px] text-[#A1A5B0] font-light">Deep-Dive Quant & Qualitative AI Analysis</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Price Badge */}
            <div className="bg-[#0F1115] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="text-xs text-[#A1A5B0]">Live Price:</span>
              <span className={`text-sm font-mono font-bold ${isUp ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                {data.currency || '$'}{data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Quick Switch Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A1A5B0] hidden sm:inline">Quick Switch:</span>
              <select
                value={selectedTicker}
                onChange={(e) => handleViewCompany(e.target.value)}
                className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white cursor-pointer"
              >
                {screenerList.map((x) => (
                  <option key={x.ticker} value={x.ticker}>
                    {x.ticker} ({x.currency || '$'}{x.price})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* --- Key Metrics & Chart Dashboard Section --- */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5">
          {/* Past 5 Days */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Past 5 Days:</span>
            <div className="flex flex-wrap gap-2">
              {data.past_5_days && data.past_5_days.map((d: any, idx: number) => {
                const isPos = d.pct > 0;
                const isNeg = d.pct < 0;
                return (
                  <span key={idx} className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                    isPos ? 'bg-[#2EE59D]/10 text-[#2EE59D] border border-[#2EE59D]/20' :
                    isNeg ? 'bg-[#FF4B55]/10 text-[#FF4B55] border border-[#FF4B55]/20' :
                    'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {d.day}: {isPos ? '+' : ''}{d.pct}%
                  </span>
                );
              })}
            </div>
          </div>

          {/* Market Update Box */}
          <div className="bg-[#0F1115] border border-white/5 rounded-xl p-4">
            <div className="text-[9px] text-[#4D88FF] font-bold uppercase tracking-wider mb-1">
              ● Market Update
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
              {data.market_update}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Key Metrics</span>
              <select className="px-2 py-1 bg-[#0F1115] border border-white/5 rounded-lg text-[10px] font-semibold text-slate-300 outline-none">
                <option>Price</option>
                <option>Volume</option>
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {/* Current Price */}
              <div className="bg-[#0F1115] border-2 border-[#4D88FF] rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Current Price</span>
                <span className={`text-xs font-mono font-bold mt-1 flex items-center gap-1 ${isUp ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                  {isUp ? '▲' : '▼'} {data.currency || '$'}{data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Price Change */}
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Price Change</span>
                <span className={`text-xs font-mono font-bold mt-1 ${data.price_change_raw >= 0 ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                  {data.price_change}
                </span>
              </div>
              {/* Prev Close */}
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Prev Close</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.prev_close}</span>
              </div>
              {/* 24h Volume */}
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">24h Volume</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.volume_24h}</span>
              </div>
              {/* 30D Avg Vol */}
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">30D Avg Vol.</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.volume_30d_avg}</span>
              </div>
              {/* Market Cap */}
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Market Cap</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.market_cap}</span>
              </div>
            </div>
          </div>

          {/* Price Data Grid */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">Price Data</span>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Open</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.open_price}</span>
              </div>
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Close</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.close_price}</span>
              </div>
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">High</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.high_price}</span>
              </div>
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Low</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.low_price}</span>
              </div>
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">52W High</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.high_52w}</span>
              </div>
              <div className="bg-[#0F1115] border border-white/5 rounded-xl p-3 flex flex-col justify-center min-h-[64px]">
                <span className="text-[9px] text-slate-500 font-bold uppercase">52W Low</span>
                <span className="text-xs font-mono font-bold text-slate-300 mt-1">{data.low_52w}</span>
              </div>
            </div>
          </div>

          {/* Intraday Chart Section */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">Jun 29, 2026</span>
            <div className="h-48 w-full bg-[#0F1115] rounded-xl border border-white/5 p-4 relative">
              {/* Floating High and Low tags on chart */}
              <div className="absolute top-4 left-1/4 bg-[#2EE59D]/10 border border-[#2EE59D]/20 px-2 py-0.5 rounded text-[9px] font-mono text-[#2EE59D]">
                High: {data.chart_high_node?.label}
              </div>
              <div className="absolute bottom-12 right-1/3 bg-[#FF4B55]/10 border border-[#FF4B55]/20 px-2 py-0.5 rounded text-[9px] font-mono text-[#FF4B55]">
                Low: {data.chart_low_node?.label}
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="glowChart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D88FF" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#4D88FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }}
                    labelStyle={{ color: '#94a3b8', fontSize: 9 }}
                    itemStyle={{ fontSize: 10 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4D88FF" 
                    strokeWidth={2}
                    fill="url(#glowChart)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Overview Grid */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">Performance Overview</span>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {data.performance && Object.keys(data.performance).map((key) => {
                const val = data.performance[key];
                const isPos = val >= 0;
                const isSelected = selectedPerfTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPerfTab(key)}
                    className={`bg-[#0F1115] rounded-xl p-3 flex flex-col justify-center min-h-[64px] transition-all cursor-pointer text-left focus:outline-none ${
                      isSelected ? 'border-2 border-[#4D88FF]' : 'border border-white/5'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{key}</span>
                    <span className={`text-xs font-mono font-bold mt-1 ${isPos ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                      {isPos ? '+' : ''}{val}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Fundamental Statements & AI Analysis Section --- */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          
          {/* Card 1: Tabbed Financial Statements */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#4D88FF]" />
                  Financial Statements
                </h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Detailed TTM Performance, Health, and Liquidity Books</span>
              </div>
              
              {/* Statement Tabs */}
              <div className="flex bg-[#0F1115] border border-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setSelectedFinancialTab('income')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedFinancialTab === 'income' ? 'bg-[#4D88FF] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Income Statement
                </button>
                <button
                  onClick={() => setSelectedFinancialTab('balance')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedFinancialTab === 'balance' ? 'bg-[#4D88FF] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Balance Sheet
                </button>
                <button
                  onClick={() => setSelectedFinancialTab('cashflow')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    selectedFinancialTab === 'cashflow' ? 'bg-[#4D88FF] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cash Flow
                </button>
              </div>
            </div>

            <div className="space-y-4 min-h-[300px] flex flex-col justify-between">
              {/* Tab 1: Income Statement */}
              {selectedFinancialTab === 'income' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Total Revenue (TTM)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.revenue_ttm}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Cost of Goods Sold (COGS)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.cogs}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Gross Profit</span>
                    <span className="text-sm font-mono font-bold text-[#2EE59D]">{data.gross_profit}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Operating Expenses (OPEX)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.opex}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">EBIT (Operating Income)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.ebit}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Net Income (TTM)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.net_income_ttm}</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Balance Sheet */}
              {selectedFinancialTab === 'balance' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Cash & Cash Equivalents</span>
                    <span className="text-sm font-mono font-bold text-white">{data.cash_and_equivalents}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Total Assets</span>
                    <span className="text-sm font-mono font-bold text-white">{data.total_assets}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Total Liabilities</span>
                    <span className="text-sm font-mono font-bold text-white">{data.total_liabilities}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Retained Earnings</span>
                    <span className="text-sm font-mono font-bold text-white">{data.retained_earnings}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Shareholders' Equity</span>
                    <span className="text-sm font-mono font-bold text-[#4D88FF]">{data.shareholders_equity}</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Cash Flow Statement */}
              {selectedFinancialTab === 'cashflow' && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Operating Cash Flow</span>
                    <span className="text-sm font-mono font-bold text-white">{data.operating_cash_flow}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Capital Expenditures (CapEx)</span>
                    <span className="text-sm font-mono font-bold text-white">{data.capex}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Free Cash Flow (FCF)</span>
                    <span className="text-sm font-mono font-bold text-[#2EE59D]">{data.fcf}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-slate-400">Financing Cash Flow</span>
                    <span className="text-sm font-mono font-bold text-white">{data.financing_cash_flow}</span>
                  </div>
                </div>
              )}

              {/* Cash vs Debt comparison widget */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D]" /> Cash Reserves: {data.total_cash}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF4B55]" /> Total Debt: {data.total_debt}</span>
                </div>
                {/* Stacked progress bar */}
                <div className="h-2 rounded-full bg-[#0F1115] overflow-hidden flex border border-white/5">
                  <div className="bg-[#2EE59D] h-full transition-all" style={{ width: `${cashWeight}%` }} />
                  <div className="bg-[#FF4B55] h-full transition-all" style={{ width: `${debtWeight}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>Liquid Assets ({cashWeight}%)</span>
                  <span>Debt Leverage ({debtWeight}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Valuation Layers & AI Insights */}
          <div className="flex flex-col gap-6 md:col-span-1">
            {/* Valuation ratios */}
            <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#4D88FF]" />
                  Market Valuation
                </h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Asset multiple layers</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-xs text-slate-400">Market Cap</span>
                  <span className="text-sm font-mono font-bold text-white">{data.market_cap}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-xs text-slate-400">P/E Ratio</span>
                  <span className="text-sm font-mono font-bold text-white">{data.pe_ratio}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-xs text-slate-400">EV/EBITDA</span>
                  <span className="text-sm font-mono font-bold text-white">{data.ev_ebitda}</span>
                </div>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#4D88FF]" />
                  AI Contextual Audit
                </h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">NLP analysis insights</span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 p-3 bg-[#0F1115] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Sector & Classification</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-semibold text-[#4D88FF] bg-[#4D88FF]/10 px-2.5 py-1 rounded-lg">
                      {data.sector}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                      {data.industry}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-[#0F1115] border border-white/5 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Guidance Sentiment</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                    data.forward_guidance === 'Positive' ? 'text-[#2EE59D] bg-[#2EE59D]/10' :
                    data.forward_guidance === 'Neutral' ? 'text-[#FFD33D] bg-[#FFD33D]/10' :
                    'text-[#FF4B55] bg-[#FF4B55]/10'
                  }`}>
                    <BookOpen className="w-3 h-3" />
                    {data.forward_guidance}
                  </span>
                </div>

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                  <span className="absolute -right-2 -bottom-2 text-indigo-500/5 font-extrabold text-7xl select-none font-sans">
                    AI
                  </span>
                  <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" /> Growth Engine
                  </h4>
                  <p className="text-xs italic text-slate-300 leading-relaxed font-sans font-light">
                    "{data.core_growth_driver}"
                  </p>
                </div>
              </div>
            </div>

            {/* Social Sentiment Radar Card */}
            <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#4D88FF]" />
                  Social Sentiment Buzz
                </h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Live Scraped Consensus (Reddit, StockTwits, X)</span>
              </div>

              {loadingSocial || !socialFeed ? (
                <div className="py-12 flex justify-center items-center text-slate-500 text-xs animate-pulse">
                  Scraping discussion APIs...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Consensus Indicator Bar */}
                  <div className="p-3 bg-[#0F1115] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
                      <span className="text-[#2EE59D]">Bullish: {socialFeed.bullish_pct}%</span>
                      <span className="text-[#FF4B55]">Bearish: {socialFeed.bearish_pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0F1115] overflow-hidden flex border border-white/5">
                      <div className="bg-[#2EE59D] h-full transition-all" style={{ width: `${socialFeed.bullish_pct}%` }} />
                      <div className="bg-[#FF4B55] h-full transition-all" style={{ width: `${socialFeed.bearish_pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>Total Buzz: {socialFeed.total_posts} threads</span>
                      <span>Consensus: {socialFeed.bullish_pct > 55 ? "Strong Buy" : socialFeed.bearish_pct > 55 ? "Short Bias" : "Neutral"}</span>
                    </div>
                  </div>

                  {/* Scraped Posts Feed */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {socialFeed.posts && socialFeed.posts.map((post: any, idx: number) => {
                      const isBull = post.sentiment === "Bullish";
                      const isBear = post.sentiment === "Bearish";
                      return (
                        <div key={idx} className="p-3 bg-[#0F1115] border border-white/5 rounded-xl space-y-1.5 hover:border-slate-800 transition-all">
                          <div className="flex justify-between items-center text-[9px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                post.source === "Reddit" ? "bg-orange-500/10 text-orange-400" :
                                post.source === "StockTwits" ? "bg-[#4D88FF]/10 text-[#4D88FF]" :
                                "bg-slate-800 text-slate-300"
                              }`}>
                                {post.source}
                              </span>
                              <span className="text-slate-400">{post.username}</span>
                            </div>
                            <span className="text-slate-500">{post.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans leading-relaxed break-words font-light">
                            {post.text}
                          </p>
                          <div className="flex justify-end">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                              isBull ? 'text-[#2EE59D] bg-[#2EE59D]/5 border border-[#2EE59D]/10' :
                              isBear ? 'text-[#FF4B55] bg-[#FF4B55]/5 border border-[#FF4B55]/10' :
                              'text-slate-400 bg-white/5 border border-white/10'
                            }`}>
                              {post.sentiment}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }


  return (
    <div className="grid md:grid-cols-4 gap-6 min-h-[calc(100vh-140px)] select-none text-[#E1E3E8] items-start">
      {/* Left 3 Columns: Filters & Main Screener Grid */}
      <div className="md:col-span-3 flex flex-col gap-4">
        
        {/* Filters Panel */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold tracking-wide flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-[#4D88FF]" />
              Quant Signal Matrix / AI Asset Screener
            </h2>
            <button 
              onClick={fetchScreener}
              className="px-4 py-1.5 rounded-lg bg-[#4D88FF]/10 text-[#4D88FF] border border-[#4D88FF]/20 text-xs font-semibold hover:bg-[#4D88FF]/20 transition-all"
            >
              Filtering Plans
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Confidence Slider */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#A1A5B0] font-semibold mb-1.5 uppercase tracking-wider">
                AI Confidence Range ({confidenceRange}-100%)
              </label>
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={confidenceRange}
                onChange={(e) => setConfidenceRange(Number(e.target.value))}
                className="w-full h-1 bg-[#0F1115] rounded-lg appearance-none cursor-pointer accent-[#4D88FF]"
              />
              <div className="flex justify-between text-[9px] text-[#A1A5B0] mt-1 font-mono">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Predicted Direction */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#A1A5B0] font-semibold mb-1.5 uppercase tracking-wider">
                Predicted Direction
              </label>
              <select
                value={predictedDirection}
                onChange={(e) => setPredictedDirection(e.target.value)}
                className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
              >
                <option value="All">All Directions</option>
                <option value="Bullish">Bullish</option>
                <option value="Bearish">Bearish</option>
              </select>
            </div>

            {/* Strategy Source */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#A1A5B0] font-semibold mb-1.5 uppercase tracking-wider">
                Strategy Source
              </label>
              <select
                value={strategySource}
                onChange={(e) => setStrategySource(e.target.value)}
                className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
              >
                <option value="All">All Pipelines</option>
                <option value="Anomaly Detection">Anomaly Detection</option>
                <option value="Sentiment Hub">Sentiment Hub</option>
              </select>
            </div>

            {/* Asset Universe */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#A1A5B0] font-semibold mb-1.5 uppercase tracking-wider">
                Asset Universe
              </label>
              <select
                value={assetUniverse}
                onChange={(e) => setAssetUniverse(e.target.value)}
                className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
              >
                <option value="All">Global Universe</option>
                <option value="S&P 500">S&P 500</option>
                <option value="Nasdaq 100">Nasdaq 100</option>
                <option value="NGX (Nigeria)">NGX (Nigeria)</option>
              </select>
            </div>

            {/* Page Size selector */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#A1A5B0] font-semibold mb-1.5 uppercase tracking-wider">
                Rows per page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
              >
                <option value="10">10 Rows</option>
                <option value="15">15 Rows</option>
                <option value="20">20 Rows</option>
                <option value="30">30 Rows</option>
                <option value="50">50 Rows</option>
                <option value="100">100 Rows</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search & Main Table */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col">
          
          {/* Controls */}
          <div className="flex justify-between items-center gap-4 mb-4">
            <button className="px-3 py-1.5 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-white/5 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </button>

            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#A1A5B0]">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0F1115] border border-white/5 focus:border-[#4D88FF]/50 rounded-lg text-xs outline-none"
                placeholder="Search Asset or Model..."
              />
            </div>
          </div>

          {/* Screener Table */}
          <div className="overflow-x-auto pr-1">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[#A1A5B0] font-light">
                <span className="animate-pulse">Loading Quant Signal Matrix...</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-white/5 text-[#A1A5B0] font-semibold sticky top-0 bg-[#1A1D24] z-10">
                    <th className="py-2.5 px-3">Asset (Ticker)</th>
                    <th className="py-2.5 px-3">Live Price</th>
                    <th className="py-2.5 px-3">AI Prediction</th>
                    <th className="py-2.5 px-3">Confidence Score (%)</th>
                    <th className="py-2.5 px-3">Driver Model</th>
                    <th className="py-2.5 px-3">Key Features</th>
                    <th className="py-2.5 px-3 text-right">Alpha Predict (1%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                  {paginatedList.map((item, idx) => {
                    const isSelected = selectedTicker === item.ticker;
                    const isUp = item.direction === 'Bullish';
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedTicker(item.ticker)}
                        className={`cursor-pointer hover:bg-white/[0.02] transition-colors ${
                          isSelected ? 'bg-[#4D88FF]/10 text-white border-l-2 border-l-[#4D88FF]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-sans font-bold text-white">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCompany(item.ticker);
                            }}
                            className="text-[#4D88FF] hover:underline font-bold text-left cursor-pointer transition-all focus:outline-none"
                          >
                            {item.ticker}
                          </button>
                        </td>
                        <td className={`py-2.5 px-3 ${isUp ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                          {item.currency || '$'}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            isUp ? 'text-[#2EE59D]' : 'text-[#FF4B55]'
                          }`}>
                            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {item.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 font-bold">{item.confidence.toFixed(1)}%</span>
                            <div className="flex-1 bg-[#0F1115] h-2 rounded-full border border-white/5 overflow-hidden">
                              <div 
                                className="bg-[#4D88FF] h-2 rounded-full" 
                                style={{ width: `${item.confidence}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">{item.model}</td>
                        <td className="py-2.5 px-3 font-sans">{item.features}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          item.alpha >= 0 ? 'text-[#2EE59D]' : 'text-[#FF4B55]'
                        }`}>
                          {item.alpha >= 0 ? '+' : ''}{item.alpha.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#A1A5B0] font-sans font-light">
                        No assets found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredList.length > 0 && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 shrink-0 select-none">
              <span className="text-[10px] text-[#A1A5B0] font-mono">
                Showing {startIndex + 1}–{Math.min(endIndex, filteredList.length)} of {filteredList.length} assets
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1 bg-[#0F1115] border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                >
                  Previous
                </button>
                <span className="text-[10px] font-mono text-white px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 bg-[#0F1115] border border-white/5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Context Information Panel */}
      <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-6 h-fit md:sticky md:top-24">
        {/* Title */}
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#4D88FF]" />
            {selectedTicker} Diagnostics
          </h3>
          <span className="text-[10px] text-[#A1A5B0] font-light">AI Signal Severity details</span>
        </div>

        {/* Mini line chart */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#A1A5B0]">Model Path 24h</span>
            <span className="font-mono text-white font-bold">
              {screenerList.find(x => x.ticker === selectedTicker)?.currency || '$'}
              {(screenerList.find(x => x.ticker === selectedTicker)?.price ?? 193.50).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="h-32 w-full bg-[#0F1115] rounded-xl border border-white/5 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="screenerGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4D88FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4D88FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip 
                  contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }}
                  labelStyle={{ color: '#94a3b8', fontSize: 9 }}
                  itemStyle={{ fontSize: 10 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#4D88FF" 
                  strokeWidth={1.5}
                  fill="url(#screenerGlow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Importance Radar Chart */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#A1A5B0]">Feature Importance weight</span>
          <div className="h-44 w-full bg-[#0F1115] rounded-xl border border-white/5 p-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={featureImportance}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#334155" />
                <Radar 
                  name="Selected Asset" 
                  dataKey="A" 
                  stroke="#4D88FF" 
                  fill="#4D88FF" 
                  fillOpacity={0.3} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alternative News Feed */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold text-[#A1A5B0] flex items-center gap-1">
            <Newspaper className="w-3.5 h-3.5 text-[#4D88FF]" />
            Asset News Feed
          </span>
          <div className="space-y-3">
            {newsFeed.map((news) => (
              <div 
                key={news.id} 
                className="p-3 bg-[#0F1115] border border-white/5 rounded-lg flex flex-col gap-1.5 hover:border-slate-800 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-[#4D88FF] uppercase font-bold tracking-wider">
                    {news.headline.startsWith('[SENTIMENT]') ? 'Sentiment' : news.headline.startsWith('[REPORT]') ? 'Report' : 'Alert'}
                  </span>
                  <span className="text-[9px] text-[#A1A5B0] font-mono">{news.timestamp}</span>
                </div>
                <p className="text-[11px] font-bold text-white leading-normal">
                  {news.headline}
                </p>
              </div>
            ))}
            {newsFeed.length === 0 && (
              <div className="text-center text-[10px] text-[#A1A5B0] font-light py-4">
                No news updates available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
