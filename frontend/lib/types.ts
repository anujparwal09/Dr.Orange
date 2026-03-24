export interface PredictionResult {
  scan_id?: string;
  disease: string;
  confidence: number;
  quality_score: number;
  shelf_life: number;
  days_since_harvest: number;
  ripeness: string;
  description: string;
  treatment: string[];
  hindi_summary: string;
  confidence_breakdown: Record<string, number>;
  model_used?: 'local_mtl' | 'gemini_vision' | 'mock';
  gemini_used?: boolean;
  fallback_used?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

export interface HistoryItem {
  id: string;
  name: string;
  date: string;
  disease: string;
  diseaseType: 'canker' | 'healthy' | 'melanose' | 'greening' | 'blackspot';
  quality: number;
  shelfLife: string;
  gradient: string;
}

export interface DashStats {
  totalScans: number;
  diseasesFound: number;
  healthyCount: number;
  avgQuality: number;
}
