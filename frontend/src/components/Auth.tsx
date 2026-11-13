import { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from './ui/icons';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from '../lib/supabaseSession';

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
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, username);
      if (result.needsEmailConfirmation) {
        setNotice('Check your email to confirm your account, then sign in.');
        setIsLogin(true);
        return;
      }
      onLoginSuccess(result.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-6">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="max-w-md w-full glass-panel glass-panel-glow-indigo p-8 animate-fade-in relative">
        <button onClick={onBack} type="button" className="absolute top-6 left-6 text-xs text-slate-400 hover:text-indigo-400">← Back</button>
        <div className="text-center mt-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-xl text-black shadow-lg mx-auto mb-4">AQ</div>
          <h2 className="text-2xl font-extrabold tracking-wide text-white">{isLogin ? 'ACCESS TERMINAL' : 'CREATE ACCOUNT'}</h2>
          <p className="text-slate-400 text-xs mt-1.5">{isLogin ? 'Sign in securely to Aiquant' : 'Create your Aiquant account'}</p>
        </div>
        {error && <div role="alert" className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs text-center">{error}</div>}
        {notice && <div role="status" className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs text-center">{notice}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Display name</label>
            <div className="relative"><User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input required minLength={2} maxLength={80} autoComplete="name" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm outline-none" placeholder="Your name" />
            </div>
          </div>}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Email address</label>
            <div className="relative"><Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input required type="email" maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm outline-none" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2">Password</label>
            <div className="relative"><Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input required type="password" minLength={8} maxLength={256} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm outline-none" placeholder="Your password" />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-6">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : <>{isLogin ? 'Launch Environment' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <div className="text-center mt-6">
          <button type="button" disabled={isSubmitting} onClick={() => { setIsLogin(!isLogin); setError(''); setNotice(''); }} className="text-xs text-slate-400 hover:text-indigo-400">
            {isLogin ? "Don't have an account? Sign Up" : 'Already registered? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
