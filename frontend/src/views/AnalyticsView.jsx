import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Clock,
  Award,
  Loader2,
  RefreshCw,
  AlertCircle,
  PieChart,
  BarChart4
} from 'lucide-react';

export default function AnalyticsView() {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch opportunities.');
      setOpportunities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const stats = useMemo(() => {
    if (opportunities.length === 0) return null;

    // 1. Completion Rate
    const total = opportunities.length;
    const completed = opportunities.filter(o => o.status === 'completed').length;
    const completionRate = ((completed / total) * 100).toFixed(0);

    // 2. Category Breakdown
    const categoryCounts = {};
    opportunities.forEach(opp => {
      const cat = opp.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 3. Average Time-to-Completion by Category
    const categoryCompletionTimes = {};
    opportunities.forEach(opp => {
      if (opp.status === 'completed') {
        const cat = opp.category || 'General';
        const start = new Date(opp.createdAt);
        const end = new Date(opp.updatedAt);
        const diffHours = Math.max(0, (end - start) / (1000 * 60 * 60)); // difference in hours
        if (!categoryCompletionTimes[cat]) {
          categoryCompletionTimes[cat] = [];
        }
        categoryCompletionTimes[cat].push(diffHours);
      }
    });

    const avgTimesByCategory = {};
    Object.keys(categoryCompletionTimes).forEach(cat => {
      const times = categoryCompletionTimes[cat];
      const sum = times.reduce((a, b) => a + b, 0);
      avgTimesByCategory[cat] = (sum / times.length).toFixed(1); // average in hours
    });

    // 4. Completion Trend (last 7 days completions)
    const completionTrend = {};
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    past7Days.forEach(date => {
      completionTrend[date] = 0;
    });

    opportunities.forEach(opp => {
      if (opp.status === 'completed') {
        const dateStr = new Date(opp.updatedAt).toISOString().slice(0, 10);
        if (completionTrend[dateStr] !== undefined) {
          completionTrend[dateStr] += 1;
        }
      }
    });

    return {
      total,
      completed,
      completionRate,
      categoryCounts,
      avgTimesByCategory,
      completionTrend: Object.entries(completionTrend).map(([date, count]) => ({ date, count }))
    };
  }, [opportunities]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Aggregating workspace analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Workspace Analytics</h2>
          <p className="text-slate-400 text-xs mt-1">Real database metrics detailing ingestion throughput and task velocity</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchOpportunities();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 py-2 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors hover:text-white cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recalculate
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-200 m-0">{error}</p>
        </div>
      )}

      {!stats ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-850 text-center text-slate-500 font-medium italic shadow-xl">
          No data available. Ingest documents and create opportunities to generate workspace metrics.
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Real Aggregated Metrics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Ingested Opportunities */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Total Ingested</span>
                <BarChart4 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white leading-none block">{stats.total} Opportunities</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-2">Active DB Records</span>
              </div>
            </div>

            {/* Overall Ingestion Completion Rate */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-455 uppercase tracking-widest">Completion Rate</span>
                <Award className="w-4 h-4 text-emerald-450" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-emerald-450 leading-none block">{stats.completionRate}%</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-2">Processed Velocity</span>
              </div>
            </div>

            {/* Completed Workflow Actions */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-850 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Archive Total</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-white leading-none block">{stats.completed} Workflows</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-2">Status Set to Completed</span>
              </div>
            </div>

          </div>

          {/* Dynamic Calculated Charts Focus Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Category Breakdown */}
            <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <PieChart className="w-4 h-4 text-purple-450" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 m-0">Category Breakdown</h3>
              </div>
              
              <div className="space-y-4 pt-2">
                {Object.entries(stats.categoryCounts).map(([cat, count]) => {
                  const pct = ((count / stats.total) * 100).toFixed(0);
                  return (
                    <div key={cat} className="space-y-1.5 animate-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center text-xs text-slate-350">
                        <span className="font-semibold text-slate-200">{cat}</span>
                        <span className="font-bold text-white">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Average Time to Completion */}
            <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 m-0">Avg Time-to-Completion</h3>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Average hours calculated between file ingestion (`createdAt`) and status updated to completed (`updatedAt`).
              </p>
              
              <div className="space-y-4 pt-2">
                {Object.keys(stats.avgTimesByCategory).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 font-medium">No completed opportunities available to evaluate completion velocity.</p>
                ) : (
                  Object.entries(stats.avgTimesByCategory).map(([cat, hours]) => {
                    const hoursVal = parseFloat(hours);
                    const label = hoursVal >= 24 ? `${(hoursVal / 24).toFixed(1)} days` : `${hoursVal} hours`;
                    const barPct = Math.min(100, (hoursVal / 72) * 100); // Scaled relative to 72 hours max

                    return (
                      <div key={cat} className="space-y-1.5 animate-in slide-in-from-left-2 duration-300">
                        <div className="flex justify-between items-center text-xs text-slate-350">
                          <span className="font-semibold text-slate-200">{cat}</span>
                          <span className="font-bold text-indigo-400">{label}</span>
                        </div>
                        <div className="w-full bg-slate-950 border border-slate-900 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-650 to-indigo-400 rounded-full" style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Chart 3: Completion Trend Chart */}
          <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-450" />
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 m-0">7-Day Completion Trend</h3>
            </div>
            
            <div className="overflow-x-auto pt-3">
              <div className="flex justify-between items-end gap-3 min-h-[140px] px-4 max-w-4xl mx-auto">
                {stats.completionTrend.map(({ date, count }) => {
                  const formattedDate = new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const maxCount = Math.max(...stats.completionTrend.map(t => t.count), 1);
                  const barHeightPct = (count / maxCount) * 100;

                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-3 group">
                      {/* Count label */}
                      <span className={`text-[10px] font-bold tracking-wide transition-all ${count > 0 ? 'text-emerald-400 font-extrabold scale-110' : 'text-slate-650'}`}>
                        {count}
                      </span>
                      {/* Bar indicator */}
                      <div className="w-full bg-slate-950/40 border border-slate-900 rounded-lg h-24 flex items-end overflow-hidden hover:border-emerald-500/25 transition-all">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md transition-all duration-300"
                          style={{ height: `${barHeightPct}%` }}
                        />
                      </div>
                      {/* Date label */}
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
