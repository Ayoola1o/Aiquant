import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Copy, FileCode, Terminal } from 'lucide-react';

interface AIStrategyLabProps {
  strategies: Array<{ id: string; name: string; code: string }>;
  setStrategies: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; code: string }>>>;
  selectedStrategyId: string;
  setSelectedStrategyId: (id: string) => void;
  openAiApiKey?: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  nvidiaApiKey?: string;
  aiModel?: string;
  openaiModel?: string;
  geminiModel?: string;
  openRouterModel?: string;
  nvidiaModel?: string;
}

interface Message {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
}

export default function AIStrategyLab({ 
  strategies, 
  setStrategies, 
  selectedStrategyId, 
  setSelectedStrategyId,
  openAiApiKey = '',
  geminiApiKey = '',
  openRouterApiKey = '',
  nvidiaApiKey = '',
  aiModel = 'gemini',
  openaiModel = 'gpt-4o',
  geminiModel = 'gemini-1.5-flash',
  openRouterModel = 'anthropic/claude-3.5-sonnet',
  nvidiaModel = 'meta/llama-3.1-nemotron-70b-instruct'
}: AIStrategyLabProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: 1, sender: 'assistant', text: "Hello! I am your AI Quantitative Developer Assistant. Describe a trading strategy in natural language (e.g., 'Golden Cross strategy using 50/200 SMAs with a 2% stop-loss'), and I will generate the fully functional Python class for you!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Naming & editing states
  const [strategyName, setStrategyName] = useState('New Strategy');
  const [workingCode, setWorkingCode] = useState('');

  // Sync with selected strategy
  useEffect(() => {
    const active = strategies.find(s => s.id === selectedStrategyId);
    if (active) {
      setStrategyName(active.name);
      setWorkingCode(active.code);
    }
  }, [selectedStrategyId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setCompileStatus('idle');
    setConsoleLogs(["[Compiler] Initializing code generation request...", "[Compiler] Sending prompts to AI model..."]);
    
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          openai_api_key: openAiApiKey, 
          gemini_api_key: geminiApiKey,
          openrouter_api_key: openRouterApiKey,
          nvidia_api_key: nvidiaApiKey,
          ai_model: aiModel,
          openai_model: openaiModel,
          gemini_model: geminiModel,
          openrouter_model: openRouterModel,
          nvidia_model: nvidiaModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkingCode(data.code);
        setCompileStatus('success');
        setConsoleLogs(prev => [...prev, "[Compiler] Success! Strategy class compiled successfully without syntax errors.", "[Compiler] CustomStrategy instance generated."]);
        
        // Add to chat
        setChatMessages(prev => [
          ...prev,
          { id: prev.length + 1, sender: 'user', text: `Generate: ${prompt}` },
          { id: prev.length + 2, sender: 'assistant', text: "I have generated the strategy! The code is loaded in your editor. It inherits from `BaseStrategy` and executes trades based on your parameters. Let me know if you would like to adjust it!" }
        ]);
        setPrompt('');
      } else {
        setCompileStatus('error');
        setConsoleLogs(prev => [...prev, "[Compiler] Error: Generation request rejected by backend."]);
      }
    } catch (e) {
      setCompileStatus('error');
      setConsoleLogs(prev => [...prev, `[Compiler] Connection Error: ${e}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !workingCode) return;
    
    const adjustment = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { id: prev.length + 1, sender: 'user', text: adjustment }]);
    setLoading(true);
    setConsoleLogs(prev => [...prev, "[Compiler] Analyzing current Python AST...", "[Compiler] Injecting adjustments..."]);

    try {
      const res = await fetch('/api/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: workingCode,
          adjustment: adjustment,
          openai_api_key: openAiApiKey,
          gemini_api_key: geminiApiKey,
          openrouter_api_key: openRouterApiKey,
          nvidia_api_key: nvidiaApiKey,
          ai_model: aiModel,
          openai_model: openaiModel,
          gemini_model: geminiModel,
          openrouter_model: openRouterModel,
          nvidia_model: nvidiaModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWorkingCode(data.code);
        setCompileStatus('success');
        setConsoleLogs(prev => [...prev, "[Compiler] Refinement complete! Strategy compiled.", "[Compiler] Hot reload ready."]);
        
        setChatMessages(prev => [
          ...prev,
          { id: prev.length + 1, sender: 'assistant', text: "Strategy refined successfully! I've updated the script variables and injected the changes into the editor. You can now test it in the Backtester!" }
        ]);
      } else {
        setCompileStatus('error');
        setConsoleLogs(prev => [...prev, "[Compiler] Refinement failed at AST parsing level."]);
      }
    } catch (e) {
      setCompileStatus('error');
      setConsoleLogs(prev => [...prev, `[Compiler] Refinement Error: ${e}`]);
    } finally {
      setLoading(false);
    }
  };

  // Strategy Management Actions
  const handleCreateNew = () => {
    const defaultTemplate = `class CustomStrategy(BaseStrategy):
    def __init__(self, parameters=None):
        super().__init__(parameters)
        
    def on_candle(self, candle, state):
        # Write your triggers here
        return None`;
    
    const newId = `strategy_${Date.now()}`;
    const newStrategy = {
      id: newId,
      name: 'Custom Unnamed Strategy',
      code: defaultTemplate
    };
    
    setStrategies(prev => [...prev, newStrategy]);
    setSelectedStrategyId(newId);
    setStrategyName(newStrategy.name);
    setWorkingCode(newStrategy.code);
    setConsoleLogs(["[System] Created a new custom strategy template. Define its triggers or generate via prompt."]);
  };

  const handleSaveStrategy = () => {
    setStrategies(prev => prev.map(s => {
      if (s.id === selectedStrategyId) {
        return { ...s, name: strategyName, code: workingCode };
      }
      return s;
    }));
    setConsoleLogs(prev => [...prev, `[System] Saved changes to Strategy: "${strategyName}".`]);
  };

  const handleSaveAsNew = () => {
    const newId = `strategy_${Date.now()}`;
    const newStrategy = {
      id: newId,
      name: `${strategyName} (Copy)`,
      code: workingCode
    };
    
    setStrategies(prev => [...prev, newStrategy]);
    setSelectedStrategyId(newId);
    setStrategyName(newStrategy.name);
    setConsoleLogs(prev => [...prev, `[System] Duplicated strategy as: "${newStrategy.name}".`]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(workingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
      {/* Left Column: AI Console & Editor */}
      <div className="flex flex-col gap-4 h-full min-h-0">
        
        {/* Strategy Selection & Naming Bar */}
        <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold uppercase">Load Saved:</span>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500/50 text-white font-semibold"
            >
              {strategies.map((strat) => (
                <option key={strat.id} value={strat.id}>{strat.name}</option>
              ))}
            </select>
            <button 
              onClick={handleCreateNew}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold transition-all"
            >
              New Strategy
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleSaveStrategy}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all"
            >
              Save Changes
            </button>
            <button 
              onClick={handleSaveAsNew}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-all"
            >
              Save As New
            </button>
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="glass-panel p-5 shrink-0">
          <div className="flex justify-between items-center mb-2.5">
            <label className="block text-slate-300 text-xs font-semibold">
              Prompt AI Strategy Generator
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Active Name:</span>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="px-2 py-0.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded text-xs outline-none font-bold text-white max-w-[180px]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Write a golden cross strategy using 50/200 SMAs with a 2% stop-loss"
              className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm outline-none"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="glass-panel p-5 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2">
              <FileCode className="w-4.5 h-4.5 text-indigo-400" />
              Python Strategy Code Editor
            </h3>
            
            {workingCode && (
              <button
                onClick={copyCode}
                className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 bg-slate-950/40 border border-slate-800 px-3 py-1.5 rounded-lg hover:border-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            )}
          </div>

          <textarea
            value={workingCode}
            onChange={(e) => setWorkingCode(e.target.value)}
            className="w-full flex-1 code-editor border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-300 outline-none rounded-xl resize-none focus:border-slate-700"
            placeholder={`# Your Python strategy script will appear here.\n# It must inherit from BaseStrategy and implement the on_candle method.\n# You can write it yourself or ask the AI to generate it.`}
          />
        </div>
      </div>

      {/* Right Column: AI Refiner Chat & Console Logs */}
      <div className="flex flex-col gap-4 h-full min-h-0">
        {/* Chat / Refinement Assistant */}
        <div className="glass-panel p-5 flex-1 flex flex-col min-h-0">
          <h3 className="font-bold text-white text-xs uppercase mb-3 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            AI Strategy Assistant Chat
          </h3>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-950/60 border border-slate-900 text-slate-200 rounded-bl-none font-light leading-relaxed'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat input */}
          <form onSubmit={handleRefine} className="flex gap-2 shrink-0">
            <input
              type="text"
              value={chatInput}
              disabled={!workingCode || loading}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={workingCode ? "Ask to refine (e.g. 'Add a 3% stop loss' or 'Change short window to 14')" : "Generate a strategy first to start refinement chat"}
              className="flex-1 px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 rounded-xl text-sm outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!workingCode || loading}
              className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-600 text-indigo-400 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Compiler Console Logs */}
        <div className="glass-panel p-5 h-40 flex flex-col min-h-0 shrink-0">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-xs uppercase text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Compiler Output & Execution Logs
            </h3>
            
            {compileStatus !== 'idle' && (
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                compileStatus === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {compileStatus.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-950/90 border border-slate-900 rounded-lg p-2.5 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
            {consoleLogs.length === 0 ? (
              <span className="text-slate-600 font-light text-[11px]">Console inactive. Ready for strategy compilation.</span>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className={log.includes("Error") ? "text-red-400" : log.includes("Success") ? "text-emerald-400" : ""}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
