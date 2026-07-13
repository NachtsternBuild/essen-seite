import { repositories, BaseRepository } from '../repositories';
import { auditService } from './auditService';
import type { AuthUser, TrashEntry } from '../types';

const trash = repositories.trash;

/**
 * Fields PocketBase manages itself; they must be stripped from a snapshot
 * before re-creating a record on restore.
 */
const SYSTEM_FIELDS = ['id', 'created', 'updated', 'collectionId', 'collectionName', 'expand'];

function stripSystemFields(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!SYSTEM_FIELDS.includes(key)) clean[key] = value;
  }
  return clean;
}

export interface SoftDeleteInput {
  collection: string;
  record: { id: string } & Record<string, unknown>;
  actor: AuthUser | null;
  group?: string;
}

export const trashService = {
  /**
   * Moves a record into the trash: snapshots it, then deletes it from its source
   * collection. The snapshot retains everything needed to restore it later.
   */
  async softDelete({ collection, record, actor, group }: SoftDeleteInput): Promise<TrashEntry> {
    const entry = await trash.create({
      collection_name: collection,
      record_id: record.id,
      data: stripSystemFields(record),
      deleted_by: actor?.id ?? null,
      deleted_by_name: actor?.name ?? 'System',
      group: group ?? null,
    });

    await new BaseRepository(collection).delete(record.id);

    void auditService.log({
      user: actor,
      action: 'delete',
      entity_type: collection,
      entity_id: record.id,
      group,
      details: { trashed: true, trash_id: entry.id },
    });

    return entry;
  },

  async list(limit = 200): Promise<TrashEntry[]> {
    const res = await trash.getList(1, limit, { sort: '-created' });
    return res.items;
  },

  async listForGroup(groupId: string, limit = 200): Promise<TrashEntry[]> {
    const res = await trash.getList(1, limit, {
      filter: `group = "${groupId}"`,
      sort: '-created',
    });
    return res.items;
  },

  /**
   * Restores a trashed record back into its source collection and removes the
   * trash entry. Returns the id of the newly created record.
   */
  async restore(trashId: string, actor: AuthUser | null): Promise<string> {
    const entry = await trash.getOne(trashId);
    const created = await new BaseRepository(entry.collection_name).create(entry.data);
    await trash.delete(trashId);

    void auditService.log({
      user: actor,
      action: 'restore',
      entity_type: entry.collection_name,
      entity_id: created.id,
      group: entry.group,
      details: { restored_from: trashId, original_id: entry.record_id },
    });

    return created.id;
  },

  /** Permanently removes a trash entry without restoring it. */
  async purge(trashId: string): Promise<void> {
    await trash.delete(trashId);
  },

  /** Empties the entire trash (or a single group's trash). */
  async empty(groupId?: string): Promise<void> {
    const entries = groupId
      ? await trashService.listForGroup(groupId)
      : await trashService.list();
    await Promise.all(entries.map(e => trash.delete(e.id)));
  },
};
