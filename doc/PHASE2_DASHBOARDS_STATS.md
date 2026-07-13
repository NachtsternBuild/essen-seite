# Phase 2 – Dashboards & Statistics

Adds the three role dashboards (brief §8) and the statistics suite (§14) on top of
the Phase 0/1 foundation. Additive and backward-compatible — no existing view or
flow was removed; two new navigation entries were added.

## Three role dashboards (§8)
New **📊 Übersicht** nav item (now the default landing page) renders
[Dashboard.tsx](../src/components/dashboard/Dashboard.tsx), which composes
role-specific panels from data the app already holds (no extra fetching):

- **Benutzer** (everyone) – greeting, "bestellt diese Woche" (x/5), own total,
  open days, today's menu with a "bestellt" marker, quick links.
- **Gruppenadministrator** – week KPIs for the active group (orders,
  participants, revenue, top menu via `summarizeOrdersByUser`), quick links to
  Nutzer / Statistiken / Planung.
- **Superuser** – system KPIs (active vs archived groups, users, admins,
  superusers) and quick links to Gruppen / Statistiken / Nutzer.

## Statistics suite (§14)
New **📈 Statistiken** nav item, gated by the `VIEW_STATISTICS` permission
(`usePermissions().can(...)`). [Statistics.tsx](../src/components/stats/Statistics.tsx)
renders, for the active group:

- KPI tiles: total orders, revenue, active users, Ø per order.
- **Beliebteste Menüs**, **Bestellungen pro Tag**, **Ernährung**
  (vegetarian / vegan / other with %), **Allergene**, **Verlauf** (orders per
  calendar week).
- **Gruppenvergleich** (superuser only) – orders/revenue per group across the
  whole system.
- **Export**: download the snapshot as CSV or JSON ("Exportstatistiken").

Charts are a dependency-free [BarList](../src/components/shared/BarList.tsx) (CSS
bars) + [StatCard](../src/components/shared/StatCard.tsx) — no chart library, so
the bundle stays lean.

## How statistics are computed
Orders store only `meal_number/name/price/day`, so diet and allergen data are
recovered by joining each order to its plan's `MealItem` (day-specific lookup) in
the pure [`computeStatistics`](../src/lib/statistics.ts). All aggregation
(KPIs, popular meals, orders/day, diet, allergens, weekly trend) lives there and
is fully unit-tested.

## Files

| File | Change |
|------|--------|
| `src/lib/statistics.ts` | **New** – `computeStatistics`, `summarizeOrdersByUser`. |
| `src/services/statisticsService.ts` | **New** – per-group stats, group comparison, CSV/JSON export. |
| `src/hooks/useStatistics.ts` | **New** – loads group stats (+ comparison for superuser). |
| `src/components/stats/Statistics.tsx` | **New** – statistics view. |
| `src/components/dashboard/Dashboard.tsx` | **New** – 3 role dashboards. |
| `src/components/shared/StatCard.tsx`, `BarList.tsx` | **New** – reusable KPI tile + bar chart. |
| `src/services/orderService.ts` | `getAllOrders()` for system-wide stats. |
| `src/App.tsx` | "Übersicht" + "Statistiken" nav, default view = dashboard, renders both views. |
| `src/types/index.ts` | `Statistics`, `DietStat`, `AllergenStat`, `TrendPoint`, `GroupComparisonRow`, `OrdersSummary`; `ViewType` += `dashboard`. |
| `src/styles/stats.css` (+ `base.css` badge) | Styles for KPI tiles, bars, dashboard. |
| `src/__tests__/statistics.test.ts` | **New** – 8 tests. |

## New data surface
**No new collections or fields.** Statistics are derived entirely from existing
`orders` + `meal_plans` data. Reads only; the only new query is
`getAllOrders()` (superuser-scoped by existing PB rules).

## Verification
- `npx tsc -b` — clean.
- `npx vitest run` — **58 tests pass** (8 new).
- `npm run build` — succeeds.
- Lint — 16 problems (baseline 15); the single net-new is a `set-state-in-effect`
  in `useStatistics`, identical to the accepted pattern in `useGroups`/`useOrders`.
