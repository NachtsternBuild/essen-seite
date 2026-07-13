/// <reference path="../pb_data/types.d.ts" />
/**
 * Essensplaner – full declarative schema setup.
 *
 * This is the ONE file you need to set up every collection, field and API
 * rule the app currently requires (Phases 0–4). It is idempotent: collections
 * and fields are only created if missing, and every API rule is
 * (re-)applied to its current, correct value every time this migration runs.
 *
 * ── Fresh install ────────────────────────────────────────────────────────────
 *   1. Copy ONLY this file into your PocketBase `pb_migrations/` directory.
 *   2. Restart `./pocketbase serve` — it runs automatically and creates
 *      every collection below plus the `users` field extensions.
 *   3. Continue with migrations/README.md § "Ersten Superuser anlegen".
 *
 *   Do NOT also copy the older numbered migrations (1751284800_*,
 *   1751299200_*, 1751385600_*) alongside this file on a fresh install —
 *   this file already contains everything they did. Copying both would try
 *   to create the same collections twice and fail.
 *
 * ── Existing install ─────────────────────────────────────────────────────────
 *   If you already ran the numbered migrations (or set collections up by
 *   hand), copying this file in and restarting is still safe and useful:
 *   every collection/field it needs already exists, so creation is skipped,
 *   but every API rule gets re-applied to the current correct value. This is
 *   the easiest way to pick up rule fixes without hunting through old
 *   migrations by hand.
 *
 * The declarative source of truth lives here; migrations/README.md § 12
 * mirrors it in prose for humans copy-pasting into the Admin UI by hand.
 */
migrate(
  (app) => {
    // ── helpers ────────────────────────────────────────────────────────────────

    /** Finds a collection by name, or null if it doesn't exist yet. */
    function findCollection(name) {
      try {
        return app.findCollectionByNameOrId(name);
      } catch (_) {
        return null;
      }
    }

    /**
     * Creates the collection if missing; otherwise re-applies its API rules
     * (structure/fields on an existing collection are left to ensureField,
     * called separately for every field in `def.fields`).
     */
    function ensureCollection(def) {
      let col = findCollection(def.name);
      if (col) {
        col.listRule = def.listRule ?? null;
        col.viewRule = def.viewRule ?? null;
        col.createRule = def.createRule ?? null;
        col.updateRule = def.updateRule ?? null;
        col.deleteRule = def.deleteRule ?? null;
        app.save(col);
        ensureTimestamps(col);
        return col;
      }
      col = new Collection({
        type: def.type ?? 'base',
        name: def.name,
        listRule: def.listRule ?? null,
        viewRule: def.viewRule ?? null,
        createRule: def.createRule ?? null,
        updateRule: def.updateRule ?? null,
        deleteRule: def.deleteRule ?? null,
        fields: def.fields,
        indexes: def.indexes ?? [],
      });
      app.save(col);
      // PocketBase ≥ 0.23 doesn't add created/updated automatically.
      ensureTimestamps(col);
      return col;
    }

    /** Adds a field to a collection if a field with that name isn't already there. */
    function ensureField(col, fieldDef) {
      if (col.fields.getByName(fieldDef.name)) return;
      col.fields.add(new Field(fieldDef));
      app.save(col);
    }

    /**
     * PocketBase ≥ 0.23 no longer auto-creates the `created`/`updated` system
     * fields. Without them, any query with `sort=-created` fails with HTTP 400
     * ("invalid sort field created") — which broke notifications on every page
     * load and every `-created` sort in the app. Add them as autodate fields.
     */
    function ensureTimestamps(col) {
      ensureField(col, { name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
      ensureField(col, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
    }

    const usersId = app.findCollectionByNameOrId('users').id;

    // Let superusers/admins manage other users (e.g. reset a password) WITHOUT
    // providing the target's oldPassword. Without a manageRule, PocketBase
    // rejects such updates with {"oldPassword":"cannot be blank"}.
    {
      const usersCol = app.findCollectionByNameOrId('users');
      const rule = '@request.auth.is_superuser = true || @request.auth.is_admin = true';
      if (usersCol.manageRule !== rule) {
        usersCol.manageRule = rule;
        app.save(usersCol);
      }
    }

    // ── groups ─────────────────────────────────────────────────────────────────
    const groups = ensureCollection({
      name: 'groups',
      fields: [
        { name: 'name', type: 'text', required: true, max: 60 },
        { name: 'description', type: 'text', required: false, max: 200 },
        { name: 'color', type: 'text', required: false },
        // Soft-archive flag (group hidden but not deleted). Phase 1.
        { name: 'archived', type: 'bool', required: false },
        // Stored as text (not relation) — PocketBase forbids self-references.
        { name: 'linked_group', type: 'text', required: false },
        // Per-group settings bag (logo, timezone, language, order deadline, …).
        { name: 'settings', type: 'json', required: false },
        // Optional parent for a future group hierarchy. Text, not relation —
        // same self-reference restriction as linked_group.
        { name: 'parent_group', type: 'text', required: false },
      ],
      // NOTE: `groups` is created before `group_memberships`, so its rules must
      // NOT reference @collection.group_memberships (that fails to apply on a
      // fresh DB). A regular user sees their own group via group_id; admins see
      // all (for the reassignment UI); superusers see everything.
      listRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || id = @request.auth.group_id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || id = @request.auth.group_id)',
      createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    });
    // Backstop for installs where `groups` predates these fields.
    ensureField(groups, { name: 'archived', type: 'bool', required: false });
    ensureField(groups, { name: 'settings', type: 'json', required: false });
    ensureField(groups, { name: 'parent_group', type: 'text', required: false });

    // ── group_memberships ────────────────────────────────────────────────────────
    const groupMemberships = ensureCollection({
      name: 'group_memberships',
      fields: [
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'role', type: 'select', maxSelect: 1, required: true, values: ['admin', 'member'] },
      ],
      listRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || user.id = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || user.id = @request.auth.id)',
      createRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true)',
      updateRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true)',
      deleteRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true)',
    });

    // ── meal_plans ───────────────────────────────────────────────────────────────
    const mealPlans = ensureCollection({
      name: 'meal_plans',
      fields: [
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'year', type: 'number', required: true },
        { name: 'week_number', type: 'number', required: true },
        { name: 'status', type: 'select', maxSelect: 1, required: true, values: ['upcoming', 'current', 'archived'] },
        { name: 'meals', type: 'json', required: false },
        // Text (not relation) — PocketBase forbids self-references.
        { name: 'synced_from', type: 'text', required: false },
        { name: 'sync_mode', type: 'select', maxSelect: 1, required: false, values: ['copy', 'sync'] },
      ],
      // Any authenticated user may view (needed for shared-plan access); only
      // group admins/superusers modify.
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      // group_id-based so it applies reliably (avoids the `@collection…=`
      // multi-join pitfall). Group admins manage their own group's plans;
      // this also makes week rotation (which deletes the old plan) work.
      createRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && group = @request.auth.group_id))',
      updateRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && group = @request.auth.group_id))',
      deleteRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && group = @request.auth.group_id))',
    });

    // ── orders ───────────────────────────────────────────────────────────────────
    const orders = ensureCollection({
      name: 'orders',
      fields: [
        { name: 'meal_plan', type: 'relation', collectionId: mealPlans.id, maxSelect: 1, required: true, cascadeDelete: true },
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'user_name', type: 'text', required: true },
        { name: 'user_info', type: 'text', required: false },
        { name: 'day', type: 'select', maxSelect: 1, required: true, values: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'] },
        { name: 'meal_number', type: 'text', required: true },
        { name: 'meal_name', type: 'text', required: true },
        { name: 'meal_price', type: 'number', required: true },
        { name: 'edited', type: 'bool', required: false },
      ],
      // Group membership is proven via the user's group_id. The previous
      // `@collection.group_memberships.group = group` form used `=` on a
      // multi-value join, which is unreliable and caused orders to vanish on
      // reload even though they were saved. A member sees every order in their
      // group (the week view shows all orders); users manage their own; group
      // admins manage their group's orders.
      listRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || group = @request.auth.group_id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || group = @request.auth.group_id)',
      createRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || group = @request.auth.group_id)',
      updateRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (@request.auth.is_admin = true && group = @request.auth.group_id))',
      deleteRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (@request.auth.is_admin = true && group = @request.auth.group_id))',
    });

    // ── shared_plans ─────────────────────────────────────────────────────────────
    ensureCollection({
      name: 'shared_plans',
      fields: [
        { name: 'source_plan', type: 'relation', collectionId: mealPlans.id, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'source_group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'source_group_name', type: 'text', required: true },
        { name: 'shared_by', type: 'relation', collectionId: usersId, maxSelect: 1, required: true, cascadeDelete: false },
        { name: 'shared_by_name', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        { name: 'week_label', type: 'text', required: false },
        { name: 'meals', type: 'json', required: true },
      ],
      listRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
      viewRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
      createRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
      updateRule: '@request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)',
      deleteRule: '@request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)',
    });

    // ── settings (key/value) ─────────────────────────────────────────────────────
    ensureCollection({
      name: 'settings',
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'json', required: false },
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    });

    // ── roles (Phase 0) ──────────────────────────────────────────────────────────
    const roles = ensureCollection({
      name: 'roles',
      fields: [
        { name: 'name', type: 'text', required: true, max: 50 },
        { name: 'slug', type: 'text', required: true, max: 50 },
        { name: 'description', type: 'text', required: false, max: 200 },
        // Array of permission keys (see src/lib/permissions.ts).
        { name: 'permissions', type: 'json', required: false },
        // System roles cannot be deleted from the UI.
        { name: 'is_system', type: 'bool', required: false },
        // Optional group scope (text id). Empty = global role.
        { name: 'group', type: 'text', required: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_roles_slug ON roles (slug)'],
      // Everyone authenticated may read (needed to resolve permissions
      // client-side); only superusers modify.
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      updateRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    });

    // ── audit_logs (Phase 0) ─────────────────────────────────────────────────────
    ensureCollection({
      name: 'audit_logs',
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'user_name', type: 'text', required: true },
        {
          name: 'action',
          type: 'select',
          maxSelect: 1,
          required: true,
          values: ['login', 'logout', 'create', 'update', 'delete', 'restore', 'import', 'export', 'permission_change', 'group_create'],
        },
        { name: 'entity_type', type: 'text', required: false },
        { name: 'entity_id', type: 'text', required: false },
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'details', type: 'json', required: false },
      ],
      // Any authenticated user can write entries attributed to themselves;
      // only superusers can read or delete them.
      listRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      viewRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    });

    // ── trash (Phase 0) ──────────────────────────────────────────────────────────
    ensureCollection({
      name: 'trash',
      fields: [
        { name: 'collection_name', type: 'text', required: true },
        { name: 'record_id', type: 'text', required: true },
        { name: 'data', type: 'json', required: true },
        { name: 'deleted_by', type: 'relation', collectionId: usersId, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'deleted_by_name', type: 'text', required: true },
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: false, cascadeDelete: false },
      ],
      // Superusers see all trash; group admins see their own group's trash.
      listRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && group = @request.auth.group_id))',
      viewRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && group = @request.auth.group_id))',
      createRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
      updateRule: null,
      deleteRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
    });

    // ── plan_history (Phase 3) ───────────────────────────────────────────────────
    ensureCollection({
      name: 'plan_history',
      fields: [
        { name: 'meal_plan', type: 'relation', collectionId: mealPlans.id, maxSelect: 1, required: true, cascadeDelete: true },
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, required: false, cascadeDelete: false },
        { name: 'user_name', type: 'text', required: true },
        {
          name: 'action',
          type: 'select',
          maxSelect: 1,
          required: true,
          values: ['created', 'meal_added', 'meal_removed', 'meals_updated', 'status_changed'],
        },
        { name: 'day', type: 'text', required: false },
        { name: 'summary', type: 'text', required: true },
        { name: 'before', type: 'json', required: false },
        { name: 'after', type: 'json', required: false },
      ],
      // Group members can read their group's history; any authed user can
      // append (only group admins reach the edit actions that record entries).
      listRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || group = @request.auth.group_id)',
      viewRule:
        '@request.auth.id != "" && (@request.auth.is_superuser = true || group = @request.auth.group_id)',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: '@request.auth.id != "" && @request.auth.is_superuser = true',
    });

    // ── notifications (Phase 3) ──────────────────────────────────────────────────
    ensureCollection({
      name: 'notifications',
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, required: false, cascadeDelete: true },
        { name: 'group', type: 'relation', collectionId: groups.id, maxSelect: 1, required: false, cascadeDelete: false },
        {
          name: 'type',
          type: 'select',
          maxSelect: 1,
          required: true,
          values: ['order_deadline', 'new_week', 'plan_changed', 'new_group', 'admin_message', 'system'],
        },
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'message', type: 'text', required: false, max: 500 },
        { name: 'read', type: 'bool', required: false },
      ],
      indexes: ['CREATE INDEX idx_notifications_user ON notifications (user)'],
      // Recipients see/manage their own notifications; admins/superusers create.
      listRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)',
      viewRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)',
      createRule: '@request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)',
      updateRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)',
      deleteRule: '@request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)',
    });

    // ── users collection extensions ─────────────────────────────────────────────
    const users = app.findCollectionByNameOrId('users');
    ensureField(users, { name: 'is_admin', type: 'bool', required: false });
    ensureField(users, { name: 'is_superuser', type: 'bool', required: false });
    ensureField(users, { name: 'info', type: 'text', required: false, max: 100 });
    // Optional primary group reference (simple assignment; group_memberships
    // is the formal, preferred way).
    ensureField(users, { name: 'group_id', type: 'text', required: false });
    // Phase 0: optional primary source of permissions when set (see
    // src/lib/permissions.ts); falls back to is_admin/is_superuser otherwise.
    ensureField(users, { name: 'role', type: 'relation', collectionId: roles.id, maxSelect: 1, required: false, cascadeDelete: false });

    users.listRule = '@request.auth.id != "" && @request.auth.is_admin = true';
    users.viewRule = '@request.auth.id != "" && (id = @request.auth.id || @request.auth.is_admin = true)';
    users.createRule = '@request.auth.id != "" && @request.auth.is_superuser = true';
    // Admins may update other users' group_id (to reassign groups); the app
    // itself ensures admins never touch is_admin/is_superuser on records that
    // aren't their own — this DB rule can't distinguish individual fields.
    users.updateRule =
      '@request.auth.id != "" && (id = @request.auth.id || @request.auth.is_superuser = true || @request.auth.is_admin = true)';
    users.deleteRule = '@request.auth.id != "" && @request.auth.is_superuser = true';
    app.save(users);

    console.log('Essensplaner schema setup complete.');
  },

  // ── Down migration ──────────────────────────────────────────────────────────
  // Intentionally a no-op: this migration is additive/idempotent and may run
  // against a database that already has data in these collections from other
  // sources. Reverting a full multi-tenant schema safely isn't a single,
  // sane operation — remove collections manually via the Admin UI if needed.
  (_app) => {}
);
