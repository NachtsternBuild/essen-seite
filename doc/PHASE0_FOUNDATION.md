# Phase 0 – Foundation

This phase lays the architectural groundwork for the professionalisation roadmap
(sections 1, 2, 13, 18 of the project brief). It is **fully additive and
backward-compatible**: no existing feature, flow, collection, field or rule was
removed, and existing accounts behave exactly as before until new capabilities
are explicitly used.

## Architecture: the new layering

```
UI (components)
  ↓
Hooks (useMeals, useOrders, useGroups, usePermissions, …)
  ↓
Services (mealService, groupService, roleService, auditService, trashService, settingsService, …)
  ↓
Repositories (BaseRepository + repositories registry)   ← NEW
  ↓
PocketBase
```

All data access now flows through a single repository layer. Services no longer
talk to `pb.collection(...)` directly; they compose typed repositories from
`src/repositories/`. This isolates query shape, collection naming and error
normalisation in one place.

### New / changed source files

| File | Purpose |
|------|---------|
| `src/repositories/baseRepository.ts` | Generic typed CRUD wrapper over a PocketBase collection. |
| `src/repositories/index.ts` | Registry of one repository per collection. |
| `src/lib/permissions.ts` | Permission catalog, standard-role definitions, `resolvePermissions`/`hasPermission`. |
| `src/services/roleService.ts` | Role CRUD + idempotent `ensureStandardRoles()` seeding. |
| `src/services/auditService.ts` | Best-effort append-only audit logging. |
| `src/services/trashService.ts` | Soft-delete / restore / purge over the `trash` collection. |
| `src/services/settingsService.ts` | Typed global app settings + generic key/value access. |
| `src/context/PermissionContext.tsx` | Loads roles, resolves the current user's permissions, exposes `can()`. |
| `src/services/{user,group,meal,order,maintenance}Service.ts` | Refactored to route through repositories (signatures unchanged). |
| `src/context/AuthContext.tsx` | Now writes `login`/`logout` audit entries. |
| `src/main.tsx` | Wraps the app in `PermissionProvider`. |
| `src/types/index.ts` | New types: `Permission`, `Role`, `AuditLog`, `TrashEntry`, `AppSettings`, `GroupSettings`; `AuthUser.role`, `Group.archived/settings`. |
| `src/lib/validation.ts` | `roleSchema` + `RoleFormInput`. |
| `src/__tests__/permissions.test.ts` | 8 tests covering permission resolution & backward compat. |

## Flexible permission system (brief §2)

The rigid `is_admin` / `is_superuser` booleans are **no longer the only source of
authority**. Permissions are now explicit capabilities resolved per user:

- **Catalog** (`src/lib/permissions.ts`): 20 permission keys grouped by category
  (Benutzer, Essenspläne, Bestellungen, Daten, Gruppen, System).
- **Roles** carry a list of permission keys. Three system roles are seeded:
  `user` (Benutzer), `group_admin` (Gruppenadministrator), `superuser`.
  Custom roles can be added at any time.
- **Resolution order** (`resolvePermissions`):
  1. Superuser → all permissions.
  2. Assigned DB role (`users.role`) → that role's permissions.
  3. Fallback → legacy flags (`is_admin` → group-admin defaults, else user defaults).

This guarantees existing users keep their exact capabilities with **zero
configuration**, while allowing fine-grained custom roles going forward.

Usage in components:

```tsx
const { can } = usePermissions();
if (can('EXPORT_DATA')) { /* show export button */ }
```

## Audit log (brief §13)

`auditService.log()` writes append-only entries to `audit_logs`. Login and logout
are already wired (`AuthContext`). The service is best-effort: a logging failure
never disrupts the user's action. Later phases wire create/update/delete/import/
export/permission-change events through the same service.

## Trash / soft delete (brief §12 infrastructure)

`trashService.softDelete()` snapshots a record into `trash` then deletes the
original; `restore()` recreates it; `purge()`/`empty()` discard permanently.
Phase 0 ships the infrastructure; the restore **UI** is scheduled for Phase 3.

## Security (brief §18)

Every new collection has server-side PocketBase rules — no new capability relies
on the frontend alone:

- `roles`: read by any authenticated user (needed to resolve permissions);
  write restricted to superusers.
- `audit_logs`: any authenticated user may append (attributed) entries;
  read/delete restricted to superusers; updates disabled.
- `trash`: superusers see everything; group admins see their own group's trash;
  only admins/superusers may create/delete entries; updates disabled.

---

## New collections, fields, permissions & settings

### Collections added

| Collection | Fields |
|-----------|--------|
| `roles` | `name`, `slug` (unique), `description`, `permissions` (json), `is_system` (bool), `group` (text) |
| `audit_logs` | `user` (rel→users), `user_name`, `action` (select), `entity_type`, `entity_id`, `group` (rel→groups), `details` (json) |
| `trash` | `collection_name`, `record_id`, `data` (json), `deleted_by` (rel→users), `deleted_by_name`, `group` (rel→groups) |

### Fields added to existing collections

| Collection | Field | Type | Notes |
|-----------|-------|------|-------|
| `users` | `role` | relation → roles | Optional; primary permission source when set. |
| `groups` | `settings` | json | Per-group settings bag (Phase 1). |
| `groups` | `parent_group` | text | Foundation for group hierarchy (Phase 1, brief §4). |

### Permission keys (20)

`VIEW_USERS`, `CREATE_USERS`, `EDIT_USERS`, `DELETE_USERS`,
`VIEW_MEALS`, `EDIT_MEALS`, `DELETE_MEALS`, `MANAGE_TEMPLATES`,
`PLACE_ORDERS`, `VIEW_ORDERS`,
`EXPORT_DATA`, `IMPORT_DATA`, `VIEW_STATISTICS`,
`CREATE_GROUPS`, `EDIT_GROUPS`, `DELETE_GROUPS`,
`MANAGE_PERMISSIONS`, `VIEW_AUDIT_LOG`, `MANAGE_TRASH`, `SYSTEM_SETTINGS`.

### Global app settings (`settings` collection, key `app_defaults`)

`default_color`, `default_language`, `default_timezone`, `default_currency`,
`default_order_deadline`, `default_export`, `default_theme`. New groups inherit
these (consumed in Phase 1).

---

## How to apply the migration

**Fresh install:** use the declarative schema in
`migrations/setup_collections.js` (now includes the three new collections, the
new fields and all rules).

**Existing install (PocketBase ≥ 0.22):**
1. Copy `migrations/1751284800_phase0_foundation.js` into your PocketBase
   `pb_migrations/` directory.
2. Restart `./pocketbase serve` — it runs automatically (includes a down-migration).
3. Standard roles are seeded automatically by the app
   (`roleService.ensureStandardRoles()`), or create them manually in the Admin UI.

## Verification

- `npx tsc -b` — clean.
- `npx vitest run` — 40 tests pass (8 new permission tests).
- `npm run build` — succeeds.
- Lint: no **new kinds** of violations; `PermissionContext` follows the exact
  same accepted pattern as the existing `AuthContext`/`GroupContext`.
