import React, { useState, useEffect } from 'react';
import { GearItem, TripContext, LoadoutAnalysis } from './types';
import GearCard from './components/GearCard';
import AddGearForm from './components/AddGearForm';
import Sidebar from './components/Sidebar';
import { Mountain, ShieldCheck, CheckCheck, Moon, Sun, AlertOctagon, Briefcase, MapPin, Sparkles } from 'lucide-react';
import { checkGearSafety, getInspectionDetails, analyzeGearCondition, analyzeTripLoadout } from './services/geminiService';

// Mock Initial Data
const INITIAL_GEAR: GearItem[] = [
  {
    id: '1',
    name: 'Petzl Grigri 2',
    brand: 'Petzl',
    model: 'Grigri 2',
    category: 'Other',
    purchaseDate: '2011',
    region: 'US',
    status: 'unknown',
    notes: 'Used heavily'
  },
  {
    id: '2',
    name: 'MSR Reactor',
    brand: 'MSR',
    model: 'Reactor Stove',
    category: 'Stove',
    purchaseDate: '2017',
    region: 'US',
    status: 'unknown'
  }
];

const App: React.FC = () => {
  // State
  const [inventory, setInventory] = useState<GearItem[]>(INITIAL_GEAR);
  const [isGlobalChecking, setIsGlobalChecking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [tripContext, setTripContext] = useState<TripContext>({
    type: 'Day Hike',
    environment: ['Fair']
  });
  const [isLoadoutMode, setIsLoadoutMode] = useState(false);
  const [loadoutAnalysis, setLoadoutAnalysis] = useState<LoadoutAnalysis | null>(null);
  const [analyzingLoadout, setAnalyzingLoadout] = useState(false);

  // Effects
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Handlers
  const addGear = (item: GearItem) => {
    setInventory([item, ...inventory]);
  };

  const updateGear = (updatedItem: GearItem) => {
    setInventory(inventory.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const removeGear = (id: string) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const handleGlobalCheck = async () => {
    setIsGlobalChecking(true);
    const promises = inventory
      .filter(item => item.status === 'unknown')
      .map(async (item) => {
        try {
          const [recallResult, inspectionResult, conditionResult] = await Promise.all([
             checkGearSafety(item),
             getInspectionDetails(item),
             analyzeGearCondition(item)
          ]);
          return {
            ...item,
            status: recallResult.status,
            recallInfo: recallResult,
            expiryYear: inspectionResult.expiryYear,
            inspectionTasks: inspectionResult.inspectionTasks,
            weakPoints: inspectionResult.weakPoints,
            conditionScore: conditionResult.score,
            conditionLabel: conditionResult.label,
            inspectionDue: true
          };
        } catch (e) {
          return item;
        }
    });

    const updatedItems = await Promise.all(promises);
    setInventory(prev => prev.map(item => {
      const updated = updatedItems.find(u => u.id === item.id);
      return updated || item;
    }));
    setIsGlobalChecking(false);
  };

  const analyzeLoadout = async () => {
    const loadoutItems = inventory.filter(i => i.inLoadout);
    if (loadoutItems.length === 0) return;
    setAnalyzingLoadout(true);
    const result = await analyzeTripLoadout(loadoutItems, tripContext);
    setLoadoutAnalysis(result);
    setAnalyzingLoadout(false);
  };

  // Derived State
  const stats = {
    total: inventory.length,
    safe: inventory.filter(i => i.status === 'safe').length,
    warning: inventory.filter(i => i.status === 'warning' || i.status === 'recalled').length,
    unknown: inventory.filter(i => i.status === 'unknown').length,
  };

  const highDangerItems = inventory.filter(item => 
    item.status === 'recalled' || 
    item.status === 'warning' || 
    (item.conditionScore !== undefined && item.conditionScore < 50)
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row max-w-7xl mx-auto px-4 sm:px-6 py-6 gap-6 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        
        {/* Header */}
        <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
                <Mountain className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">TrailSafe Recall</h1>
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mb-4">
            AI-powered inventory safety checks, condition analysis, and trip risk assessment.
          </p>

          {/* Trip Context Settings */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
               <MapPin className="w-4 h-4 text-blue-500" />
               <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Trip Context:</span>
            </div>
            <select 
              value={tripContext.type}
              onChange={(e) => setTripContext({...tripContext, type: e.target.value})}
              className="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-700 dark:text-slate-200"
            >
              <option>Day Hike</option>
              <option>Overnight</option>
              <option>Multi-day</option>
              <option>Climbing</option>
              <option>Alpine</option>
              <option>Water/Paddle</option>
            </select>
            <input 
              type="text" 
              value={tripContext.environment.join(', ')}
              onChange={(e) => setTripContext({...tripContext, environment: e.target.value.split(', ')})}
              placeholder="Conditions (e.g. Cold, Wet)"
              className="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 flex-1 min-w-[150px] text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </header>

        {/* High Danger Alert Panel */}
        {highDangerItems.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <h3 className="text-red-800 dark:text-red-300 font-bold text-sm flex items-center gap-2 mb-2">
              <AlertOctagon className="w-4 h-4" /> High Risk Gear Detected
            </h3>
            <div className="space-y-1">
              {highDangerItems.map(item => (
                <div key={item.id} className="text-xs text-red-700 dark:text-red-400 flex justify-between">
                   <span>{item.brand} {item.model}</span>
                   <span className="font-semibold uppercase">{item.status === 'recalled' ? 'Recalled' : 'Low Condition'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
             <div className="flex flex-col">
               <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Inventory</span>
               <span className="font-semibold text-lg">{stats.total} Items</span>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2"></div>
             <div className="flex flex-col text-red-600 dark:text-red-400">
               <span className="text-xs font-bold uppercase text-red-200 dark:text-red-900/50">Alerts</span>
               <span className="font-semibold text-lg">{stats.warning}</span>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-600 mx-2"></div>
             <div className="flex flex-col text-green-600 dark:text-green-400">
               <span className="text-xs font-bold uppercase text-green-200 dark:text-green-900/50">Safe</span>
               <span className="font-semibold text-lg">{stats.safe}</span>
             </div>
          </div>

          {stats.unknown > 0 && (
            <button
              onClick={handleGlobalCheck}
              disabled={isGlobalChecking}
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-70 whitespace-nowrap"
            >
              {isGlobalChecking ? (
                <>Checking...</>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Check All ({stats.unknown})
                </>
              )}
            </button>
          )}
        </div>

        {/* Loadout Risk Analysis Panel */}
        {isLoadoutMode && (
          <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                   <Briefcase className="w-5 h-5" /> Trip Loadout Analysis
                </h3>
                <button 
                  onClick={analyzeLoadout}
                  disabled={analyzingLoadout || inventory.filter(i => i.inLoadout).length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded shadow flex items-center gap-2"
                >
                  {analyzingLoadout ? <Sparkles className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Analyze Risk
                </button>
             </div>
             
             {!loadoutAnalysis && (
               <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-2">
                 Select items below (checkbox icon) to include in your trip loadout, then click Analyze.
                 <br/><span className="text-xs opacity-75">{inventory.filter(i => i.inLoadout).length} items selected.</span>
               </p>
             )}

             {loadoutAnalysis && (
               <div className="space-y-3 animate-fade-in bg-white dark:bg-slate-800 p-4 rounded border border-indigo-100 dark:border-slate-700">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{loadoutAnalysis.summary}</p>
                  
                  {loadoutAnalysis.redFlagItems.length > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-bold">
                       Red Flags: {loadoutAnalysis.redFlagItems.join(', ')}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                     <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Weakest Categories</p>
                        <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300">
                           {loadoutAnalysis.weakestCategories.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Suggestions</p>
                        <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300">
                           {loadoutAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Loadout Toggle Bar */}
        <div className="mb-4 flex justify-end">
           <button 
             onClick={() => setIsLoadoutMode(!isLoadoutMode)}
             className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded transition-colors ${isLoadoutMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400'}`}
           >
             {isLoadoutMode ? 'Hide Loadout Planner' : 'Open Loadout Planner'}
           </button>
        </div>

        {/* Inventory List */}
        <div className="mb-6">
          <AddGearForm onAdd={addGear} />
          
          <div className="space-y-1">
            {inventory.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                <Mountain className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Your gear locker is empty.</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm">Add gear to start checking for recalls.</p>
              </div>
            ) : (
              inventory.map(item => (
                <GearCard 
                  key={item.id} 
                  item={item} 
                  tripContext={tripContext}
                  onUpdate={updateGear} 
                  onRemove={removeGear}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Sidebar Area */}
      <aside className="w-full md:w-80 flex-shrink-0">
        <div className="sticky top-6">
          <Sidebar inventory={inventory} />
        </div>
      </aside>

    </div>
  );
};

export default App;
