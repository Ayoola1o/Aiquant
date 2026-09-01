import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AIPredictor from './components/AIPredictor';
import AIStrategyLab from './components/AIStrategyLab';
import Backtester from './components/Backtester';
import LiveSession from './components/LiveSession';
import Portfolio from './components/Portfolio';
import Settings from './components/Settings';
import Screener from './components/Screener';
import UserProfile from './components/UserProfile';
import GlobalNews from './components/GlobalNews';
import HistoryPage from './components/HistoryPage';
import HistoryResultPage from './components/HistoryResultPage';
import MarketIntelligence from './components/MarketIntelligence';
import CommandPalette from './components/CommandPalette';
import MarketScanner from './components/MarketScanner';
import FeatureEngineeringLab from './components/FeatureEngineeringLab';
import RiskCommandCenter from './components/RiskCommandCenter';
import AICommandCenter from './components/AICommandCenter';
import DataManagement from './components/DataManagement';



import { 
  LayoutDashboard, 
  SlidersHorizontal,
  Sparkles,
  Compass,
  Layers,
  ShieldAlert,
  Bot,
  FlaskConical,
  TrendingUp, 
  Radio,
  Clock,
  Briefcase, 
  Database,
  Newspaper,
  BrainCircuit,
  Settings as SettingsIcon,
  User,
  ShieldCheck,
  LogOut,
  Search,
  Bell,
  Moon,
  ChevronDown,
  ArrowRight,
  Maximize2,
  X,
  Menu
} from 'lucide-react';


export default function App() {
  return (
    <BrowserRouter>
      <QuantApp />
    </BrowserRouter>
  );
}

function QuantApp() {
  const [session, setSession] = useState<string | null>(() => {
    return localStorage.getItem('neuroquant_session') || null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  
  // Managed Strategy lists persisted via localStorage
  const [strategies, setStrategies] = useState<Array<{ id: string; name: string; code: string }>>(() => {
    const saved = localStorage.getItem('neuroquant_strategies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load strategies from local storage", e);
      }
    }
    return [
      {
        id: 'default',
        name: 'SMA-20 Crossover',
        code: `class CustomStrategy(BaseStrategy):
    """
    SMA-20 Crossover Strategy.
    BUY when price crosses ABOVE the 20-period SMA.
    SELL when price crosses BELOW the 20-period SMA.
    Tracks previous candle to detect the actual crossover event.
    """
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.prev_close = None
        self.prev_sma   = None

    def on_candle(self, candle, state):
        close = candle['close']
        sma   = candle.get('sma', close)
        if self.prev_close is None:
            self.prev_close = close
            self.prev_sma   = sma
            return None
        pos_qty = sum(state['positions'].values())
        crossed_up   = (self.prev_close <= self.prev_sma) and (close > sma)
        crossed_down = (self.prev_close >= self.prev_sma) and (close < sma)
        order = None
        if crossed_up and state['cash'] > 50:
            qty = round((state['cash'] * 0.95) / close, 6)
            order = {"action": "BUY", "qty": qty, "type": "MARKET"}
        elif crossed_down and pos_qty > 0:
            order = {"action": "SELL", "qty": round(pos_qty, 6), "type": "MARKET"}
        self.prev_close = close
        self.prev_sma   = sma
        return order`
      },
      {
        id: 'rsi-reversion',
        name: 'RSI Mean Reversion',
        code: `class CustomStrategy(BaseStrategy):
    """
    RSI Mean-Reversion Strategy.
    BUY when RSI dips below 35 and bounces back above it.
    SELL when RSI spikes above 65 or stop-loss triggered.
    """
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.prev_rsi    = 50.0
        self.entry_price = None
        self.BUY_LEVEL   = 35
        self.SELL_LEVEL  = 65
        self.STOP_PCT    = 0.03

    def on_candle(self, candle, state):
        close   = candle['close']
        rsi     = candle.get('rsi', 50.0)
        pos_qty = sum(state['positions'].values())
        order = None
        if pos_qty == 0:
            if self.prev_rsi < self.BUY_LEVEL and rsi >= self.BUY_LEVEL and state['cash'] > 50:
                qty = round((state['cash'] * 0.95) / close, 6)
                self.entry_price = close
                order = {"action": "BUY", "qty": qty, "type": "MARKET"}
        else:
            stop_hit = self.entry_price and (close < self.entry_price * (1 - self.STOP_PCT))
            take_hit = rsi > self.SELL_LEVEL and self.prev_rsi <= self.SELL_LEVEL
            if stop_hit or take_hit:
                order = {"action": "SELL", "qty": round(pos_qty, 6), "type": "MARKET"}
                self.entry_price = None
        self.prev_rsi = rsi
        return order`
      },
      {
        id: 'macd-momentum',
        name: 'MACD Momentum',
        code: `class CustomStrategy(BaseStrategy):
    """
    MACD Histogram Momentum Strategy.
    BUY when MACD histogram flips positive (bullish momentum).
    SELL when MACD histogram flips negative (bearish momentum).
    """
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.prev_hist = 0.0
        self.MIN_HIST  = 0.00001

    def on_candle(self, candle, state):
        close   = candle['close']
        hist    = candle.get('macd_hist', 0.0)
        pos_qty = sum(state['positions'].values())
        order = None
        if self.prev_hist <= 0 and hist > self.MIN_HIST and pos_qty == 0 and state['cash'] > 50:
            qty = round((state['cash'] * 0.95) / close, 6)
            order = {"action": "BUY", "qty": qty, "type": "MARKET"}
        elif self.prev_hist >= 0 and hist < -self.MIN_HIST and pos_qty > 0:
            order = {"action": "SELL", "qty": round(pos_qty, 6), "type": "MARKET"}
        self.prev_hist = hist
        return order`
      }
    ];
  });

  const [selectedStrategyId, setSelectedStrategyId] = useState('default');

  // Global API credential settings — persisted to localStorage
  const [alpacaKeyId, setAlpacaKeyId] = useState<string>(() =>
    localStorage.getItem('neuroquant_alpaca_key_id') || ''
  );
  const [alpacaSecretKey, setAlpacaSecretKey] = useState<string>(() =>
    localStorage.getItem('neuroquant_alpaca_secret_key') || ''
  );
  const [openAiApiKey, setOpenAiApiKey] = useState<string>(() =>
    localStorage.getItem('neuroquant_openai_api_key') || ''
  );
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_gemini_api_key') || ''
  );
  const [techAgentKey, setTechAgentKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_tech_agent_key') || ''
  );
  const [sentimentAgentKey, setSentimentAgentKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_sentiment_agent_key') || ''
  );
  const [tradingViewAgentKey, setTradingViewAgentKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_tradingview_agent_key') || ''
  );
  const [hyperliquidAgentKey, setHyperliquidAgentKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_hyperliquid_agent_key') || ''
  );
  const [hyperliquidPrivateKey, setHyperliquidPrivateKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_hyperliquid_private_key') || ''
  );
  const [firecrawlAgentKey, setFirecrawlAgentKey] = useState<string>(() => 
    localStorage.getItem('neuroquant_firecrawl_agent_key') || ''
  );
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>(() =>
    localStorage.getItem('neuroquant_openrouter_api_key') || ''
  );
  const [nvidiaApiKey, setNvidiaApiKey] = useState<string>(() =>
    localStorage.getItem('neuroquant_nvidia_api_key') || ''
  );

  // Global AI Model Settings
  const [aiModel, setAiModel] = useState<string>(() =>
    localStorage.getItem('neuroquant_ai_model') || 'gemini'
  );
  const [openaiModel, setOpenaiModel] = useState<string>(() =>
    localStorage.getItem('neuroquant_openai_model') || 'gpt-4o'
  );
  const [geminiModel, setGeminiModel] = useState<string>(() =>
    localStorage.getItem('neuroquant_gemini_model') || 'gemini-1.5-flash'
  );
  const [openRouterModel, setOpenRouterModel] = useState<string>(() =>
    localStorage.getItem('neuroquant_openrouter_model') || 'anthropic/claude-3.5-sonnet'
  );
  const [nvidiaModel, setNvidiaModel] = useState<string>(() =>
    localStorage.getItem('neuroquant_nvidia_model') || 'meta/llama-3.1-nemotron-70b-instruct'
  );

  // ── Risk Management States ───────────────────────────────────────
  const [atrSizingEnabled, setAtrSizingEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_atr_sizing_enabled') === 'true'
  );
  const [atrRiskPercent, setAtrRiskPercent] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_atr_risk_percent') || '1.0')
  );
  const [atrPeriod, setAtrPeriod] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_atr_period') || '14')
  );
  const [atrMultiplier, setAtrMultiplier] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_atr_multiplier') || '2.0')
  );

  const [maxOrderValueEnabled, setMaxOrderValueEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_max_order_value_enabled') === 'true'
  );
  const [maxOrderValue, setMaxOrderValue] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_order_value') || '5000.0')
  );

  const [priceCollarEnabled, setPriceCollarEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_price_collar_enabled') === 'true'
  );
  const [maxSpreadPercent, setMaxSpreadPercent] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_spread_percent') || '0.5')
  );

  const [correlationLimitEnabled, setCorrelationLimitEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_correlation_limit_enabled') === 'true'
  );
  const [maxAllocationPerAsset, setMaxAllocationPerAsset] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_allocation_per_asset') || '20.0')
  );

  const [maxSimultaneousTradesEnabled, setMaxSimultaneousTradesEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_max_simultaneous_trades_enabled') === 'true'
  );
  const [maxSimultaneousTrades, setMaxSimultaneousTrades] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_simultaneous_trades') || '5')
  );

  const [maxDrawdownEnabled, setMaxDrawdownEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_max_drawdown_enabled') === 'true'
  );
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_drawdown_percent') || '3.0')
  );

  const [heartbeatCheckEnabled, setHeartbeatCheckEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_heartbeat_check_enabled') === 'true'
  );
  const [maxHeartbeatStaleSeconds, setMaxHeartbeatStaleSeconds] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_max_heartbeat_stale_seconds') || '30')
  );

  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState<boolean>(() =>
    localStorage.getItem('neuroquant_risk_auto_rebalance_enabled') === 'true'
  );
  const [autoRebalanceIntervalMinutes, setAutoRebalanceIntervalMinutes] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_auto_rebalance_interval_minutes') || '30')
  );
  const [slippageTolerancePct, setSlippageTolerancePct] = useState<number>(() =>
    Number(localStorage.getItem('neuroquant_risk_slippage_tolerance_pct') || '0.5')
  );

  // Sync Risk settings to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_risk_atr_sizing_enabled', String(atrSizingEnabled));
    localStorage.setItem('neuroquant_risk_atr_risk_percent', String(atrRiskPercent));
    localStorage.setItem('neuroquant_risk_atr_period', String(atrPeriod));
    localStorage.setItem('neuroquant_risk_atr_multiplier', String(atrMultiplier));
    localStorage.setItem('neuroquant_risk_max_order_value_enabled', String(maxOrderValueEnabled));
    localStorage.setItem('neuroquant_risk_max_order_value', String(maxOrderValue));
    localStorage.setItem('neuroquant_risk_price_collar_enabled', String(priceCollarEnabled));
    localStorage.setItem('neuroquant_risk_max_spread_percent', String(maxSpreadPercent));
    localStorage.setItem('neuroquant_risk_correlation_limit_enabled', String(correlationLimitEnabled));
    localStorage.setItem('neuroquant_risk_max_allocation_per_asset', String(maxAllocationPerAsset));
    localStorage.setItem('neuroquant_risk_max_simultaneous_trades_enabled', String(maxSimultaneousTradesEnabled));
    localStorage.setItem('neuroquant_risk_max_simultaneous_trades', String(maxSimultaneousTrades));
    localStorage.setItem('neuroquant_risk_max_drawdown_enabled', String(maxDrawdownEnabled));
    localStorage.setItem('neuroquant_risk_max_drawdown_percent', String(maxDrawdownPercent));
    localStorage.setItem('neuroquant_risk_heartbeat_check_enabled', String(heartbeatCheckEnabled));
    localStorage.setItem('neuroquant_risk_max_heartbeat_stale_seconds', String(maxHeartbeatStaleSeconds));
    localStorage.setItem('neuroquant_risk_auto_rebalance_enabled', String(autoRebalanceEnabled));
    localStorage.setItem('neuroquant_risk_auto_rebalance_interval_minutes', String(autoRebalanceIntervalMinutes));
    localStorage.setItem('neuroquant_risk_slippage_tolerance_pct', String(slippageTolerancePct));
  }, [
    atrSizingEnabled, atrRiskPercent, atrPeriod, atrMultiplier,
    maxOrderValueEnabled, maxOrderValue, priceCollarEnabled, maxSpreadPercent,
    correlationLimitEnabled, maxAllocationPerAsset, maxSimultaneousTradesEnabled, maxSimultaneousTrades,
    maxDrawdownEnabled, maxDrawdownPercent, heartbeatCheckEnabled, maxHeartbeatStaleSeconds,
    autoRebalanceEnabled, autoRebalanceIntervalMinutes, slippageTolerancePct
  ]);

  const riskProfile = {
    atr_sizing_enabled: atrSizingEnabled,
    atr_risk_percent: atrRiskPercent,
    atr_period: atrPeriod,
    atr_multiplier: atrMultiplier,
    max_order_value_enabled: maxOrderValueEnabled,
    max_order_value: maxOrderValue,
    price_collar_enabled: priceCollarEnabled,
    max_spread_percent: maxSpreadPercent,
    correlation_limit_enabled: correlationLimitEnabled,
    max_allocation_per_asset: maxAllocationPerAsset,
    max_simultaneous_trades_enabled: maxSimultaneousTradesEnabled,
    max_simultaneous_trades: maxSimultaneousTrades,
    max_drawdown_enabled: maxDrawdownEnabled,
    max_drawdown_percent: maxDrawdownPercent,
    heartbeat_check_enabled: heartbeatCheckEnabled,
    max_heartbeat_stale_seconds: maxHeartbeatStaleSeconds,
    auto_rebalance_enabled: autoRebalanceEnabled,
    auto_rebalance_interval_minutes: autoRebalanceIntervalMinutes,
    slippage_tolerance_pct: slippageTolerancePct
  };


  // Sync strategies to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_strategies', JSON.stringify(strategies));
  }, [strategies]);

  // Sync Alpaca credentials to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_alpaca_key_id', alpacaKeyId);
    localStorage.setItem('neuroquant_alpaca_secret_key', alpacaSecretKey);
  }, [alpacaKeyId, alpacaSecretKey]);

  // Sync AI Assistant API credentials & models to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_openai_api_key', openAiApiKey);
    localStorage.setItem('neuroquant_gemini_api_key', geminiApiKey);
    localStorage.setItem('neuroquant_tech_agent_key', techAgentKey);
    localStorage.setItem('neuroquant_sentiment_agent_key', sentimentAgentKey);
    localStorage.setItem('neuroquant_tradingview_agent_key', tradingViewAgentKey);
    localStorage.setItem('neuroquant_hyperliquid_agent_key', hyperliquidAgentKey);
    localStorage.setItem('neuroquant_hyperliquid_private_key', hyperliquidPrivateKey);
    localStorage.setItem('neuroquant_firecrawl_agent_key', firecrawlAgentKey);
    localStorage.setItem('neuroquant_openrouter_api_key', openRouterApiKey);
    localStorage.setItem('neuroquant_nvidia_api_key', nvidiaApiKey);
    localStorage.setItem('neuroquant_ai_model', aiModel);
    localStorage.setItem('neuroquant_openai_model', openaiModel);
    localStorage.setItem('neuroquant_gemini_model', geminiModel);
    localStorage.setItem('neuroquant_openrouter_model', openRouterModel);
    localStorage.setItem('neuroquant_nvidia_model', nvidiaModel);
  }, [
    openAiApiKey, 
    geminiApiKey,
    techAgentKey,
    sentimentAgentKey,
    tradingViewAgentKey,
    hyperliquidAgentKey,
    hyperliquidPrivateKey,
    firecrawlAgentKey,
    openRouterApiKey, 
    nvidiaApiKey, 
    aiModel, 
    openaiModel, 
    geminiModel, 
    openRouterModel, 
    nvidiaModel
  ]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = (username: string) => {
    setSession(username);
    localStorage.setItem('neuroquant_session', username);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('neuroquant_session');
    navigate('/');
  };

  // Checks if current path is a public page (Landing Page or Login)
  const isPublicPage = location.pathname === '/' || location.pathname === '/login';

  if (!session) {
    if (isPublicPage) {
      return (
        <Routes>
          <Route path="/" element={<LandingPage onLaunch={() => navigate('/login')} />} />
          <Route path="/login" element={<Auth onLoginSuccess={handleLoginSuccess} onBack={() => navigate('/')} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  // If logged in and on a public page, redirect to dashboard
  if (isPublicPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render Main Platform Layout
  return (
    <div className="flex min-h-screen text-slate-200">
      {/* Sidebar Navigation */}
      <aside className={`bg-[#080b14] border-r border-white/5 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out sticky top-0 h-screen overflow-y-auto ${
        sidebarOpen ? 'w-64 p-5 opacity-100' : 'w-0 p-0 opacity-0 border-r-0 overflow-hidden'
      }`}>
        <div className="space-y-6">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div 
              className="flex items-center gap-3 min-w-0 cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <div className="w-full h-full bg-[#080b14] rounded-[10px] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-base tracking-wide text-white block truncate leading-tight">
                  AiQuant
                </span>
                <span className="text-[10px] text-slate-400 font-medium block truncate">
                  AI Trading System
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Collapse Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items (Exact 17 items from mockup) */}
          <nav className="space-y-1">
            {[
              { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
              { name: 'Screener', path: '/screener', icon: SlidersHorizontal },
              { name: 'Market Intelligence', path: '/market', icon: Sparkles },
              { name: 'Global Scanner', path: '/scanner', icon: Compass },
              { name: 'Feature Engineering', path: '/features', icon: Layers },
              { name: 'Risk Command Center', path: '/risk', icon: ShieldAlert },
              { name: 'AI Command Center', path: '/commandcenter', icon: Bot },
              { name: 'Strategy Lab', path: '/strategylab', icon: FlaskConical },
              { name: 'Backtester', path: '/backtester', icon: TrendingUp },
              { name: 'Live Session', path: '/live', icon: Radio },
              { name: 'History', path: '/history', icon: Clock },
              { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
              { name: 'Data Lake', path: '/datalake', icon: Database },
              { name: 'News & Sentiment', path: '/news', icon: Newspaper },
              { name: 'AI Predictor', path: '/predictor', icon: BrainCircuit },
              { name: 'Settings', path: '/settings', icon: SettingsIcon },
              { name: 'Profile', path: '/profile', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#201c4e] to-[#151433] text-white border border-[#4f46e5]/40 shadow-[0_0_15px_rgba(99,102,241,0.25)] font-semibold' 
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar System Status & Version */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="p-3 bg-[#0c101d] border border-white/5 rounded-xl space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
              <span>SYSTEM STATUS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse" />
            </div>
            <div className="text-xs font-bold text-emerald-400">All Systems Operational</div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
              <span>Heartbeat</span>
              <span className="font-mono text-slate-400">2.4s ago</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
            <span>v2.4.0</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
              <Maximize2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#0a0c16] to-[#05070c]">
        {/* Top Header */}
        <header className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-[#0d111d]/70 backdrop-blur-md gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all focus:outline-none shrink-0"
                title="Expand Menu"
              >
                <Menu className="w-5 h-5 animate-pulse" />
              </button>
            )}
            
            {/* Search Input / Quick Launcher */}
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer w-64 md:w-80 shadow-inner"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1 text-slate-400 text-xs truncate">Search anything...</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-white/5">⌘ K</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Telegram Command & Control Center Link Button */}
            <a
              href="https://t.me/Aiquantappbot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 border border-sky-500/30 text-sky-400 hover:text-white hover:border-sky-400/60 transition-all text-xs font-semibold shadow-sm group"
              title="Open 24/7 Telegram Command & Control Terminal (@Aiquantappbot)"
            >
              <svg className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
              </svg>
              <span className="hidden md:inline font-bold">Telegram Terminal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981] animate-pulse" />
            </a>

            {/* Market Status UTC Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MARKET STATUS</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981] animate-pulse" />
                OPEN
              </span>
              <span className="text-slate-400 font-mono text-xs">12:45:30 UTC</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </div>

            {/* Notification Bell */}
            <button 
              onClick={() => navigate('/market')}
              className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5 bg-slate-900/60"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#0a0c16]">
                7
              </span>
            </button>

            {/* Theme Toggle (Moon) */}
            <button 
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5 bg-slate-900/60"
              title="Toggle Theme"
            >
              <Moon className="w-4 h-4" />
            </button>

            {/* User Profile Pill */}
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-slate-900/80 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                OP
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">Operator</div>
                <div className="text-[9px] font-semibold text-indigo-400 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Pro Trader
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </div>
          </div>
        </header>


        {/* Content Box */}
        <main className="p-8 flex-1 overflow-y-auto">
          <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predictor" element={<AIPredictor />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/market" element={<MarketIntelligence />} />
            <Route path="/scanner" element={<MarketScanner />} />
            <Route path="/features" element={<FeatureEngineeringLab />} />
            <Route path="/risk" element={<RiskCommandCenter />} />
            <Route path="/commandcenter" element={<AICommandCenter />} />
            <Route path="/datalake" element={<DataManagement />} />
            <Route path="/news" element={<GlobalNews />} />


            <Route path="/strategylab" element={
              <AIStrategyLab 
                strategies={strategies} 
                setStrategies={setStrategies} 
                selectedStrategyId={selectedStrategyId} 
                setSelectedStrategyId={setSelectedStrategyId} 
                openAiApiKey={openAiApiKey}
                geminiApiKey={geminiApiKey}
                openRouterApiKey={openRouterApiKey}
                nvidiaApiKey={nvidiaApiKey}
                aiModel={aiModel}
                openaiModel={openaiModel}
                geminiModel={geminiModel}
                openRouterModel={openRouterModel}
                nvidiaModel={nvidiaModel}
              />
            } />
            <Route path="/backtester" element={
              <Backtester 
                strategies={strategies} 
                selectedStrategyId={selectedStrategyId} 
                alpacaKeyId={alpacaKeyId}
                alpacaSecretKey={alpacaSecretKey}
              />
            } />
            <Route path="/live" element={
              <LiveSession
                strategies={strategies}
                selectedStrategyId={selectedStrategyId}
                alpacaKeyId={alpacaKeyId}
                alpacaSecretKey={alpacaSecretKey}
                riskProfile={riskProfile}
                geminiApiKey={geminiApiKey}
                techAgentKey={techAgentKey}
                sentimentAgentKey={sentimentAgentKey}
                tradingViewAgentKey={tradingViewAgentKey}
                hyperliquidAgentKey={hyperliquidAgentKey}
                hyperliquidPrivateKey={hyperliquidPrivateKey}
                firecrawlAgentKey={firecrawlAgentKey}
              />
            } />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:sessionId" element={<HistoryResultPage />} />
            <Route path="/portfolio" element={
              <Portfolio
                alpacaKeyId={alpacaKeyId}
                alpacaSecretKey={alpacaSecretKey}
              />
            } />
            <Route path="/settings" element={
              <Settings
                alpacaKeyId={alpacaKeyId}
                setAlpacaKeyId={setAlpacaKeyId}
                alpacaSecretKey={alpacaSecretKey}
                setAlpacaSecretKey={setAlpacaSecretKey}
                openAiApiKey={openAiApiKey}
                setOpenAiApiKey={setOpenAiApiKey}
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                techAgentKey={techAgentKey}
                setTechAgentKey={setTechAgentKey}
                sentimentAgentKey={sentimentAgentKey}
                setSentimentAgentKey={setSentimentAgentKey}
                tradingViewAgentKey={tradingViewAgentKey}
                setTradingViewAgentKey={setTradingViewAgentKey}
                hyperliquidAgentKey={hyperliquidAgentKey}
                hyperliquidPrivateKey={hyperliquidPrivateKey}
                setHyperliquidPrivateKey={setHyperliquidPrivateKey}
                setHyperliquidAgentKey={setHyperliquidAgentKey}
                firecrawlAgentKey={firecrawlAgentKey}
                setFirecrawlAgentKey={setFirecrawlAgentKey}
                openRouterApiKey={openRouterApiKey}
                setOpenRouterApiKey={setOpenRouterApiKey}
                nvidiaApiKey={nvidiaApiKey}
                setNvidiaApiKey={setNvidiaApiKey}
                aiModel={aiModel}
                setAiModel={setAiModel}
                openaiModel={openaiModel}
                setOpenaiModel={setOpenaiModel}
                geminiModel={geminiModel}
                setGeminiModel={setGeminiModel}
                openRouterModel={openRouterModel}
                setOpenRouterModel={setOpenRouterModel}
                nvidiaModel={nvidiaModel}
                setNvidiaModel={setNvidiaModel}
                
                atrSizingEnabled={atrSizingEnabled}
                setAtrSizingEnabled={setAtrSizingEnabled}
                atrRiskPercent={atrRiskPercent}
                setAtrRiskPercent={setAtrRiskPercent}
                atrPeriod={atrPeriod}
                setAtrPeriod={setAtrPeriod}
                atrMultiplier={atrMultiplier}
                setAtrMultiplier={setAtrMultiplier}
                maxOrderValueEnabled={maxOrderValueEnabled}
                setMaxOrderValueEnabled={setMaxOrderValueEnabled}
                maxOrderValue={maxOrderValue}
                setMaxOrderValue={setMaxOrderValue}
                priceCollarEnabled={priceCollarEnabled}
                setPriceCollarEnabled={setPriceCollarEnabled}
                maxSpreadPercent={maxSpreadPercent}
                setMaxSpreadPercent={setMaxSpreadPercent}
                correlationLimitEnabled={correlationLimitEnabled}
                setCorrelationLimitEnabled={setCorrelationLimitEnabled}
                maxAllocationPerAsset={maxAllocationPerAsset}
                setMaxAllocationPerAsset={setMaxAllocationPerAsset}
                maxSimultaneousTradesEnabled={maxSimultaneousTradesEnabled}
                setMaxSimultaneousTradesEnabled={setMaxSimultaneousTradesEnabled}
                maxSimultaneousTrades={maxSimultaneousTrades}
                setMaxSimultaneousTrades={setMaxSimultaneousTrades}
                maxDrawdownEnabled={maxDrawdownEnabled}
                setMaxDrawdownEnabled={setMaxDrawdownEnabled}
                maxDrawdownPercent={maxDrawdownPercent}
                setMaxDrawdownPercent={setMaxDrawdownPercent}
                heartbeatCheckEnabled={heartbeatCheckEnabled}
                setHeartbeatCheckEnabled={setHeartbeatCheckEnabled}
                maxHeartbeatStaleSeconds={maxHeartbeatStaleSeconds}
                setMaxHeartbeatStaleSeconds={setMaxHeartbeatStaleSeconds}
                
                autoRebalanceEnabled={autoRebalanceEnabled}
                setAutoRebalanceEnabled={setAutoRebalanceEnabled}
                autoRebalanceIntervalMinutes={autoRebalanceIntervalMinutes}
                setAutoRebalanceIntervalMinutes={setAutoRebalanceIntervalMinutes}
                slippageTolerancePct={slippageTolerancePct}
                setSlippageTolerancePct={setSlippageTolerancePct}
              />
            } />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
