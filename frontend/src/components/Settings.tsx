import { useState, useEffect } from 'react';
import { Key, ShieldAlert, Cpu, Settings as SettingsIcon, Bell, CheckCircle2, Circle, Plus, Trash2, Globe, Brain, Database, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface SettingsProps {
  alpacaKeyId: string;
  setAlpacaKeyId: (v: string) => void;
  alpacaSecretKey: string;
  setAlpacaSecretKey: (v: string) => void;
  openAiApiKey: string;
  setOpenAiApiKey: (v: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (v: string) => void;
  techAgentKey: string;
  setTechAgentKey: (v: string) => void;
  sentimentAgentKey: string;
  setSentimentAgentKey: (v: string) => void;
  tradingViewAgentKey: string;
  setTradingViewAgentKey: (v: string) => void;
  hyperliquidPrivateKey: string;
  setHyperliquidPrivateKey: (v: string) => void;
  hyperliquidAgentKey: string;
  setHyperliquidAgentKey: (v: string) => void;
  firecrawlAgentKey: string;
  setFirecrawlAgentKey: (v: string) => void;
  openRouterApiKey: string;
  setOpenRouterApiKey: (v: string) => void;
  nvidiaApiKey: string;
  setNvidiaApiKey: (v: string) => void;
  aiModel: string;
  setAiModel: (v: string) => void;
  openaiModel: string;
  setOpenaiModel: (v: string) => void;
  geminiModel: string;
  setGeminiModel: (v: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (v: string) => void;
  nvidiaModel: string;
  setNvidiaModel: (v: string) => void;

  atrSizingEnabled: boolean;
  setAtrSizingEnabled: (v: boolean) => void;
  atrRiskPercent: number;
  setAtrRiskPercent: (v: number) => void;
  atrPeriod: number;
  setAtrPeriod: (v: number) => void;
  atrMultiplier: number;
  setAtrMultiplier: (v: number) => void;
  maxOrderValueEnabled: boolean;
  setMaxOrderValueEnabled: (v: boolean) => void;
  maxOrderValue: number;
  setMaxOrderValue: (v: number) => void;
  priceCollarEnabled: boolean;
  setPriceCollarEnabled: (v: boolean) => void;
  maxSpreadPercent: number;
  setMaxSpreadPercent: (v: number) => void;
  correlationLimitEnabled: boolean;
  setCorrelationLimitEnabled: (v: boolean) => void;
  maxAllocationPerAsset: number;
  setMaxAllocationPerAsset: (v: number) => void;
  maxSimultaneousTradesEnabled: boolean;
  setMaxSimultaneousTradesEnabled: (v: boolean) => void;
  maxSimultaneousTrades: number;
  setMaxSimultaneousTrades: (v: number) => void;
  maxDrawdownEnabled: boolean;
  setMaxDrawdownEnabled: (v: boolean) => void;
  maxDrawdownPercent: number;
  setMaxDrawdownPercent: (v: number) => void;
  heartbeatCheckEnabled: boolean;
  setHeartbeatCheckEnabled: (v: boolean) => void;
  maxHeartbeatStaleSeconds: number;
  setMaxHeartbeatStaleSeconds: (v: number) => void;

  autoRebalanceEnabled: boolean;
  setAutoRebalanceEnabled: (v: boolean) => void;
  autoRebalanceIntervalMinutes: number;
  setAutoRebalanceIntervalMinutes: (v: number) => void;
  slippageTolerancePct: number;
  setSlippageTolerancePct: (v: number) => void;
}

export default function Settings({ 
  alpacaKeyId, 
  setAlpacaKeyId, 
  alpacaSecretKey, 
  setAlpacaSecretKey,
  openAiApiKey,
  setOpenAiApiKey,
  geminiApiKey,
  setGeminiApiKey,
  techAgentKey,
  setTechAgentKey,
  sentimentAgentKey,
  setSentimentAgentKey,
  tradingViewAgentKey,
  setTradingViewAgentKey,
  hyperliquidAgentKey,
  hyperliquidPrivateKey,
  setHyperliquidPrivateKey,
  setHyperliquidAgentKey,
  firecrawlAgentKey,
  setFirecrawlAgentKey,
  openRouterApiKey,
  setOpenRouterApiKey,
  nvidiaApiKey,
  setNvidiaApiKey,
  aiModel,
  setAiModel,
  openaiModel,
  setOpenaiModel,
  geminiModel,
  setGeminiModel,
  openRouterModel,
  setOpenRouterModel,
  nvidiaModel,
  setNvidiaModel,

  atrSizingEnabled,
  setAtrSizingEnabled,
  atrRiskPercent,
  setAtrRiskPercent,
  atrPeriod,
  setAtrPeriod,
  atrMultiplier,
  setAtrMultiplier,
  maxOrderValueEnabled,
  setMaxOrderValueEnabled,
  maxOrderValue,
  setMaxOrderValue,
  priceCollarEnabled,
  setPriceCollarEnabled,
  maxSpreadPercent,
  setMaxSpreadPercent,
  correlationLimitEnabled,
  setCorrelationLimitEnabled,
  maxAllocationPerAsset,
  setMaxAllocationPerAsset,
  maxSimultaneousTradesEnabled,
  setMaxSimultaneousTradesEnabled,
  maxSimultaneousTrades,
  setMaxSimultaneousTrades,
  maxDrawdownEnabled,
  setMaxDrawdownEnabled,
  maxDrawdownPercent,
  setMaxDrawdownPercent,
  heartbeatCheckEnabled,
  setHeartbeatCheckEnabled,
  maxHeartbeatStaleSeconds,
  setMaxHeartbeatStaleSeconds,

  autoRebalanceEnabled,
  setAutoRebalanceEnabled,
  autoRebalanceIntervalMinutes,
  setAutoRebalanceIntervalMinutes,
  slippageTolerancePct,
  setSlippageTolerancePct
}: SettingsProps) {
  // Local-only settings (not globally shared)
  const [binanceKey, setBinanceKey] = useState('');

  const [slippage, setSlippage] = useState(0.1);
  const [defaultSize, setDefaultSize] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState(5.0);
  const [leverage, setLeverage] = useState(1);
  const [showKeys, setShowKeys] = useState(false);

  const [aiTemp, setAiTemp] = useState(0.2);
  const [signalThreshold, setSignalThreshold] = useState(70);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState('obsidian');
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [syncFlash, setSyncFlash] = useState<string | null>(null);
 
  // Dynamic X/Twitter Handles Configuration
  const [xHandles, setXHandles] = useState<string[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [loadingHandles, setLoadingHandles] = useState(false);
  const [handlesError, setHandlesError] = useState('');

  // Google ADK Settings State
  const [adkSupervisionEnabled, setAdkSupervisionEnabled] = useState(() => {
    return localStorage.getItem('adk_supervision_enabled') === 'true';
  });
  const [adkTemp, setAdkTemp] = useState(() => {
    return Number(localStorage.getItem('adk_temperature') || '0.1');
  });
  const [adkLatencyThreshold, setAdkLatencyThreshold] = useState(() => {
    return Number(localStorage.getItem('adk_latency_threshold') || '3000');
  });

  // Telegram Command & Control Center State
  const [telegramToken, setTelegramToken] = useState(() => {
    return localStorage.getItem('neuroquant_telegram_token') || '';
  });
  const [telegramChatId, setTelegramChatId] = useState(() => {
    return localStorage.getItem('neuroquant_telegram_chat_id') || '8961634909';
  });
  const [telegramBotUsername, setTelegramBotUsername] = useState(() => {
    return localStorage.getItem('neuroquant_telegram_username') || 'Aiquantappbot';
  });
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(() => {
    return localStorage.getItem('neuroquant_telegram_notifications') !== 'false';
  });
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestTelegram = async () => {
    if (!telegramToken || !telegramChatId) {
      setTelegramTestResult({ success: false, message: 'Please enter both Telegram Bot Token and Chat ID.' });
      return;
    }
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: telegramToken,
          chat_id: telegramChatId,
          bot_username: telegramBotUsername,
          notifications_enabled: telegramNotificationsEnabled
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramTestResult({ success: true, message: 'Connected! Test ping delivered to your Telegram.' });
      } else {
        setTelegramTestResult({ success: false, message: data.detail || 'Failed to send test message.' });
      }
    } catch (e) {
      setTelegramTestResult({ success: false, message: 'Network error connecting to Telegram API.' });
    } finally {
      setTelegramTesting(false);
    }
  };

  const fetchXHandles = async () => {
    setLoadingHandles(true);
    try {
      const res = await fetch('/api/social/x-handles');
      if (res.ok) {
        const data = await res.json();
        setXHandles(data.handles || []);
      }
    } catch (e) {
      console.error("Failed to load X handles:", e);
    } finally {
      setLoadingHandles(false);
    }
  };

  useEffect(() => {
    fetchXHandles();
  }, []);

  const handleAddHandle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newHandle.trim()) return;
    
    let formatted = newHandle.trim();
    if (!formatted.startsWith('@')) {
      formatted = '@' + formatted;
    }
    
    setHandlesError('');
    try {
      const res = await fetch('/api/social/x-handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: formatted })
      });
      if (res.ok) {
        const data = await res.json();
        setXHandles(data.handles || []);
        setNewHandle('');
      } else {
        const errData = await res.json();
        setHandlesError(errData.detail || "Failed to add handle.");
      }
    } catch (err) {
      console.error("Error adding handle:", err);
      setHandlesError("Network error. Could not add handle.");
    }
  };

  const handleDeleteHandle = async (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    setHandlesError('');
    try {
      const res = await fetch(`/api/social/x-handles?handle=${encodeURIComponent(handle)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setXHandles(data.handles || []);
      } else {
        const errData = await res.json();
        setHandlesError(errData.detail || "Failed to delete handle.");
      }
    } catch (err) {
      console.error("Error deleting handle:", err);
      setHandlesError("Network error. Could not delete handle.");
    }
  };

  const syncAgentKeys = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setSyncFlash("Syncing keys...");
      const res = await fetch('/api/live/bots/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini: geminiApiKey,
          tech: techAgentKey,
          sentiment: sentimentAgentKey,
          tradingview: tradingViewAgentKey,
          hyperliquid: hyperliquidAgentKey,
          firecrawl: firecrawlAgentKey
        })
      });
      if (res.ok) {
        setSyncFlash("✅ API Keys successfully synced to all running bots!");
      } else {
        setSyncFlash("❌ Failed to sync keys.");
      }
      setTimeout(() => setSyncFlash(null), 3000);
    } catch (err) {
      console.error("Error syncing keys:", err);
      setSyncFlash("❌ Network error. Could not sync keys.");
      setTimeout(() => setSyncFlash(null), 3000);
    }
  };

  const alpacaConnected = alpacaKeyId.length > 4 && alpacaSecretKey.length > 4;
  const [alpacaVerifying, setAlpacaVerifying] = useState(false);
  const [alpacaVerifyResult, setAlpacaVerifyResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const testAlpacaConnection = async () => {
    if (!alpacaKeyId || !alpacaSecretKey) {
      setAlpacaVerifyResult({ success: false, message: 'Please enter both Alpaca Key ID and Secret Key.' });
      return;
    }
    setAlpacaVerifying(true);
    setAlpacaVerifyResult(null);
    try {
      const res = await fetch('/api/alpaca/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alpaca_key_id: alpacaKeyId, alpaca_secret_key: alpacaSecretKey })
      });
      const data = await res.json();
      if (res.ok) {
        setAlpacaVerifyResult({
          success: true,
          message: `Connected! Account #${data.account_number} • Equity: $${Number(data.portfolio_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} • Buying Power: $${Number(data.buying_power).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          details: data
        });
      } else {
        setAlpacaVerifyResult({ success: false, message: data.detail || 'Verification failed. Please check credentials.' });
      }
    } catch (e) {
      setAlpacaVerifyResult({ success: false, message: 'Network error communicating with server.' });
    } finally {
      setAlpacaVerifying(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFlash(true);

    // Save ADK Settings locally
    localStorage.setItem('adk_supervision_enabled', adkSupervisionEnabled.toString());
    localStorage.setItem('adk_temperature', adkTemp.toString());
    localStorage.setItem('adk_latency_threshold', adkLatencyThreshold.toString());

    // Save Telegram Settings locally and sync to backend
    localStorage.setItem('neuroquant_telegram_token', telegramToken);
    localStorage.setItem('neuroquant_telegram_chat_id', telegramChatId);
    localStorage.setItem('neuroquant_telegram_username', telegramBotUsername);
    localStorage.setItem('neuroquant_telegram_notifications', telegramNotificationsEnabled.toString());

    try {
      await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: telegramToken,
          chat_id: telegramChatId,
          bot_username: telegramBotUsername,
          notifications_enabled: telegramNotificationsEnabled
        })
      });
    } catch (err) {
      console.error("Failed to sync Telegram config to engine:", err);
    }

    try {
      await fetch('/api/live/risk_profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atr_sizing_enabled: atrSizingEnabled,
          atr_risk_percent: Number(atrRiskPercent),
          atr_period: Number(atrPeriod),
          atr_multiplier: Number(atrMultiplier),
          max_order_value_enabled: maxOrderValueEnabled,
          max_order_value: Number(maxOrderValue),
          price_collar_enabled: priceCollarEnabled,
          max_spread_percent: Number(maxSpreadPercent),
          correlation_limit_enabled: correlationLimitEnabled,
          max_allocation_per_asset: Number(maxAllocationPerAsset),
          max_simultaneous_trades_enabled: maxSimultaneousTradesEnabled,
          max_simultaneous_trades: Number(maxSimultaneousTrades),
          max_drawdown_enabled: maxDrawdownEnabled,
          max_drawdown_percent: Number(maxDrawdownPercent),
          heartbeat_check_enabled: heartbeatCheckEnabled,
          max_heartbeat_stale_seconds: Number(maxHeartbeatStaleSeconds),
          auto_rebalance_enabled: autoRebalanceEnabled,
          auto_rebalance_interval_minutes: Number(autoRebalanceIntervalMinutes),
          slippage_tolerance_pct: Number(slippageTolerancePct)
        })
      });
    } catch (err) {
      console.error("Failed to sync risk profile to engine:", err);
    }
    setTimeout(() => setSavedFlash(false), 3000);
  };

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* API Settings */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-indigo-400" />
            External API Key Settings
          </h3>

          {/* Live Alpaca connection status pill & Test button */}
          <div className="space-y-2">
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
              alpacaConnected
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}>
              <div className="flex items-center gap-2">
                {alpacaConnected
                  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Alpaca Paper API — Credentials Active</>  
                  : <><Circle className="w-3.5 h-3.5" /> Alpaca Paper API — Not Configured</>}
              </div>

              {alpacaConnected && (
                <button
                  type="button"
                  onClick={testAlpacaConnection}
                  disabled={alpacaVerifying}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${alpacaVerifying ? 'animate-spin' : ''}`} />
                  <span>{alpacaVerifying ? 'Verifying...' : 'Test Connection'}</span>
                </button>
              )}
            </div>

            {alpacaVerifyResult && (
              <div className={`p-2.5 rounded-xl text-xs font-medium border animate-fadeIn ${
                alpacaVerifyResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-mono text-[11px]' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300 text-[11px]'
              }`}>
                {alpacaVerifyResult.message}
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Alpaca Key ID (Paper Trading)</label>
            <input
              type="text"
              value={alpacaKeyId}
              onChange={(e) => setAlpacaKeyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="PKXXXXXXXXXXXXXXXXXX"
            />
            <p className="text-[10px] text-slate-600 mt-1">Used by Live Terminal bots for Alpaca paper order routing.</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Alpaca Secret Key</label>
            <input
              type="text"
              value={alpacaSecretKey}
              onChange={(e) => setAlpacaSecretKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Stored in browser localStorage — used for live account balance & order execution.</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Binance Public Feed Key (Optional)</label>
            <input
              type="text"
              value={binanceKey}
              onChange={(e) => setBinanceKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="Key for live high-frequency order placement"
            />
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-500 font-semibold">API Keys are stored locally in your browser.</span>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 text-[10px] font-bold text-slate-400 hover:text-white transition-all"
            >
              {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showKeys ? 'Hide Keys' : 'Show Keys'}
            </button>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">OpenAI API Key (Optional)</label>
            <input
              type={showKeys ? "text" : "password"}
              value={openAiApiKey}
              onChange={(e) => setOpenAiApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="sk-••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Used to generate highly customized strategies in AI Strategy Lab.</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Gemini API Key (Optional)</label>
            <input
              type={showKeys ? "text" : "password"}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="AIzaSy••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Powers the Agentic AI multi-agent pipeline (ADK). Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">AI Studio</a>.</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">OpenRouter API Key (Optional)</label>
            <input
              type={showKeys ? "text" : "password"}
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="sk-or-v1-••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Used to access a vast array of models via OpenRouter routing.</p>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">NVIDIA API Key (Optional)</label>
            <input
              type={showKeys ? "text" : "password"}
              value={nvidiaApiKey}
              onChange={(e) => setNvidiaApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="nvapi-••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Used for fast inference on NVIDIA NIM optimized models.</p>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-800/50">
            <h4 className="text-sm font-semibold text-white mb-4">ADK Agent-Specific Keys</h4>
            <p className="text-[10px] text-slate-500 mb-4 font-light">By default, all sub-agents use the Main Gemini Key. Provide separate keys below to distribute API rate-limits.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Technical Analyst Agent Key (Optional)</label>
                <input 
                  type={showKeys ? "text" : "password"}
                  value={techAgentKey}
                  onChange={(e) => setTechAgentKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
                  placeholder="Uses Main Gemini Key if empty"
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Sentiment Analyst Agent Key (Optional)</label>
                <input 
                  type={showKeys ? "text" : "password"}
                  value={sentimentAgentKey}
                  onChange={(e) => setSentimentAgentKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
                  placeholder="Uses Main Gemini Key if empty"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">TradingView Analyst Agent Key (Optional)</label>
                <input 
                  type={showKeys ? "text" : "password"}
                  value={tradingViewAgentKey}
                  onChange={(e) => setTradingViewAgentKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
                  placeholder="Uses Main Gemini Key if empty"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Hyperliquid Tracker Agent Key (Optional)</label>
                <input 
                  type={showKeys ? "text" : "password"}
                  value={hyperliquidAgentKey}
                  onChange={(e) => setHyperliquidAgentKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
                  placeholder="Uses Main Gemini Key if empty"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Firecrawl Researcher Agent Key (Optional)</label>
                <input 
                  type={showKeys ? "text" : "password"}
                  value={firecrawlAgentKey}
                  onChange={(e) => setFirecrawlAgentKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
                  placeholder="Uses Main Gemini Key if empty"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Command & Control Center Remote Terminal */}
        <div className="glass-panel p-6 space-y-4 md:col-span-2 bg-gradient-to-br from-[#0c1222] to-[#080d19] border border-sky-500/20 rounded-2xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                <div className="w-full h-full bg-[#080d19] rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-sky-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  Telegram Command &amp; Control Center
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold">
                    24/7 REMOTE TERMINAL
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control active bots, monitor P&amp;L, execute panic close, and receive 30-min AI intelligence briefs on Telegram.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://t.me/${telegramBotUsername || 'Aitraderheartbeatbot'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Open @{telegramBotUsername || 'Aitraderheartbeatbot'}</span>
                <Globe className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Telegram Bot Token</label>
              <input
                type={showKeys ? "text" : "password"}
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-sky-500/50 rounded-xl text-xs font-mono outline-none text-white"
                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              />
              <p className="text-[10px] text-slate-500 mt-1">Obtained from @BotFather on Telegram.</p>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Authorized Chat ID / User ID</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-sky-500/50 rounded-xl text-xs font-mono outline-none text-white"
                placeholder="e.g. 123456789 (or send /auth to bot)"
              />
              <p className="text-[10px] text-slate-500 mt-1">Restricts trading commands strictly to your Telegram account.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Telegram Bot Username</label>
              <input
                type="text"
                value={telegramBotUsername}
                onChange={(e) => setTelegramBotUsername(e.target.value.replace('@', ''))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-sky-500/50 rounded-xl text-xs font-mono outline-none text-white"
                placeholder="Aitraderheartbeatbot"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Automated Telemetry &amp; 30-min AI Briefs</span>
                <span className="text-[10px] text-slate-500 font-light block">Push trade execution alerts &amp; AI briefings to Telegram</span>
              </div>
              <input
                type="checkbox"
                checked={telegramNotificationsEnabled}
                onChange={(e) => setTelegramNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-800 text-sky-500 bg-slate-950/60 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Test connection row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={telegramTesting}
              className="px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${telegramTesting ? 'animate-spin' : ''}`} />
              <span>{telegramTesting ? 'Sending Test Ping...' : 'Test Telegram Connection'}</span>
            </button>

            {telegramTestResult && (
              <div className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                telegramTestResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-mono text-[11px]' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300 text-[11px]'
              }`}>
                {telegramTestResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Engine Settings */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2 mb-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            Trading Engine Settings
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Slippage Limit (%)</label>
              <input
                type="number"
                step="0.05"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Default Size (% Cash)</label>
              <input
                type="number"
                value={defaultSize}
                onChange={(e) => setDefaultSize(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Max Risk Drawdown (%)</label>
              <input
                type="number"
                step="0.5"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Target Leverage (X)</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-500 flex gap-2 items-center">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Engines apply risk caps automatically. Reaching Max Risk halts live strategies.</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI & Model Settings */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            AI & Model Settings
          </h3>

          {/* Provider Select */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Strategy Lab Provider</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50 text-white font-semibold"
            >
              <option value="gemini">Google Gemini API</option>
              <option value="openai">OpenAI API</option>
              <option value="openrouter">OpenRouter API</option>
              <option value="nvidia">NVIDIA NIM API</option>
            </select>
          </div>

          {/* Model Config based on Provider */}
          {aiModel === 'openai' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">OpenAI Model</label>
                <select
                  value={['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].includes(openaiModel) ? openaiModel : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setOpenaiModel('');
                    } else {
                      setOpenaiModel(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50 text-white"
                >
                  <option value="gpt-4o">GPT-4o (Default)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="custom">Custom Model...</option>
                </select>
              </div>
              {!['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].includes(openaiModel) && (
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Custom OpenAI Model Name</label>
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="Enter custom model identifier (e.g. gpt-4)"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>
          )}

          {aiModel === 'gemini' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Gemini Model</label>
                <select
                  value={['gemini-1.5-flash', 'gemini-1.5-pro'].includes(geminiModel) ? geminiModel : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setGeminiModel('');
                    } else {
                      setGeminiModel(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50 text-white"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="custom">Custom Model...</option>
                </select>
              </div>
              {!['gemini-1.5-flash', 'gemini-1.5-pro'].includes(geminiModel) && (
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Custom Gemini Model Name</label>
                  <input
                    type="text"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    placeholder="Enter custom model identifier (e.g. gemini-1.0-pro)"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>
          )}

          {aiModel === 'openrouter' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">OpenRouter Model</label>
                <select
                  value={['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-exp:free'].includes(openRouterModel) ? openRouterModel : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setOpenRouterModel('');
                    } else {
                      setOpenRouterModel(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50 text-white"
                >
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Default)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
                  <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (Free)</option>
                  <option value="custom">Custom Model...</option>
                </select>
              </div>
              {!['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-exp:free'].includes(openRouterModel) && (
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Custom OpenRouter Model Name</label>
                  <input
                    type="text"
                    value={openRouterModel}
                    onChange={(e) => setOpenRouterModel(e.target.value)}
                    placeholder="Enter custom model (e.g. deepseek/deepseek-chat)"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>
          )}

          {aiModel === 'nvidia' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">NVIDIA NIM Model</label>
                <select
                  value={['meta/llama-3.1-nemotron-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'].includes(nvidiaModel) ? nvidiaModel : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setNvidiaModel('');
                    } else {
                      setNvidiaModel(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50 text-white"
                >
                  <option value="meta/llama-3.1-nemotron-70b-instruct">Llama 3.1 Nemotron 70B (Default)</option>
                  <option value="nvidia/llama-3.1-nemotron-70b-instruct">NVIDIA Llama 3.1 Nemotron 70B</option>
                  <option value="custom">Custom Model...</option>
                </select>
              </div>
              {!['meta/llama-3.1-nemotron-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'].includes(nvidiaModel) && (
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Custom NVIDIA Model Name</label>
                  <input
                    type="text"
                    value={nvidiaModel}
                    onChange={(e) => setNvidiaModel(e.target.value)}
                    placeholder="Enter custom model (e.g. meta/llama3-70b-instruct)"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Assistant Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={aiTemp}
                onChange={(e) => setAiTemp(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Signal Threshold (%)</label>
              <input
                type="number"
                value={signalThreshold}
                onChange={(e) => setSignalThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* App Preferences */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            App Preferences & Alerts
          </h3>

          <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-slate-300 text-xs font-semibold">Sound Notifications</label>
                <span className="text-[10px] text-slate-500 font-light block">Play sounds on order executions or alerts</span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label className="block text-slate-300 text-xs font-semibold">Email Alerts</label>
                <span className="text-[10px] text-slate-500 font-light block">Send daily P&L reports to profile email</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Theme Mode</label>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50"
              >
                <option value="obsidian">Obsidian Dark (Glassmorphic)</option>
                <option value="slate">Slate Dark (Classic)</option>
                <option value="light">Amber Light (High Contrast)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
 
      {/* Risk Management & Account Protection Controls */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="font-bold text-base text-white flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          Risk Management &amp; Account Protection
        </h3>
        <p className="text-[11px] text-slate-500 font-light -mt-2">
          Defensive layers that intercept signals, size positions, and pause execution dynamically before trades reach execution.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Section 1: Pre-Trade Single-Trade Controls */}
          <div className="space-y-4 bg-slate-950/40 rounded-2xl p-4 border border-slate-900">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-900 pb-2">
              1. Pre-Trade Risk Controls
            </h4>

            {/* ATR Sizing */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Volatility-Based Position Sizing (ATR Sizing)</label>
                  <span className="text-[10px] text-slate-500 font-light block">Scale order sizes dynamically using Average True Range (14 period)</span>
                </div>
                <input
                  type="checkbox"
                  checked={atrSizingEnabled}
                  onChange={(e) => setAtrSizingEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {atrSizingEnabled && (
                <div className="grid grid-cols-3 gap-3 pl-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Risk % of Capital</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={atrRiskPercent}
                      onChange={(e) => setAtrRiskPercent(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">ATR Period</label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={atrPeriod}
                      onChange={(e) => setAtrPeriod(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">ATR Multiplier (Stop)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      max="5.0"
                      value={atrMultiplier}
                      onChange={(e) => setAtrMultiplier(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Max Order Value Cap */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Fat-Finger Protection (Max Order Value)</label>
                  <span className="text-[10px] text-slate-500 font-light block">Hard limit on total dollar value allocated to any single trade</span>
                </div>
                <input
                  type="checkbox"
                  checked={maxOrderValueEnabled}
                  onChange={(e) => setMaxOrderValueEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {maxOrderValueEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Maximum Trade Value (USD)</label>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={maxOrderValue}
                    onChange={(e) => setMaxOrderValue(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none font-semibold text-indigo-400"
                  />
                </div>
              )}
            </div>

            {/* Price Collar Spread Protection */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Price Collar Spread Protection</label>
                  <span className="text-[10px] text-slate-500 font-light block">Reject market orders when bid-ask spread is too wide (prevents slippage)</span>
                </div>
                <input
                  type="checkbox"
                  checked={priceCollarEnabled}
                  onChange={(e) => setPriceCollarEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {priceCollarEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Max Allowed Spread (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="5.0"
                    value={maxSpreadPercent}
                    onChange={(e) => setMaxSpreadPercent(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Portfolio-Level & Operational Controls */}
          <div className="space-y-4 bg-slate-950/40 rounded-2xl p-4 border border-slate-900">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-900 pb-2">
              2. Portfolio &amp; Operational Controls
            </h4>

            {/* Correlation & Allocation limits */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Sector &amp; Asset Correlation Limits</label>
                  <span className="text-[10px] text-slate-500 font-light block">Cap max portfolio allocation percentage allocated per individual asset</span>
                </div>
                <input
                  type="checkbox"
                  checked={correlationLimitEnabled}
                  onChange={(e) => setCorrelationLimitEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {correlationLimitEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Max Allocation Per Asset (% of Equity)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={maxAllocationPerAsset}
                    onChange={(e) => setMaxAllocationPerAsset(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>

            {/* Max Simultaneous Open Trades */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Maximum Simultaneous Open Positions</label>
                  <span className="text-[10px] text-slate-500 font-light block">Ceiling on concurrent open trades. Excess strategy signals are blocked.</span>
                </div>
                <input
                  type="checkbox"
                  checked={maxSimultaneousTradesEnabled}
                  onChange={(e) => setMaxSimultaneousTradesEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {maxSimultaneousTradesEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Max Open Positions Count</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxSimultaneousTrades}
                    onChange={(e) => setMaxSimultaneousTrades(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>

            {/* Max Daily Drawdown Kill Switch */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Daily Drawdown Circuit Breaker (Kill Switch)</label>
                  <span className="text-[10px] text-red-500/80 font-semibold block">Emergency flatten &amp; lockdown when rolling 24h losses hit cap</span>
                </div>
                <input
                  type="checkbox"
                  checked={maxDrawdownEnabled}
                  onChange={(e) => setMaxDrawdownEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-red-500 bg-slate-950/60 focus:ring-red-500"
                />
              </div>
              {maxDrawdownEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Max Daily Drawdown Limit (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20.0"
                    value={maxDrawdownPercent}
                    onChange={(e) => setMaxDrawdownPercent(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-red-500/30 rounded-lg text-xs font-mono outline-none font-bold text-red-400"
                  />
                </div>
              )}
            </div>

            {/* Heartbeat / Connection check */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Data Heartbeat Connection Check</label>
                  <span className="text-[10px] text-slate-500 font-light block">Halt orders immediately if no new tick is received within threshold (seconds)</span>
                </div>
                <input
                  type="checkbox"
                  checked={heartbeatCheckEnabled}
                  onChange={(e) => setHeartbeatCheckEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {heartbeatCheckEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Max Heartbeat Age (Seconds)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={maxHeartbeatStaleSeconds}
                    onChange={(e) => setMaxHeartbeatStaleSeconds(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                  />
                </div>
              )}
            </div>

            {/* Auto Risk Rebalancing */}
            <div className="space-y-3 pt-2 border-t border-slate-900/60">
              <div className="flex justify-between items-center">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold">Auto Risk Rebalancing</label>
                  <span className="text-[10px] text-slate-500 font-light block">Periodically adjust portfolio weights inversely to bot volatility</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoRebalanceEnabled}
                  onChange={(e) => setAutoRebalanceEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 bg-slate-950/60 focus:ring-indigo-500"
                />
              </div>
              {autoRebalanceEnabled && (
                <div className="pl-2">
                  <label className="block text-slate-400 text-[10px] mb-1">Rebalance Interval</label>
                  <select
                    value={autoRebalanceIntervalMinutes}
                    onChange={(e) => setAutoRebalanceIntervalMinutes(Number(e.target.value))}
                    className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="240">4 Hours</option>
                  </select>
                </div>
              )}
            </div>

            {/* Slippage Tolerance */}
            <div className="space-y-3 pt-2 border-t border-slate-900/60">
              <div>
                <label className="block text-slate-300 text-xs font-semibold">Slippage Tolerance (%)</label>
                <span className="text-[10px] text-slate-500 font-light block">Defines execution price buffer for orders and simulator execution penalty</span>
              </div>
              <div className="pl-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={slippageTolerancePct}
                  onChange={(e) => setSlippageTolerancePct(Number(e.target.value))}
                  className="w-48 px-2 py-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/50 rounded-lg text-xs font-mono outline-none text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Sync Button */}
          <div className="px-6 pb-6 pt-2 flex justify-between items-center">
            <div className="text-sm font-medium">
              {syncFlash && (
                <span className={syncFlash.includes('❌') ? "text-red-400" : "text-green-400"}>
                  {syncFlash}
                </span>
              )}
            </div>
            <button
              onClick={syncAgentKeys}
              className="bg-[#4D88FF] hover:bg-[#3B76EB] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Sync Keys to Live Bots
            </button>
          </div>
        </div>

        {/* Hyperliquid Trading Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/80 flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Hyperliquid Trading</h2>
              <p className="text-sm text-gray-400">Execution credentials for Hyperliquid Testnet/Mainnet.</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hyperliquid Wallet Private Key (Ethereum Address)
              </label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={hyperliquidPrivateKey}
                onChange={(e) => setHyperliquidPrivateKey(e.target.value)}
                placeholder="Uses Main Gemini Key if empty (0x...)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* X/Twitter Scraper Configurations */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2 mb-1">
          <Globe className="w-5 h-5 text-indigo-400" />
          X (Twitter) Scraper Configurations
        </h3>
        <p className="text-xs text-slate-500 font-light">
          Narrow down the social media scraper to target these specific accounts/handles. Enter any custom handle to scrape news dynamically from it.
        </p>

        {/* Input box to enter new accounts */}
        <div className="flex gap-2 max-w-md pt-2">
          <input
            type="text"
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs outline-none text-white placeholder-slate-600 font-semibold"
            placeholder="Enter X handle (e.g. @Nairametrics)"
          />
          <button
            onClick={handleAddHandle}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </div>

        {handlesError && (
          <p className="text-xs text-[#FF4B55] font-semibold animate-pulse">{handlesError}</p>
        )}

        {/* List of active handles */}
        <div className="pt-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Tracked News Accounts</span>
          {loadingHandles ? (
            <div className="text-xs text-slate-500 animate-pulse">Loading sources list...</div>
          ) : xHandles.length === 0 ? (
            <div className="text-xs text-slate-600">No custom handles registered. Nairametrics defaults active.</div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {xHandles.map((handle, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#0F1115] border border-white/5 rounded-xl text-xs text-slate-300 font-semibold group hover:border-slate-700 transition-all"
                >
                  <span className="font-mono text-indigo-400">{handle}</span>
                  <button
                    onClick={(e) => handleDeleteHandle(handle, e)}
                    className="text-slate-500 hover:text-[#FF4B55] transition-colors p-0.5 rounded cursor-pointer"
                    title={`Stop tracking ${handle}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google ADK Multi-Agent Cognitive Settings */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-indigo-400" />
          Google ADK Cognitive Agent Settings
        </h3>
        <p className="text-xs text-slate-500 font-light">
          Configure the Google Agent Development Kit (ADK) supervisor framework. When enabled, a multi-agent desk (Quantitative & Sentiment Analysts) evaluates and must clear trading setups.
        </p>

        <div className="space-y-4 pt-2">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Enable Multi-Agent Desk Supervision</span>
              <span className="text-[10px] text-slate-500">Enable Gemini 1.5/2.5 supervisor compliance layer</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={adkSupervisionEnabled}
                onChange={(e) => setAdkSupervisionEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-950/70 border border-slate-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supervisor Temperature</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1.0"
                value={adkTemp}
                onChange={(e) => setAdkTemp(Number(e.target.value))}
                className="px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs outline-none text-white w-full font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Decision Latency (ms)</label>
              <input
                type="number"
                step="100"
                min="500"
                max="10000"
                value={adkLatencyThreshold}
                onChange={(e) => setAdkLatencyThreshold(Number(e.target.value))}
                className="px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs outline-none text-white w-full font-mono"
              />
            </div>
          </div>
          
          {adkSupervisionEnabled && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-[10px] text-amber-300 font-semibold flex items-center gap-2">
              ⚠️ Note: LLM cognitive reasoning cycles add 800ms - 3s latency. This setup is not suitable for high-frequency scalping.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {savedFlash && (
          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Configuration saved successfully.
          </span>
        )}
        <div className="ml-auto">
          <button
            type="submit"
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/10 transition-all duration-300"
          >
            Save Platform Configuration
          </button>
        </div>
      </div>
    </form>
  );
}
