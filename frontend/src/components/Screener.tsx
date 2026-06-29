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
  Scale,
  Building2,
  BookOpen
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

  const handleViewCompany = async (ticker: string) => {
    setSelectedTicker(ticker);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/screener/company/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCompanyData(data);
        setViewMode('company');
      }
    } catch (e) {
      console.error("Failed to fetch company details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

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

        {/* Dashboard 3-Column Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          
          {/* Card 1: Financial Foundation */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4D88FF]" />
                Financial Foundation
              </h3>
              <span className="text-[10px] text-[#A1A5B0] font-light">TTM Balance Sheet & Income Statements</span>
            </div>

            <div className="space-y-4">
              {/* Total Revenue */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Total Revenue (TTM)</span>
                <span className="text-sm font-mono font-bold text-white">{data.revenue_ttm}</span>
              </div>

              {/* Gross Margin */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Gross Profit Margin</span>
                <span className="text-sm font-mono font-bold text-[#2EE59D]">{data.gross_margin}</span>
              </div>

              {/* Net Income */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Net Income (TTM)</span>
                <span className="text-sm font-mono font-bold text-white">{data.net_income_ttm}</span>
              </div>

              {/* Free Cash Flow */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Free Cash Flow (FCF)</span>
                <span className="text-sm font-mono font-bold text-[#4D88FF]">{data.fcf}</span>
              </div>

              {/* Cash vs Debt comparison widget */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#2EE59D]" /> Cash: {data.total_cash}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF4B55]" /> Debt: {data.total_debt}</span>
                </div>
                {/* Stacked progress bar */}
                <div className="h-2.5 rounded-full bg-[#0F1115] overflow-hidden flex border border-white/5">
                  <div className="bg-[#2EE59D] h-full transition-all" style={{ width: `${cashWeight}%` }} />
                  <div className="bg-[#FF4B55] h-full transition-all" style={{ width: `${debtWeight}%` }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>Liquid Reserves ({cashWeight}%)</span>
                  <span>Leverage ({debtWeight}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Market Valuation & Chart */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#4D88FF]" />
                Market Valuation Layers
              </h3>
              <span className="text-[10px] text-[#A1A5B0] font-light">Market capitalization & valuation ratios</span>
            </div>

            <div className="space-y-4">
              {/* Market Cap */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">Market Capitalization</span>
                <span className="text-sm font-mono font-bold text-white">{data.market_cap}</span>
              </div>

              {/* P/E Ratio */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">P/E Ratio</span>
                <span className="text-sm font-mono font-bold text-white">{data.pe_ratio}</span>
              </div>

              {/* EV/EBITDA */}
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">EV/EBITDA</span>
                <span className="text-sm font-mono font-bold text-white">{data.ev_ebitda}</span>
              </div>

              {/* Model projection 24h Area Chart */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-[10px] text-[#A1A5B0] font-semibold uppercase tracking-wider">Model Projection 24h</span>
                <div className="h-24 w-full bg-[#0F1115] rounded-xl border border-white/5 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="companyGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={isUp ? "#2EE59D" : "#FF4B55"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={isUp ? "#2EE59D" : "#FF4B55"} stopOpacity={0}/>
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
                        stroke={isUp ? "#2EE59D" : "#FF4B55"} 
                        strokeWidth={1.5}
                        fill="url(#companyGlow)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: AI Contextual & Qualitative Insights */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#4D88FF]" />
                AI Contextual superpower
              </h3>
              <span className="text-[10px] text-[#A1A5B0] font-light">NLP transcript audits & sentiment reports</span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Sector & Industry Classification */}
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

              {/* Guidance Sentiment Badge */}
              <div className="flex justify-between items-center p-3 bg-[#0F1115] border border-white/5 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Forward Guidance Sentiment</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                  data.forward_guidance === 'Positive' ? 'text-[#2EE59D] bg-[#2EE59D]/10' :
                  data.forward_guidance === 'Neutral' ? 'text-[#FFD33D] bg-[#FFD33D]/10' :
                  'text-[#FF4B55] bg-[#FF4B55]/10'
                }`}>
                  <BookOpen className="w-3 h-3" />
                  {data.forward_guidance}
                </span>
              </div>

              {/* Growth Driver Quote */}
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative overflow-hidden">
                <span className="absolute -right-2 -bottom-2 text-indigo-500/5 font-extrabold text-7xl select-none font-sans">
                  AI
                </span>
                <h4 className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Core Growth Engine
                </h4>
                <p className="text-xs italic text-slate-300 leading-relaxed font-sans font-light">
                  "{data.core_growth_driver}"
                </p>
              </div>
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
