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

import { 
  LayoutDashboard, 
  BrainCircuit, 
  Terminal, 
  Activity, 
  TrendingUp, 
  Briefcase, 
  Settings as SettingsIcon,
  LogOut,
  User,
  ShieldCheck,
  Layers,
  Menu,
  X
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

  // Sync strategies to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_strategies', JSON.stringify(strategies));
  }, [strategies]);

  // Sync Alpaca credentials to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_alpaca_key_id', alpacaKeyId);
    localStorage.setItem('neuroquant_alpaca_secret_key', alpacaSecretKey);
  }, [alpacaKeyId, alpacaSecretKey]);

  // Sync AI Assistant API credentials to localStorage
  useEffect(() => {
    localStorage.setItem('neuroquant_openai_api_key', openAiApiKey);
    localStorage.setItem('neuroquant_gemini_api_key', geminiApiKey);
  }, [openAiApiKey, geminiApiKey]);

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
      <aside className={`bg-slate-950/70 border-r border-white/5 flex flex-col justify-between shrink-0 backdrop-blur-md transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64 p-6 opacity-100' : 'w-0 p-0 opacity-0 border-r-0 overflow-hidden'
      }`}>
        <div className="space-y-8">
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between gap-2">
            <div 
              className="flex items-center gap-3 min-w-0 cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-base text-black shadow-md shadow-indigo-500/10 shrink-0">
                AQ
              </div>
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent truncate">
                AIQUANT
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Collapse Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {/* Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/dashboard' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Market Dashboard
            </button>

            {/* AI Predictor */}
            <button
              onClick={() => navigate('/predictor')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/predictor' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              AI Predictor
            </button>

            {/* AI Asset Screener */}
            <button
              onClick={() => navigate('/screener')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/screener' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4" />
              AI Asset Screener
            </button>

            {/* AI Strategy Lab */}
            <button
              onClick={() => navigate('/strategylab')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/strategylab' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Terminal className="w-4 h-4" />
              AI Strategy Lab
            </button>

            {/* Backtester */}
            <button
              onClick={() => navigate('/backtester')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/backtester' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Strategy Backtester
            </button>

            {/* Live Terminal */}
            <button
              onClick={() => navigate('/live')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/live' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Activity className="w-4 h-4" />
              Live Terminal
            </button>

            {/* Portfolio */}
            <button
              onClick={() => navigate('/portfolio')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/portfolio' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Portfolio Manager
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/settings' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Platform Settings
            </button>

            {/* User Profile */}
            <button
              onClick={() => navigate('/profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === '/profile' 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <User className="w-4 h-4" />
              User Profile
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="space-y-4">
          <div 
            onClick={() => navigate('/profile')}
            className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-xs text-white block truncate">{session}</span>
              <span className="text-[9px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Verified Quant
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Exit Terminal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#0a0c16] to-[#05070c]">
        {/* Top Header */}
        <header className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-slate-950/20 backdrop-blur-md gap-4">
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
            <h1 className="font-extrabold text-lg tracking-wide uppercase text-white truncate">
              {location.pathname === '/dashboard' && 'Market Dashboard'}
              {location.pathname === '/screener' && 'Quant Signal Matrix / AI Asset Screener'}
              {location.pathname === '/predictor' && 'AI Price Forecasting'}
              {location.pathname === '/strategylab' && 'AI Strategy Playground'}
              {location.pathname === '/backtester' && 'Strategy Backtesting'}
              {location.pathname === '/live' && 'Live simulated Session'}
              {location.pathname === '/portfolio' && 'Portfolio & Risk Diagnostics'}
              {location.pathname === '/settings' && 'Platform Configuration'}
              {location.pathname === '/profile' && 'Alexander Ramirez (Alex R.) - User Profile Terminal'}
            </h1>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4D88FF] animate-pulse" />
            ENVIRONMENT ONLINE: WSS://STREAM.BINANCE.COM
          </div>
        </header>

        {/* Content Box */}
        <main className="p-8 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predictor" element={<AIPredictor />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/strategylab" element={
              <AIStrategyLab 
                strategies={strategies} 
                setStrategies={setStrategies} 
                selectedStrategyId={selectedStrategyId} 
                setSelectedStrategyId={setSelectedStrategyId} 
                openAiApiKey={openAiApiKey}
                geminiApiKey={geminiApiKey}
              />
            } />
            <Route path="/backtester" element={
              <Backtester 
                strategies={strategies} 
                selectedStrategyId={selectedStrategyId} 
              />
            } />
            <Route path="/live" element={
              <LiveSession
                strategies={strategies}
                selectedStrategyId={selectedStrategyId}
                alpacaKeyId={alpacaKeyId}
                alpacaSecretKey={alpacaSecretKey}
              />
            } />
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
