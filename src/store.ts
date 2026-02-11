// src/store.ts

import { RegisteredItem, Source, NoticeSnapshot, StoreData } from './types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const STORE_KEY = 'aptamil_watcher_data';
const LOCAL_STORE_PATH = join(process.cwd(), '.local-store.json');

// Vercel KV 또는 Upstash Redis 사용 가능 여부 확인
const isKVAvailable = () => {
  return !!(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
};

// 로컬 파일 저장소 로드
function loadLocalStore(): StoreData {
  if (existsSync(LOCAL_STORE_PATH)) {
    try {
      const data = JSON.parse(readFileSync(LOCAL_STORE_PATH, 'utf-8'));
      console.log('[Store] Loaded from local file store');
      return data;
    } catch (error) {
      console.error('[Store] Error loading local store:', error);
    }
  }
  
  return {
    group_chat_id: null,
    items: [],
    sources: [],
    notices: [],
  };
}

// 로컬 파일 저장소 저장
function saveLocalStore(data: StoreData): void {
  try {
    writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[Store] Saved to local file store');
  } catch (error) {
    console.error('[Store] Error saving local store:', error);
  }
}

export async function loadStore(): Promise<StoreData> {
  // 로컬 개발 환경 (KV 없음) - 파일 저장소 사용
  if (!isKVAvailable()) {
    return loadLocalStore();
  }

  // Vercel 환경 (KV 사용)
  const { kv } = await import('@vercel/kv');
  const data = await kv.get<StoreData>(STORE_KEY);
  if (!data) {
    return {
      group_chat_id: null,
      items: [],
      sources: [],
      notices: [],
    };
  }
  return data;
}

export async function saveStore(data: StoreData): Promise<void> {
  // 로컬 개발 환경 (KV 없음) - 파일 저장소 사용
  if (!isKVAvailable()) {
    saveLocalStore(data);
    return;
  }

  // Vercel 환경 (KV 사용)
  const { kv } = await import('@vercel/kv');
  await kv.set(STORE_KEY, data);
}

export async function setGroupChatId(chatId: number): Promise<void> {
  const data = await loadStore();
  data.group_chat_id = chatId;
  await saveStore(data);
}

export async function getGroupChatId(): Promise<number | null> {
  const data = await loadStore();
  return data.group_chat_id;
}

export async function addItem(item: RegisteredItem): Promise<void> {
  const data = await loadStore();
  // 중복 체크
  const exists = data.items.some(
    (i) => i.model_key === item.model_key && i.mhd === item.mhd
  );
  if (exists) {
    throw new Error('이미 등록된 모델+MHD 조합입니다.');
  }
  data.items.push(item);
  await saveStore(data);
}

export async function getItems(): Promise<RegisteredItem[]> {
  const data = await loadStore();
  return data.items;
}

export async function removeItem(id: string): Promise<boolean> {
  const data = await loadStore();
  const initialLength = data.items.length;
  data.items = data.items.filter((i) => i.id !== id);
  if (data.items.length < initialLength) {
    await saveStore(data);
    return true;
  }
  return false;
}

export async function getSources(): Promise<Source[]> {
  const data = await loadStore();
  return data.sources;
}

export async function updateSource(source: Source): Promise<void> {
  const data = await loadStore();
  const index = data.sources.findIndex((s) => s.source_key === source.source_key);
  if (index >= 0) {
    data.sources[index] = source;
  } else {
    data.sources.push(source);
  }
  await saveStore(data);
}

export async function addNoticeSnapshot(snapshot: NoticeSnapshot): Promise<void> {
  const data = await loadStore();
  data.notices.push(snapshot);
  // 최근 3개만 유지
  if (data.notices.length > 3) {
    data.notices = data.notices.slice(-3);
  }
  await saveStore(data);
}

export async function getNotices(): Promise<NoticeSnapshot[]> {
  const data = await loadStore();
  return data.notices;
}
