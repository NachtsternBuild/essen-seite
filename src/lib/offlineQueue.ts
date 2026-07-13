/**
 * Offline write queue (foundation for brief §19).
 *
 * Mutations made while offline can be appended here and replayed in order once
 * connectivity returns. The queue is storage-agnostic: a backend implements
 * {@link QueueStorage}, so the flush logic stays pure and unit-testable with an
 * in-memory backend while production uses IndexedDB (see offlineDb.ts).
 */

export type QueueOp = 'create' | 'update' | 'delete';

export interface QueuedMutation {
  id: string;
  collection: string;
  op: QueueOp;
  /** Target record id for update/delete. */
  recordId?: string;
  data?: Record<string, unknown>;
  created: number;
}

export interface QueueStorage {
  all(): Promise<QueuedMutation[]>;
  put(item: QueuedMutation): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Builds a queued mutation with a stable id + timestamp. */
export function makeMutation(
  collection: string,
  op: QueueOp,
  opts: { recordId?: string; data?: Record<string, unknown> } = {}
): QueuedMutation {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    collection,
    op,
    recordId: opts.recordId,
    data: opts.data,
    created: Date.now(),
  };
}

/** Runner executes a single mutation against the backend (e.g. PocketBase). */
export type MutationRunner = (m: QueuedMutation) => Promise<void>;

export interface FlushResult {
  flushed: number;
  remaining: number;
  /** Set when flushing stopped early because a mutation failed. */
  failedAt?: string;
}

/**
 * Replays queued mutations in chronological order. Stops at the first failure
 * so ordering/causality is preserved (later mutations may depend on earlier
 * ones). Successfully applied mutations are removed from storage.
 */
export async function flushQueue(
  storage: QueueStorage,
  runner: MutationRunner
): Promise<FlushResult> {
  const items = (await storage.all()).sort((a, b) => a.created - b.created);
  let flushed = 0;

  for (const item of items) {
    try {
      await runner(item);
      await storage.remove(item.id);
      flushed++;
    } catch {
      return { flushed, remaining: items.length - flushed, failedAt: item.id };
    }
  }
  return { flushed, remaining: 0 };
}

/** In-memory {@link QueueStorage} — used in tests and as a fallback when
 *  IndexedDB is unavailable. */
export function memoryQueueStorage(initial: QueuedMutation[] = []): QueueStorage {
  const map = new Map<string, QueuedMutation>(initial.map(i => [i.id, i]));
  return {
    async all() {
      return [...map.values()];
    },
    async put(item) {
      map.set(item.id, item);
    },
    async remove(id) {
      map.delete(id);
    },
  };
}
