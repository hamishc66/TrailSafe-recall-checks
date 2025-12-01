export type Region = 'US' | 'EU' | 'AU' | 'Global';

export type GearCategory = 
  | 'Tent' 
  | 'Stove' 
  | 'Pack' 
  | 'Headlamp' 
  | 'Harness' 
  | 'Rope' 
  | 'PLB' 
  | 'Boots' 
  | 'Helmet' 
  | 'Carabiner' 
  | 'Other';

export type RecallStatus = 
  | 'unknown' 
  | 'safe' 
  | 'warning' 
  | 'recalled';

export type HazardType = 
  | 'Fire / Burn' 
  | 'Fall / Failure' 
  | 'Gas Leak' 
  | 'Electrical' 
  | 'Water / Drowning' 
  | 'Child Safety' 
  | 'Laceration' 
  | 'Structural'
  | 'None';

export interface InspectionTask {
  id: string;
  task: string;
  isCompleted: boolean;
}

export interface RecallResult {
  status: RecallStatus;
  summary: string;
  hazardReason: string;
  hazardType: HazardType;
  affectedRegion: string;
  actionRequired: string[];
  sources: { title: string; uri: string }[];
  lastChecked: string; // ISO Date
}

export interface GearItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: GearCategory;
  purchaseDate: string; // YYYY-MM-DD or YYYY
  region: Region;
  notes?: string;
  serialNumber?: string;
  
  // Computed / AI Fields
  status: RecallStatus;
  recallInfo?: RecallResult;
  expiryYear?: number;
  inspectionTasks?: InspectionTask[];
  inspectionDue?: boolean;
  
  // New Features
  conditionScore?: number; // 0-100
  conditionLabel?: string;
  knownWeakPoints?: string[];
  inLoadout?: boolean;
}

export interface RecentRecallSummary {
  productName: string;
  date: string;
  hazardType: HazardType;
  region: string;
  url: string;
}

export interface WidgetStats {
  hazardBreakdown: { type: string; count: number }[];
  highRiskCategory: string;
}

export interface TripContext {
  type: string;
  environment: string[];
}

export interface LoadoutAnalysis {
  summary: string;
  weakestCategories: string[];
  redFlagItems: string[];
  suggestions: string[];
}
