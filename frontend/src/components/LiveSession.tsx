import React, { useState, useEffect, useRef } from 'react';
import { ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, AreaChart, Area } from 'recharts';
import { Play, Square, Cpu, Plus, Power, Activity, Terminal, AlertTriangle, Save, X, Bookmark, Scale, RefreshCw, ShieldAlert } from 'lucide-react';

interface LiveSessionProps {
  strategies: Array<{ id: string; name: string; code: string }>;
  selectedStrategyId: string;
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
  riskProfile?: any;
  geminiApiKey?: string;
  techAgentKey?: string;
  sentimentAgentKey?: string;
  tradingViewAgentKey?: string;
  hyperliquidAgentKey?: string;
  hyperliquidPrivateKey?: string;
  firecrawlAgentKey?: string;
}

const FEED_SYMBOLS: Record<string, { value: string; label: string }[]> = {
  binance: [
    { value: 'BTCUSDT', label: 'BTC/USDT' },
    { value: 'ETHUSDT', label: 'ETH/USDT' },
    { value: 'SOLUSDT', label: 'SOL/USDT' },
    { value: 'ADAUSDT', label: 'ADA/USDT' },
  ],
  yfinance: [
    { value: 'AAPL', label: 'AAPL (Apple)' },
    { value: 'MSFT', label: 'MSFT (Microsoft)' },
    { value: 'TSLA', label: 'TSLA (Tesla)' },
    { value: 'NVDA', label: 'NVDA (NVIDIA)' },
    { value: 'BTC-USD', label: 'BTC-USD (Bitcoin)' },
    { value: 'ETH-USD', label: 'ETH-USD (Ethereum)' },
  ],
  alpaca: [
    { value: 'AAPL', label: 'AAPL (Apple)' },
    { value: 'MSFT', label: 'MSFT (Microsoft)' },
    { value: 'TSLA', label: 'TSLA (Tesla)' },
    { value: 'NVDA', label: 'NVDA (NVIDIA)' },
    { value: 'BTCUSD', label: 'BTCUSD (Bitcoin)' },
    { value: 'ETHUSD', label: 'ETHUSD (Ethereum)' },
  ],
  mock: [
    { value: 'BTCUSDT', label: 'BTC/USDT (Mock)' },
    { value: 'ETHUSDT', label: 'ETH/USDT (Mock)' },
    { value: 'AAPL', label: 'AAPL (Mock)' },
    { value: 'MSFT', label: 'MSFT (Mock)' },
  ],
};

// Custom Candlestick rendering shape (same as predictor)
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  
  const color = isUp ? '#10b981' : '#ef4444';
  const cx = x + width / 2;
  
  const bodyDelta = Math.abs(close - open) || 0.01;
  const pixelScale = height / bodyDelta;
  
  const maxBody = Math.max(open, close);
  const minBody = Math.min(open, close);
  
  const yHigh = y - (high - maxBody) * pixelScale;
  const yLow = y + height + (minBody - low) * pixelScale;
  
  return (
    <g>
      <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1.5} />
      <rect x={x} y={y} width={width} height={Math.max(2, height)} fill={color} fillOpacity={0.8} />
    </g>
  );
};

export default function LiveSession({
  strategies,
  selectedStrategyId,
  alpacaKeyId: globalAlpacaKeyId = '',
  alpacaSecretKey: globalAlpacaSecretKey = '',
  riskProfile = null,
  geminiApiKey = '',
  techAgentKey = '',
  sentimentAgentKey = '',
  tradingViewAgentKey = '',
  hyperliquidAgentKey = '',
  hyperliquidPrivateKey = '',
  firecrawlAgentKey = ''
}: LiveSessionProps) {
  // Multi-bot list states
  const [bots, setBots] = useState<Record<string, any>>({});
  const [selectedBotId, setSelectedBotId] = useState('default');

  // Spawn Form states
  const [botName, setBotName] = useState('Custom Bot');
  const [strategyId, setStrategyId] = useState(selectedStrategyId);
  const [liveSymbol, setLiveSymbol] = useState('BTCUSDT');
  const [liveTimeframe, setLiveTimeframe] = useState('1m');
  const [startingCash, setStartingCash] = useState(10000.0);
  const [liveFeedSource, setLiveFeedSource] = useState('binance');
  // Pre-fill from global settings — user can still override per-bot
  const [alpacaKeyId, setAlpacaKeyId] = useState(globalAlpacaKeyId);
  const [alpacaSecretKey, setAlpacaSecretKey] = useState(globalAlpacaSecretKey);
  const [agenticMode, setAgenticMode] = useState(false);
  const [leverageLimit, setLeverageLimit] = useState(1);
  const [localSlippagePct, setLocalSlippagePct] = useState(0.5);
  const [localAgentAttitude, setLocalAgentAttitude] = useState('balanced');
  const [selectedBotToTerminate, setSelectedBotToTerminate] = useState<string | null>(null);
  const [closePct, setClosePct] = useState<number>(1.0);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [rebalanceMessage, setRebalanceMessage] = useState<string | null>(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicMessage, setPanicMessage] = useState<string | null>(null);

  // Template modal state
  interface BotTemplate {
    name: string;
    botName: string;
    strategyId: string;
    symbol: string;
    timeframe: string;
    startingCash: number;
    feedSource: string;
    agenticMode: boolean;
    leverageLimit: number;
    slippagePct: number;
    agentAttitude: string;
  }
  const [savedTemplates, setSavedTemplates] = useState<BotTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('aiquant_bot_templates');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const tpl: BotTemplate = {
      name: templateName.trim(),
      botName,
      strategyId,
      symbol: liveSymbol,
      timeframe: liveTimeframe,
      startingCash,
      feedSource: liveFeedSource,
      agenticMode,
      leverageLimit,
      slippagePct: localSlippagePct,
      agentAttitude: localAgentAttitude,
    };
    const updated = [...savedTemplates, tpl];
    setSavedTemplates(updated);
    localStorage.setItem('aiquant_bot_templates', JSON.stringify(updated));
    setTemplateName('');
    setShowSaveTemplateModal(false);
  };

  const handleLoadTemplate = (tpl: BotTemplate) => {
    setBotName(tpl.botName);
    setStrategyId(tpl.strategyId);
    setLiveSymbol(tpl.symbol);
    setLiveTimeframe(tpl.timeframe);
    setStartingCash(tpl.startingCash);
    setLiveFeedSource(tpl.feedSource);
    setAgenticMode(tpl.agenticMode);
    setLeverageLimit(tpl.leverageLimit);
    setLocalSlippagePct(tpl.slippagePct ?? 0.5);
    setLocalAgentAttitude(tpl.agentAttitude ?? 'balanced');
  };

  const handleDeleteTemplate = (idx: number) => {
    const updated = savedTemplates.filter((_, i) => i !== idx);
    setSavedTemplates(updated);
    localStorage.setItem('aiquant_bot_templates', JSON.stringify(updated));
  };

  const handleFeedSourceChange = (feed: string) => {
    setLiveFeedSource(feed);
    const symbolsForFeed = FEED_SYMBOLS[feed] || FEED_SYMBOLS.mock;
    if (symbolsForFeed.length > 0) {
      setLiveSymbol(symbolsForFeed[0].value);
    }
  };

  useEffect(() => {
    setAlpacaKeyId(globalAlpacaKeyId);
  }, [globalAlpacaKeyId]);

  useEffect(() => {
    setAlpacaSecretKey(globalAlpacaSecretKey);
  }, [globalAlpacaSecretKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sym = params.get('symbol');
    if (sym) {
      setLiveSymbol(sym.toUpperCase());
    }
  }, []);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any | null>(null);
  const reconnectDelayRef = useRef(1000);
 
  const fetchAllBots = async () => {
    try {
      const res = await fetch('/api/live/bots');
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || {});
      }
    } catch (e) {
      console.error("Failed to load active bots:", e);
    }
  };

  const handlePanicStopAll = async () => {
    if (!window.confirm("⚠️ WARNING: This will immediately close all active bots and flatten 100% of open positions on Alpaca & Hyperliquid. Proceed?")) {
      return;
    }
    setPanicLoading(true);
    setPanicMessage(null);
    try {
      const res = await fetch('/api/live/bots/panic', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setBots(data.bots || {});
        setPanicMessage("🚨 PANIC: Stopped all bots & closed positions.");
      } else {
        setPanicMessage(`❌ Panic action failed: ${data.detail || "Unknown error"}`);
      }
    } catch (e) {
      setPanicMessage("❌ Network error triggering panic action.");
    } finally {
      setPanicLoading(false);
      setTimeout(() => setPanicMessage(null), 8000);
    }
  };

  const handleSpawnBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStrategy = strategies.find(s => s.id === strategyId);
    if (!targetStrategy) return;

    const newBotId = `bot_${Date.now()}`;
    try {
      const res = await fetch('/api/live/bots/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: newBotId,
          name: botName,
          symbol: liveSymbol,
          strategy_code: targetStrategy.code,
          timeframe: liveTimeframe,
          starting_cash: Number(startingCash),
          feed_source: liveFeedSource,
          alpaca_key_id: alpacaKeyId,
          alpaca_secret_key: alpacaSecretKey,
          risk_profile: {
            ...(riskProfile || {}),
            slippage_tolerance_pct: Number(localSlippagePct)
          },
          agentic_mode: agenticMode,
          agent_attitude: localAgentAttitude,
          leverage_limit: leverageLimit,
          gemini_api_key: geminiApiKey,
          tech_agent_key: techAgentKey,
          sentiment_agent_key: sentimentAgentKey,
          tradingview_agent_key: tradingViewAgentKey,
          hyperliquid_agent_key: hyperliquidAgentKey,
          hyperliquid_private_key: hyperliquidPrivateKey,
          firecrawl_agent_key: firecrawlAgentKey
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || {});
        setSelectedBotId(newBotId);
        setBotName(`Custom Bot ${Object.keys(data.bots || {}).length + 1}`);
      } else {
        alert('Failed to compile strategy script or spawn bot.');
      }
    } catch (e) {
      console.error("Failed to spawn bot:", e);
    }
  };

  const handleTerminateBot = (botId: string) => {
    if (botId === 'default') {
      alert("Default bot cannot be deleted, you can only stop its session.");
      return;
    }
    setSelectedBotToTerminate(botId);
  };

  const executeTerminateBot = async () => {
    if (!selectedBotToTerminate) return;
    const botId = selectedBotToTerminate;
    try {
      const res = await fetch(`/api/live/bots/stop/${botId}?close_pct=${closePct}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || {});
        if (selectedBotId === botId) {
          setSelectedBotId('default');
        }
      }
    } catch (e) {
      console.error("Failed to stop bot:", e);
    } finally {
      setSelectedBotToTerminate(null);
    }
  };

  const handleRebalancePortfolio = async () => {
    setRebalanceLoading(true);
    setRebalanceMessage(null);
    try {
      const res = await fetch('/api/live/bots/rebalance', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setBots(data.bots || {});
        setRebalanceMessage(data.message || "Portfolio successfully risk-balanced.");
      } else {
        setRebalanceMessage(`❌ Rebalance failed: ${data.detail || "Unknown error"}`);
      }
    } catch (e) {
      setRebalanceMessage("❌ Network error triggering rebalance.");
    } finally {
      setRebalanceLoading(false);
      setTimeout(() => setRebalanceMessage(null), 8000);
    }
  };

  const connectWebSocket = () => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${wsProto}//${wsHost}/ws/live-trading`;
 
    console.log(`Connecting Live WebSocket to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
 
    ws.onopen = () => {
      console.log('WebSocket connected.');
      reconnectDelayRef.current = 1000; // Reset delay on successful connection
    };

    ws.onmessage = (event) => {
      const payload = jsonParse(event.data);
      if (!payload) return;
 
      if (payload.type === 'all_bots') {
        // Full fleet snapshot on connect
        setBots(payload.data || {});
      } else if (payload.type === 'state') {
        // Legacy default bot update
        setBots(prev => ({ ...prev, default: payload.data }));
      } else if (payload.type === 'bot_state') {
        // Individual bot tick update
        const { bot_id, data } = payload;
        setBots(prev => ({ ...prev, [bot_id]: data }));
      }
    };
 
    ws.onclose = (event) => {
      console.log(`WebSocket closed. Reconnecting in ${reconnectDelayRef.current}ms...`, event);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        connectWebSocket();
      }, reconnectDelayRef.current);
    };
 
    ws.onerror = (e) => {
      console.error('WebSocket Error:', e);
      ws.close(); // Force trigger onclose
    };
  };

  const jsonParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const startDefaultSession = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const selectedStrategy = strategies.find(s => s.id === strategyId);
      socketRef.current.send(JSON.stringify({
        type: 'start',
        symbol: liveSymbol,
        strategy_code: selectedStrategy ? selectedStrategy.code : "",
        timeframe: liveTimeframe,
        feed_source: liveFeedSource,
        alpaca_key_id: alpacaKeyId,
        alpaca_secret_key: alpacaSecretKey
      }));
    }
  };

  const stopDefaultSession = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  };

  const handleResetAccount = async () => {
    if (window.confirm("Are you sure you want to reset the default account cash to $10,000?")) {
      try {
        await fetch('/api/live/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        fetchAllBots();
      } catch (err) {
        console.error('Account reset failed:', err);
      }
    }
  };

  useEffect(() => {
    connectWebSocket();
    fetchAllBots();
    
    const interval = setInterval(fetchAllBots, 4000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);



  const getCombinedLogs = () => {
    const list: { time: string; text: string }[] = [];
    Object.keys(bots).forEach(bid => {
      const b = bots[bid];
      if (b && b.logs) {
        b.logs.forEach((l: string) => {
          const match = l.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
          const time = match ? match[1] : '00:00:00';
          const msg = l.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
          list.push({ time, text: `[${time}] [${b.name}] ${msg}` });
        });
      }
    });
    list.sort((a, b) => a.time.localeCompare(b.time));
    return list.map(item => item.text);
  };

  const getBotChartData = (bot: any) => {
    const bCandles = bot.candles || [];
    const allCandles = bot.active_candle
      ? [...bCandles, bot.active_candle]
      : bCandles;
    return allCandles.map((c: any) => ({
      ...c,
      bodyRange: [c.open, c.close]
    }));
  };

  const combinedLogs = getCombinedLogs();

  return (
    <div className="select-none font-sans text-slate-300">

      {/* ── Two-column master layout ───────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ═══ LEFT SIDEBAR (Spawn Form + Unified Execution Logs) ═══════════ */}
        <div className="w-[320px] shrink-0 space-y-4">

          {/* Spawn Strategy Bot */}
          <div className="glass-panel p-5 flex flex-col h-auto">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 shrink-0">
              <Plus className="w-4 h-4 text-indigo-400" />
              Spawn Strategy Bot
            </h3>
            <div className="flex-1 pr-1 -mr-1">
              <form onSubmit={handleSpawnBot} className="space-y-1.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Bot Name</label>
                    <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none focus:border-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Capital ($)</label>
                    <input type="number" value={startingCash} onChange={(e) => setStartingCash(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none focus:border-indigo-500/50" />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Symbol</label>
                  <select value={liveSymbol} onChange={(e) => setLiveSymbol(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none">
                    {(FEED_SYMBOLS[liveFeedSource] || FEED_SYMBOLS.mock).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Timeframe</label>
                    <select value={liveTimeframe} onChange={(e) => setLiveTimeframe(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none">
                      <option value="10s">10s (Sim)</option>
                      <option value="1m">1m</option>
                      <option value="5m">5m</option>
                      <option value="15m">15m</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Feed Source</label>
                    <select value={liveFeedSource} onChange={(e) => handleFeedSourceChange(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none">
                      <option value="binance">Binance (WS)</option>
                      <option value="yfinance">yfinance (Poll)</option>
                      <option value="alpaca">Alpaca Markets</option>
                      <option value="mock">Local Mock (Sim)</option>
                    </select>
                  </div>
                </div>

                {liveFeedSource === 'alpaca' && (
                  <div className="space-y-1.5">
                    {globalAlpacaKeyId && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded text-[9px] text-emerald-400 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Alpaca credentials pre-filled from Settings
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Alpaca Key ID</label>
                        <input type="text" value={alpacaKeyId} onChange={(e) => setAlpacaKeyId(e.target.value)} placeholder="PK..."
                          className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-mono text-[10px] outline-none focus:border-indigo-500/50" />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Secret Key</label>
                        <input type="password" value={alpacaSecretKey} onChange={(e) => setAlpacaSecretKey(e.target.value)} placeholder="Secret..."
                          className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-mono text-[10px] outline-none focus:border-indigo-500/50" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Trading Mode</label>
                  <select 
                    value={agenticMode ? "agent" : "standard"} 
                    onChange={(e) => setAgenticMode(e.target.value === "agent")}
                    className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none text-[10px]"
                  >
                    <option value="standard">Standard Strategy Script</option>
                    <option value="agent">Autonomous AI Agent</option>
                  </select>
                </div>

                {!agenticMode ? (
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Select Strategy</label>
                    <select value={strategyId} onChange={(e) => setStrategyId(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none text-[10px]">
                      {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Select Agent Stance / Mode</label>
                    <select 
                      value={localAgentAttitude} 
                      onChange={(e) => setLocalAgentAttitude(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-semibold outline-none text-[10px]"
                    >
                      <option value="balanced">balanced ⭐ (Medium Risk)</option>
                      <option value="conservative">conservative (Low Risk)</option>
                      <option value="aggressive">aggressive (High Risk)</option>
                      <option value="ultra-short">ultra-short (High Risk Scalper)</option>
                      <option value="swing-trend">swing-trend (High Risk Trend Capture)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Max Leverage</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 5, 10].map(lv => (
                      <button key={lv} type="button" onClick={() => setLeverageLimit(lv)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                          leverageLimit === lv
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-[#0F1115] border border-white/5 text-slate-400 hover:border-indigo-500/30 hover:text-white'
                        }`}>
                        {lv}x
                      </button>
                    ))}
                  </div>
                  {leverageLimit > 1 && (
                    <p className="text-[8px] text-amber-400/70 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {leverageLimit}x leverage amplifies both gains and losses
                    </p>
                  )}
                </div>
 
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Slippage (%)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0.0" 
                      max="5.0"
                      value={localSlippagePct} 
                      onChange={(e) => setLocalSlippagePct(parseFloat(e.target.value) || 0.5)}
                      className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-white font-mono text-[10px] outline-none" 
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <button type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded transition-all flex items-center justify-center gap-1 shadow">
                    <Cpu className="w-3.5 h-3.5" />
                    Spawn Agent
                  </button>
                  <button type="button" onClick={() => { setTemplateName(''); setShowSaveTemplateModal(true); }}
                    className="px-3 py-2 bg-white/5 border border-white/10 hover:border-indigo-500/30 text-slate-400 hover:text-white font-bold text-xs rounded transition-all flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Saved Templates List */}
                {savedTemplates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">Saved Templates</span>
                    {savedTemplates.map((tpl, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 group">
                        <button type="button" onClick={() => handleLoadTemplate(tpl)}
                          className="flex-1 text-left px-2 py-1 rounded bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 text-[10px] text-slate-300 hover:text-white font-semibold transition-all truncate">
                          {tpl.name}
                        </button>
                        <button type="button" onClick={() => handleDeleteTemplate(idx)}
                          className="opacity-0 group-hover:opacity-100 px-1 py-1 text-red-400 hover:text-red-300 transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Combined Execution Log Sidebar card */}
          <div className="glass-panel p-5 flex flex-col h-[380px]">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5 shrink-0">
              <Terminal className="w-4 h-4 text-indigo-400" />
              Unified Logs ({combinedLogs.length})
            </h3>
            <div className="flex-1 bg-[#06080D]/90 border border-white/5 rounded-lg p-3 overflow-y-auto font-mono text-[10px] space-y-1">
              {combinedLogs.length === 0 ? (
                <span className="text-slate-600 italic">Awaiting activity feed...</span>
              ) : (
                [...combinedLogs].reverse().map((log, idx) => (
                  <div key={idx} className={
                    log.includes('Error') || log.includes('error') ? 'text-red-400'
                      : log.includes('BUY') || log.includes('Signal: BUY') ? 'text-emerald-400 font-bold'
                      : log.includes('SELL') || log.includes('Signal: SELL') ? 'text-rose-400 font-bold'
                      : log.includes('Alpaca') ? 'text-indigo-400'
                      : log.includes('Mock') || log.includes('Sim') ? 'text-amber-500/70'
                      : 'text-slate-500'
                  }>{log}</div>
                ))
              )}
            </div>
          </div>

        </div>{/* end LEFT SIDEBAR */}

        {/* ═══ RIGHT MAIN AREA (Spawned Bot Cards Stack) ═══════════════════════ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Portfolio Risk Header & Rebalance Panel */}
          {Object.keys(bots).length > 0 && (
            <div className="glass-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-950/10 border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Fleet Management Actions</h3>
                  <p className="text-[10px] text-slate-500 font-light">Rebalance allocations to scale risk down, or stop everything immediately under severe conditions.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {rebalanceMessage && (
                  <span className={`text-[10px] font-mono px-2 py-1 rounded bg-[#0f1115] border ${rebalanceMessage.includes('❌') ? 'border-red-500/20 text-red-400' : 'border-emerald-500/20 text-emerald-400'}`}>
                    {rebalanceMessage}
                  </span>
                )}
                {panicMessage && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#0f1115] border border-red-500/30 text-red-400">
                    {panicMessage}
                  </span>
                )}
                <button
                  onClick={handleRebalancePortfolio}
                  disabled={rebalanceLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-500/15"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rebalanceLoading ? 'animate-spin' : ''}`} />
                  {rebalanceLoading ? 'Rebalancing...' : 'Rebalance Portfolio'}
                </button>
                <button
                  onClick={handlePanicStopAll}
                  disabled={panicLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-500/15"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {panicLoading ? 'STOPPING ALL...' : 'PANIC STOP & FLATTEN'}
                </button>
              </div>
            </div>
          )}

          {Object.keys(bots).length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-500 italic font-mono flex flex-col items-center justify-center space-y-3">
              <Activity className="w-8 h-8 text-indigo-500 animate-pulse" />
              <span>No bots currently running. Use the sidebar to spawn a strategy bot!</span>
            </div>
          ) : (
            Object.keys(bots).map((bid) => {
              const b = bots[bid];
              const rPnl    = b.realized_pnl   ?? 0;
              const uPnl    = b.unrealized_pnl ?? 0;
              const tPnl    = b.total_pnl      ?? (rPnl + uPnl);
              const pnlPct  = b.pnl_pct        ?? 0;
              const winRate = b.win_rate        ?? 0;
              const runtime = b.running_time    ?? '00:00:00';
              const avgCost = b.avg_cost        ?? 0;
              const tCount  = b.trade_count     ?? (b.trades || []).length;
              const feedSrc = b.feed_source     ?? 'mock';
              const posQty  = (b.positions || {})[b.symbol] ?? 0;
              const startCash = b.starting_cash ?? 10000;
              const eqHistory = b.equity_history || [];
              const bCandles = b.candles || [];
              const bTrades = b.trades || [];
              const bLogs = b.logs || [];

              return (
                <div key={bid} className="glass-panel p-6 flex flex-col space-y-4 bg-slate-900/30 border border-white/5 relative">
                  
                  {/* Card Header Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${b.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                          {b.name} <span className="text-[10px] text-slate-500 font-normal">({bid})</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                          {b.symbol} | Feed: <span className="text-indigo-400 uppercase">{feedSrc}</span> | TF: {b.timeframe || '—'} · {runtime}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {bid === 'default' ? (
                        <>
                          {b.is_active ? (
                            <button onClick={stopDefaultSession} className="px-3 py-1.5 rounded font-bold text-[10px] uppercase bg-red-600 hover:bg-red-700 text-white flex items-center gap-1">
                              <Square className="w-2.5 h-2.5 fill-current" /> Stop Session
                            </button>
                          ) : (
                            <button onClick={startDefaultSession} className="px-3 py-1.5 rounded font-bold text-[10px] uppercase bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-current" /> Start Session
                            </button>
                          )}
                          <button onClick={handleResetAccount} className="px-2.5 py-1.5 rounded border border-slate-800 hover:border-slate-700 text-[10px] uppercase font-bold text-slate-300">
                            Reset Capital
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleTerminateBot(bid)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white font-bold text-[10px] uppercase rounded flex items-center gap-1">
                          <Power className="w-3.5 h-3.5" /> Terminate Bot
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPIs & Metrics Dashboard Row */}
                  <div className="grid md:grid-cols-4 gap-4">
                    
                    {/* KPI: P&L */}
                    <div className="glass-panel p-4 flex flex-col justify-center text-center bg-[#07090D]/50">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Net P&L</span>
                      <span className={`text-lg font-extrabold font-mono mt-1 ${tPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tPnl >= 0 ? '+' : ''}${tPnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span>
                    </div>

                    {/* KPI: Win Rate */}
                    <div className="glass-panel p-4 flex flex-col justify-center text-center bg-[#07090D]/50">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Win Rate</span>
                      <span className={`text-lg font-extrabold font-mono mt-1 ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {winRate.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{tCount} trades</span>
                    </div>

                    {/* Metrics details */}
                    <div className="glass-panel md:col-span-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono p-4 bg-[#07090D]/30">
                      {[
                        { label: 'Starting Capital', val: `$${startCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-slate-400' },
                        { label: 'Equity', val: `$${b.portfolio_value?.toFixed(2) || startCash.toFixed(2)}`, color: 'text-white font-bold' },
                        { label: 'Cash', val: `$${b.cash?.toFixed(2) || startCash.toFixed(2)}`, color: 'text-slate-300' },
                        { label: 'Avg Entry Price', val: avgCost > 0 ? `$${avgCost.toFixed(2)}` : '—', color: 'text-slate-300' },
                        { label: 'Realized P&L', val: `${rPnl >= 0 ? '+' : ''}$${rPnl.toFixed(2)}`, color: rPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
                        { label: 'Unrealized P&L', val: `${uPnl >= 0 ? '+' : ''}$${uPnl.toFixed(2)}`, color: uPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70' },
                        { label: `${b.symbol} Holding`, val: `${posQty.toFixed(6)}`, color: 'text-indigo-300' },
                        { label: 'Uptime', val: runtime, color: 'text-white' },
                        { label: 'Trading Mode', val: b.is_agentic ? 'AUTONOMOUS AI' : 'STANDARD SCRIPT', color: b.is_agentic ? 'text-indigo-400 font-bold' : 'text-slate-400' },
                        { label: 'Slippage Tol.', val: `${b.risk_profile?.slippage_tolerance_pct ?? 0.5}%`, color: 'text-slate-300' },
                        ...(b.is_agentic ? [{
                          label: 'Stance / Attitude',
                          val: (
                            <select
                              value={b.agent_attitude}
                              onChange={async (e) => {
                                const newAttitude = e.target.value;
                                try {
                                  const res = await fetch(`/api/live/bots/attitude/${bid}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ attitude: newAttitude })
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setBots(data.bots || {});
                                  } else {
                                    alert("Failed to update agent attitude.");
                                  }
                                } catch (err) {
                                  console.error("Failed to update attitude:", err);
                                }
                              }}
                              className="bg-[#0b0f19] border border-white/10 rounded px-1 py-0.5 text-[9px] font-bold text-indigo-400 focus:outline-none cursor-pointer"
                            >
                              <option value="balanced">balanced ⭐</option>
                              <option value="conservative">conservative</option>
                              <option value="aggressive">aggressive</option>
                              <option value="ultra-short">ultra-short</option>
                              <option value="swing-trend">swing-trend</option>
                            </select>
                          ),
                          color: 'text-indigo-300'
                        }] : []),
                      ].map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-white/[0.01] pb-0.5">
                          <span className="text-slate-500 truncate">{m.label}</span>
                          <span className={`${m.color} shrink-0`}>{m.val}</span>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Capital Allocation Visualizer */}
                  {(() => {
                    const totalVal = b.portfolio_value ?? startCash;
                    const cashVal = b.cash ?? startCash;
                    const deployedVal = Math.max(0, totalVal - cashVal);
                    const deployedPct = totalVal > 0 ? (deployedVal / totalVal) * 100 : 0;
                    const idlePct = 100 - deployedPct;
                    return (
                      <div className="glass-panel p-4 bg-[#07090D]/20 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-indigo-400 font-semibold">Active Exposure: ${deployedVal.toLocaleString(undefined, {minimumFractionDigits: 2})} ({deployedPct.toFixed(1)}%)</span>
                          <span className="text-slate-400">Idle Capital: ${cashVal.toLocaleString(undefined, {minimumFractionDigits: 2})} ({idlePct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                          <div style={{ width: `${deployedPct}%` }} className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500" />
                          <div style={{ width: `${idlePct}%` }} className="h-full bg-slate-800 transition-all duration-500" />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Charts: OHLCV Candlesticks + Equity Curve side-by-side */}
                  <div className="grid md:grid-cols-2 gap-4">
                    
                    {/* Candlestick Chart (1/2 width) */}
                    <div className="glass-panel p-4 md:col-span-1 flex flex-col h-[280px]">
                      <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider mb-2 flex justify-between shrink-0">
                        <span>Streaming OHLCV Candles</span>
                        {b.active_candle && (
                          <span className="font-mono text-indigo-400 animate-pulse">
                            Tick: ${b.active_candle.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </h3>
                      <div className="flex-1 relative">
                        {bCandles.length === 0 && !b.active_candle ? (
                          <div className="h-full flex items-center justify-center text-slate-600 text-[10px] italic font-mono">
                            <span className="animate-pulse">Waiting for feed stream…</span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={getBotChartData(b)}>
                              <XAxis dataKey="timestamp" stroke="#334155" fontSize={8} tickFormatter={(v) => v.split(' ')[1] || v} tickLine={false} />
                              <YAxis stroke="#334155" fontSize={8} domain={['auto', 'auto']} tickLine={false} orientation="right" />
                              <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} labelStyle={{ color: '#94a3b8', fontSize: 9 }} itemStyle={{ fontSize: 10 }} />
                              <Bar dataKey="bodyRange" shape={<CandlestickShape />} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Equity Performance Chart (1/2 width) */}
                    <div className="glass-panel p-4 md:col-span-1 flex flex-col h-[280px]">
                      <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider mb-2 shrink-0">
                        Equity curve
                      </h3>
                      <div className="flex-1 relative">
                        {eqHistory.length < 2 ? (
                          <div className="h-full flex items-center justify-center text-slate-600 text-[10px] italic font-mono">
                            Collecting performance metrics…
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={eqHistory} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                              <defs>
                                <linearGradient id={`botEquityGrad-${bid}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={tPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor={tPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="timestamp" hide />
                              <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                              <Tooltip
                                contentStyle={{ background: '#0F111A', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
                                labelStyle={{ fontSize: '8px', color: '#64748B', fontFamily: 'monospace' }}
                                itemStyle={{ fontSize: '9px', color: '#F1F5F9', fontWeight: 'bold', fontFamily: 'monospace' }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 'Equity']}
                                labelFormatter={(label) => `Time: ${label}`}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="equity" 
                                stroke={tPnl >= 0 ? "#10b981" : "#ef4444"} 
                                strokeWidth={1.5}
                                fillOpacity={1} 
                                fill={`url(#botEquityGrad-${bid})`} 
                                />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Agentic Alpha Brief Panel */}
                  {b.last_alpha_rationale && (
                    <div className="glass-panel p-4 mb-4 border border-blue-500/20 bg-blue-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${b.last_alpha_status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {b.last_alpha_status || 'UNKNOWN'}
                        </span>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Latest Alpha Brief Rationale</h3>
                      </div>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        {b.last_alpha_rationale}
                      </p>
                    </div>
                  )}

                  {/* Bottom Row: Order History & Local Logs */}
                  <div className="grid md:grid-cols-2 gap-4">

                    {/* Orders History Card */}
                    <div className="glass-panel p-4 flex flex-col h-[200px]">
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 pb-1 border-b border-white/5 shrink-0">
                        Order History ({bTrades.length})
                      </h3>
                      <div className="flex-1 overflow-y-auto">
                        {bTrades.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic font-mono">
                            No orders recorded for this bot.
                          </div>
                        ) : (
                          <table className="w-full text-[10px] font-mono">
                            <thead>
                              <tr className="text-[8px] text-slate-600 uppercase border-b border-white/5">
                                <th className="text-left pb-1">Timestamp</th>
                                <th className="text-left pb-1">Side</th>
                                <th className="text-right pb-1">Price</th>
                                <th className="text-right pb-1">Qty</th>
                                <th className="text-right pb-1">Net P&L</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...bTrades].reverse().map((t: any) => (
                                <tr key={t.id} className="border-b border-white/[0.01] hover:bg-white/[0.01]">
                                  <td className="py-1 text-slate-500">{t.timestamp}</td>
                                  <td className={`py-1 font-bold ${t.action === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.action}</td>
                                  <td className="py-1 text-right text-slate-300 font-semibold">${Number(t.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                  <td className="py-1 text-right text-slate-400">{Number(t.qty).toFixed(4)}</td>
                                  <td className={`py-1 text-right font-bold ${t.action === 'SELL' ? (t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600'}`}>
                                    {t.action === 'SELL' ? `${t.pnl >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* Bot Local Logs Card */}
                    <div className="glass-panel p-4 flex flex-col h-[200px]">
                      <div className="flex justify-between items-center mb-2 pb-1 border-b border-white/5 shrink-0">
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          Bot Logs ({bLogs.length})
                        </h3>
                        {bLogs.length > 0 && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(bLogs.join('\n'));
                            }}
                            className="px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 text-[8px] font-bold text-slate-400 hover:text-white uppercase transition-all"
                          >
                            Copy Logs
                          </button>
                        )}
                      </div>
                      <div className="flex-1 bg-[#06080D]/90 border border-white/5 rounded-lg p-3 overflow-y-auto font-mono text-[9px] space-y-1 select-text">
                        {bLogs.length === 0 ? (
                          <span className="text-slate-600 italic">No logs recorded for this bot.</span>
                        ) : (
                          [...bLogs].reverse().map((log: string, idx: number) => (
                            <div key={idx} className={
                              log.includes('Error') || log.includes('error') ? 'text-red-400'
                                : log.includes('BUY') || log.includes('Signal: BUY') ? 'text-emerald-400 font-bold'
                                : log.includes('SELL') || log.includes('Signal: SELL') ? 'text-rose-400 font-bold'
                                : log.includes('Alpaca') ? 'text-indigo-400'
                                : log.includes('Mock') || log.includes('Sim') ? 'text-amber-500/70'
                                : 'text-slate-500'
                            }>{log}</div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              );
            })
          )}

        </div>{/* end RIGHT MAIN */}
      </div>{/* end two-column master */}

      {/* Custom Confirmation Modal for Bot Termination */}
      {selectedBotToTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1D24] border border-red-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Terminate Strategy Bot</h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Destructive session action</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans font-light">
              Are you sure you want to terminate bot: <strong className="text-white font-bold">{bots[selectedBotToTerminate]?.name || selectedBotToTerminate}</strong>? This will stop its live feed parsing execution thread and remove it from your console dashboard.
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <span className="text-xs font-semibold text-slate-300">Exit Sizing: Close {Math.round(closePct * 100)}% of Positions</span>
              <div className="flex gap-2">
                {[0, 0.25, 0.5, 0.75, 1.0].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setClosePct(pct)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded ${closePct === pct ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {pct === 0 ? "0%" : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedBotToTerminate(null)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={executeTerminateBot}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all cursor-pointer focus:outline-none"
              >
                Terminate Bot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Template Modal ────────────────────────────────────────── */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1D24] border border-indigo-500/20 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Bot Template</h3>
                <span className="text-[10px] text-[#A1A5B0] font-light">Store current config for quick re-use</span>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Enter a name for this bot template:</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); }}
                placeholder="e.g. BTC Scalper, ETH Swing..."
                autoFocus
                className="w-full px-3 py-2.5 bg-[#0F1115] border border-white/10 rounded-lg text-white font-semibold text-xs outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-slate-600 transition-all"
              />
            </div>

            {/* Config Preview */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono bg-[#0a0d12] rounded-lg p-3 border border-white/5">
              {[
                { label: 'Symbol', val: liveSymbol },
                { label: 'Timeframe', val: liveTimeframe },
                { label: 'Capital', val: `$${startingCash.toLocaleString()}` },
                { label: 'Leverage', val: `${leverageLimit}x` },
                { label: 'Feed', val: liveFeedSource.toUpperCase() },
                { label: 'Agentic', val: agenticMode ? 'ON' : 'OFF' },
              ].map((m, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-slate-500">{m.label}</span>
                  <span className="text-slate-300">{m.val}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/30 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer focus:outline-none flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

