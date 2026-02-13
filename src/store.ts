// src/store.ts

import { kv } from '@vercel/kv';
import { RegisteredItem, Source, NoticeSnapshot, StoreData } from './types';

const STORE_KEY = 'aptamil_watcher_data';

export async function loadStore(): Promise<StoreData> {
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
