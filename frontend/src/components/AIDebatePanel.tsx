import { useState } from 'react';
import { Cpu } from 'lucide-react';

interface AIDebatePanelProps {
  ticker: string;
}

export default function AIDebatePanel({ ticker }: AIDebatePanelProps) {

  const [debating, setDebating] = useState(false);
  const [debateResult, setDebateResult] = useState<any>({
    ticker,
    confidence: 0.84,
    consensus: 'BULLISH',
    recommendation: 'BUY',
    entryPrice: 64250,
    stopLoss: 63100,
    takeProfit: 66800,
    maxAllocationPct: 15.0,
    agents: [
      {
        role: 'Technical Analyst',
        avatar: '📊',
        signal: 'BULLISH',
        confidence: 0.88,
        thesis: '20-period EMA crossed above 50-period EMA with RSI bouncing off 32 (oversold region). VWAP support holding firm.',
        keyMetrics: { RSI: 34.2, MACD: '+12.4', VWAP: '$63,980' }
      },
      {
        role: 'Macro & Sentiment',
        avatar: '🌐',
        signal: 'NEUTRAL-BULLISH',
        confidence: 0.76,
        thesis: 'Funding rates normalized to +0.01% while Open Interest expanded +$450M over 24h. Fear & Greed index at 28 (Fear zone favors mean-reversion).',
        keyMetrics: { Funding: '+0.01%', OI_Change: '+$450M', FearGreed: 28 }
      },
      {
        role: 'Risk Supervisor',
        avatar: '🛡️',
        signal: 'APPROVED',
        confidence: 0.92,
        thesis: 'Risk bounds satisfied. ATR sizing permits max 15.0% allocation with tight 1.8% stop-loss at $63,100.',
        keyMetrics: { RiskR: '2.3:1', MaxDrawdownCap: '3.0%', ATR_Mult: '2.0x' }
      }
    ],
    moderatorSummary: 'Consensus achieved across Technical, Macro, and Risk agents. Recommended entry on minor dip near $64,250 with target $66,800.'
  });

  const triggerDebate = () => {
    setDebating(true);
    setTimeout(() => {
      setDebateResult((prev: any) => ({
        ...prev,
        confidence: Number((0.75 + Math.random() * 0.2).toFixed(2)),
      }));
      setDebating(false);
    }, 1500);
  };

  return (
    <div className="glass-panel p-5 border border-purple-500/20 bg-slate-950/80 shadow-2xl rounded-xl">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            MULTI-AGENT DEBATE TEAM
          </span>
          <span className="text-lg font-bold text-white">{ticker}</span>
        </div>
        <button
          onClick={triggerDebate}
          disabled={debating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs transition-all shadow-md disabled:opacity-50"
        >
          <Cpu className={`w-3.5 h-3.5 ${debating ? 'animate-spin' : ''}`} />
          <span>{debating ? 'Agents Debating...' : 'Trigger Multi-Agent Debate'}</span>
        </button>
      </div>

      {/* Consensus Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-4 p-4 rounded-xl bg-slate-900/80 border border-gray-800">
        <div>
          <div className="text-xs text-gray-400 font-mono">CONSENSUS SIGNAL</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              {debateResult.consensus} ({debateResult.recommendation})
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 font-mono">CONFIDENCE SCORE</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
            {(debateResult.confidence * 100).toFixed(0)}%
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 font-mono">EXECUTION BOUNDS</div>
          <div className="text-xs font-mono text-gray-300 mt-1">
            Entry: ${debateResult.entryPrice} | SL: ${debateResult.stopLoss}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 font-mono">RISK ALLOCATION</div>
          <div className="text-xs font-mono text-emerald-400 mt-1">
            Max {debateResult.maxAllocationPct}% Capital
          </div>
        </div>
      </div>

      {/* Agents Conversation Stream */}
      <div className="space-y-3">
        {debateResult.agents.map((agent: any, idx: number) => (
          <div key={idx} className="p-3.5 rounded-lg bg-slate-900/40 border border-gray-800/80 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{agent.avatar}</span>
                <span className="text-xs font-bold text-gray-200">{agent.role}</span>
                <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-gray-400 border border-gray-700">
                  Signal: {agent.signal}
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400">Confidence: {(agent.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">{agent.thesis}</p>

            {agent.keyMetrics && (
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-800/50 text-[11px] font-mono text-gray-400">
                {Object.entries(agent.keyMetrics).map(([k, v]: [string, any]) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-slate-950 border border-gray-800">
                    <span className="text-gray-500">{k}:</span> <span className="text-gray-200">{v}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Moderator Consensus Summary */}
      <div className="mt-4 p-3 rounded-lg bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
        <span className="font-bold text-purple-300">Moderator AI Synthesis:</span> {debateResult.moderatorSummary}
      </div>
    </div>
  );
}
