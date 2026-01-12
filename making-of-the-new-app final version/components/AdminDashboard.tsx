
import React, { useState, useEffect } from 'react';
import { apiTracker } from '../services/apiTracker';
import { AdminSettings } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [stats, setStats] = useState(apiTracker.getStats());
  const [settings, setSettings] = useState<AdminSettings>(apiTracker.getSettings());
  const [activeTab, setActiveTab] = useState<'monitor' | 'settings'>('monitor');

  useEffect(() => {
    // 2-second interval for real-time feel
    const interval = setInterval(() => {
      setStats(apiTracker.getStats());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    apiTracker.updateSettings(settings);
    alert('Settings Updated Successfully!');
  };

  const usagePercent = Math.min((stats.rpm / stats.limit) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Intelligence Hub</h2>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              stats.health === 'Healthy' ? 'bg-emerald-100 text-emerald-700' :
              stats.health === 'Degraded' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                stats.health === 'Healthy' ? 'bg-emerald-500' :
                stats.health === 'Degraded' ? 'bg-amber-500' : 'bg-red-500'
              }`}></div>
              {stats.health}
            </div>
          </div>
          <p className="text-slate-500 text-sm">Enterprise real-time monitoring • Alerts to: <span className="font-mono text-indigo-600">{settings.alertEmail}</span></p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setActiveTab('monitor')}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'monitor' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              📊 Live Stats
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              ⚙️ Alert Config
            </button>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-100 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
          >
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'monitor' ? (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="text-4xl">⚡</span>
               </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Requests</p>
              <p className="text-4xl font-black text-slate-900">{stats.total}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stats.successRate.toFixed(1)}% Success</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="text-4xl">📁</span>
               </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Files Processed</p>
              <p className="text-4xl font-black text-indigo-600">{stats.totalFiles}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {Object.entries(stats.formatDistribution).slice(0, 3).map(([fmt, count]) => (
                  <span key={fmt} className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">.{fmt} ({count})</span>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="text-4xl">🕒</span>
               </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Latency</p>
              <p className="text-4xl font-black text-amber-500">{stats.avgLatency}<span className="text-sm font-normal text-slate-400 ml-1 tracking-normal">ms</span></p>
              <p className="mt-4 text-[10px] font-medium text-slate-400">Response time per success</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 right-0 px-3 py-1 text-[8px] font-black uppercase tracking-widest ${usagePercent >= settings.threshold ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                {usagePercent >= settings.threshold ? 'Critical Load' : 'Stable'}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Load (RPM)</p>
              <div className="flex items-center justify-between mb-4">
                <p className={`text-4xl font-black ${usagePercent >= settings.threshold ? 'text-red-600' : 'text-slate-900'}`}>{stats.rpm}</p>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400">Capacity</p>
                  <p className="text-xs font-black text-slate-700">{stats.limit}/min</p>
                </div>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out ${usagePercent >= settings.threshold ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0">
              <div>
                <h3 className="font-black text-slate-800 tracking-tight text-lg">Detailed Activity Stream</h3>
                <p className="text-slate-400 text-xs mt-1">Showing latest 20 operations across all modules</p>
              </div>
              <button 
                onClick={() => { if(confirm('Wipe all logs? This cannot be undone.')) { apiTracker.clearLogs(); setStats(apiTracker.getStats()); } }}
                className="px-4 py-2 bg-slate-50 hover:bg-red-50 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest rounded-xl transition-all border border-slate-100 hover:border-red-100"
              >
                Clear Archives
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 font-black uppercase text-[9px] tracking-[0.15em]">
                    <th className="px-8 py-5">Time</th>
                    <th className="px-8 py-5">Operation</th>
                    <th className="px-8 py-5">Files/Format</th>
                    <th className="px-8 py-5">Execution Path</th>
                    <th className="px-8 py-5">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentLogs.length > 0 ? stats.recentLogs.map((log) => (
                    <tr key={log.id} className={`transition-all duration-300 ${log.isAlert ? 'bg-red-50/70 border-l-4 border-l-red-500' : 'hover:bg-indigo-50/30'}`}>
                      <td className="px-8 py-5">
                        <span className="text-slate-400 font-mono text-[11px] bg-slate-100 px-2 py-1 rounded-md">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-8 py-5">
                        <p className={`font-bold tracking-tight ${log.isAlert ? 'text-red-600' : 'text-slate-800'}`}>
                          {log.isAlert ? '🚨 CRITICAL SYSTEM ALERT' : log.tool}
                        </p>
                        {!log.isAlert && <p className="text-[10px] text-slate-400 font-medium">Request ID: {log.id}</p>}
                      </td>
                      <td className="px-8 py-5">
                         {log.isAlert ? (
                           <span className="text-red-400 font-medium italic">N/A</span>
                         ) : (
                           <div className="flex items-center gap-2">
                              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md">{log.fileCount} {log.fileCount === 1 ? 'FILE' : 'FILES'}</span>
                              <div className="flex -space-x-1">
                                {log.fileFormats.map((f, i) => (
                                  <span key={i} className="text-[8px] font-bold bg-white border border-slate-200 text-slate-500 px-1 rounded uppercase min-w-[30px] text-center shadow-sm">.{f}</span>
                                ))}
                              </div>
                           </div>
                         )}
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{log.model}</span>
                        {log.latency > 0 && <span className="ml-2 text-amber-500 font-bold text-[10px]">{log.latency}ms</span>}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            log.isAlert ? 'bg-red-600 text-white' :
                            log.status === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {log.isAlert ? 'Email Sent' : log.status}
                          </span>
                          {log.errorMessage && (
                            <p className="text-[10px] text-red-400 italic max-w-xs truncate" title={log.errorMessage}>
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-30">
                          <span className="text-5xl mb-4">📂</span>
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No activity logged in current session</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">⚙️</div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Alert Configuration</h3>
              <p className="text-slate-400 text-sm">Define notification triggers for resource management.</p>
            </div>
          </div>
          <form onSubmit={handleUpdateSettings} className="space-y-8">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Notification Email</label>
              <input 
                type="email"
                value={settings.alertEmail}
                onChange={(e) => setSettings({...settings, alertEmail: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                placeholder="admin@achievers.com"
                required
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-indigo-500 font-black">ℹ</span> Alerts will be triggered when the RPM limit approaches threshold.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Usage Sensitivity ({settings.threshold}%)</label>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${settings.threshold > 85 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {settings.threshold > 85 ? 'High Intensity' : 'Standard'}
                </span>
              </div>
              <input 
                type="range"
                min="10"
                max="95"
                step="5"
                value={settings.threshold}
                onChange={(e) => setSettings({...settings, threshold: parseInt(e.target.value)})}
                className="w-full h-3 bg-slate-100 rounded-2xl appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                <span>Safe (10%)</span>
                <span>Danger (95%)</span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50">
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
              >
                Apply System Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
