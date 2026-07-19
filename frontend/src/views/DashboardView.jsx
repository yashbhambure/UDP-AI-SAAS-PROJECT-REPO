import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Bell,
  Sparkles,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function DashboardView() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch summary.');
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading workspace dashboard summary...</p>
      </div>
    );
  }

  const { opportunities, tasksDueNext7Days, highPriorityTasks, upcomingReminders48h, insights } = stats || {};

  const insightLines = insights
    ? insights.split('\n').filter(line => line.trim().length > 0)
    : [];

  const isFallback = insights && insights.includes('limit constraints');

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Workspace Dashboard</h2>
          <p className="text-slate-400 text-xs mt-1">Real-time task summaries and AI-powered insights</p>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-300 py-2 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all hover:text-white cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-200 m-0">{error}</p>
        </div>
      )}

      {/* Grid of Metric Widgets with Clean Visual Hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Opportunities Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-purple-500/20 transition-all min-h-[140px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Total Opportunities</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-white leading-none block">{opportunities?.total || 0}</span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="text-indigo-400">{opportunities?.inProgress || 0}</span> Active
              <span className="text-slate-650">•</span>
              <span className="text-yellow-500">{opportunities?.pending || 0}</span> Pending
            </div>
          </div>
        </div>

        {/* Completed Opportunities Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-emerald-500/20 transition-all min-h-[140px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Completed Ops</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-emerald-400 leading-none block">{opportunities?.completed || 0}</span>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-2">
              Success Rate: <strong className="text-slate-350">{opportunities?.total > 0 ? Math.round((opportunities.completed / opportunities.total) * 100) : 0}%</strong>
            </div>
          </div>
        </div>

        {/* Tasks Due in 7 Days Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-amber-500/20 transition-all min-h-[140px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Due Next 7 Days</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className={`text-4xl font-extrabold leading-none block ${tasksDueNext7Days > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {tasksDueNext7Days || 0}
            </span>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-2">
              {tasksDueNext7Days > 0 ? 'Deliverables approaching' : 'No near-term deadlines'}
            </div>
          </div>
        </div>

        {/* High-Priority Active Tasks Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-red-500/20 transition-all min-h-[140px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/10 transition-all" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">High Priority Tasks</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-4">
            <span className={`text-4xl font-extrabold leading-none block ${highPriorityTasks > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {highPriorityTasks || 0}
            </span>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-2">
              {highPriorityTasks > 0 ? 'Critical review required' : 'Priorities are balanced'}
            </div>
          </div>
        </div>

      </div>

      {/* Second Row: AI Insights and Notifications Count */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* AI Insights Card */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden border border-slate-850 hover:border-purple-500/10 transition-all">
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/5 rounded-full blur-[70px] pointer-events-none" />
          
          <div className="flex items-center gap-3.5 mb-6 border-b border-slate-900 pb-4">
            <div className="w-10 h-10 bg-purple-550/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0 tracking-wide">AI Action Insights</h3>
              <p className="text-slate-450 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                Automated recommendations from Groq (Llama 3.3 70B)
              </p>
            </div>
          </div>

          {isFallback ? (
            <div className="bg-amber-955/20 border border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-450 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-200 font-semibold text-xs m-0">System Limits Reached</h4>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed font-mono">{insights}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {insightLines.length > 0 ? (
                <ul className="space-y-4 pl-0 list-none m-0">
                  {insightLines.map((line, index) => {
                    const cleanLine = line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
                    return (
                      <li key={index} className="flex gap-3 text-xs text-slate-300 leading-relaxed items-start bg-slate-950/20 p-3 rounded-xl border border-slate-900/50 hover:border-purple-500/10 transition-all">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0" />
                        <span className="font-medium">{cleanLine}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-slate-400 text-xs leading-relaxed bg-slate-950/20 p-4 rounded-xl border border-slate-900/50 font-medium italic">{insights}</p>
              )}
            </div>
          )}
        </div>

        {/* Reminders widget Card */}
        <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border border-slate-850 hover:border-blue-500/10 transition-all min-h-[300px]">
          <div>
            <div className="flex items-center gap-3.5 mb-6 border-b border-slate-900 pb-4">
              <div className="w-10 h-10 bg-blue-550/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white m-0 tracking-wide">Reminders Status</h3>
                <p className="text-slate-450 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Alert Thresholds</p>
              </div>
            </div>

            <div className="text-center py-8">
              <span className={`text-6xl font-black block tracking-tight ${upcomingReminders48h > 0 ? 'text-blue-400 animate-pulse' : 'text-slate-600'}`}>
                {upcomingReminders48h || 0}
              </span>
              <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider mt-4 block">
                Active alerts due in 48h
              </span>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-5 text-center">
            <p className="text-slate-500 text-[10px] font-medium leading-relaxed m-0">
              Reminders trigger automated in-app alerts 7, 2, and 0 days prior to target milestone deadlines.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
