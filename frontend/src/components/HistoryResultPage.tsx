import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Bot
} from 'lucide-react';
import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
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
}

export default function HistoryResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<BotSession | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Generate Equity Curve data from trades
  let currentEquity = session.start_cash;
  const equityData = [{ date: session.start_time, equity: currentEquity }];
  
  session.trades_json.forEach((t) => {
    currentEquity += t.net_pnl;
    equityData.push({ date: t.exit_date, equity: currentEquity });
  });
  
  // Add final point
  if (equityData[equityData.length - 1].date !== session.end_time) {
      equityData.push({ date: session.end_time, equity: currentEquity });
  }

  const isProfitable = session.pnl >= 0;

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

      <div className="flex items-center gap-6 text-sm font-mono text-slate-400 bg-slate-900/30 p-4 rounded-xl border border-white/5">
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
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Final Alpha Brief Rationale</h3>
          </div>
          <p className="text-sm text-slate-300 font-mono leading-relaxed">
            {session.last_alpha_rationale}
          </p>
        </div>
      )}

      {/* Equity Curve */}
      <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[400px] flex flex-col">
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
                formatter={(value: number) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Equity']}
              />
              <ReferenceLine y={session.start_cash} stroke="#334155" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke={isProfitable ? "#10b981" : "#ef4444"} 
                strokeWidth={2} 
                dot={true}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[#1A1D24] border border-white/5 rounded-xl shadow-lg flex flex-col">
        <div className="p-5 border-b border-white/5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Trade Executions
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
