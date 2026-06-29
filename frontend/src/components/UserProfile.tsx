import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { 
  ShieldCheck, 
  Layers, 
  CheckCircle, 
  Settings as SettingsIcon, 
  Activity, 
  Database,
  BarChart3
} from 'lucide-react';

interface ProfileData {
  name: string;
  title: string;
  member_since: string;
  email: string;
  linked_profile: string;
  roles: Array<{ name: string; project: string }>;
  account_settings: {
    tier: string;
    renewal: string;
    "2fa_enabled": boolean;
    api_keys_masked: string;
    last_login_ip: string;
  };
  integrations: {
    alpaca: boolean;
    polygon: boolean;
    aws: boolean;
  };
  model_dev_history: Array<{ year: string; models: number }>;
  contributions: Array<{ name: string; role: string; status: string }>;
  activity_feed: Array<{ timestamp: string; event: string }>;
  skills: Array<{ subject: string; value: number; fullMark: number }>;
}

export default function UserProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching user profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading || !profile) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center text-xs text-[#A1A5B0] font-light font-mono select-none">
        <span className="animate-pulse">Accessing Alexander Ramirez User Profile...</span>
      </div>
    );
  }

  // Gradient colors for model development
  const COLORS = ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#4D88FF'];

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] select-none text-[#E1E3E8] overflow-y-auto pr-1">
      {/* Upper Grid Layout: Profile Card, Account Details & Security */}
      <div className="grid md:grid-cols-3 gap-6 shrink-0">
        
        {/* Left Side: Avatar Card */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg flex flex-col items-center text-center">
          <div className="relative w-28 h-28 rounded-full border-2 border-[#4D88FF] overflow-hidden bg-[#0F1115] mb-4 flex items-center justify-center">
            {/* Real Avatar Image from placeholder / github developer avatar */}
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" 
              alt="Alexander Ramirez"
              className="w-full h-full object-cover"
            />
          </div>

          <h2 className="text-lg font-extrabold text-white">{profile.name}</h2>
          <span className="text-xs text-[#4D88FF] font-semibold mt-0.5">{profile.title}</span>

          <div className="w-full border-t border-white/5 my-4 pt-4 flex flex-col gap-2.5 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Member Since</span>
              <span className="font-semibold text-white">{profile.member_since}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Email contact</span>
              <span className="font-mono text-white text-[11px]">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Linked Profile</span>
              <span className="font-mono text-white text-[11px]">linkedin-profile/alex-r</span>
            </div>
          </div>

          {/* User Roles */}
          <div className="w-full pt-2 flex flex-wrap gap-2 justify-center">
            {profile.roles.map((role, idx) => (
              <span 
                key={idx} 
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  role.name === 'Lead' 
                    ? 'bg-[#4D88FF]/10 border-[#4D88FF]/20 text-[#4D88FF]' 
                    : 'bg-[#FFB300]/10 border-[#FFB300]/20 text-[#FFB300]'
                }`}
              >
                {role.name} {role.project}
              </span>
            ))}
          </div>
        </div>

        {/* Center: Account & Terminal Settings */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <SettingsIcon className="w-4.5 h-4.5 text-[#4D88FF]" />
              Account & Terminal Settings
            </h3>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#A1A5B0]">Account Type</span>
                <span className="px-2 py-0.5 bg-[#2EE59D]/10 border border-[#2EE59D]/20 text-[#2EE59D] text-[10px] font-bold rounded-lg">
                  {profile.account_settings.tier}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A1A5B0]">Renewal Schedule</span>
                <span className="font-bold text-white">{profile.account_settings.renewal}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A1A5B0]">Terminal Security</span>
                <span className="font-bold text-[#2EE59D] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Secure Connection
                </span>
              </div>
            </div>
          </div>

          {/* Integration widgets */}
          <div className="pt-4 border-t border-white/5">
            <span className="text-[10px] text-[#A1A5B0] font-semibold block mb-2.5 uppercase tracking-wider">
              Integration API Status
            </span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${profile.integrations.alpaca ? 'bg-[#2EE59D]' : 'bg-[#FF4B55]'}`} />
                Alpaca
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${profile.integrations.polygon ? 'bg-[#2EE59D]' : 'bg-[#FF4B55]'}`} />
                Polygon
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${profile.integrations.aws ? 'bg-[#2EE59D]' : 'bg-[#FF4B55]'}`} />
                AWS Cloud
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Security, API Keys, 2FA */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-[#4D88FF]" />
              Security Settings
            </h3>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A1A5B0]">Two-Factor Auth (2FA)</span>
                <span className="font-bold text-[#2EE59D] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Enabled
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A5B0]">Last Login IP</span>
                <span className="font-mono text-white">{profile.account_settings.last_login_ip}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col gap-2.5">
            <span className="text-[10px] text-[#A1A5B0] font-semibold uppercase tracking-wider">
              API Key Management
            </span>
            <div className="flex justify-between items-center bg-[#0F1115] border border-white/5 rounded-lg p-2.5">
              <span className="font-mono text-[10px] text-[#A1A5B0] truncate max-w-[150px]">
                {profile.account_settings.api_keys_masked}
              </span>
              <button 
                onClick={() => alert("Generating new API Keys...")}
                className="text-[9px] px-2 py-1 rounded bg-[#4D88FF]/10 text-[#4D88FF] hover:bg-[#4D88FF]/20 border border-[#4D88FF]/20 transition-colors font-semibold"
              >
                Generate new ones
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid Layout: Charts & Contributions */}
      <div className="grid md:grid-cols-2 gap-6 shrink-0">
        
        {/* Model Development over Time (Horizontal Bar) */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#4D88FF]" />
            Personal Model Development over Time
          </h3>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={profile.model_dev_history}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" stroke="#A1A5B0" fontSize={10} tickLine={false} />
                <YAxis dataKey="year" type="category" stroke="#A1A5B0" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} />
                <Bar dataKey="models" fill="#4D88FF" radius={[0, 4, 4, 0]}>
                  {profile.model_dev_history.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contribution Roll-up */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4D88FF]" />
            Personal Contribution Roll-up
          </h3>

          <div className="flex-1 overflow-y-auto max-h-48 pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[#A1A5B0] font-semibold sticky top-0 bg-[#1A1D24] z-10">
                  <th className="py-2.5 px-3">Strategy Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Development Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {profile.contributions.map((con, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">{con.name}</td>
                    <td className="py-2.5 px-3">{con.role}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        con.status === 'Active' 
                          ? 'bg-[#4D88FF]/10 border-[#4D88FF]/20 text-[#4D88FF]' 
                          : 'bg-[#2EE59D]/10 border-[#2EE59D]/20 text-[#2EE59D]'
                      }`}>
                        {con.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Grid Layout: R&D Activity Feed & Radar Skills */}
      <div className="grid md:grid-cols-3 gap-6 shrink-0">
        
        {/* R&D Activity Feed (Table) */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg md:col-span-2 flex flex-col">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4D88FF]" />
            Personal R&D Activity Feed
          </h3>

          <div className="overflow-y-auto max-h-48 pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[#A1A5B0] font-semibold">
                  <th className="py-2 px-3">Date/Time</th>
                  <th className="py-2 px-3">Feed Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {profile.activity_feed.map((feed, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 text-[#A1A5B0]">{feed.timestamp}</td>
                    <td className="py-2.5 px-3 font-sans text-white">{feed.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skill Proficiency (Radar) */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#4D88FF]" />
            Personal Skill Proficiency
          </h3>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={profile.skills}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={8} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#334155" />
                <Radar 
                  name="Proficiency" 
                  dataKey="value" 
                  stroke="#2EE59D" 
                  fill="#2EE59D" 
                  fillOpacity={0.3} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
