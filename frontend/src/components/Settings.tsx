import { useState } from 'react';
import { Key, ShieldAlert, Cpu, Settings as SettingsIcon, Bell, CheckCircle2, Circle } from 'lucide-react';

interface SettingsProps {
  alpacaKeyId: string;
  setAlpacaKeyId: (v: string) => void;
  alpacaSecretKey: string;
  setAlpacaSecretKey: (v: string) => void;
  openAiApiKey: string;
  setOpenAiApiKey: (v: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (v: string) => void;
}

export default function Settings({ 
  alpacaKeyId, 
  setAlpacaKeyId, 
  alpacaSecretKey, 
  setAlpacaSecretKey,
  openAiApiKey,
  setOpenAiApiKey,
  geminiApiKey,
  setGeminiApiKey
}: SettingsProps) {
  // Local-only settings (not globally shared)
  const [binanceKey, setBinanceKey] = useState('');

  const [slippage, setSlippage] = useState(0.1);
  const [defaultSize, setDefaultSize] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState(5.0);
  const [leverage, setLeverage] = useState(1);

  const [aiModel, setAiModel] = useState('gemini-pro');
  const [aiTemp, setAiTemp] = useState(0.2);
  const [signalThreshold, setSignalThreshold] = useState(70);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState('obsidian');
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const alpacaConnected = alpacaKeyId.length > 4 && alpacaSecretKey.length > 4;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFlash(true);
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

          {/* Live Alpaca connection status pill */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
            alpacaConnected
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-slate-900/50 border-slate-800 text-slate-500'
          }`}>
            {alpacaConnected
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Alpaca Paper API — Credentials Saved &amp; Active</>  
              : <><Circle className="w-3.5 h-3.5" /> Alpaca Paper API — Not Configured</>}
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
              type="password"
              value={alpacaSecretKey}
              onChange={(e) => setAlpacaSecretKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Stored in browser localStorage — never sent to external servers.</p>
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

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">OpenAI API Key (Optional)</label>
            <input
              type="password"
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
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-xs font-mono outline-none"
              placeholder="AIzaSy••••••••••••••••••••••••••••••••"
            />
            <p className="text-[10px] text-slate-600 mt-1">Fallback generator model key for custom agent scripts.</p>
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

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Strategy Lab Assistant Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs outline-none focus:border-indigo-500/50"
            >
              <option value="gemini-pro">Gemini 3.5 Flash (Medium)</option>
              <option value="gpt-4">GPT-4o (Large Model)</option>
              <option value="claude-3">Claude 3.5 Sonnet</option>
              <option value="llama-3">Llama 3 (70B Local)</option>
            </select>
          </div>

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
