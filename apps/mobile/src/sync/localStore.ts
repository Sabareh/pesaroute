import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JournalEntry, PortfolioItem, SyncQueueItem } from "../types";

const JOURNAL_KEY = "pesaroute.sync.journal.v1";
const PORTFOLIO_KEY = "pesaroute.sync.portfolio.v1";
const QUEUE_KEY = "pesaroute.sync.queue.v1";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadJournalEntries() {
  return readJson<JournalEntry[]>(JOURNAL_KEY, []);
}

export function saveJournalEntries(entries: JournalEntry[]) {
  return writeJson(JOURNAL_KEY, entries);
}

export function loadPortfolioItems() {
  return readJson<PortfolioItem[]>(PORTFOLIO_KEY, []);
}

export function savePortfolioItems(items: PortfolioItem[]) {
  return writeJson(PORTFOLIO_KEY, items);
}

export function loadSyncQueue() {
  return readJson<SyncQueueItem[]>(QUEUE_KEY, []);
}

export function saveSyncQueue(queue: SyncQueueItem[]) {
  return writeJson(QUEUE_KEY, queue);
}
