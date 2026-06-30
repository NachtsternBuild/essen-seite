# Graph Report - .  (2026-06-30)

## Corpus Check
- 1 files · ~53,097 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 355 nodes · 686 edges · 25 communities (17 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `AuthUser` - 27 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 18 edges
4. `useToastContext()` - 15 edges
5. `Graphify Skill` - 14 edges
6. `Group` - 11 edges
7. `MealItem` - 11 edges
8. `PocketBase Setup Guide (Multi-Group Schema)` - 11 edges
9. `App()` - 9 edges
10. `OrdersByUser` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Order Form UI (Regular User View)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/add_order_menu.png → migrations/README.md
- `Billing/Export UI (Abrechnung with TXT/CSV/PDF)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/bill.png → migrations/README.md
- `Order Form UI (Admin View with Wochenplanung beenden)` --references--> `orders Collection (PocketBase)`  [INFERRED]
  doc/assets/add_order_admin.png → migrations/README.md
- `User Management UI (Benutzerverwaltung)` --references--> `users Collection (PocketBase Auth)`  [INFERRED]
  doc/assets/admin_user_managment.png → migrations/README.md
- `User Management UI (Benutzerverwaltung)` --references--> `Superuser Role (is_superuser)`  [INFERRED]
  doc/assets/admin_user_managment.png → migrations/README.md

## Import Cycles
- 1-file cycle: `src/lib/pocketbase.ts -> src/lib/pocketbase.ts`

## Communities (25 total, 8 thin omitted)

### Community 0 - "Group Management UI"
Cohesion: 0.08
Nodes (41): GROUP_COLORS, GroupForm(), GroupFormProps, GroupCardProps, GroupManagementProps, GroupSelector(), GroupSelectorProps, LoginForm() (+33 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, crypto-js, js-sha256, jspdf, jspdf-autotable, pocketbase, react, react-dom (+32 more)

### Community 2 - "Hooks & PocketBase Core"
Cohesion: 0.10
Nodes (28): COLLECTIONS, DayOfWeek, DAYS_OF_WEEK, pb, getCurrentWeekNumber(), getCurrentYear(), maintenanceService, mealService (+20 more)

### Community 3 - "Order Summary & Utils"
Cohesion: 0.12
Nodes (19): OrderSummary, OrderSummaryProps, calculateUserTotal(), DAYS_MAP, downloadFile(), formatPrice(), initials(), isLocked() (+11 more)

### Community 4 - "Graphify Skill Docs"
Cohesion: 0.09
Nodes (26): Graphify Add URL to Corpus, Graphify Watch Mode (Auto-Rebuild), Graphify MCP Server, Neo4j Export, Wiki Export (Agent-Crawlable), Confidence Rubric (EXTRACTED/INFERRED/AMBIGUOUS), Extraction Subagent (Parallel Semantic), Cross-Repo Graph Merge (+18 more)

### Community 5 - "App Shell & Navigation"
Cohesion: 0.17
Nodes (17): App(), GroupManagement(), MaintenancePanel(), MaintenancePanelProps, ICONS, ToastContainer(), ToastContext, ToastContextValue (+9 more)

### Community 6 - "Meal Form & Cards"
Cohesion: 0.16
Nodes (16): AddMealForm(), AddMealFormProps, MealCard, MealCardProps, OrderForm(), OrderFormProps, EmptyState(), EmptyStateProps (+8 more)

### Community 7 - "Theme & Auth Context"
Cohesion: 0.13
Nodes (18): LABELS, NEXT, ThemeToggle(), AuthContext, AuthContextValue, AuthProvider(), useAuthContext(), GroupProvider() (+10 more)

### Community 8 - "TypeScript App Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 9 - "Deployment & Doc Assets"
Cohesion: 0.17
Nodes (20): GitHub Pages CI/CD Deployment, Order Form UI (Admin View with Wochenplanung beenden), Order Form UI (Regular User View), User Management UI (Benutzerverwaltung), Billing/Export UI (Abrechnung with TXT/CSV/PDF), App Entry Point (index.html), Admin Role (is_admin), group_memberships Collection (PocketBase) (+12 more)

### Community 10 - "TypeScript Node Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 11 - "Maintenance UI Screenshots"
Cohesion: 0.29
Nodes (7): Active Week Info Banner with Time Restriction Warning, Maintenance Warning Banner - Normal User View (countdown display), Maintenance Admin Overview - Warning Banner plus Control Panel, Maintenance Control Panel - Admin Setup (Wartungssarbeitensteuerung), Active Week Full Overview - Admin view with day cards and info banner, App Start View - Unauthenticated with multi-day week overview and locked cards, Superuser Management Panel - User list with roles, token reset, and maintenance control

### Community 12 - "Login Screens"
Cohesion: 0.67
Nodes (3): Login Header - Admin User (testadm) Logged In, Login Header - Normal User (test) Logged In, Login Header - Superuser (root/Admin) Logged In

## Knowledge Gaps
- **143 isolated node(s):** `SCHEMA`, `name`, `private`, `version`, `type` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pocketbase` connect `Package Dependencies` to `Hooks & PocketBase Core`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `SCHEMA`, `name`, `private` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Group Management UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07622504537205081 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Hooks & PocketBase Core` be split into smaller, more focused modules?**
  _Cohesion score 0.09581646423751687 - nodes in this community are weakly interconnected._
- **Should `Order Summary & Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `Graphify Skill Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.09230769230769231 - nodes in this community are weakly interconnected._