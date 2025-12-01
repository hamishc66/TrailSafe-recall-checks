import React, { useEffect, useState } from 'react';
import { getRecallStats, getRecentRecalls } from '../services/geminiService';
import { GearItem, RecentRecallSummary, WidgetStats } from '../types';
import { AlertTriangle, TrendingUp, ShieldAlert, ExternalLink, Loader2, Bell, Clock } from 'lucide-react';

interface SidebarProps {
  inventory: GearItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ inventory }) => {
  const [recalls, setRecalls] = useState<RecentRecallSummary[]>([]);
  const [stats, setStats] = useState<WidgetStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recentData, statsData] = await Promise.all([
          getRecentRecalls(),
          getRecallStats()
        ]);
        setRecalls(recentData);
        setStats(statsData);
      } catch (e) {
        console.error("Sidebar data fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute local reminders
  const reminders = inventory.filter(item => {
    const isExpired = item.expiryYear && item.expiryYear <= new Date().getFullYear();
    const needsInspection = item.conditionScore !== undefined && item.conditionScore < 60;
    return isExpired || needsInspection;
  });

  return (
    <div className="space-y-6">

      {/* Local Reminders Widget */}
      {reminders.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800 p-4">
           <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
             <Bell className="w-4 h-4" /> Action Required
           </h3>
           <div className="space-y-2">
             {reminders.slice(0, 3).map(item => (
               <div key={item.id} className="text-xs border-b border-orange-200/50 dark:border-orange-800/50 last:border-0 pb-1">
                 <p className="font-bold text-slate-700 dark:text-slate-300">{item.brand} {item.model}</p>
                 <p className="text-orange-700 dark:text-orange-400">
                    {item.expiryYear && item.expiryYear <= new Date().getFullYear() ? "Expired" : "Needs Check"}
                 </p>
               </div>
             ))}
             {reminders.length > 3 && (
               <p className="text-[10px] text-orange-600 dark:text-orange-500 italic">+ {reminders.length - 3} more items</p>
             )}
           </div>
        </div>
      )}
      
      {/* Widget 1: Recent Recalls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-500" /> Recent Alerts
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-3">
            {recalls.slice(0, 4).map((recall, idx) => (
              <div key={idx} className="border-b border-slate-100 dark:border-slate-700 last:border-0 pb-2 last:pb-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{recall.productName}</p>
                <div className="flex justify-between items-end mt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{recall.date} • {recall.region}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded mt-1 inline-block">{recall.hazardType}</span>
                  </div>
                  {recall.url && (
                    <a href={recall.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {recalls.length === 0 && <p className="text-xs text-slate-400">No recent alerts found.</p>}
          </div>
        )}
      </div>

      {/* Widget 2: Stats */}
      {stats && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Hazard Trends
          </h3>
          <div className="mb-4">
             <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">High Risk Category</p>
             <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.highRiskCategory}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-2">Breakdown</p>
            <div className="space-y-2">
              {stats.hazardBreakdown.slice(0, 4).map((h, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-300">{h.type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(h.count * 10, 100)}%` }}></div>
                    </div>
                    <span className="font-medium text-slate-800 dark:text-slate-200 w-3 text-right">{h.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Widget 3: Liability */}
      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" /> Important Notice
        </h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          TrailSafe Recall uses AI and public search data to assist with safety checks. Results may not be comprehensive. Always verify with official manufacturer sources. Use at your own risk.
        </p>
      </div>

    </div>
  );
};

export default Sidebar;
