import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Bot,
  BarChart2
} from 'lucide-react';
import { 
  ComposedChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

interface Trade {
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  exit_price: number;
  entry_date: string;
  exit_date: string;
  pnl: number;
  r_multiple: number;
  fees: number;
  net_pnl: number;
}

interface BotSession {
  id: number;
  bot_id: string;
  strategy_name: string;
  symbol: string;
  start_time: string;
  end_time: string;
  start_cash: number;
  end_cash: number;
  pnl: number;
  total_trades: number;
  wins: number;
  losses: number;
  trades_json: Trade[];
  last_alpha_rationale?: string;
  custom_charts?: {
    candle_lines?: Record<string, Array<{ time: number; value: number | null; color: string | null }>>;
    candle_horizontal_lines?: Record<string, { value: number; color: string | null; line_width: number; line_style: string }>;
    extra_charts?: Record<string, Record<string, Array<{ time: number; value: number | null; color: string | null }>>>;
    extra_horizontal_lines?: Record<string, Record<string, { value: number; color: string | null }>>;
  };
}

// ─── Candlestick shape — receives y=top-of-wickRange, height=wickRange pixels ─
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || !height || height <= 0 || width <= 0) return null;
  const { open, high, low, close } = payload;
  const priceRange = high - low;
  if (priceRange <= 0) return null;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#ef4444';
  const cx = x + width / 2;
  const bw = Math.max(2, width - 2);
  const pxPerPrice = height / priceRange;
  const bodyTop    = y + (high - Math.max(open, close)) * pxPerPrice;
  const bodyBottom = y + (high - Math.min(open, close)) * pxPerPrice;
  const bodyH = Math.max(1, bodyBottom - bodyTop);
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x + 1} y={bodyTop} width={bw} height={bodyH} fill={color} fillOpacity={0.85} />
    </g>
  );
};

export default function HistoryResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<BotSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState<any[]>([]);
  const [candleLoading, setCandleLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'candlestick' | 'performance'>('candlestick');

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          const found = data.sessions.find((s: BotSession) => s.id.toString() === sessionId);
          setSession(found || null);
        }
      })
      .catch(err => console.error("Failed to fetch history:", err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      setCandleLoading(true);
      fetch(`/api/history/${session.id}/candles`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setCandles(data.candles);
          }
        })
        .catch(err => console.error("Failed to fetch session candles:", err))
        .finally(() => setCandleLoading(false));
    }
  }, [session]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400 font-mono animate-pulse">Loading Session Results...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="text-slate-400 font-mono">Session not found.</div>
        <button 
          onClick={() => navigate('/history')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-mono text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Helper to locate closest value in a custom line dataset
  const findClosestValue = (points: any[], targetTime: number) => {
    if (!points || points.length === 0) return null;
    let closest = points[0];
    let minDiff = Math.abs(points[0].time - targetTime);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }
    if (minDiff > 24 * 3600 * 1000) return null; // 1 day tolerance
    return closest.value;
  };

  // Generate Equity Curve and Drawdowns data from trades
  let currentEquity = session.start_cash;
  let peak = session.start_cash;
  const equityData = [{ 
    date: session.start_time, 
    equity: currentEquity, 
    drawdown: 0 
  }];
  
  session.trades_json.forEach((t) => {
    currentEquity += t.net_pnl;
    if (currentEquity > peak) {
      peak = currentEquity;
    }
    const drawdown = peak > 0 ? ((currentEquity - peak) / peak) * 100 : 0;
    equityData.push({ 
      date: t.exit_date, 
      equity: currentEquity, 
      drawdown: Number(drawdown.toFixed(2)) 
    });
  });
  
  // Add final point
  if (equityData[equityData.length - 1].date !== session.end_time) {
      if (currentEquity > peak) peak = currentEquity;
      const drawdown = peak > 0 ? ((currentEquity - peak) / peak) * 100 : 0;
      equityData.push({ 
        date: session.end_time, 
        equity: currentEquity, 
        drawdown: Number(drawdown.toFixed(2)) 
      });
  }

  const isProfitable = session.pnl >= 0;

  // ─── Construct Fills from Trades ───
  const fills: any[] = [];
  session.trades_json.forEach((t) => {
    if (t.entry_price > 0) {
      fills.push({
        symbol: t.symbol,
        side: t.side.toUpperCase(),
        price: t.entry_price,
        timestamp: t.entry_date,
      });
    }
    if (t.exit_price > 0) {
      const exitSide = (t.side.toUpperCase() === 'BUY' || t.side.toUpperCase() === 'LONG') ? 'SELL' : 'BUY';
      fills.push({
        symbol: t.symbol,
        side: exitSide,
        price: t.exit_price,
        timestamp: t.exit_date,
      });
    }
  });

  // ─── Merge candles and fills ───
  const mergedCandles = candles.map((c: any, index: number) => {
    const cTime = new Date(c.time).getTime();
    let nextTime = index < candles.length - 1 
      ? new Date(candles[index + 1].time).getTime() 
      : cTime + 3600000;
    
    let signal: string | null = null;
    let signalPrice: number | null = null;
    
    for (const f of fills) {
      const fTime = new Date(f.timestamp).getTime();
      if (fTime >= cTime && fTime < nextTime) {
        signal = f.side;
        signalPrice = f.price;
        break;
      }
    }
    return { ...c, signal, signalPrice };
  });

  const lows = mergedCandles.map((c: any) => c.low);
  const highs = mergedCandles.map((c: any) => c.high);
  const priceMin = Math.min(...lows);
  const priceMax = Math.max(...highs);
  const rangeTotal = priceMax - priceMin || 1;

  const normalizedCandles = mergedCandles.map((c: any) => {
    const cTime = new Date(c.time).getTime();
    const customLinesData: any = {};
    if (session.custom_charts?.candle_lines) {
      Object.keys(session.custom_charts.candle_lines).forEach((title) => {
        const pts = session.custom_charts?.candle_lines?.[title] || [];
        const val = findClosestValue(pts, cTime);
        if (val !== null) {
          customLinesData[title] = val - priceMin;
          customLinesData[`${title}_raw`] = val;
        }
      });
    }
    return {
      ...c,
      _base: c.low - priceMin,
      _wick: c.high - c.low,
      _signal: c.signalPrice != null ? c.signalPrice - priceMin : null,
      ...customLinesData
    };
  });

  const fmtReal = (v: number) => v > 1000 ? `$${(v / 1000).toFixed(2)}k` : `$${v.toFixed(2)}`;

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6">
      <button 
        onClick={() => navigate('/history')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-semibold text-sm">Back to Ledger</span>
      </button>

      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.strategy_name.includes('AI') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-300'}`}>
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              {session.strategy_name}
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono uppercase">
                {session.symbol}
              </span>
            </h2>
            <p className="text-sm text-slate-400 font-mono mt-1">Session ID: {session.bot_id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-extrabold font-mono flex items-center justify-end gap-2 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
            {isProfitable ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            {isProfitable ? '+' : '-'}${Math.abs(session.pnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
          <div className="text-sm text-slate-500 uppercase tracking-wider font-bold mt-1">
            Net Session PnL
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Starting Capital</span>
          <span className="text-lg font-mono text-white">${session.start_cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Final Capital</span>
          <span className="text-lg font-mono text-white">${session.end_cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Total Trades</span>
          <span className="text-lg font-mono text-white">{session.total_trades}</span>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Win/Loss</span>
          <span className="text-lg font-mono text-white">
            <span className="text-emerald-400">{session.wins}W</span> / <span className="text-red-400">{session.losses}L</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm font-mono text-slate-400 bg-slate-900/30 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Started: {session.start_time}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          Ended: {session.end_time}
        </div>
      </div>

      {session.last_alpha_rationale && session.last_alpha_rationale.trim() !== '' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Final Alpha Brief Rationale</h3>
          </div>
          <p className="text-sm text-slate-300 font-mono leading-relaxed">
            {session.last_alpha_rationale}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab('candlestick')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'candlestick'
              ? 'border-indigo-500 text-white bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Execution Candles
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'performance'
              ? 'border-indigo-500 text-white bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Equity & Drawdowns
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'candlestick' ? (
        <div className="space-y-4">
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg min-h-[380px] flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-4 flex items-center justify-between">
              <span>Intraday Price candles & executions ({session.symbol})</span>
              <span className="text-[10px] text-slate-500 uppercase">Interactive Chart</span>
            </h3>
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              {candleLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : candles.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p className="text-xs text-slate-500">No candle data returned from yfinance for this session.</p>
                </div>
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={normalizedCandles} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="time" stroke="#334155"
                        tick={{ fill: '#64748b', fontSize: 8 }} tickLine={false}
                        tickFormatter={(v: string) => {
                          try {
                            const d = new Date(v);
                            return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                          } catch {
                            return v;
                          }
                        }}
                      />
                      <YAxis
                        domain={[0, rangeTotal * 1.02]}
                        stroke="#334155"
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        tickLine={false}
                        tickFormatter={(v: number) => fmtReal(v + priceMin)}
                      />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#0f172a] border border-white/10 rounded-xl p-3 text-[11px] font-mono shadow-2xl">
                              <div className="text-slate-400 mb-1.5">{new Date(d.time).toLocaleString()}</div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                <span className="text-slate-500">Open</span><span className="text-white font-bold">{fmtReal(d.open)}</span>
                                <span className="text-slate-500">High</span><span className="text-emerald-400 font-bold">{fmtReal(d.high)}</span>
                                <span className="text-slate-500">Low</span><span className="text-red-400 font-bold">{fmtReal(d.low)}</span>
                                <span className="text-slate-500">Close</span><span className={`font-bold ${d.close >= d.open ? 'text-emerald-400' : 'text-red-400'}`}>{fmtReal(d.close)}</span>
                              </div>
                              {session.custom_charts?.candle_lines && Object.keys(session.custom_charts.candle_lines).map((title) => {
                                const val = d[`${title}_raw`];
                                if (val === undefined || val === null) return null;
                                const pts = session.custom_charts!.candle_lines![title];
                                const color = pts[0]?.color || '#a855f7';
                                return (
                                  <div key={title} className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-0.5 border-t border-white/5 pt-0.5">
                                    <span style={{ color }}>{title}</span>
                                    <span className="text-white font-bold">{val.toFixed(4)}</span>
                                  </div>
                                );
                              })}
                              {d.signal && (
                                <div className={`mt-2 text-center font-bold px-2 py-0.5 rounded text-[10px] ${
                                  d.signal === 'BUY' || d.signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {d.signal === 'BUY' || d.signal === 'LONG' ? '▲ BUY' : '▼ SELL'} @ {fmtReal(d.signalPrice || d.close)}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="_base" stackId="c" fill="transparent" isAnimationActive={false} legendType="none" />
                      <Bar dataKey="_wick" stackId="c" shape={<CandlestickBar />} isAnimationActive={false} legendType="none" />
                      <Line
                        type="monotone" dataKey="_signal"
                        stroke="transparent"
                        dot={(p: any) => {
                          if (!p.payload?.signal) return <g key={p.key} />;
                          const isBuy = p.payload.signal === 'BUY' || p.payload.signal === 'LONG';
                          const col = isBuy ? '#10b981' : '#ef4444';
                          return (
                            <g key={p.key}>
                              <circle cx={p.cx} cy={p.cy} r={6} fill={col} stroke="#1e293b" strokeWidth={1.5} />
                            </g>
                          );
                        }}
                        isAnimationActive={false} legendType="none"
                      />
                      {session.custom_charts?.candle_lines && Object.keys(session.custom_charts.candle_lines).map((title) => {
                        const pts = session.custom_charts!.candle_lines![title];
                        const color = pts[0]?.color || '#a855f7';
                        return (
                          <Line
                            key={title}
                            type="monotone"
                            dataKey={title}
                            stroke={color}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                            name={title}
                          />
                        );
                      })}
                      {fills.map((f: any, i: number) => (
                        <ReferenceLine key={i}
                          y={f.price - priceMin}
                          stroke={f.side === 'BUY' || f.side === 'LONG' ? '#10b981' : '#ef4444'}
                          strokeDasharray="3 3" strokeWidth={0.8} strokeOpacity={0.6}
                          label={{ 
                            value: `${f.side === 'BUY' || f.side === 'LONG' ? '▲' : '▼'} ${fmtReal(f.price)}`, 
                            fill: f.side === 'BUY' || f.side === 'LONG' ? '#10b981' : '#ef4444', 
                            fontSize: 8, 
                            position: 'insideRight' 
                          }}
                        />
                      ))}
                      {session.custom_charts?.candle_horizontal_lines && Object.entries(session.custom_charts.candle_horizontal_lines).map(([title, config]: any) => {
                        const val = config.value - priceMin;
                        const color = config.color || '#f43f5e';
                        const dash = config.line_style === 'dotted' ? '1 3' : config.line_style === 'dashed' ? '5 5' : undefined;
                        return (
                          <ReferenceLine
                            key={title}
                            y={val}
                            stroke={color}
                            strokeWidth={config.line_width || 1.5}
                            strokeDasharray={dash}
                            label={{
                              value: `${title} (${config.value})`,
                              fill: color,
                              fontSize: 8,
                              position: 'insideRight'
                            }}
                          />
                        );
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Extra charts dynamic rendering (like RSI, MACD, etc.) */}
          {session.custom_charts?.extra_charts && Object.entries(session.custom_charts.extra_charts).map(([chartName, titleMap]: [string, any]) => {
            const lineNames = Object.keys(titleMap);
            if (lineNames.length === 0) return null;

            const extraChartData = mergedCandles.map((c: any) => {
              const cTime = new Date(c.time).getTime();
              const pointsData: any = { time: c.time };
              lineNames.forEach((title) => {
                const pts = titleMap[title] || [];
                const val = findClosestValue(pts, cTime);
                if (val !== null) {
                  pointsData[title] = val;
                }
              });
              return pointsData;
            });

            const horizontalLines = session.custom_charts?.extra_horizontal_lines?.[chartName] || {};

            return (
              <div key={chartName} className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[200px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3">
                  {chartName} Chart
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={extraChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="time" stroke="#334155"
                        tick={{ fill: '#64748b', fontSize: 8 }} tickLine={false}
                        tickFormatter={(v: string) => {
                          try {
                            const d = new Date(v);
                            return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                          } catch {
                            return v;
                          }
                        }}
                      />
                      <YAxis
                        stroke="#334155"
                        tick={{ fill: '#64748b', fontSize: 8 }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#0f172a] border border-white/10 rounded-xl p-2.5 text-[10px] font-mono shadow-2xl">
                              <div className="text-slate-400 mb-1">{new Date(d.time).toLocaleString()}</div>
                              {payload.map((p: any) => (
                                <div key={p.name} className="flex gap-4 justify-between">
                                  <span style={{ color: p.color }}>{p.name}</span>
                                  <span className="text-white font-bold">{p.value?.toFixed(4)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend verticalAlign="top" height={24} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                      {lineNames.map((title) => {
                        const pts = titleMap[title];
                        const color = pts[0]?.color || '#3b82f6';
                        return (
                          <Line
                            key={title}
                            type="monotone"
                            dataKey={title}
                            stroke={color}
                            strokeWidth={1.2}
                            dot={false}
                            isAnimationActive={false}
                            name={title}
                          />
                        );
                      })}
                      {Object.entries(horizontalLines).map(([title, config]: any) => {
                        const color = config.color || '#ef4444';
                        return (
                          <ReferenceLine
                            key={title}
                            y={config.value}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            label={{
                              value: `${title} (${config.value})`,
                              fill: color,
                              fontSize: 7,
                              position: 'insideRight'
                            }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Equity Curve */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[340px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-4">
              Session Equity Curve
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#334155" 
                    tick={{fill: '#64748b', fontSize: 10}}
                    tickFormatter={(val) => val.split(' ')[1] || val}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    stroke="#334155"
                    tick={{fill: '#64748b', fontSize: 10}}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Equity']}
                  />
                  <ReferenceLine y={session.start_cash} stroke="#334155" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke={isProfitable ? "#10b981" : "#ef4444"} 
                    strokeWidth={2.5} 
                    dot={true}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawdowns Chart */}
          <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[240px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-4 flex items-center justify-between">
              <span>Session Drawdown (%)</span>
              <span className="text-red-400 font-mono text-xs font-bold">
                Max DD: {Math.min(...equityData.map(d => d.drawdown)).toFixed(2)}%
              </span>
            </h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#334155" 
                    tick={{fill: '#64748b', fontSize: 10}}
                    tickFormatter={(val) => val.split(' ')[1] || val}
                  />
                  <YAxis 
                    domain={['auto', 0]}
                    stroke="#334155"
                    tick={{fill: '#64748b', fontSize: 10}}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
                    itemStyle={{ color: '#ef4444' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value: any) => [`${value}%`, 'Drawdown']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="drawdown" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Trades Table */}
      <div className="bg-[#1A1D24] border border-white/5 rounded-xl shadow-lg flex flex-col">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Trade Executions Ledger
          </h3>
        </div>
        <div className="overflow-x-auto">
          {session.trades_json.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 font-mono">
                <tr>
                  <th className="p-4 font-semibold">Symbol</th>
                  <th className="p-4 font-semibold">Side</th>
                  <th className="p-4 font-semibold text-right">Qty</th>
                  <th className="p-4 font-semibold text-right">Entry Price</th>
                  <th className="p-4 font-semibold text-right">Exit Price</th>
                  <th className="p-4 font-semibold text-right">Net PnL</th>
                  <th className="p-4 font-semibold text-right">R-Multi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/10">
                {session.trades_json.map((t, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-slate-300">{t.symbol}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.side.toUpperCase() === 'BUY' || t.side.toUpperCase() === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-400">{t.qty}</td>
                    <td className="p-4 text-right font-mono text-slate-400">${t.entry_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="p-4 text-right font-mono text-slate-400">${t.exit_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className={`p-4 text-right font-mono font-bold ${t.net_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.net_pnl >= 0 ? '+' : '-'}${Math.abs(t.net_pnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-400">{t.r_multiple.toFixed(2)}R</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              No trades were executed during this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
