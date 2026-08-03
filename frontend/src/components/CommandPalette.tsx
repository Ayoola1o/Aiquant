import { useState, useEffect } from 'react';
import { Search, LayoutDashboard, BrainCircuit, Terminal, Activity, TrendingUp, Briefcase, Settings as SettingsIcon, Newspaper, Archive, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state trigger
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    { label: 'Mission Control Dashboard', route: '/dashboard', icon: LayoutDashboard, category: 'Workspace' },
    { label: 'AI Quant Lab', route: '/lab', icon: BrainCircuit, category: 'Workspace' },
    { label: 'Strategy Studio & Library', route: '/strategy', icon: Terminal, category: 'Workspace' },
    { label: 'Backtesting Laboratory', route: '/backtest', icon: Activity, category: 'Workspace' },
    { label: 'Live & Paper Trading Terminal', route: '/live', icon: TrendingUp, category: 'Workspace' },
    { label: 'Portfolio Manager', route: '/portfolio', icon: Briefcase, category: 'Workspace' },
    { label: 'Market Intelligence Workspace', route: '/market', icon: Newspaper, category: 'Workspace' },
    { label: 'Experiment Tracker Log', route: '/history', icon: Archive, category: 'Workspace' },
    { label: 'System Settings & API Keys', route: '/settings', icon: SettingsIcon, category: 'Settings' },
  ];

  const filteredItems = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl glass-panel border border-cyan-500/30 shadow-2xl rounded-xl overflow-hidden bg-slate-950/95">
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-cyan-400 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a workspace, strategy, or command (e.g. Backtest, BTC)..."
            className="w-full bg-transparent text-white placeholder-gray-500 outline-none text-sm font-sans"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 font-sans">
              No matching commands or workspaces found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.route)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-gray-200 group-hover:text-white">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-gray-400 border border-gray-800">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-900/60 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <span>Navigate with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-300">↓</kbd></span>
          <span>Open with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-gray-300">Ctrl + K</kbd></span>
        </div>
      </div>
    </div>
  );
}
