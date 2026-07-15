import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Archive, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  Bot
} from 'lucide-react';

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
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setSessions(data.sessions);
        }
      })
      .catch(err => console.error("Failed to fetch history:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Archive className="w-8 h-8 animate-pulse text-indigo-500" />
          <p className="font-mono text-sm tracking-wider uppercase">Loading Trade Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">Trade History</h2>
          <p className="text-sm text-slate-400 mt-1">Review your past live bot sessions and AI executions.</p>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => {
          const isProfitable = session.pnl >= 0;

          return (
            <div key={session.id} className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden transition-all">
              {/* Card Header / Summary */}
              <div 
                className="p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => navigate(`/history/${session.id}`)}
              >
                {/* Bot & Strategy Info */}
                <div className="flex items-center gap-4 min-w-[250px]">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${session.strategy_name.includes('AI') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-300'}`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      {session.strategy_name}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                        {session.symbol}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {session.bot_id}</p>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="flex flex-1 items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Starting Cash</span>
                    <span className="text-sm font-mono text-slate-300">${session.start_cash.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Total Trades</span>
                    <span className="text-sm font-mono text-slate-300">{session.total_trades}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Win/Loss</span>
                    <span className="text-sm font-mono text-slate-300">
                      <span className="text-emerald-400">{session.wins}W</span> / <span className="text-red-400">{session.losses}L</span>
                    </span>
                  </div>

                  <div className="flex flex-col items-end min-w-[120px]">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Net PnL</span>
                    <span className={`text-base font-bold font-mono flex items-center gap-1 ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {isProfitable ? '+' : '-'}${Math.abs(session.pnl).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
