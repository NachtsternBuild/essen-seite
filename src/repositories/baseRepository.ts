import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

/**
 * Generic options accepted by list/getOne queries. Mirrors the subset of the
 * PocketBase SDK options the app actually uses, so repositories stay thin and
 * predictable.
 */
export interface ListOptions {
  filter?: string;
  sort?: string;
  expand?: string;
  fields?: string;
  /**
   * PocketBase auto-cancellation key. Defaults to `null` (disabled) for reads
   * so that concurrent requests to the *same* endpoint don't cancel each other
   * — e.g. the current/upcoming/previous order queries that fire together on
   * mount. With auto-cancel on, all but the last would throw "autocancelled"
   * and their data would silently vanish from the UI.
   */
  requestKey?: string | null;
  /** Extra query params passed straight through to the SDK. */
  params?: Record<string, unknown>;
}

/**
 * BaseRepository — the single choke point through which the app talks to a
 * PocketBase collection. Services compose these instead of calling `pb`
 * directly, which keeps data-access concerns (collection name, query shape,
 * error normalisation) in one layer:
 *
 *   UI → Hooks → Services → Repositories → PocketBase
 *
 * It is intentionally generic. Collection-specific behaviour (cascades,
 * aggregations) lives in the service that owns the repository, not here.
 */
export class BaseRepository<T extends { id: string } = RecordModel> {
  readonly collection: string;

  constructor(collection: string) {
    this.collection = collection;
  }

  /** Underlying SDK collection accessor — escape hatch for SDK-specific calls. */
  protected get col() {
    return pb.collection(this.collection);
  }

  getFullList(options: ListOptions = {}): Promise<T[]> {
    return this.col.getFullList<T>({ requestKey: null, ...options });
  }

  getList(page = 1, perPage = 50, options: ListOptions = {}) {
    return this.col.getList<T>(page, perPage, { requestKey: null, ...options });
  }

  getOne(id: string, options: Omit<ListOptions, 'filter' | 'sort'> = {}): Promise<T> {
    return this.col.getOne<T>(id, { requestKey: null, ...options });
  }

  /** Returns the first record matching the filter, or null when none exists. */
  async getFirst(filter: string, options: Omit<ListOptions, 'filter'> = {}): Promise<T | null> {
    try {
      return await this.col.getFirstListItem<T>(filter, { requestKey: null, ...options });
    } catch {
      return null;
    }
  }

  create<D extends Record<string, unknown>>(data: D, options: ListOptions = {}): Promise<T> {
    return this.col.create<T>(data, options);
  }

  update<D extends Record<string, unknown>>(
    id: string,
    data: D,
    options: ListOptions = {}
  ): Promise<T> {
    return this.col.update<T>(id, data, options);
  }

  async delete(id: string): Promise<void> {
    await this.col.delete(id);
  }
}
