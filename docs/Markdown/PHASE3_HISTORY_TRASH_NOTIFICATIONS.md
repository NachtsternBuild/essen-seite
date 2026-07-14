# Phase 3 – Plan history, Trash UI & Notifications

Turns the Phase 0 trash/audit infrastructure into real features and adds plan
versioning history and a notification system (brief §11, §12, §15, plus parts of
§9). Additive and backward-compatible.

## Plan history / versioning (§11)
Every meal-plan change is now recorded in the new `plan_history` collection via
[planHistoryService](../src/services/planHistoryService.ts), wired into
[useMeals](../src/hooks/useMeals.ts) (`addMeal`, `removeMeal`, `createPlan`). Each
entry stores **who / when / what** plus before/after snapshots of the affected
day. A **🕓 Verlauf** button in the current/upcoming plan headers opens
[PlanHistoryModal](../src/components/plans/PlanHistoryModal.tsx), a read-only
timeline. Recording is best-effort — it never disrupts editing.

## Trash / Papierkorb (§12)
- **Producer**: a new **Plan löschen** action soft-deletes a meal plan into the
  trash (`useMeals.deletePlan` → `trashService.softDelete`) instead of hard
  deletion.
- **UI**: new **🗑 Papierkorb** nav entry (gated by the `MANAGE_TRASH`
  permission) renders [TrashPanel](../src/components/trash/TrashPanel.tsx):
  list, **Wiederherstellen**, **Endgültig löschen**, and **Papierkorb leeren**.
  Superusers see all entries; group admins see their own group's
  (enforced by both the hook and PocketBase rules).
- Restore is generic — any record type already routed through `softDelete`
  (plans now, more later) can be restored from here.

## Notifications (§15)
New `notifications` collection + [notificationService](../src/services/notificationService.ts)
(`notifyUser`, `notifyGroup` fan-out, `markRead`, `markAllRead`, `unreadCount`).
A **🔔 bell** in the sidebar ([NotificationBell](../src/components/notifications/NotificationBell.tsx))
shows an unread badge and a dropdown (mark read / dismiss), polling every 60 s
via [useNotifications](../src/hooks/useNotifications.ts).

Wired producers: **new_week** (on week rotation) and **plan_changed/created**
notify the whole group. The model supports `order_deadline`, `admin_message`,
`new_group`, `system` types for later wiring.

## Files

| File | Change |
|------|--------|
| `src/services/planHistoryService.ts` | **New** – record/list plan history. |
| `src/services/notificationService.ts` | **New** – per-user + group fan-out notifications. |
| `src/hooks/usePlanHistory.ts`, `useNotifications.ts`, `useTrash.ts` | **New** hooks. |
| `src/components/plans/PlanHistoryModal.tsx` | **New** – history timeline. |
| `src/components/notifications/NotificationBell.tsx` | **New** – bell + dropdown. |
| `src/components/trash/TrashPanel.tsx` | **New** – trash management. |
| `src/lib/trash.ts` | **New** – `describeTrashEntry`, `trashCollectionLabel` (tested). |
| `src/hooks/useMeals.ts` | Threads `currentUser`; records history; `deletePlan`; new-week notify. |
| `src/App.tsx` | Bell in sidebar, Papierkorb nav + view, Verlauf/Plan-löschen buttons, history modal, `useMeals(currentUser)`. |
| `src/types/index.ts` | `PlanHistoryEntry`, `Notification`, action/type unions; `ViewType` += `trash`. |
| `src/styles/phase3.css` | Styles for bell, history, trash table. |
| `migrations/setup_collections.js` + `1751299200_phase3_history_notifications.js` | Collections + rules. |
| `src/__tests__/trash.test.ts` | **New** – 6 tests. |

## New collections, fields & permissions

| Collection | Fields | Rules summary |
|-----------|--------|---------------|
| `plan_history` | meal_plan (rel), group (rel), user (rel), user_name, action (select), day, summary, before (json), after (json) | read: group members/superuser; create: authed; no update; delete: superuser |
| `notifications` | user (rel), group (rel), type (select), title, message, read (bool) | read/update/delete: recipient or superuser; create: admin/superuser |

Permissions already defined in Phase 0 are now consumed: `MANAGE_TRASH` gates the
Papierkorb. `VIEW_AUDIT_LOG` remains available for a later audit-log viewer.

## Deferred (by design)
Full shared-plan **auto-sync** propagation (§10) and granular order/group
soft-delete producers are left for a later pass; the trash UI and sync schema
fields already support them.

## Verification
- `npx tsc -b` — clean.
- `npx vitest run` — **64 tests pass** (6 new).
- `npm run build` — succeeds.
- Lint — 19 problems (baseline 15); the +3 vs Phase 2 are all `set-state-in-effect`
  in the new data-loading hooks, identical to the accepted `useGroups`/`useOrders`
  pattern. 0 warnings.
