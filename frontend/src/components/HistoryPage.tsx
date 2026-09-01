import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, TrendingUp, TrendingDown, Bot, FlaskConical, Save } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'sessions' | 'experiments'>('sessions');
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState('');

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.status === 'success') {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch bot sessions:", err);
    }
  };

  const fetchExperiments = async () => {
    try {
      const res = await fetch('/api/experiments');
      const data = await res.json();
      if (data.status === 'success') {
        setExperiments(data.experiments || []);
      }
    } catch (err) {
      console.error("Failed to fetch experiment log:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSessions(), fetchExperiments()]).finally(() => setLoading(false));
  }, []);

  const handleSaveNotes = async (expId: number) => {
    try {
      const res = await fetch(`/api/experiments/${expId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_notes: notesText })
      });
      if (res.ok) {
        setEditingNotesId(null);
        fetchExperiments();
      }
    } catch (err) {
      console.error('Failed to update experiment notes:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Archive className="w-8 h-8 animate-pulse text-indigo-500" />
          <p className="font-mono text-sm tracking-wider uppercase">Loading Trade & Experiment Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">Ledger & History Workspace</h2>
          <p className="text-sm text-slate-400 mt-1">Review live bot executions and quantitative backtest experiment logs.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sessions'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-md'
                : 'bg-slate-900/60 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Live Bot Sessions ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('experiments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'experiments'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md'
                : 'bg-slate-900/60 text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Backtest Experiments ({experiments.length})</span>
          </button>
        </div>
      </div>

      {/* 1. Live Bot Sessions View */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-12">No active or past bot sessions recorded yet.</div>
          ) : (
            sessions.map((session) => {
              const isProfitable = session.pnl >= 0;

              return (
                <div key={session.id} className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden transition-all hover:border-indigo-500/30">
                  <div 
                    className="p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => navigate(`/history/${session.id}`)}
                  >
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
            })
          )}
        </div>
      )}

      {/* 2. Experiment Tracker View */}
      {activeTab === 'experiments' && (
        <div className="glass-panel p-6 border border-purple-500/20 bg-slate-950/80 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Quantitative Experiment Tracking Log</span>
          </h3>

          {experiments.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-12">No backtest experiments recorded yet. Run a backtest in the Backtesting Laboratory to auto-log your first experiment.</div>
          ) : (
            <div className="space-y-3">
              {experiments.map((exp: any) => (
                <div key={exp.id} className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{exp.strategy_name}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {exp.ticker} ({exp.interval})
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{exp.created_at}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-lg border border-gray-800">
                    <div><span className="text-gray-500">Period:</span> {exp.period}</div>
                    <div><span className="text-gray-500">PnL:</span> <span className={exp.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>${exp.pnl?.toFixed(2)} ({exp.pnl_pct?.toFixed(2)}%)</span></div>
                    <div><span className="text-gray-500">Sharpe:</span> <span className="text-cyan-300 font-bold">{exp.sharpe?.toFixed(2)}</span></div>
                    <div><span className="text-gray-500">Win Rate:</span> <span className="text-emerald-400 font-bold">{exp.win_rate?.toFixed(1)}%</span></div>
                    <div><span className="text-gray-500">Max DD:</span> <span className="text-rose-400 font-bold">-{exp.max_dd?.toFixed(1)}%</span></div>
                    <div><span className="text-gray-500">Trades:</span> {exp.total_trades}</div>
                  </div>

                  {/* AI Notes Editor */}
                  <div className="text-xs">
                    {editingNotesId === exp.id ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add research observations, parameter changes, or AI insights..."
                          className="w-full p-2.5 bg-slate-950 border border-purple-500/40 rounded-lg text-xs font-mono text-gray-200 outline-none resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingNotesId(null)} className="px-3 py-1 rounded bg-slate-800 text-gray-400 text-xs">Cancel</button>
                          <button onClick={() => handleSaveNotes(exp.id)} className="px-3 py-1 rounded bg-purple-600 text-white font-bold text-xs flex items-center gap-1">
                            <Save className="w-3 h-3" /> Save Notes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-gray-400 pt-1">
                        <p className="font-mono text-[11px] italic">{exp.ai_notes || 'No research notes attached.'}</p>
                        <button
                          onClick={() => {
                            setEditingNotesId(exp.id);
                            setNotesText(exp.ai_notes || '');
                          }}
                          className="text-[11px] font-mono text-purple-400 hover:underline"
                        >
                          Edit Notes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
