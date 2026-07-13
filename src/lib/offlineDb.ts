import type { QueueStorage, QueuedMutation } from './offlineQueue';
import { memoryQueueStorage } from './offlineQueue';

/**
 * IndexedDB-backed {@link QueueStorage}. Falls back to an in-memory store when
 * IndexedDB is unavailable (SSR, private mode, tests), so callers never need to
 * feature-detect.
 */

const DB_NAME = 'meal_planner_offline';
const STORE = 'mutation_queue';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const store = db.transaction(STORE, mode).objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function indexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Returns the best available queue storage for the current environment. */
export function getQueueStorage(): QueueStorage {
  if (!indexedDbAvailable()) return memoryQueueStorage();

  return {
    all: () => tx<QueuedMutation[]>('readonly', s => s.getAll()),
    put: async item => {
      await tx('readwrite', s => s.put(item));
    },
    remove: async id => {
      await tx('readwrite', s => s.delete(id));
    },
  };
}
