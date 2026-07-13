# Phase 1 – Groups pro

Builds professional, multi-tenant group management on top of the Phase 0
foundation (brief sections §3–§7). Like Phase 0, everything is **additive and
backward-compatible**: the existing group create/edit/delete flow is preserved
and extended, not replaced.

## What's new

### 1. Per-group settings (§3, §5)
Each group now carries a `settings` bag (`groups.settings`, added in Phase 0):
`logo`, `language`, `timezone`, `currency`, `order_deadline`, `default_export`.
Unset fields **inherit** from the global defaults via
`effectiveGroupSettings()` ([groupOptions.ts](../src/lib/groupOptions.ts)).

### 2. Two creation modes (§6)
[GroupForm.tsx](../src/components/groups/GroupForm.tsx) now has a
**Standard / Erweiterte Einrichtung** switch:
- **Standard** – only name + description + colour; all other settings inherit
  from the global defaults.
- **Erweiterte Einrichtung** – configure logo, language, timezone, currency,
  order deadline, default export format, and the parent group up front.

When editing a group that already has overrides, the form opens in advanced mode
automatically.

### 3. Global default settings / Systemeinstellungen (§7)
A superuser **⚙ Systemeinstellungen** dialog
([SystemSettingsForm.tsx](../src/components/groups/SystemSettingsForm.tsx))
edits the global defaults (`settingsService.getAppSettings` /
`updateAppSettings`, stored under the `app_defaults` key). New groups inherit
these; existing groups keep their own settings.

Defaults: `default_color`, `default_language`, `default_timezone`,
`default_currency`, `default_order_deadline`, `default_export`, `default_theme`.

### 4. Group lifecycle actions (§5)
Each group card exposes **Bearbeiten · Klonen · Export · Archivieren · Löschen**:
- **Archivieren / Wiederherstellen** – soft-hide a group (`groups.archived`)
  without deleting it. Archived groups are hidden behind a toggle.
- **Klonen** – copy a group's configuration (name " (Kopie)", description,
  colour, settings, parent) into a new independent group.
- **Export** – download a portable JSON snapshot (`GroupExport`) of the group's
  config + meal plans.
- **Importieren** (header) – recreate a group from an exported JSON file
  (validated by `groupExportSchema`).

### 5. Group hierarchy (§4)
`groups.parent_group` (added in Phase 0) is now editable. Groups can be nested
(Unternehmen → Werk → Abteilung). Cycles are prevented client-side by
`wouldCreateCycle()`, and the card shows an ancestry breadcrumb. The data model
fully supports nesting; deeper hierarchy UI can be layered on later.

### 6. Audit logging (Phase 0 integration, §13)
Group create / update / delete / archive / clone / export / import all write
audit entries via `auditService` (wired in [useGroups.ts](../src/hooks/useGroups.ts)).

## Files

| File | Change |
|------|--------|
| `src/lib/groupOptions.ts` | **New** – option catalogs + `effectiveGroupSettings`, `wouldCreateCycle`, `groupAncestry`. |
| `src/components/groups/SystemSettingsForm.tsx` | **New** – global defaults editor. |
| `src/components/groups/GroupForm.tsx` | Two modes + advanced settings + parent select. |
| `src/components/groups/GroupManagement.tsx` | Actions menu, import/export, system settings, archived toggle, hierarchy display. |
| `src/services/groupService.ts` | `setArchived`, `setParent`, `clone`, `exportGroup`, `importGroup`; create/update persist new fields. |
| `src/hooks/useGroups.ts` | New action wrappers + audit logging. |
| `src/lib/validation.ts` | `groupSettingsSchema`, extended `groupSchema`, `appSettingsSchema`, `groupExportSchema`. |
| `src/types/index.ts` | `Group.parent_group`, `GroupExport`. |
| `src/styles/forms.css`, `cards.css` | Styles for mode switch, 2-col grid, breadcrumb, logo, toggle. |
| `src/__tests__/groupOptions.test.ts` | **New** – 10 tests (inheritance, cycle detection, ancestry, export schema). |

## New data surface

No new collections. Fields used (all added in Phase 0, now populated):
`groups.settings` (json), `groups.parent_group` (text), `groups.archived` (bool),
plus the `app_defaults` document in the existing `settings` collection.

## Not yet included (deferred by design)
Mail-sender / PDF-logo / QR-code configuration (§5) need file storage + external
integrations and are scheduled for Phase 4. The `settings` bag already has room
for them.

## Verification
- `npx tsc -b` — clean.
- `npx vitest run` — **50 tests pass** (10 new).
- `npm run build` — succeeds.
- Lint — unchanged at 15 pre-existing problems; **no new violations** (all Phase 1
  files lint clean).
