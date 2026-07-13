import { describe, it, expect, vi } from 'vitest';
import {
  makeMutation,
  flushQueue,
  memoryQueueStorage,
  type QueuedMutation,
} from '../lib/offlineQueue';

describe('makeMutation', () => {
  it('creates a mutation with id, timestamp and payload', () => {
    const m = makeMutation('orders', 'create', { data: { day: 'Montag' } });
    expect(m.collection).toBe('orders');
    expect(m.op).toBe('create');
    expect(m.data).toEqual({ day: 'Montag' });
    expect(m.id).toBeTruthy();
    expect(typeof m.created).toBe('number');
  });
});

describe('flushQueue', () => {
  const items: QueuedMutation[] = [
    { id: 'a', collection: 'orders', op: 'create', created: 1 },
    { id: 'b', collection: 'orders', op: 'update', recordId: 'x', created: 2 },
    { id: 'c', collection: 'orders', op: 'delete', recordId: 'y', created: 3 },
  ];

  it('replays all mutations in chronological order and clears the queue', async () => {
    const storage = memoryQueueStorage([...items].reverse()); // unsorted on purpose
    const seen: string[] = [];
    const result = await flushQueue(storage, async m => {
      seen.push(m.id);
    });
    expect(seen).toEqual(['a', 'b', 'c']); // sorted by created
    expect(result.flushed).toBe(3);
    expect(result.remaining).toBe(0);
    expect(await storage.all()).toHaveLength(0);
  });

  it('stops at the first failure and keeps the failed + later mutations', async () => {
    const storage = memoryQueueStorage(items);
    const runner = vi
      .fn<(m: QueuedMutation) => Promise<void>>()
      .mockResolvedValueOnce(undefined) // a ok
      .mockRejectedValueOnce(new Error('offline')); // b fails
    const result = await flushQueue(storage, runner);

    expect(result.flushed).toBe(1);
    expect(result.remaining).toBe(2);
    expect(result.failedAt).toBe('b');
    const remaining = (await storage.all()).map(m => m.id).sort();
    expect(remaining).toEqual(['b', 'c']);
  });

  it('handles an empty queue', async () => {
    const result = await flushQueue(memoryQueueStorage(), async () => {});
    expect(result).toEqual({ flushed: 0, remaining: 0 });
  });
});
