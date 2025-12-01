import React, { useState } from 'react';
import { GearItem, TripContext } from '../types';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Calendar, RefreshCw, Activity, AlertOctagon, Mail, Zap, Square, CheckSquare } from 'lucide-react';
import { checkGearSafety, getInspectionDetails, analyzeGearCondition, assessImmediateSafety } from '../services/geminiService';

interface GearCardProps {
  item: GearItem;
  tripContext: TripContext;
  onUpdate: (updatedItem: GearItem) => void;
  onRemove: (id: string) => void;
}

const GearCard: React.FC<GearCardProps> = ({ item, tripContext, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [safetyVerdict, setSafetyVerdict] = useState<string | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'recalled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'recalled': return <XCircle className="w-5 h-5" />;
      default: return <RefreshCw className="w-5 h-5" />;
    }
  };

  const getConditionColor = (score?: number) => {
    if (score === undefined) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  const handleCheckSafety = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const [recallResult, inspectionResult, conditionResult] = await Promise.all([
        checkGearSafety(item),
        getInspectionDetails(item),
        analyzeGearCondition(item)
      ]);

      onUpdate({
        ...item,
        status: recallResult.status,
        recallInfo: recallResult,
        expiryYear: inspectionResult.expiryYear,
        inspectionTasks: inspectionResult.inspectionTasks,
        weakPoints: inspectionResult.weakPoints,
        conditionScore: conditionResult.score,
        conditionLabel: conditionResult.label,
        inspectionDue: true
      });
      setExpanded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSafetyCheck = async () => {
    setVerdictLoading(true);
    const verdict = await assessImmediateSafety(item, tripContext);
    setSafetyVerdict(verdict);
    setVerdictLoading(false);
  };

  const toggleTask = (taskId: string) => {
    if (!item.inspectionTasks) return;
    const newTasks = item.inspectionTasks.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdate({ ...item, inspectionTasks: newTasks });
  };

  const toggleLoadout = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ ...item, inLoadout: !item.inLoadout });
  };

  const generateMailto = () => {
    if (!item.recallInfo) return '';
    const subject = `Recall Inquiry: ${item.brand} ${item.model}`;
    const body = `To Customer Support,\n\nI own a ${item.brand} ${item.model} (${item.category}), purchased in ${item.purchaseDate} in region ${item.region}.\n\nI understand there may be a safety recall potentially affecting this item (${item.recallInfo.summary}).\n\nPlease advise on next steps.\n\nThank you.`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className={`border rounded-lg shadow-sm transition-all duration-300 mb-4 bg-white dark:bg-slate-800 dark:border-slate-700 ${expanded ? 'ring-2 ring-blue-500/20 dark:ring-blue-500/40' : ''}`}>
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-t-lg"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-full flex-shrink-0 ${getStatusColor(item.status)}`}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : getStatusIcon(item.status)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {item.brand} {item.model}
              {item.conditionScore !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${getConditionColor(item.conditionScore)}`}>
                  {item.conditionScore}% • {item.conditionLabel}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="uppercase tracking-wider font-bold text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{item.category}</span>
              <span>Purchased: {item.purchaseDate}</span>
              {item.expiryYear && (
                 <span className={`${item.expiryYear <= new Date().getFullYear() ? 'text-red-500 font-bold' : ''}`}>
                   • Exp: {item.expiryYear}
                 </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {/* Loadout Toggle */}
           <button 
             onClick={toggleLoadout}
             className={`p-1.5 rounded transition-colors ${item.inLoadout ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
             title="Add to Trip Loadout"
           >
             {item.inLoadout ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
           </button>

           {item.status === 'unknown' && !loading && (
             <button 
              onClick={handleCheckSafety}
              className="hidden sm:block text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              Check
            </button>
           )}
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-lg">
          
          {/* Action Bar for Mobile */}
          {item.status === 'unknown' && !loading && (
             <button 
              onClick={handleCheckSafety}
              className="sm:hidden w-full mb-4 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Run Safety Check
            </button>
           )}

          {/* Quick Safety Verdict */}
          {item.status !== 'unknown' && (
            <div className="mb-4">
              {!safetyVerdict ? (
                <button 
                  onClick={handleQuickSafetyCheck}
                  disabled={verdictLoading}
                  className="w-full text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-center gap-2"
                >
                  {verdictLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-yellow-500" />}
                  Is this safe to use right now? (Based on {tripContext.type} trip)
                </button>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded text-xs text-slate-700 dark:text-slate-300">
                  <strong className="block text-blue-700 dark:text-blue-400 mb-1">AI Safety Verdict:</strong>
                  {safetyVerdict}
                </div>
              )}
            </div>
          )}

          {/* Recall Status Panel */}
          {item.recallInfo && (
            <div className={`mb-6 p-4 rounded-md border ${
              item.status === 'recalled' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' :
              item.status === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800' :
              'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold text-sm uppercase tracking-wide ${
                  item.status === 'recalled' ? 'text-red-800 dark:text-red-300' :
                  item.status === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
                  'text-green-800 dark:text-green-300'
                }`}>
                  Recall Analysis
                </h4>
                {item.recallInfo.hazardType !== 'None' && (
                  <span className="text-xs font-bold px-2 py-1 rounded bg-white/80 dark:bg-slate-800 border dark:border-slate-600 text-slate-700 dark:text-slate-300">
                    {item.recallInfo.hazardType}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 mb-2 font-medium">{item.recallInfo.summary}</p>
              
              {item.status !== 'safe' && (
                <>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    <strong className="dark:text-slate-300">Hazard:</strong> {item.recallInfo.hazardReason}
                  </div>
                  
                  {/* Manufacturer Helper */}
                  <div className="my-3 p-3 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                     <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Action Required</span>
                     </div>
                     <div className="flex gap-2">
                        {item.recallInfo.sources[0] && (
                          <a href={item.recallInfo.sources[0].uri} target="_blank" rel="noreferrer" className="flex-1 text-center text-xs bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 py-1.5 rounded">
                            View Notice
                          </a>
                        )}
                        <a href={generateMailto()} className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded">
                           Draft Email
                        </a>
                     </div>
                  </div>
                </>
              )}

              {item.recallInfo.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700">
                   <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Sources:</p>
                   <div className="flex flex-wrap gap-2">
                      {item.recallInfo.sources.map((source, i) => (
                        <a key={i} href={source.uri} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]">
                          {source.title}
                        </a>
                      ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {/* Known Weak Points */}
          {item.knownWeakPoints && item.knownWeakPoints.length > 0 && (
            <div className="mb-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-3 rounded">
               <h4 className="font-semibold text-orange-800 dark:text-orange-300 text-xs flex items-center gap-2 mb-2">
                  <AlertOctagon className="w-3 h-3" /> Known Weak Points
               </h4>
               <ul className="list-disc list-inside text-xs text-orange-900 dark:text-orange-200/80 space-y-1">
                 {item.knownWeakPoints.map((point, i) => (
                   <li key={i}>{point}</li>
                 ))}
               </ul>
            </div>
          )}

          {/* Inspection & Expiry Panel */}
          {(item.inspectionTasks || item.expiryYear) && (
            <div className="bg-white dark:bg-slate-700 p-4 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                 <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Inspection & Expiry
                 </h4>
                 {item.expiryYear && (
                   <span className={`text-xs font-bold px-2 py-1 rounded ${
                     item.expiryYear <= new Date().getFullYear() 
                       ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                       : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                   }`}>
                     Est. Expiry: {item.expiryYear}
                   </span>
                 )}
              </div>
              
              <div className="space-y-2">
                {item.inspectionTasks?.map((task) => (
                  <label key={task.id} className="flex items-start gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={task.isCompleted} 
                      onChange={() => toggleTask(task.id)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500 dark:bg-slate-600"
                    />
                    <span className={`text-sm ${task.isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                      {task.task}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => onRemove(item.id)}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline"
            >
              Remove Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GearCard;
