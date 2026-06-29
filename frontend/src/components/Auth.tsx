import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (username: string) => void;
  onBack: () => void;
}

export default function Auth({ onLoginSuccess, onBack }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      // Mock validation
      const resolvedName = email.split('@')[0];
      onLoginSuccess(resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1));
    } else {
      if (!email || !password || !username) {
        setError('Please fill in all fields.');
        return;
      }
      onLoginSuccess(username);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-6">
      {/* Background Blurs */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full glass-panel glass-panel-glow-indigo p-8 animate-fade-in relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center mt-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-xl text-black shadow-lg mx-auto mb-4">
            AQ
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide text-white">
            {isLogin ? 'ACCESS TERMINAL' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-light">
            Connect to the Aiquant Quant Environment
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                  placeholder="quantTrader101"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                placeholder="you@aiquant.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Security Key (Password)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 flex items-center justify-center gap-2 mt-6"
          >
            {isLogin ? 'Launch Environment' : 'Create Credentials'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
