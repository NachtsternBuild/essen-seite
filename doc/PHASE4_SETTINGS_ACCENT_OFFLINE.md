# Phase 4 – Settings area, Accent colours & Offline foundation

Completes the professionalisation roadmap: a real settings area (§16), custom
theme accent colours (§17, theme modes were done earlier), an audit-log viewer
(§13/§16), and the offline foundation (§19). Additive and backward-compatible.

## Theme accent colours (§17)
`theme.css` now derives `--accent-hover` and `--accent-light` from `--accent`
via `color-mix`, so a custom accent (and dark mode) adapt automatically without
per-theme overrides. `ThemeContext` gained `accent` / `setAccent`, persisted in
`localStorage` and applied to the document root; the pre-paint script in
`index.html` also applies it to avoid a flash. Presets + a custom colour picker
live in the settings Appearance tab. Reset returns to the default accent.

## Settings area (§16)
New **⚙️ Einstellungen** nav entry (all users) →
[Settings.tsx](../src/components/settings/Settings.tsx), a tabbed area:
- **Darstellung** – theme mode (Hell / Dunkel / System) + accent colour.
- **Benachrichtigungen** – real desktop-notification opt-in (requests the
  browser Notification permission; preference stored via
  [preferences.ts](../src/lib/preferences.ts)). Wired into `useNotifications`,
  which now raises a browser notification for newly-arrived unread items
  (suppressed on first load).
- **Protokoll** – the audit-log viewer, shown only with `VIEW_AUDIT_LOG`.
- **System** – app/role info + permission-gated quick links.

## Audit-log viewer (§13/§16)
[useAuditLog](../src/hooks/useAuditLog.ts) + [AuditLogPanel](../src/components/settings/AuditLogPanel.tsx)
render the Phase 0 `audit_logs` trail (time / user / action / object).
Superuser-only, enforced by the existing PocketBase rules.

## Offline foundation (§19)
- [useOnlineStatus](../src/hooks/useOnlineStatus.ts) – tracks real connectivity
  via `online`/`offline` events; the sidebar connection badge now reflects it.
- [offlineQueue.ts](../src/lib/offlineQueue.ts) – a storage-agnostic write queue.
  `flushQueue` replays queued mutations in chronological order and stops at the
  first failure to preserve causality. The pure logic is fully unit-tested via an
  in-memory backend.
- [offlineDb.ts](../src/lib/offlineDb.ts) – IndexedDB-backed `QueueStorage` with
  an automatic in-memory fallback (private mode / SSR / tests).

The queue infrastructure is deliberately not yet wired into every mutation path
(that integration is incremental and must not risk existing online flows) —
this delivers the "prepare for offline" scope of §19.

## Files

| File | Change |
|------|--------|
| `src/lib/accent.ts` | **New** – accent presets. |
| `src/lib/preferences.ts` | **New** – typed localStorage preferences. |
| `src/lib/offlineQueue.ts`, `offlineDb.ts` | **New** – offline write queue + IndexedDB storage. |
| `src/hooks/useOnlineStatus.ts`, `useAuditLog.ts` | **New** hooks. |
| `src/components/settings/Settings.tsx`, `AuditLogPanel.tsx` | **New** – settings area + audit viewer. |
| `src/context/ThemeContext.tsx` | Accent state + apply. |
| `src/styles/theme.css` | Accent derived via `color-mix`. |
| `src/styles/settings.css` | **New** – settings styling. |
| `index.html` | Pre-paint accent apply (+ earlier FOUC/`lang` fix). |
| `src/hooks/useNotifications.ts` | Desktop-notification display (opt-in). |
| `src/App.tsx` | Einstellungen nav + view; connection badge uses real online status. |
| `src/types/index.ts` | `ViewType` += `settings`. |
| `src/__tests__/offlineQueue.test.ts` | **New** – 4 tests. |

## New data surface
**None.** Phase 4 is entirely client-side (theme/accent/preferences in
localStorage, offline queue in IndexedDB) and reuses the Phase 0 `audit_logs`.

## Verification
- `npx tsc -b` — clean.
- `npx vitest run` — **68 tests pass** (4 new).
- `npm run build` — succeeds.
- Lint — 20 (baseline 19); the +1 is a `set-state-in-effect` in `useAuditLog`,
  identical to every other data-loading hook. 0 warnings.

## Remaining / deferred
Full offline mutation interception + auto-sync wiring, and the deferred §5 items
(mail sender / PDF logo / QR code — need file storage). The lint-config cleanup
(pervasive `set-state-in-effect` house pattern) is a codebase-wide follow-up.
