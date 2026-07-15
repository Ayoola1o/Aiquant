import { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Search, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  CheckCircle2, 
  Hash
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface Post {
  source: string;
  username: string;
  text: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  timestamp: string;
  ticker: string;
}

export default function GlobalNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('All');
  const [selectedTicker, setSelectedTicker] = useState('All');

  const fetchGlobalNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/news');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error('Error fetching global social news:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalNews();
  }, []);

  // Filter posts based on controls
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSentiment = selectedSentiment === 'All' || post.sentiment === selectedSentiment;
    const matchesTicker = selectedTicker === 'All' || post.ticker === selectedTicker;
    return matchesSearch && matchesSentiment && matchesTicker;
  });

  // Calculate stats
  const bullishCount = posts.filter(p => p.sentiment === 'Bullish').length;
  const bearishCount = posts.filter(p => p.sentiment === 'Bearish').length;
  const neutralCount = posts.filter(p => p.sentiment === 'Neutral').length;
  const total = posts.length || 1;

  const bullishPct = Math.round((bullishCount / total) * 100);
  const bearishPct = Math.round((bearishCount / total) * 100);

  // Chart data: Ticker sentiment count mapping
  const tickerMap: Record<string, { ticker: string; Bullish: number; Bearish: number; Neutral: number }> = {};
  posts.forEach(post => {
    if (!tickerMap[post.ticker]) {
      tickerMap[post.ticker] = { ticker: post.ticker, Bullish: 0, Bearish: 0, Neutral: 0 };
    }
    tickerMap[post.ticker][post.sentiment] += 1;
  });
  const chartData = Object.values(tickerMap);

  // Helper to format mock stats (likes, retweets, replies) based on post content hash
  const getPostMetrics = (text: string) => {
    let sum = 0;
    for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
    return {
      replies: (sum % 23) + 3,
      retweets: (sum % 87) + 5,
      likes: (sum % 245) + 12
    };
  };

  return (
    <div className="flex flex-col gap-6 text-[#E1E3E8] select-none min-h-[calc(100vh-140px)]">
      
      {/* --- Top Metrics Summary Board --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Buzz */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Social Stream</span>
            <span className="text-2xl font-mono font-extrabold text-white mt-1 block">{posts.length}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Live X/Twitter ticks analyzed</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Newspaper className="w-5 h-5" />
          </div>
        </div>

        {/* Bullish Index */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#2EE59D] font-bold uppercase tracking-wider block">Bullish consensus</span>
            <span className="text-2xl font-mono font-extrabold text-[#2EE59D] mt-1 block">{bullishPct}%</span>
            <span className="text-[10px] text-slate-400 mt-1 block">{bullishCount} positive reports</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#2EE59D]/10 border border-[#2EE59D]/20 flex items-center justify-center text-[#2EE59D]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Bearish Index */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#FF4B55] font-bold uppercase tracking-wider block">Bearish consensus</span>
            <span className="text-2xl font-mono font-extrabold text-[#FF4B55] mt-1 block">{bearishPct}%</span>
            <span className="text-[10px] text-slate-400 mt-1 block">{bearishCount} negative signals</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FF4B55]/10 border border-[#FF4B55]/20 flex items-center justify-center text-[#FF4B55]">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Consensus Health */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Global Sentiment Bias</span>
            <span className={`text-lg font-extrabold mt-1 block uppercase ${
              bullishPct > 55 ? 'text-[#2EE59D]' : bearishPct > 55 ? 'text-[#FF4B55]' : 'text-slate-300'
            }`}>
              {bullishPct > 55 ? 'Strong Buy Bias' : bearishPct > 55 ? 'Bear Reversion' : 'Neutral Consolidation'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Consensus ratio: {bullishPct}:{bearishPct}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <Hash className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* --- Filter / Control Bar --- */}
      <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search tweets, handles, tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0F1115] border border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white placeholder-slate-500"
          />
        </div>

        {/* Filter Selection Grid */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Ticker Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Asset:</span>
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white cursor-pointer"
            >
              <option value="All">All Assets</option>
              <option value="MTNN">MTNN</option>
              <option value="DANGCEM">DANGCEM</option>
              <option value="SEPLAT">SEPLAT</option>
              <option value="GTCO">GTCO</option>
              <option value="NVDA">NVDA</option>
              <option value="AAPL">AAPL</option>
              <option value="MSFT">MSFT</option>
              <option value="TSLA">TSLA</option>
            </select>
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sentiment:</span>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white cursor-pointer"
            >
              <option value="All">All Sentiments</option>
              <option value="Bullish">Bullish Only</option>
              <option value="Bearish">Bearish Only</option>
              <option value="Neutral">Neutral Only</option>
            </select>
          </div>

          {/* Refresh Action */}
          <button
            onClick={fetchGlobalNews}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* --- Main Contents split view --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Real-time Tweets Feed (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4D88FF] animate-pulse" />
              Real-Time X (Twitter) Sentiment Stream
            </h3>
            
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-xs text-slate-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span>Aggregating global X.com sentiment channels...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                No matching social reports found in stream.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post, idx) => {
                  const isBull = post.sentiment === 'Bullish';
                  const isBear = post.sentiment === 'Bearish';
                  const metrics = getPostMetrics(post.text);
                  
                  return (
                    <div 
                      key={idx} 
                      className="p-4 bg-[#0F1115] border border-white/5 rounded-xl hover:border-slate-800 transition-all space-y-3 relative group"
                    >
                      {/* Tweet header */}
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2.5 items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center font-bold text-xs text-[#4D88FF] border border-indigo-500/20">
                            {post.username[1].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white hover:underline cursor-pointer">{post.username.replace('@', '')}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                              <span className="text-[10px] text-slate-500 font-mono">{post.username}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">{post.timestamp}</span>
                          </div>
                        </div>

                        {/* Top-Right Badges */}
                        <div className="flex items-center gap-2">
                          {/* Ticker Indicator */}
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            ${post.ticker}
                          </span>
                          {/* Sentiment Tag */}
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isBull ? 'text-[#2EE59D] bg-[#2EE59D]/10 border border-[#2EE59D]/20' :
                            isBear ? 'text-[#FF4B55] bg-[#FF4B55]/10 border border-[#FF4B55]/20' :
                            'text-slate-400 bg-white/5 border border-white/10'
                          }`}>
                            {post.sentiment}
                          </span>
                        </div>
                      </div>

                      {/* Tweet body */}
                      <p className="text-xs text-slate-200 leading-relaxed font-sans font-light break-words pl-1">
                        {post.text}
                      </p>

                      {/* Interactive mock stats */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pl-1 max-w-sm pt-1.5 border-t border-white/5 select-none">
                        <button className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{metrics.replies}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-[#2EE59D] transition-colors">
                          <Repeat2 className="w-3.5 h-3.5" />
                          <span>{metrics.retweets}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-[#FF4B55] transition-colors">
                          <Heart className="w-3.5 h-3.5" />
                          <span>{metrics.likes}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sentiment Heatmap Overview (col-span-1) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#4D88FF]" />
                Asset Sentiment Radar
              </h3>
              <span className="text-[10px] text-[#A1A5B0] font-light">Distribution across key tickers</span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                Rendering radar metrics...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                No sentiment data to plot.
              </div>
            ) : (
              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="ticker" stroke="#555" fontSize={10} tickLine={false} />
                    <YAxis stroke="#555" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }}
                      itemStyle={{ fontSize: 10 }}
                    />
                    <Bar dataKey="Bullish" stackId="a" fill="#2EE59D" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Bearish" stackId="a" fill="#FF4B55" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Neutral" stackId="a" fill="#718096" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Custom Sentiment Checklist */}
            <div className="space-y-3.5 border-t border-white/5 pt-4">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Consensus breakdown</span>
              
              <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2EE59D]" />
                  Bullish Stream
                </span>
                <span className="font-mono font-bold text-white">{bullishCount} posts</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF4B55]" />
                  Bearish Stream
                </span>
                <span className="font-mono font-bold text-white">{bearishCount} posts</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Neutral Stream
                </span>
                <span className="font-mono font-bold text-white">{neutralCount} posts</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
