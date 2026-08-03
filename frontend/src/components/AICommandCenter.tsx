import { useState } from 'react';
import { Cpu, MessageSquare, Play, Pause } from 'lucide-react';


interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'IDLE' | 'BUSY' | 'STREAMING' | 'PAUSED';
  model: string;
  activeTask: string;
  confidence: number;
}

export default function AICommandCenter() {
  const [agents, setAgents] = useState<AgentStatus[]>([
    { id: 'quant', name: 'Quant AI', role: 'Signal & Feature Engineering', status: 'STREAMING', model: 'Gemini 2.5 Flash', activeTask: 'Evaluating 1H Order Block Squeezes', confidence: 92 },
    { id: 'research', name: 'Research AI', role: 'Literature & Backtesting', status: 'BUSY', model: 'Claude 3.5 Sonnet', activeTask: 'Monte Carlo Resampling N=1,000', confidence: 88 },
    { id: 'risk', name: 'Risk AI', role: 'Portfolio Guardrails & VaR', status: 'IDLE', model: 'GPT-4o', activeTask: 'Monitoring Drawdown Limits', confidence: 96 },
    { id: 'news', name: 'News & Sentiment AI', role: 'Social & Macro NLP', status: 'STREAMING', model: 'DeepSeek R1', activeTask: 'Parsing Federal Reserve Speech', confidence: 84 },
    { id: 'portfolio', name: 'Portfolio AI', role: 'Execution & Allocation', status: 'IDLE', model: 'Kronos Quant v2', activeTask: 'Optimal Rebalancing Execution', confidence: 90 }
  ]);

  const [activeTab, setActiveTab] = useState<'agents' | 'debate' | 'telemetry' | 'decisions'>('agents');

  const toggleAgentPause = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'PAUSED' ? 'IDLE' : 'PAUSED' } : a));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 glass-panel border border-purple-500/30 bg-slate-950/80 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">AI Command Center & Multi-Agent Orchestrator</h1>
            <p className="text-xs text-gray-400">Manage autonomous quant agents, multi-agent consensus debates & task telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'agents' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'bg-slate-900 text-gray-400'
            }`}
          >
            Agents Roster (5)
          </button>
          <button
            onClick={() => setActiveTab('debate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'debate' ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-gray-400'
            }`}
          >
            Live Agent Debate
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'telemetry' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-slate-900 text-gray-400'
            }`}
          >
            System Telemetry
          </button>
        </div>
      </div>

      {/* Agents Roster */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="p-5 rounded-xl border border-gray-800 bg-slate-950/80 space-y-4 hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {agent.name}
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {agent.model}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{agent.role}</p>
                </div>

                <button
                  onClick={() => toggleAgentPause(agent.id)}
                  className="p-1.5 rounded bg-slate-900 border border-gray-800 text-gray-400 hover:text-white"
                  title={agent.status === 'PAUSED' ? 'Resume Agent' : 'Pause Agent'}
                >
                  {agent.status === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-gray-800 text-xs font-mono">
                <span className="text-gray-500 text-[10px] block uppercase">Current Active Task</span>
                <span className="text-gray-200">{agent.activeTask}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-gray-400">Status: <span className={agent.status === 'STREAMING' ? 'text-cyan-400 font-bold animate-pulse' : agent.status === 'BUSY' ? 'text-amber-400 font-bold' : agent.status === 'PAUSED' ? 'text-rose-400' : 'text-emerald-400'}>{agent.status}</span></span>
                <span className="text-gray-400">Confidence: <span className="text-purple-300 font-bold">{agent.confidence}%</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Agent Debate Stream */}
      {activeTab === 'debate' && (
        <div className="glass-panel p-6 border border-cyan-500/20 bg-slate-950/80 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Autonomous Multi-Agent Strategy Consensus Stream</span>
          </h3>

          <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto p-4 bg-slate-900/80 rounded-xl border border-gray-800">
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <span className="font-bold block text-indigo-400">[Quant AI] 16:42:10</span>
              "BTCUSDT 1H candle completed VWAP crossover (+2.4 sigma). Volume delta positive at +$42M."
            </div>

            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <span className="font-bold block text-purple-400">[Research AI] 16:42:12</span>
              "Backtest lookup for VWAP crossover under current 20d volatility regime yields 68% win rate across 142 historical occurrences."
            </div>

            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
              <span className="font-bold block text-rose-400">[Risk AI] 16:42:14</span>
              "Portfolio VaR limit allows max order size of 0.75 BTC. Trailing stop must be set at 63,800 USDT."
            </div>
          </div>
        </div>
      )}

      {/* System Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 bg-slate-950/80 border border-gray-800 rounded-xl">
            <span className="text-gray-400 block text-[10px] uppercase">CPU Load</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1">18.4%</span>
            <span className="text-[10px] text-gray-500 block mt-1">8 Cores Active</span>
          </div>

          <div className="glass-panel p-5 bg-slate-950/80 border border-gray-800 rounded-xl">
            <span className="text-gray-400 block text-[10px] uppercase">RAM Allocation</span>
            <span className="text-2xl font-bold text-cyan-400 mt-1">4.2 GB / 16 GB</span>
            <span className="text-[10px] text-gray-500 block mt-1">Feature Engine Cache Warm</span>
          </div>

          <div className="glass-panel p-5 bg-slate-950/80 border border-gray-800 rounded-xl">
            <span className="text-gray-400 block text-[10px] uppercase">API Tokens Used Today</span>
            <span className="text-2xl font-bold text-purple-400 mt-1">142,850</span>
            <span className="text-[10px] text-gray-500 block mt-1">Quota 1,000,000 tokens</span>
          </div>
        </div>
      )}
    </div>
  );
}
