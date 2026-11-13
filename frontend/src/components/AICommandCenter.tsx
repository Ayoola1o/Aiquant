import { useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, Bot, BrainCircuit, ChevronRight, Clock3, Cpu,
  Gauge, Layers3, MessageSquare,
  Pause, Play, Radio, RefreshCw, ShieldCheck, Sparkles, Terminal, Zap
} from 'lucide-react';

type AgentStatus = 'IDLE' | 'BUSY' | 'STREAMING' | 'PAUSED';
interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  model: string;
  activeTask: string;
  confidence: number;
  color: string;
  latency: string;
  tasks: string;
}

const initialAgents: Agent[] = [
  { id: 'quant', name: 'Quant Analyst', role: 'Signals, indicators & feature research', status: 'STREAMING', model: 'Gemini 2.5 Flash', activeTask: 'Evaluating BTCUSDT 1H momentum and VWAP structure', confidence: 92, color: 'cyan', latency: '184 ms', tasks: '248' },
  { id: 'research', name: 'Strategy Researcher', role: 'Research, validation & backtesting', status: 'BUSY', model: 'Claude 3.5 Sonnet', activeTask: 'Running Monte Carlo robustness checks', confidence: 88, color: 'purple', latency: '420 ms', tasks: '126' },
  { id: 'risk', name: 'Risk Monitor', role: 'Portfolio guardrails & exposure analysis', status: 'IDLE', model: 'GPT-4o', activeTask: 'Monitoring drawdown and position limits', confidence: 96, color: 'emerald', latency: '96 ms', tasks: '312' },
  { id: 'news', name: 'News Analyst', role: 'News, macro & sentiment intelligence', status: 'STREAMING', model: 'DeepSeek R1', activeTask: 'Scoring macro headlines for BTC and ETH', confidence: 84, color: 'amber', latency: '310 ms', tasks: '184' },
  { id: 'portfolio', name: 'Portfolio Optimizer', role: 'Allocation & execution recommendations', status: 'IDLE', model: 'Kronos Quant v2', activeTask: 'Waiting for portfolio rebalance request', confidence: 90, color: 'blue', latency: '—', tasks: '78' }
];

const statusStyles: Record<AgentStatus, string> = {
  STREAMING: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
  BUSY: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  IDLE: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  PAUSED: 'bg-rose-400/10 text-rose-300 border-rose-400/20'
};

const colorStyles: Record<string, string> = {
  cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-300 border-cyan-400/20',
  purple: 'from-purple-500/20 to-indigo-500/5 text-purple-300 border-purple-400/20',
  emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-300 border-emerald-400/20',
  amber: 'from-amber-500/20 to-orange-500/5 text-amber-300 border-amber-400/20',
  blue: 'from-blue-500/20 to-indigo-500/5 text-blue-300 border-blue-400/20'
};

const decisions = [
  { time: '14:32:08', agent: 'Quant Analyst', symbol: 'BTCUSDT', action: 'Momentum signal detected', detail: '1H VWAP reclaim with rising volume. Awaiting independent risk validation.', confidence: 92, tone: 'cyan' },
  { time: '14:28:41', agent: 'Risk Monitor', symbol: 'ETHUSDT', action: 'Position size constrained', detail: 'Proposed exposure exceeded the configured per-asset allocation threshold.', confidence: 96, tone: 'amber' },
  { time: '14:16:22', agent: 'Strategy Researcher', symbol: 'SOLUSDT', action: 'Setup rejected', detail: 'Out-of-sample expectancy fell below the strategy acceptance threshold.', confidence: 88, tone: 'rose' },
  { time: '13:58:04', agent: 'News Analyst', symbol: 'BTCUSDT', action: 'Sentiment update published', detail: 'Macro headline cluster classified as mixed; no directional bias recommended.', confidence: 84, tone: 'purple' }
];

export default function AICommandCenter() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'decisions' | 'telemetry'>('overview');
  const [notice, setNotice] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeCount = useMemo(() => agents.filter((agent) => agent.status === 'BUSY' || agent.status === 'STREAMING').length, [agents]);
  const averageConfidence = Math.round(agents.reduce((sum, agent) => sum + agent.confidence, 0) / agents.length);

  const toggleAgent = (id: string) => {
    setAgents((current) => current.map((agent) => {
      if (agent.id !== id) return agent;
      return { ...agent, status: agent.status === 'PAUSED' ? 'IDLE' : 'PAUSED' };
    }));
    setNotice('Agent state changed locally. Connect the orchestration API to persist agent lifecycle changes.');
  };

  const runAction = (label: string) => setNotice(label + ' is a UI action preview. The orchestration endpoint is not connected yet.');

  const refreshView = () => {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 450);
    setNotice('Agent roster refreshed from the current UI state.');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'agents', label: 'Agent roster' },
    { id: 'decisions', label: 'Decision log' },
    { id: 'telemetry', label: 'Telemetry' }
  ] as const;

  return (
    <main className="space-y-5 text-slate-200">
      <section className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-[#111b3c] via-[#0b1228] to-[#080d1b] p-5 md:p-6 shadow-[0_18px_60px_rgba(3,8,25,0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-between gap-7">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-indigo-300/20 bg-indigo-500/15 text-indigo-200 shadow-lg shadow-indigo-950/40">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Orchestration workspace</span>
                  <span className="text-[10px] text-slate-500">AI QUANT LAB / INTELLIGENCE</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">AI Command Center</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">Coordinate research agents, inspect model decisions and monitor the intelligence layer behind your trading workflow.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.07] bg-[#071020]/70 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Active agents</div>
                <div className="mt-1 text-2xl font-bold text-white">{activeCount}<span className="text-sm font-medium text-slate-500"> / 5</span></div>
                <div className="mt-1 text-[10px] text-emerald-300">Agent availability</div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#071020]/70 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Decisions today</div>
                <div className="mt-1 text-2xl font-bold text-white">1,248</div>
                <div className="mt-1 text-[10px] text-cyan-300">Illustrative metric</div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#071020]/70 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Avg. confidence</div>
                <div className="mt-1 text-2xl font-bold text-white">{averageConfidence}<span className="text-sm text-slate-400">%</span></div>
                <div className="mt-1 text-[10px] text-purple-300">Agent-reported</div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#071020]/70 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">System health</div>
                <div className="mt-1 flex items-center gap-2 text-xl font-bold text-emerald-300"><Activity className="h-5 w-5" /> Ready</div>
                <div className="mt-1 text-[10px] text-slate-500">UI status only</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-300/15 bg-[#080f24]/75 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Layers3 className="h-4 w-4 text-indigo-300" /> Agent network</div>
              <span className="text-[10px] text-slate-500">5 configured roles</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {agents.map((agent) => (
                <div key={agent.id} className="flex flex-col items-center gap-2">
                  <div className={'relative grid h-11 w-11 place-items-center rounded-xl border bg-gradient-to-br ' + colorStyles[agent.color]}>
                    <Bot className="h-5 w-5" />
                    <span className={'absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#080f24] ' + (agent.status === 'PAUSED' ? 'bg-rose-400' : agent.status === 'IDLE' ? 'bg-emerald-400' : agent.status === 'BUSY' ? 'bg-amber-400' : 'bg-cyan-400')} />
                  </div>
                  <span className="max-w-full truncate text-[9px] text-slate-400">{agent.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Orchestration capacity</span><span className="font-semibold text-white">{activeCount} / 5 agents</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all" style={{ width: (activeCount / 5 * 100) + '%' }} /></div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Agents analyze and recommend. Broker execution should remain gated by independent backend risk validation.</p>
            </div>
          </div>
        </div>
      </section>

      {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-200"><span>{notice}</span><button onClick={() => setNotice('')} className="text-indigo-300 hover:text-white">Dismiss</button></div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-[#090f1e] p-1">
          {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'rounded-lg px-3 py-2 text-xs font-semibold transition ' + (activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>{tab.label}</button>)}
        </div>
        <div className="flex gap-2">
          <button onClick={refreshView} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.07]"><RefreshCw className={'h-3.5 w-3.5 ' + (isRefreshing ? 'animate-spin' : '')} /> Refresh view</button>
          <button onClick={() => runAction('AI analysis')} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-950/40 hover:brightness-110"><Sparkles className="h-3.5 w-3.5" /> Run AI analysis</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
            <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">AI performance overview</h2><p className="mt-1 text-xs text-slate-500">Illustrative activity profile — connect model telemetry for live metrics.</p></div><span className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1 text-[10px] text-cyan-300">Last 7 days</span></div>
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Signals reviewed', value: '842', change: '+12.4%' }, { label: 'Consensus reached', value: '76.8%', change: '+4.2%' }, { label: 'Avg. response', value: '284 ms', change: '−18 ms' }].map((item) => <div key={item.label} className="rounded-xl border border-white/[0.06] bg-[#0d172b] p-3"><div className="text-[10px] text-slate-500">{item.label}</div><div className="mt-1 text-xl font-bold text-white">{item.value}</div><div className="mt-1 text-[10px] text-emerald-300">{item.change}</div></div>)}
            </div>
            <div className="mt-5 rounded-xl border border-white/[0.05] bg-[#070d19] p-3">
              <div className="mb-3 flex items-center justify-between text-xs"><span className="font-medium text-slate-300">Agent activity trend</span><span className="text-[10px] text-slate-500">Mon — Sun</span></div>
              <div className="flex h-36 items-end gap-2 sm:gap-4">
                {[42, 56, 48, 72, 63, 86, 76, 92, 68, 80, 95, 84, 72, 89, 100, 78, 88, 70, 94, 82, 74, 90, 68, 86].map((height, index) => <div key={index} className="group relative flex h-full flex-1 items-end"><div className="w-full rounded-t-sm bg-gradient-to-t from-indigo-700/80 to-cyan-400/80 transition-all group-hover:brightness-125" style={{ height: height + '%' }} /></div>)}
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-slate-600"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
            </div>
          </section>
          <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-white">AI insights</h2><Sparkles className="h-4 w-4 text-amber-300" /></div>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ArrowUpRight className="h-4 w-4" /> Momentum setup detected</div><p className="mt-1 text-xs leading-relaxed text-slate-400">Quant Analyst flagged a BTCUSDT 1H momentum condition. Route through risk validation before considering an order.</p><span className="mt-2 inline-block text-[9px] uppercase tracking-wider text-emerald-400/70">Example insight</span></div>
              <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-amber-300"><ShieldCheck className="h-4 w-4" /> Exposure review required</div><p className="mt-1 text-xs leading-relaxed text-slate-400">Portfolio concentration should be checked before adding correlated crypto exposure.</p><span className="mt-2 inline-block text-[9px] uppercase tracking-wider text-amber-400/70">Example insight</span></div>
              <div className="rounded-xl border border-purple-400/15 bg-purple-400/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-purple-300"><MessageSquare className="h-4 w-4" /> Consensus summary</div><p className="mt-1 text-xs leading-relaxed text-slate-400">Research and news agents have not established a unified directional view. Maintain a neutral stance.</p><span className="mt-2 inline-block text-[9px] uppercase tracking-wider text-purple-400/70">Example insight</span></div>
            </div>
          </section>
          <section className="xl:col-span-2 rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Agent status</h2><p className="mt-1 text-xs text-slate-500">Manage each agent independently.</p></div><button onClick={() => setActiveTab('agents')} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white">Manage agents <ChevronRight className="h-4 w-4" /></button></div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
              {agents.map((agent) => <div key={agent.id} className="rounded-xl border border-white/[0.06] bg-[#0c1527] p-3"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-gradient-to-br ' + colorStyles[agent.color]}><Bot className="h-4 w-4" /></span><span className="truncate text-xs font-semibold text-white">{agent.name}</span></div><span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold ' + statusStyles[agent.status]}>{agent.status}</span></div><div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>Confidence</span><span className="font-semibold text-slate-300">{agent.confidence}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: agent.confidence + '%' }} /></div></div>)}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'agents' && (
        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Agent roster</h2><p className="mt-1 text-xs text-slate-500">Pause and resume controls update this interface only until lifecycle APIs are connected.</p></div><span className="text-xs text-slate-500">{agents.length} agents configured</span></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {agents.map((agent) => <article key={agent.id} className="rounded-xl border border-white/[0.07] bg-[#0c1527] p-4 transition hover:border-indigo-400/25">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={'grid h-11 w-11 place-items-center rounded-xl border bg-gradient-to-br ' + colorStyles[agent.color]}><Bot className="h-5 w-5" /></div><div><h3 className="text-sm font-semibold text-white">{agent.name}</h3><p className="mt-0.5 text-[11px] text-slate-500">{agent.role}</p></div></div><span className={'rounded-full border px-2.5 py-1 text-[10px] font-semibold ' + statusStyles[agent.status]}>{agent.status}</span></div>
              <div className="mt-4 rounded-lg border border-white/[0.05] bg-[#080f1c] p-3"><div className="text-[9px] uppercase tracking-wider text-slate-600">Current task</div><p className="mt-1 text-xs text-slate-300">{agent.activeTask}</p></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><span className="block text-slate-600">Model</span><span className="mt-1 block truncate text-slate-300">{agent.model}</span></div><div><span className="block text-slate-600">Latency</span><span className="mt-1 block text-slate-300">{agent.latency}</span></div><div><span className="block text-slate-600">Tasks</span><span className="mt-1 block text-slate-300">{agent.tasks}</span></div></div>
              <div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-slate-400"><Gauge className="h-3.5 w-3.5 text-indigo-300" /> Confidence <strong className="text-white">{agent.confidence}%</strong></div><button onClick={() => toggleAgent(agent.id)} className={'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ' + (agent.status === 'PAUSED' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15' : 'border-amber-400/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15')}>{agent.status === 'PAUSED' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{agent.status === 'PAUSED' ? 'Resume agent' : 'Pause agent'}</button></div>
            </article>)}
          </div>
        </section>
      )}

      {activeTab === 'decisions' && (
        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Decision log</h2><p className="mt-1 text-xs text-slate-500">Example decision records. Replace with persisted agent events from the backend.</p></div><span className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">Sample records</span></div>
          <div className="space-y-2">{decisions.map((item) => <div key={item.time} className="grid gap-3 rounded-xl border border-white/[0.06] bg-[#0c1527] p-3 md:grid-cols-[90px_1fr_auto] md:items-center"><div className="flex items-center gap-2 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5" />{item.time}</div><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-white">{item.action}</span><span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] text-slate-400">{item.symbol}</span><span className="text-[10px] text-indigo-300">{item.agent}</span></div><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.detail}</p></div><div className="text-left md:text-right"><div className="text-sm font-bold text-white">{item.confidence}%</div><div className="text-[9px] uppercase tracking-wider text-slate-600">Confidence</div></div></div>)}</div>
        </section>
      )}

      {activeTab === 'telemetry' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[{ label: 'Agent CPU allocation', value: '18.4%', detail: 'Illustrative host metric', icon: Cpu, color: 'text-cyan-300' }, { label: 'Memory allocation', value: '4.2 GB', detail: 'Illustrative host metric', icon: Layers3, color: 'text-purple-300' }, { label: 'Inference requests', value: '1,248', detail: 'Sample daily count', icon: Radio, color: 'text-emerald-300' }, { label: 'Average latency', value: '284 ms', detail: 'Sample response time', icon: Zap, color: 'text-amber-300' }].map((metric) => <div key={metric.label} className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5"><metric.icon className={'h-5 w-5 ' + metric.color} /><div className="mt-4 text-xs text-slate-500">{metric.label}</div><div className="mt-1 text-2xl font-bold text-white">{metric.value}</div><div className="mt-1 text-[10px] text-slate-600">{metric.detail}</div></div>)}
          <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5 md:col-span-2 xl:col-span-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Terminal className="h-4 w-4 text-cyan-300" /> Runtime notes</div><div className="space-y-2 font-mono text-[10px] text-slate-500"><p><span className="text-emerald-300">[INFO]</span> Agent roster initialized in the client interface.</p><p><span className="text-cyan-300">[INFO]</span> Backend telemetry adapter is not connected to this view yet.</p><p><span className="text-amber-300">[WARN]</span> Sample performance values must not be interpreted as live model measurements.</p></div></section>
        </div>
      )}
    </main>
  );
}
