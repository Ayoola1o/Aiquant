import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Clock3, Flame, Gauge, Info,
  Radio, RefreshCw, ShieldAlert, ShieldCheck, Siren, TrendingDown, Zap
} from 'lucide-react';

interface TelemetryData {
  paused: boolean;
  portfolio_value: number;
  daily_starting_equity: number;
  current_drawdown_pct: number;
  max_drawdown_limit_pct: number;
  active_positions_count: number;
  max_simultaneous_trades: number;
  heartbeat_ok: boolean;
  timestamp: string;
}

type StressScenario = '2008_crash' | '2020_flash' | 'crypto_cascade';

const stressResults: Record<StressScenario, { label: string; pnlImpact: string; maxDrawdown: string; var95: string; var99: string; description: string }> = {
  '2008_crash': { label: '2008 Global Financial Crisis', pnlImpact: '-28.4%', maxDrawdown: '34.2%', var95: '$14,200', var99: '$22,500', description: 'Severe equity repricing, liquidity contraction and broad risk-off conditions.' },
  '2020_flash': { label: '2020 Flash Crash', pnlImpact: '-14.8%', maxDrawdown: '18.5%', var95: '$8,400', var99: '$12,800', description: 'Rapid volatility expansion with correlated cross-asset selling.' },
  'crypto_cascade': { label: 'Crypto Deleveraging', pnlImpact: '-38.2%', maxDrawdown: '42.1%', var95: '$19,800', var99: '$31,000', description: 'A sharp crypto market cascade with liquidity gaps and forced deleveraging.' }
};

const formatMoney = (value?: number) => typeof value === 'number' && Number.isFinite(value)
  ? '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  : '—';

export default function RiskCommandCenter() {
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);
  const [killSwitchPending, setKillSwitchPending] = useState(false);
  const [stressScenario, setStressScenario] = useState<StressScenario>('2020_flash');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/risk/status');
      if (!res.ok) throw new Error('Risk status endpoint returned ' + res.status);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setTelemetry(json.data as TelemetryData);
        setKillSwitchTriggered(Boolean(json.data.paused));
        setLastUpdated(new Date().toISOString());
        setApiError('');
      } else {
        throw new Error(json.message || 'Risk telemetry response was not recognized.');
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to reach the risk service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = window.setInterval(fetchTelemetry, 5000);
    return () => window.clearInterval(interval);
  }, [fetchTelemetry]);

  const handleToggleKillSwitch = async () => {
    if (killSwitchPending) return;
    const nextState = !killSwitchTriggered;
    setKillSwitchPending(true);
    setNotice('');
    try {
      const res = await fetch('/api/risk/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: nextState })
      });
      if (!res.ok) throw new Error('Risk control request failed with status ' + res.status);
      setKillSwitchTriggered(nextState);
      setNotice(nextState
        ? 'Emergency pause request accepted by the risk API. Verify broker order state and open orders.'
        : 'Resume request accepted by the risk API. Confirm all safeguards before live trading.');
      await fetchTelemetry();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Risk control request failed. The previous state was retained.');
    } finally {
      setKillSwitchPending(false);
    }
  };

  const currentStress = stressResults[stressScenario];
  const drawdown = telemetry?.current_drawdown_pct;
  const drawdownLimit = telemetry?.max_drawdown_limit_pct;
  const drawdownProgress = typeof drawdown === 'number' && typeof drawdownLimit === 'number' && drawdownLimit > 0
    ? Math.min(100, Math.max(0, Math.abs(drawdown) / drawdownLimit * 100))
    : 0;
  const riskLabel = useMemo(() => {
    if (!telemetry) return 'Awaiting telemetry';
    if (telemetry.paused) return 'Trading paused';
    if (telemetry.heartbeat_ok === false) return 'Feed stale';
    if (typeof drawdown === 'number' && typeof drawdownLimit === 'number' && drawdownLimit > 0 && Math.abs(drawdown) >= drawdownLimit * 0.8) return 'Elevated';
    return 'Within configured limits';
  }, [telemetry, drawdown, drawdownLimit]);

  const riskTone = !telemetry ? 'text-slate-400' : telemetry.paused || telemetry.heartbeat_ok === false ? 'text-rose-300' : drawdownProgress >= 80 ? 'text-amber-300' : 'text-emerald-300';

  return (
    <main className="space-y-5 text-slate-200">
      <section className="relative overflow-hidden rounded-2xl border border-rose-400/20 bg-gradient-to-br from-[#211327] via-[#111329] to-[#080e1d] p-5 shadow-[0_18px_60px_rgba(3,8,25,0.35)] md:p-6">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-rose-600/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-rose-300/20 bg-rose-500/15 text-rose-200"><ShieldAlert className="h-7 w-7" /></div><div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-200">Capital protection</span><span className="text-[10px] text-slate-500">AI QUANT LAB / RISK</span></div><h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Risk Command Center</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Monitor portfolio risk, validate guardrails and control the trading pause state from one operational workspace.</p></div></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#080d1b]/70 px-4 py-2.5"><div className="text-[9px] uppercase tracking-wider text-slate-500">Risk engine status</div><div className={'mt-1 flex items-center gap-2 text-xs font-semibold ' + riskTone}><span className={'h-2 w-2 rounded-full ' + (!telemetry ? 'bg-slate-500' : telemetry.paused || telemetry.heartbeat_ok === false ? 'bg-rose-400' : 'bg-emerald-400')} />{riskLabel}</div></div>
            <button disabled={killSwitchPending} onClick={handleToggleKillSwitch} className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-lg transition disabled:cursor-wait disabled:opacity-60 ' + (killSwitchTriggered ? 'border border-emerald-300/20 bg-emerald-600 text-white shadow-emerald-950/30 hover:bg-emerald-500' : 'border border-rose-300/20 bg-rose-600 text-white shadow-rose-950/40 hover:bg-rose-500')}>
              {killSwitchPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              {killSwitchPending ? 'Updating risk state…' : killSwitchTriggered ? 'Trading paused — request resume' : 'Emergency pause trading'}
            </button>
          </div>
        </div>
      </section>

      {(apiError || notice) && <div role="status" className={'flex flex-col gap-2 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ' + (apiError ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-200' : 'border-indigo-400/20 bg-indigo-500/10 text-indigo-200')}><span>{apiError ? 'Risk API: ' + apiError : notice}</span><button onClick={() => { setNotice(''); fetchTelemetry(); }} className="inline-flex items-center gap-1 font-semibold hover:text-white"><RefreshCw className="h-3 w-3" /> Retry / refresh</button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current drawdown</span><TrendingDown className="h-4 w-4 text-rose-300" /></div><div className="mt-2 text-2xl font-bold text-rose-300">{typeof drawdown === 'number' ? drawdown.toFixed(2) + '%' : '—'}</div><div className="mt-1 text-[10px] text-slate-500">Configured limit: {typeof drawdownLimit === 'number' ? drawdownLimit + '%' : '—'}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={'h-full rounded-full ' + (drawdownProgress >= 80 ? 'bg-rose-400' : 'bg-gradient-to-r from-emerald-400 to-amber-400')} style={{ width: drawdownProgress + '%' }} /></div></div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Portfolio value</span><Gauge className="h-4 w-4 text-cyan-300" /></div><div className="mt-2 text-2xl font-bold text-white">{formatMoney(telemetry?.portfolio_value)}</div><div className="mt-1 text-[10px] text-slate-500">Value reported by risk service</div></div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active positions</span><Activity className="h-4 w-4 text-amber-300" /></div><div className="mt-2 text-2xl font-bold text-white">{telemetry ? telemetry.active_positions_count : '—'}<span className="text-sm font-medium text-slate-500"> / {telemetry ? telemetry.max_simultaneous_trades : '—'}</span></div><div className="mt-1 text-[10px] text-slate-500">Open position cap</div></div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Market data heartbeat</span>{telemetry?.heartbeat_ok === false ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}</div><div className={'mt-2 text-2xl font-bold ' + (telemetry?.heartbeat_ok === false ? 'text-rose-300' : telemetry ? 'text-emerald-300' : 'text-slate-400')}>{loading && !telemetry ? 'Checking…' : !telemetry ? 'Unknown' : telemetry.heartbeat_ok ? 'Healthy' : 'Stale'}</div><div className="mt-1 text-[10px] text-slate-500">Feed freshness from backend</div></div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-white">Risk utilization</h2><p className="mt-1 text-xs text-slate-500">Live drawdown against the configured circuit-breaker threshold.</p></div><span className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-slate-400">{lastUpdated ? 'Updated ' + new Date(lastUpdated).toLocaleTimeString() : 'Waiting for API'}</span></div>
          <div className="grid gap-5 md:grid-cols-[1fr_180px] md:items-center">
            <div><div className="mb-2 flex justify-between text-[10px] text-slate-500"><span>0% utilization</span><span>100% limit reached</span></div><div className="relative h-4 overflow-hidden rounded-full border border-white/[0.06] bg-slate-800"><div className="absolute inset-y-0 left-0 w-1/3 bg-emerald-500/20" /><div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-500/20" /><div className="absolute inset-y-0 left-2/3 w-1/3 bg-rose-500/20" /><div className={'relative h-full rounded-full transition-all ' + (drawdownProgress >= 80 ? 'bg-rose-400' : drawdownProgress >= 50 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-400 to-cyan-400')} style={{ width: drawdownProgress + '%' }} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-emerald-400/[0.06] p-2"><div className="text-[9px] uppercase text-emerald-300/70">Normal</div><div className="mt-1 text-xs font-semibold text-emerald-300">0–50%</div></div><div className="rounded-lg bg-amber-400/[0.06] p-2"><div className="text-[9px] uppercase text-amber-300/70">Caution</div><div className="mt-1 text-xs font-semibold text-amber-300">50–80%</div></div><div className="rounded-lg bg-rose-400/[0.06] p-2"><div className="text-[9px] uppercase text-rose-300/70">Critical</div><div className="mt-1 text-xs font-semibold text-rose-300">80–100%</div></div></div></div>
            <div className="mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: 'conic-gradient(#34d399 ' + drawdownProgress + '%, rgba(51,65,85,.55) 0)' }}><div className="grid h-32 w-32 place-items-center rounded-full border border-white/[0.06] bg-[#090f1e] text-center"><div><div className="text-2xl font-bold text-white">{telemetry ? Math.round(drawdownProgress) + '%' : '—'}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">Limit used</div></div></div></div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Backend guardrails</h2><p className="mt-1 text-xs text-slate-500">Values currently exposed by the risk status API.</p></div><ShieldCheck className="h-5 w-5 text-emerald-300" /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0c1527] p-3"><div className="flex items-center gap-2 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Drawdown circuit breaker</div><span className="text-xs font-semibold text-white">{typeof drawdownLimit === 'number' ? drawdownLimit + '%' : 'Not reported'}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0c1527] p-3"><div className="flex items-center gap-2 text-xs text-slate-300"><Activity className="h-4 w-4 text-cyan-300" /> Maximum simultaneous positions</div><span className="text-xs font-semibold text-white">{telemetry ? telemetry.max_simultaneous_trades : 'Not reported'}</span></div>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#0c1527] p-3"><div className="flex items-center gap-2 text-xs text-slate-300"><Radio className="h-4 w-4 text-indigo-300" /> Feed heartbeat</div><span className={'text-xs font-semibold ' + (telemetry?.heartbeat_ok ? 'text-emerald-300' : telemetry ? 'text-rose-300' : 'text-slate-500')}>{telemetry ? telemetry.heartbeat_ok ? 'Healthy' : 'Stale' : 'Unknown'}</span></div>
            <div className="rounded-xl border border-indigo-400/15 bg-indigo-400/[0.05] p-3 text-[10px] leading-relaxed text-indigo-200/80"><Info className="mr-1 inline h-3.5 w-3.5" /> These are telemetry readouts, not editable switches. Enforce order-size, loss and exposure limits inside the server-side order path.</div>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-white">Historical stress test</h2><p className="mt-1 text-xs text-slate-500">Illustrative scenario estimates — not calculated from current holdings.</p></div><select value={stressScenario} onChange={(event) => setStressScenario(event.target.value as StressScenario)} className="rounded-lg border border-white/10 bg-[#0c1527] px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400/50"><option value="2020_flash">2020 Flash Crash</option><option value="2008_crash">2008 Global Financial Crisis</option><option value="crypto_cascade">Crypto Deleveraging</option></select></div>
          <div className="rounded-xl border border-white/[0.05] bg-[#0c1527] p-3"><div className="text-xs font-semibold text-white">{currentStress.label}</div><p className="mt-1 text-[11px] text-slate-500">{currentStress.description}</p></div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[{ label: 'Simulated P&L impact', value: currentStress.pnlImpact, color: 'text-rose-300' }, { label: 'Peak drawdown', value: currentStress.maxDrawdown, color: 'text-rose-300' }, { label: 'Stressed VaR · 95%', value: currentStress.var95, color: 'text-amber-300' }, { label: 'Stressed VaR · 99%', value: currentStress.var99, color: 'text-rose-300' }].map((metric) => <div key={metric.label} className="rounded-xl border border-white/[0.05] bg-[#0c1527] p-3"><div className="text-[9px] uppercase tracking-wider text-slate-500">{metric.label}</div><div className={'mt-2 text-xl font-bold ' + metric.color}>{metric.value}</div></div>)}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-[10px] leading-relaxed text-amber-200/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Connect this panel to a portfolio-aware stress-test endpoint before using scenario values for capital allocation decisions.</div>
        </section>
        <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-white">Risk advisor</h2><p className="mt-1 text-xs text-slate-500">Operational checks to review.</p></div><Zap className="h-5 w-5 text-amber-300" /></div>
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-amber-200"><AlertTriangle className="h-4 w-4" /> Correlation review</div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Check correlated positions before increasing exposure to assets that respond to the same market drivers.</p></div>
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-200"><Activity className="h-4 w-4" /> Data freshness</div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{telemetry?.heartbeat_ok === false ? 'The risk service reports a stale heartbeat. Consider pausing new orders until the feed recovers.' : telemetry?.heartbeat_ok ? 'The latest heartbeat is healthy. Continue monitoring feed freshness.' : 'Waiting for the backend to report market-data heartbeat status.'}</p></div>
            <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-rose-200"><Siren className="h-4 w-4" /> Emergency procedure</div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">A pause flag alone does not guarantee open orders are cancelled. Confirm broker-side order cancellation and position state.</p></div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-[#090f1e]/90 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Clock3 className="h-4 w-4 text-slate-500" /> Telemetry connection</div><div className="flex items-center gap-3 text-[10px] text-slate-500"><span>{loading ? 'Loading risk telemetry…' : telemetry ? 'Connected to /api/risk/status' : 'No telemetry response'}</span><button onClick={fetchTelemetry} className="inline-flex items-center gap-1 text-indigo-300 hover:text-white"><RefreshCw className="h-3 w-3" /> Refresh now</button></div></div>
        {telemetry?.timestamp && <p className="mt-2 text-[10px] text-slate-600">Backend timestamp: {new Date(telemetry.timestamp).toLocaleString()}</p>}
      </section>
    </main>
  );
}
