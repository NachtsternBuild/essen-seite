# Graph Report - essen-seite  (2026-07-02)

## Corpus Check
- 119 files · ~81,486 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 820 nodes · 1471 edges · 89 communities (42 shown, 47 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0bcb2b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Group Management UI|Group Management UI]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Hooks & PocketBase Core|Hooks & PocketBase Core]]
- [[_COMMUNITY_Order Summary & Utils|Order Summary & Utils]]
- [[_COMMUNITY_Graphify Skill Docs|Graphify Skill Docs]]
- [[_COMMUNITY_App Shell & Navigation|App Shell & Navigation]]
- [[_COMMUNITY_Meal Form & Cards|Meal Form & Cards]]
- [[_COMMUNITY_Theme & Auth Context|Theme & Auth Context]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_Deployment & Doc Assets|Deployment & Doc Assets]]
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_Maintenance UI Screenshots|Maintenance UI Screenshots]]
- [[_COMMUNITY_Login Screens|Login Screens]]
- [[_COMMUNITY_TS Root Config|TS Root Config]]
- [[_COMMUNITY_Meal Card Views|Meal Card Views]]
- [[_COMMUNITY_Navigation Bar UI|Navigation Bar UI]]
- [[_COMMUNITY_Server Status Views|Server Status Views]]
- [[_COMMUNITY_Migrations Schema|Migrations Schema]]
- [[_COMMUNITY_Static Assets|Static Assets]]
- [[_COMMUNITY_FalkorDB Export|FalkorDB Export]]
- [[_COMMUNITY_Day Card View|Day Card View]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

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
- 1-file cycle: `src/lib/pocketbase.ts -> src/lib/pocketbase.ts`

## Communities (89 total, 47 thin omitted)

### Community 0 - "Group Management UI"
Cohesion: 0.18
Nodes (15): FormMode, GROUP_COLORS, GROUP_COLORS, SystemSettingsFormProps, THEME_OPTIONS, CURRENCY_OPTIONS, effectiveGroupSettings(), EXPORT_FORMAT_OPTIONS (+7 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, crypto-js, js-sha256, jspdf, jspdf-autotable, pocketbase, react, react-dom (+32 more)

### Community 2 - "Hooks & PocketBase Core"
Cohesion: 0.02
Nodes (84): v0.23.1, v0.23.10, v0.23.11, v0.23.12, v0.23.2, v0.23.3, v0.23.4, v0.23.5 (+76 more)

### Community 3 - "Order Summary & Utils"
Cohesion: 0.08
Nodes (21): ACTION_ICON, PlanHistoryModal(), PlanHistoryModalProps, usePlanHistory(), COLLECTIONS, DayOfWeek, pb, BaseRepository (+13 more)

### Community 5 - "App Shell & Navigation"
Cohesion: 0.12
Nodes (16): ACTION_LABEL, AuditLogPanel(), TrashPanel(), useAuditLog(), useTrash(), describeTrashEntry(), TRASH_COLLECTION_LABEL, trashCollectionLabel() (+8 more)

### Community 6 - "Meal Form & Cards"
Cohesion: 0.14
Nodes (19): AdminPanel(), Dashboard(), focusWeek(), greeting(), planHasMeals(), todayPlanDay(), UserPanel(), BarItem (+11 more)

### Community 7 - "Theme & Auth Context"
Cohesion: 0.17
Nodes (17): DashboardProps, OrderForm(), SettingsProps, CustomSelect(), CustomSelectProps, DropdownPos, SelectOption, EMPTY_FORM (+9 more)

### Community 8 - "TypeScript App Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 9 - "Deployment & Doc Assets"
Cohesion: 0.29
Nodes (8): Order Form UI (Admin View with Wochenplanung beenden), Order Form UI (Regular User View), User Management UI (Benutzerverwaltung), Billing/Export UI (Abrechnung with TXT/CSV/PDF), Admin Role (is_admin), orders Collection (PocketBase), Superuser Role (is_superuser), users Collection (PocketBase Auth)

### Community 10 - "TypeScript Node Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 11 - "Maintenance UI Screenshots"
Cohesion: 0.29
Nodes (7): Active Week Info Banner with Time Restriction Warning, Maintenance Warning Banner - Normal User View (countdown display), Maintenance Admin Overview - Warning Banner plus Control Panel, Maintenance Control Panel - Admin Setup (Wartungssarbeitensteuerung), Active Week Full Overview - Admin view with day cards and info banner, App Start View - Unauthenticated with multi-day week overview and locked cards, Superuser Management Panel - User list with roles, token reset, and maintenance control

### Community 12 - "Login Screens"
Cohesion: 0.67
Nodes (3): Login Header - Admin User (testadm) Logged In, Login Header - Normal User (test) Logged In, Login Header - Superuser (root/Admin) Logged In

### Community 17 - "Migrations Schema"
Cohesion: 0.70
Nodes (4): ensureCollection(), ensureField(), ensureTimestamps(), findCollection()

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (24): AuthContext, AuthContextValue, AuthProvider(), useAuthContext(), GroupProvider(), PermissionContext, PermissionContextValue, PermissionProvider() (+16 more)

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
Nodes (54): AddMealForm(), AddMealFormProps, MealCard, MealCardProps, OrderFormProps, OrderSummary, OrderSummaryProps, SkeletonWeek() (+46 more)

### Community 76 - "Community 76"
Cohesion: 0.23
Nodes (12): getQueueStorage(), indexedDbAvailable(), openDb(), tx(), flushQueue(), FlushResult, makeMutation(), memoryQueueStorage() (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (8): Deferred (by design), Files, New collections, fields & permissions, Notifications (§15), Phase 3 – Plan history, Trash UI & Notifications, Plan history / versioning (§11), Trash / Papierkorb (§12), Verification

### Community 78 - "Community 78"
Cohesion: 0.13
Nodes (14): Architecture: the new layering, Audit log (brief §13), Collections added, Fields added to existing collections, Flexible permission system (brief §2), Global app settings (`settings` collection, key `app_defaults`), How to apply the migration, New / changed source files (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.08
Nodes (29): SystemSettingsForm(), NotificationBell(), TYPE_ICON, AppearancePanel(), GroupDefaultsPanel(), Settings(), SystemPanel(), Tab (+21 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (7): Files, How statistics are computed, New data surface, Phase 2 – Dashboards & Statistics, Statistics suite (§14), Three role dashboards (§8), Verification

### Community 81 - "Community 81"
Cohesion: 0.16
Nodes (14): AppSettingsInput, createUserSchema, groupSchema, GroupSettingsInput, groupSettingsSchema, LoginInput, loginSchema, MaintenanceInput (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.11
Nodes (31): App(), MaintenancePanel(), MaintenancePanelProps, TemplateModal(), TemplateModalProps, ICONS, ToastContainer(), ToastContext (+23 more)

### Community 83 - "Community 83"
Cohesion: 0.27
Nodes (11): GroupFormProps, GroupSelector(), GroupSelectorProps, GroupContext, GroupContextValue, useGroupContext(), GroupInput, groupService (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.18
Nodes (11): GroupForm(), GroupCard(), GroupCardProps, GroupManagement(), GroupManagementProps, InputModal(), InputModalProps, Modal() (+3 more)

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (4): LoginForm(), LoginFormProps, Spinner(), SpinnerProps

### Community 86 - "Community 86"
Cohesion: 0.50
Nodes (4): Go/JSVM APIs changes, SDKs changes, v0.23.0, Web APIs changes

### Community 87 - "Community 87"
Cohesion: 0.20
Nodes (9): Audit-log viewer (§13/§16), Files, New data surface, Offline foundation (§19), Phase 4 – Settings area, Accent colours & Offline foundation, Remaining / deferred, Settings area (§16), Theme accent colours (§17) (+1 more)

## Knowledge Gaps
- **406 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+401 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pocketbase` connect `Package Dependencies` to `Order Summary & Utils`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _408 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Hooks & PocketBase Core` be split into smaller, more focused modules?**
  _Cohesion score 0.023529411764705882 - nodes in this community are weakly interconnected._
- **Should `Order Summary & Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.0782051282051282 - nodes in this community are weakly interconnected._
- **Should `App Shell & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Should `Meal Form & Cards` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._