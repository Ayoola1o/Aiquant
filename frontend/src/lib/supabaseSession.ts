export type AiquantUser = { id: string; email: string; username: string; role: 'admin' | 'trader' };
type SupabaseSession = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } };
const SESSION_KEY = 'aiquant_supabase_session';
let configPromise: Promise<{url:string;key:string}> | null = null;

async function config() {
  if (!configPromise) configPromise = fetch('/api/auth/config').then(async r => {
    if (!r.ok) throw new Error('Authentication service is not configured.');
    const c = await r.json();
    if (!c.supabase_url || !c.supabase_publishable_key) throw new Error('Supabase URL and publishable key must be configured on the backend.');
    return {url:c.supabase_url.replace(/\/$/,''),key:c.supabase_publishable_key};
  });
  return configPromise;
}
export function getSession(): SupabaseSession | null {
  try { const raw=sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as SupabaseSession : null; } catch { return null; }
}
function saveSession(s: SupabaseSession | null) {
  if (s) {
    const normalized = { ...s, expires_at: s.expires_at || Math.floor(Date.now()/1000) + (Number((s as any).expires_in) || 3600) };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  } else sessionStorage.removeItem(SESSION_KEY);
}
async function authRequest(path:string,body:Record<string,unknown>) {
  const c=await config();
  const r=await fetch(c.url+'/auth/v1'+path,{method:'POST',headers:{'Content-Type':'application/json','apikey':c.key},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'Supabase authentication failed.');
  return data;
}
export async function signIn(email:string,password:string) {
  const s=await authRequest('/token?grant_type=password',{email:email.trim(),password}) as SupabaseSession;
  saveSession(s);
  return {username:String(s.user.user_metadata?.display_name || s.user.email?.split('@')[0] || 'Trader'),needsEmailConfirmation:false};
}
export async function signUp(email:string,password:string,displayName:string) {
  const s=await authRequest('/signup',{email:email.trim(),password,data:{display_name:displayName.trim()}}) as SupabaseSession;
  if(!s.access_token) return {username:displayName,needsEmailConfirmation:true};
  saveSession(s);
  return {username:displayName,needsEmailConfirmation:false};
}
export async function validAccessToken():Promise<string|null> {
  let s=getSession(); if(!s) return null;
  if(s.expires_at && s.expires_at*1000>Date.now()+60_000) return s.access_token;
  try {
    const refreshed=await authRequest('/token?grant_type=refresh_token',{refresh_token:s.refresh_token}) as SupabaseSession;
    saveSession(refreshed); return refreshed.access_token;
  } catch { saveSession(null); return null; }
}
export async function signOut() {
  const s=getSession(); saveSession(null);
  if(!s) return;
  try { const c=await config(); await fetch(c.url+'/auth/v1/logout',{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+s.access_token}}); } catch { /* local session is already cleared */ }
}
