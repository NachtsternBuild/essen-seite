# Graph Report - essen-seite  (2026-07-14)

## Corpus Check
- 119 files · ~81,659 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 861 nodes · 1545 edges · 90 communities (43 shown, 47 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `630d7b8f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Group Management UI
- Package Dependencies
- Hooks & PocketBase Core
- Order Summary & Utils
- Graphify Skill Docs
- App Shell & Navigation
- Meal Form & Cards
- Theme & Auth Context
- TypeScript App Config
- Deployment & Doc Assets
- TypeScript Node Config
- Maintenance UI Screenshots
- Login Screens
- TS Root Config
- Meal Card Views
- Navigation Bar UI
- Server Status Views
- Migrations Schema
- Static Assets
- FalkorDB Export
- Day Card View
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `AuthUser` - 46 edges
2. `useToastContext()` - 27 edges
3. `Group` - 21 edges
4. `compilerOptions` - 20 edges
5. `compilerOptions` - 18 edges
6. `BaseRepository` - 14 edges
7. `5. Vollständiges Datenbankschema (Referenz)` - 14 edges
8. `App()` - 13 edges
9. `Spinner()` - 13 edges
10. `OrdersByUser` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Order Form UI (Admin View with Wochenplanung beenden)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/add_order_admin.png → migrations/README.md
- `Order Form UI (Regular User View)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/add_order_menu.png → migrations/README.md
- `Billing/Export UI (Abrechnung with TXT/CSV/PDF)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/bill.png → migrations/README.md
- `User Management UI (Benutzerverwaltung)` --references--> `users Collection (PocketBase Auth)`  [INFERRED]
  doc/assets/admin_user_managment.png → migrations/README.md
- `User Management UI (Benutzerverwaltung)` --references--> `Superuser Role (is_superuser)`  [INFERRED]
  doc/assets/admin_user_managment.png → migrations/README.md

## Import Cycles
- None detected.

## Communities (90 total, 47 thin omitted)

### Community 0 - "Group Management UI"
Cohesion: 0.14
Nodes (22): FormMode, GROUP_COLORS, GroupForm(), GROUP_COLORS, SystemSettingsForm(), SystemSettingsFormProps, THEME_OPTIONS, CURRENCY_OPTIONS (+14 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.07
Nodes (29): crypto-js, js-sha256, jspdf, jspdf-autotable, dependencies, crypto-js, js-sha256, jspdf (+21 more)

### Community 2 - "Hooks & PocketBase Core"
Cohesion: 0.02
Nodes (84): v0.23.1, v0.23.10, v0.23.11, v0.23.12, v0.23.2, v0.23.3, v0.23.4, v0.23.5 (+76 more)

### Community 3 - "Order Summary & Utils"
Cohesion: 0.09
Nodes (18): ACTION_ICON, formatTime(), PlanHistoryModal(), PlanHistoryModalProps, usePlanHistory(), COLLECTIONS, DayOfWeek, pb (+10 more)

### Community 5 - "App Shell & Navigation"
Cohesion: 0.12
Nodes (20): ACTION_LABEL, AuditLogPanel(), formatTime(), EmptyState(), EmptyStateProps, formatTime(), TrashPanel(), useAuditLog() (+12 more)

### Community 6 - "Meal Form & Cards"
Cohesion: 0.11
Nodes (22): Dashboard(), DashboardProps, focusWeek(), greeting(), GroupSummary(), HeroCard(), planHasMeals(), todayPlanDay() (+14 more)

### Community 7 - "Theme & Auth Context"
Cohesion: 0.21
Nodes (12): OrderFormProps, CustomSelect(), CustomSelectProps, DropdownPos, SelectOption, EMPTY_FORM, UserManagement, UserManagementProps (+4 more)

### Community 8 - "TypeScript App Config"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, src, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly (+18 more)

### Community 9 - "Deployment & Doc Assets"
Cohesion: 0.29
Nodes (8): Order Form UI (Admin View with Wochenplanung beenden), Order Form UI (Regular User View), User Management UI (Benutzerverwaltung), Billing/Export UI (Abrechnung with TXT/CSV/PDF), Admin Role (is_admin), orders Collection (PocketBase), Superuser Role (is_superuser), users Collection (PocketBase Auth)

### Community 10 - "TypeScript Node Config"
Cohesion: 0.09
Nodes (22): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+14 more)

### Community 11 - "Maintenance UI Screenshots"
Cohesion: 0.29
Nodes (7): Active Week Info Banner with Time Restriction Warning, Maintenance Warning Banner - Normal User View (countdown display), Maintenance Admin Overview - Warning Banner plus Control Panel, Maintenance Control Panel - Admin Setup (Wartungssarbeitensteuerung), Active Week Full Overview - Admin view with day cards and info banner, App Start View - Unauthenticated with multi-day week overview and locked cards, Superuser Management Panel - User list with roles, token reset, and maintenance control

### Community 12 - "Login Screens"
Cohesion: 0.67
Nodes (3): Login Header - Admin User (testadm) Logged In, Login Header - Normal User (test) Logged In, Login Header - Superuser (root/Admin) Logged In

### Community 17 - "Migrations Schema"
Cohesion: 0.53
Nodes (5): ensureCollection(), ensureField(), ensureTimestamps(), findCollection(), NOTE: `groups` is created before `group_memberships`, so its rules must

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (25): AuthContext, AuthContextValue, AuthProvider(), useAuthContext(), GroupProvider(), PermissionContext, PermissionContextValue, PermissionProvider() (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.05
Nodes (43): 1.1 Voraussetzungen, 1.2 PocketBase starten, 1.3 Schema-Migration einspielen, 1.4 Rules erneut anwenden / auffrischen, 1. Schnellstart (aktuelles Setup), 2. Ersten Superuser anlegen, 3. Erste Gruppe anlegen, 4. App-Konfiguration (+35 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (12): 1. Per-group settings (§3, §5), 2. Two creation modes (§6), 3. Global default settings / Systemeinstellungen (§7), 4. Group lifecycle actions (§5), 5. Group hierarchy (§4), 6. Audit logging (Phase 0 integration, §13), Files, New data surface (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (6): essen-seite, Expanding the ESLint configuration, React Compiler, Setup Backend, Setup Frontend, Something to React + TypeScript + Vite

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 32 - "Community 32"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): GitHub Pages CI/CD Deployment, App Entry Point (index.html), React/TypeScript/Vite Frontend

### Community 66 - "Community 66"
Cohesion: 0.05
Nodes (66): AddMealForm(), AddMealFormProps, MealCard, MealCardProps, OrderForm(), OrderSummary, OrderSummaryProps, TemplateModal() (+58 more)

### Community 76 - "Community 76"
Cohesion: 0.19
Nodes (12): getQueueStorage(), indexedDbAvailable(), openDb(), tx(), flushQueue(), FlushResult, makeMutation(), memoryQueueStorage() (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (8): Deferred (by design), Files, New collections, fields & permissions, Notifications (§15), Phase 3 – Plan history, Trash UI & Notifications, Plan history / versioning (§11), Trash / Papierkorb (§12), Verification

### Community 78 - "Community 78"
Cohesion: 0.13
Nodes (14): Architecture: the new layering, Audit log (brief §13), Collections added, Fields added to existing collections, Flexible permission system (brief §2), Global app settings (`settings` collection, key `app_defaults`), How to apply the migration, New / changed source files (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.09
Nodes (31): formatTime(), NotificationBell(), TYPE_ICON, AppearancePanel(), GroupDefaultsPanel(), NotificationsPanel(), Settings(), SystemPanel() (+23 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): Files, How statistics are computed, New data surface, Phase 2 – Dashboards & Statistics, Statistics suite (§14), Three role dashboards (§8), Verification

### Community 81 - "Community 81"
Cohesion: 0.16
Nodes (14): AppSettingsInput, createUserSchema, groupSchema, GroupSettingsInput, groupSettingsSchema, LoginInput, loginSchema, MaintenanceInput (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.15
Nodes (21): App(), GroupManagement(), MaintenancePanel(), MaintenancePanelProps, ICONS, ToastContainer(), ToastContext, ToastContextValue (+13 more)

### Community 83 - "Community 83"
Cohesion: 0.24
Nodes (14): GroupFormProps, GroupSelector(), GroupSelectorProps, UserRowProps, GroupContext, GroupContextValue, useGroupContext(), GroupInput (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): GroupCard(), GroupCardProps, GroupManagementProps, InputModal(), InputModalProps, Modal(), ModalProps, groupExportSchema

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (4): LoginForm(), LoginFormProps, Spinner(), SpinnerProps

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (4): Go/JSVM APIs changes, SDKs changes, v0.23.0, Web APIs changes

### Community 87 - "Community 87"
Cohesion: 0.20
Nodes (9): Audit-log viewer (§13/§16), Files, New data surface, Offline foundation (§19), Phase 4 – Settings area, Accent colours & Offline foundation, Remaining / deferred, Settings area (§16), Theme accent colours (§17) (+1 more)

### Community 89 - "devDependencies"
Cohesion: 0.05
Nodes (37): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+29 more)

## Knowledge Gaps
- **408 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+403 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exportPDF()` connect `Community 66` to `Package Dependencies`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Package Dependencies` to `Community 66`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _408 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Group Management UI` be split into smaller, more focused modules?**
  _Cohesion score 0.13675213675213677 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Hooks & PocketBase Core` be split into smaller, more focused modules?**
  _Cohesion score 0.023529411764705882 - nodes in this community are weakly interconnected._
- **Should `Order Summary & Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.08739495798319327 - nodes in this community are weakly interconnected._