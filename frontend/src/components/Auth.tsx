import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email, password } : { email, password, username };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed. Please try again.');
      }
      if (!data.user?.username) {
        throw new Error('The server returned an invalid account response.');
      }
      onLoginSuccess(data.user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-6">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full glass-panel glass-panel-glow-indigo p-8 animate-fade-in relative">
        <button onClick={onBack} type="button" className="absolute top-6 left-6 text-xs text-slate-400 hover:text-indigo-400 transition-colors">
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
            {isLogin ? 'Sign in to your Aiquant environment' : 'Create your secure Aiquant account'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><User className="w-4 h-4" /></span>
                <input
                  type="text" required minLength={2} maxLength={80} autoComplete="username"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                  placeholder="quantTrader101"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><Mail className="w-4 h-4" /></span>
              <input
                type="email" required maxLength={320} autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"><Lock className="w-4 h-4" /></span>
              <input
                type="password" required minLength={12} maxLength={256}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-sm outline-none transition-all"
                placeholder="At least 12 characters"
              />
            </div>
            {!isLogin && <p className="text-[10px] text-slate-500 mt-1.5">Use at least 12 characters. Your password is securely hashed before storage.</p>}
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-300 flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : <>{isLogin ? 'Launch Environment' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
