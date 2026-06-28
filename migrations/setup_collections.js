/**
 * PocketBase Collection Setup Script
 *
 * Run this via the PocketBase Admin UI → Settings → Import collections,
 * OR execute via the PocketBase JS SDK in a migration file.
 *
 * Usage with pb CLI (v0.22+):
 *   node setup_collections.js
 *
 * Requires: POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD env vars
 */

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090';

// ─── Schema definition ────────────────────────────────────────────────────────

const SCHEMA = {
  // groups – one per tenant/group
  groups: {
    name: 'groups',
    type: 'base',
    fields: [
      { name: 'name',         type: 'text', required: true, max: 60 },
      { name: 'description',  type: 'text', required: false, max: 200 },
      { name: 'color',        type: 'text', required: false },
      { name: 'archived',     type: 'bool', required: false },
      // Stores the ID of another group whose meal plan this group uses.
      // Stored as text (not relation) because PocketBase forbids self-referencing relations.
      { name: 'linked_group', type: 'text', required: false },
    ],
    listRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.user.id ?= @request.auth.id)',
    viewRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.user.id ?= @request.auth.id)',
    createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
  },

  // group_memberships – user ↔ group with role
  group_memberships: {
    name: 'group_memberships',
    type: 'base',
    fields: [
      { name: 'group', type: 'relation', collectionId: 'groups', required: true },
      { name: 'user',  type: 'relation', collectionId: 'users',  required: true },
      { name: 'role',  type: 'select', values: ['admin', 'member'], required: true },
    ],
    listRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id)',
    viewRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id)',
    createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
  },

  // meal_plans – one per group per time period
  meal_plans: {
    name: 'meal_plans',
    type: 'base',
    fields: [
      { name: 'group',        type: 'relation', collectionId: 'groups', required: true },
      { name: 'year',         type: 'number',   required: true },
      { name: 'week_number',  type: 'number',   required: true },
      { name: 'status',       type: 'select',   values: ['upcoming', 'current', 'archived'], required: true },
      { name: 'meals',        type: 'json',     required: false },
      // Stored as text (not relation) — PocketBase forbids self-referencing relations.
      { name: 'synced_from',  type: 'text', required: false },
      { name: 'sync_mode',    type: 'select',   values: ['copy', 'sync'], required: false },
    ],
    // Any authenticated user can view (needed for shared plan access); only admins can modify
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")',
    updateRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")',
    deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
  },

  // orders – individual meal orders (normalized)
  orders: {
    name: 'orders',
    type: 'base',
    fields: [
      { name: 'meal_plan',   type: 'relation', collectionId: 'meal_plans', required: true },
      { name: 'group',       type: 'relation', collectionId: 'groups',     required: true },
      { name: 'user',        type: 'relation', collectionId: 'users',      required: true },
      { name: 'user_name',   type: 'text',     required: true },
      { name: 'user_info',   type: 'text',     required: false },
      { name: 'day',         type: 'select',   values: ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'], required: true },
      { name: 'meal_number', type: 'text',     required: true },
      { name: 'meal_name',   type: 'text',     required: true },
      { name: 'meal_price',  type: 'number',   required: true },
      { name: 'edited',      type: 'bool',     required: false },
    ],
    // Supports both group_memberships (formal) and group_id field (simple assignment)
    listRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || group.memberships.user = @request.auth.id || group = @request.auth.group_id)',
    viewRule:   '@request.auth.id != "" && (@request.auth.is_superuser = true || group.memberships.user = @request.auth.id || group = @request.auth.group_id)',
    createRule: '@request.auth.id != "" && (group.memberships.user = @request.auth.id || group = @request.auth.group_id)',
    updateRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (group.memberships.user = @request.auth.id && group.memberships.role = "admin"))',
    deleteRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (group.memberships.user = @request.auth.id && group.memberships.role = "admin"))',
  },

  // shared_plans – published templates other groups can adopt
  shared_plans: {
    name: 'shared_plans',
    type: 'base',
    fields: [
      { name: 'source_plan',       type: 'relation', collectionId: 'meal_plans', required: false },
      { name: 'source_group',      type: 'relation', collectionId: 'groups',     required: true },
      { name: 'source_group_name', type: 'text',     required: true },
      { name: 'shared_by',         type: 'relation', collectionId: 'users',      required: true },
      { name: 'shared_by_name',    type: 'text',     required: true },
      { name: 'name',              type: 'text',     required: true },
      { name: 'description',       type: 'text',     required: false },
      { name: 'week_label',        type: 'text',     required: false },
      { name: 'meals',             type: 'json',     required: true },
    ],
    // Any authenticated admin can view shared plans; only creator can modify
    listRule:   '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
    viewRule:   '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
    createRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
    updateRule: '@request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)',
    deleteRule: '@request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)',
  },

  // settings – global app settings (maintenance, etc.)
  settings: {
    name: 'settings',
    type: 'base',
    fields: [
      { name: 'key',   type: 'text', required: true },
      { name: 'value', type: 'json', required: false },
    ],
    listRule:   '@request.auth.id != ""',
    viewRule:   '@request.auth.id != ""',
    createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
  },
};

// ─── Users collection extensions ─────────────────────────────────────────────
// Add these fields to the existing 'users' auth collection in PocketBase Admin:
//
//   is_admin   : bool   (already exists)
//   is_superuser: bool  (already exists)
//   info       : text   (already exists)
//   group_id   : text   (NEW — optional primary group reference)
//
// PocketBase Admin → Collections → users → Fields → Add field

console.log('Schema definition:');
console.log(JSON.stringify(Object.values(SCHEMA), null, 2));
console.log('\n--- Additional fields needed on "users" collection ---');
console.log('Add field: group_id (type: text, required: false)');
console.log('\nIMPORTANT: Apply PocketBase rules above to restrict multi-tenant access.');
