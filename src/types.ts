// src/types.ts

export interface ProductModel {
  key: string;
  label: string;
}

export interface RegisteredItem {
  id: string;
  model_key: string;
  model_label: string;
  mhd: string; // DD-MM-YYYY
  created_at: string; // ISO timestamp
}

export type CountryCode = 'DE' | 'UK' | 'IE' | 'KR';
export type ParseStrategy = 'HTML_TEXT' | 'TABLE_DATES' | 'CHECKER_LINK';
export type ReliabilityLabel = 'Official' | 'Regulator' | 'OfficialStore';

export interface Source {
  source_key: string;
  country_code: CountryCode;
  tier: 1 | 2;
  url: string;
  parse_strategy: ParseStrategy;
  reliability_label: ReliabilityLabel;
  notes?: string;
  last_hash: string | null;
  last_checked_at: string | null;
}

export interface NoticeSnapshot {
  source_key: string;
  timestamp: string;
  hash: string;
  raw_text: string;
  extracted_dates: string[];
}

export interface ScanResult {
  source_key: string;
  country_code: CountryCode;
  tier: 1 | 2;
  changed: boolean;
  error?: string;
  extracted_dates: string[];
  matched_items: RegisteredItem[];
  uncertain_items: RegisteredItem[]; // 확인 필요
}

export type RiskLevel = '안전' | '확인필요' | '위험';

export interface CountryResult {
  country_code: CountryCode;
  changed: boolean;
  matched_count: number;
  uncertain_count: number;
  unmatched_count: number;
  tier1_links: string[];
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  risk_level: RiskLevel;
  changed_sources: number;
  matched_count: number;
  uncertain_count: number;
  unmatched_count: number;
  summary: string; // 3줄 요약
  source_links: string[];
  matched_items: RegisteredItem[];
  scan_results: ScanResult[];
  country_results: CountryResult[];
}

export interface ConversationState {
  chat_id: number;
  step: 'awaiting_model' | 'awaiting_mhd';
  selected_model?: ProductModel;
}

export interface StoreData {
  group_chat_id: number | null;
  items: RegisteredItem[];
  sources: Source[];
  notices: NoticeSnapshot[];
}
