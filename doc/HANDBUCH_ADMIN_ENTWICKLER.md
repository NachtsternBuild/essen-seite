# Essensplaner – Handbuch für Admins & Entwickler

Technische Dokumentation zu Architektur, Datenbank-Setup, Schema, Rechtemodell
und Betrieb. Für die Endnutzer-Sicht siehe [BENUTZERHANDBUCH.md](./BENUTZERHANDBUCH.md);
für eine frische Server-Installation siehe [QUICKSTART_SERVER.md](./QUICKSTART_SERVER.md).

---

## Inhaltsverzeichnis

1. [Technologie-Stack & Architektur](#1-technologie-stack--architektur)
2. [Projektstruktur](#2-projektstruktur)
3. [Datenbank-Setup (PocketBase)](#3-datenbank-setup-pocketbase)
4. [Prüfergebnis: erstellt `setup_collections.js` das Schema korrekt?](#4-prüfergebnis-erstellt-setup_collectionsjs-das-schema-korrekt)
5. [Vollständiges Schema – Collections & Felder](#5-vollständiges-schema--collections--felder)
6. [API-Regeln & Zugriffsmodell](#6-api-regeln--zugriffsmodell)
7. [Rechte- und Rollenmodell](#7-rechte--und-rollenmodell)
8. [`settings`-Schlüssel](#8-settings-schlüssel)
9. [Entwickler-Workflow](#9-entwickler-workflow)
10. [Betrieb: Superuser, Backups, Wartung](#10-betrieb-superuser-backups-wartung)
11. [Bekannte Stolperfallen & offene Punkte](#11-bekannte-stolperfallen--offene-punkte)

---

## 1. Technologie-Stack & Architektur

| Schicht | Technologie |
|---------|-------------|
| Frontend | **React 19** + **TypeScript**, Build mit **Vite 7** |
| Styling | Handgeschriebenes CSS mit Design-Tokens (`src/styles/`) |
| Backend | **PocketBase** (Single-Binary, SQLite) – Auth, DB, API-Regeln |
| Validierung | **zod** |
| Export | **jspdf** + **jspdf-autotable** (PDF-Export) |
| Tests | **vitest** + Testing Library |

**Architekturprinzip (Schichten):**

```
Komponenten (src/components)          ← UI
   │  benutzen
Hooks (src/hooks)                     ← Zustands- & Ladelogik (useMeals, useOrders, …)
   │  rufen
Services (src/services)               ← fachliche Operationen (mealService, orderService, …)
   │  über
Repositories (src/repositories)       ← generischer PocketBase-CRUD-Zugriff
   │  gegen
PocketBase-Client (src/lib/pocketbase.ts)
```

- **Contexts** (`src/context`) liefern Querschnittsdaten: Auth, aktive Gruppe,
  Berechtigungen, Theme, Toasts.
- **`src/lib`** enthält reine Hilfsfunktionen (Preise, Statistik, Validierung,
  Berechtigungen, Offline-Queue).
- Der PocketBase-Client verwendet im **Dev-Modus** `http://127.0.0.1:8090`, im
  **Produktions-Build** `undefined` = **Same-Origin** (siehe
  `src/lib/pocketbase.ts`). Das ist der Grund, warum in Produktion App und API
  bequem hinter **einer** Domain liegen können (siehe Server-Quickstart).
- Es werden **keine** PocketBase-Realtime-Subscriptions verwendet; die App lädt
  Daten bei Bedarf neu. Für ein Reverse-Proxy-Setup ist daher kein SSE-Tuning
  nötig.

---

## 2. Projektstruktur

```
src/
  components/     UI-Komponenten (Dashboard, WeekView, OrderForm, Settings, …)
  context/        React-Contexts (Auth, Group, Permission, Theme, Toast)
  hooks/          Daten-Hooks (useMeals, useOrders, useUsers, useGroups, …)
  services/       Fachservices (meal, order, group, user, auth, audit, …)
  repositories/   Generischer BaseRepository-CRUD
  lib/            Utilities (utils, statistics, validation, permissions, …)
  styles/         CSS (theme, base, cards, buttons, forms, stats, …)
  types/          Zentrale TypeScript-Typen
  __tests__/      Unit-Tests
migrations/
  setup_collections.js   ← DIE maßgebliche Schema-Datei (Quelle der Wahrheit)
  README.md              ← ausführliche Schema-/Setup-Referenz
pb_migrations/           ← was PocketBase tatsächlich beim Start ausführt
pocketbase               ← PocketBase-Binary
pb_data/                 ← Live-Datenbank (SQLite) + generierte types.d.ts
```

---

## 3. Datenbank-Setup (PocketBase)

Das gesamte Schema wird **deklarativ** durch **eine** Migrationsdatei angelegt:
`migrations/setup_collections.js`. Sie ist **idempotent**:

- Collections/Felder werden nur angelegt, wenn sie fehlen.
- **Alle API-Regeln** werden bei jedem Lauf neu auf den korrekten Wert gesetzt.
- Fehlende `created`/`updated`-Zeitstempel werden nachgerüstet (PocketBase ≥ 0.23
  legt sie nicht mehr automatisch an).
- Die Down-Migration ist bewusst ein No-Op.

**Fresh Install (Kurzfassung):**

```bash
mkdir -p pb_migrations
cp migrations/setup_collections.js pb_migrations/
./pocketbase serve            # führt die Migration beim Start einmalig aus
```

Details, manuelle Admin-UI-Regeln und die Historie älterer Migrationen stehen in
[`migrations/README.md`](../migrations/README.md).

> **Wichtig:** Bei einer Neuinstallation **nur** `setup_collections.js` nach
> `pb_migrations/` kopieren – nicht zusätzlich die alten nummerierten
> Migrationen. Sonst werden Collections doppelt angelegt und der Lauf schlägt fehl.

---

## 4. Prüfergebnis: erstellt `setup_collections.js` das Schema korrekt?

**Ja – für eine Neuinstallation legt `migrations/setup_collections.js` das
komplette Layout mit allen Regeln korrekt an.** Gegen die laufende Datenbank
verifiziert (`pb_data/data.db`, `_collections`):

- ✅ Alle **11 App-Collections** existieren:
  `groups`, `group_memberships`, `meal_plans`, `orders`, `shared_plans`,
  `settings`, `roles`, `audit_logs`, `trash`, `plan_history`, `notifications`
  (dazu die PocketBase-Systemcollections `users`, `_superusers`, `_authOrigins`,
  `_externalAuths`, `_mfas`, `_otps`).
- ✅ Die **API-Regeln** der Schlüssel-Collections (`users`, `groups`,
  `meal_plans`, `orders`) stimmen mit dem Skript überein.
- ✅ `roles` hat den erwarteten **Unique-Index** auf `slug`,
  `notifications` den Index auf `user`.

**Zwei kleine Abweichungen zwischen „Skript" und „Live-DB" – kein Fehler, aber
wissenswert:**

1. Die Live-DB enthält zwei zusätzliche, **über die Admin-UI erzeugte**
   nummerierte Migrationen:
   - `pb_migrations/1782990023_updated_orders.js` – verfeinert die
     `orders`-`update`/`delete`-Regel von `user.id = @request.auth.id` zu
     `user = @request.auth.id` (funktional gleichwertig in PocketBase).
   - `pb_migrations/1782993933_updated_users.js` – setzt die `users`-**`manageRule`**
     (`is_superuser || is_admin`), damit Admins/Superuser Passwörter zurücksetzen
     können, **ohne** das alte Passwort anzugeben.
2. Die **Kopie** in `pb_migrations/setup_collections.js` ist etwas **älter** als
   die kanonische `migrations/setup_collections.js`: In der kanonischen Datei ist
   die `manageRule` bereits **inline** enthalten (Zeilen 99–110), in der
   pb_migrations-Kopie noch nicht – dort kommt sie über die nummerierte Migration
   `1782993933`.

**Konsequenz für Fresh Installs:** Wer die **kanonische**
`migrations/setup_collections.js` verwendet, bekommt die `manageRule` inline und
ein voll funktionsfähiges Schema. Die Orders-Regel-Variante `user.id = …` ist
gleichwertig zu `user = …`.

**Empfehlung (Aufräumen, optional):**
- Die veraltete Kopie `pb_migrations/setup_collections.js` durch die kanonische
  Version ersetzen, damit beide Dateien identisch sind.
- Die beiden Admin-UI-Verfeinerungen (`orders`-Regel, `users.manageRule`) sind in
  der kanonischen Datei bereits abgedeckt bzw. gleichwertig – die nummerierten
  Migrationen können nach erfolgreichem Lauf im Repo bleiben (Historie) oder für
  Fresh Installs weggelassen werden.

> **Bekannte Einschränkung der Idempotenz:** Trifft `ensureCollection` auf eine
> **bereits existierende** Collection, werden nur deren **Regeln** neu gesetzt –
> **fehlende Felder** aus `def.fields` werden dann **nicht** ergänzt (Ausnahme:
> `groups`, das explizite `ensureField`-Backstops besitzt). Bei einem echten
> Fresh Install ist das irrelevant, weil die Felder mit der Collection zusammen
> entstehen. Wer nachträglich ein Feld zu einer **bestehenden** Nicht-`groups`-
> Collection hinzufügt, sollte einen expliziten `ensureField`-Backstop ergänzen
> oder das Feld einmalig über die Admin-UI anlegen.

---

## 5. Vollständiges Schema – Collections & Felder

Maßgeblich ist der Code in `migrations/setup_collections.js`; die folgende
Tabelle erklärt **wofür** die Felder da sind.

### `users` (Auth-Collection, erweitert)

| Feld | Typ | Zweck |
|------|-----|-------|
| `name`, `email`, `password` | (Standard-Auth) | Anmeldedaten |
| `is_admin` | bool | Gruppen-Administrator |
| `is_superuser` | bool | Vollzugriff, gruppenübergreifend |
| `info` | text (max 100) | Freitext-Zusatz zum Nutzer |
| `group_id` | text | **primäre Gruppe** – Basis der Zugriffsprüfungen (s. u.) |
| `role` | relation → `roles` | optionale primäre Rechtequelle; sonst Fallback auf `is_admin`/`is_superuser` |

### `groups`

| Feld | Typ | Zweck |
|------|-----|-------|
| `name` | text (req, max 60) | Gruppenname |
| `description` | text (max 200) | Beschreibung |
| `color` | text | Hex-Farbe für UI-Kennzeichnung |
| `archived` | bool | Soft-Archiv (ausgeblendet statt gelöscht) |
| `linked_group` | text | ID einer Gruppe, deren Plan mitgenutzt wird (Text, keine Relation – PocketBase verbietet Selbstreferenzen) |
| `settings` | json | Pro-Gruppe: Logo, Sprache, Zeitzone, Währung, Bestellschluss, Export-Standard |
| `parent_group` | text | optionale Hierarchie (Text, keine Relation) |

### `group_memberships`

| Feld | Typ | Zweck |
|------|-----|-------|
| `group` | relation → `groups` | Gruppe |
| `user` | relation → `users` | Nutzer |
| `role` | select `admin`\|`member` | Kennzeichnung Gruppen-Admin vs. Mitglied |

> `group_memberships` dient primär der **Admin-Kennzeichnung**. Die
> Zugriffsprüfung der API-Regeln läuft aus Zuverlässigkeitsgründen über
> `users.group_id` (siehe [Abschnitt 6](#6-api-regeln--zugriffsmodell)).

### `meal_plans`

| Feld | Typ | Zweck |
|------|-----|-------|
| `group` | relation → `groups` | Besitzergruppe |
| `year` | number | Jahr |
| `week_number` | number | Kalenderwoche |
| `status` | select `upcoming`\|`current`\|`archived` | Wochenstatus |
| `meals` | json (`DayMeals`) | Menü je Tag (siehe Meal-Struktur unten) |
| `synced_from` | text | Quell-Plan-ID bei geteiltem Plan (Text, keine Relation) |
| `sync_mode` | select `copy`\|`sync` | Übernahme-Modus |

**`meals`-JSON (`DayMeals` → `MealItem[]` je Tag):**

```jsonc
{
  "Montag": [
    {
      "number": "1",          // Anzeige-Nummer
      "name": "Spaghetti Bolognese",
      "price": 4.90,
      "vegetarian": false,    // optional
      "vegan": false,         // optional
      "allergens": ["A","C"], // optional
      "additives": ["1","2"], // optional
      "description": "…"      // optional, aufklappbar
    }
  ],
  "Dienstag": [ /* … */ ]
}
```

### `orders`

| Feld | Typ | Zweck |
|------|-----|-------|
| `meal_plan` | relation → `meal_plans` (cascade) | zugehöriger Plan |
| `group` | relation → `groups` | Gruppe (für Zugriffsprüfung) |
| `user` | relation → `users` | Besteller |
| `user_name` | text | denormalisierter Name (für Anzeige/Export) |
| `user_info` | text | Zusatz aus `users.info` |
| `day` | select Montag…Freitag | Tag |
| `meal_number`, `meal_name`, `meal_price` | text/text/number | gewähltes Gericht (denormalisiert) |
| `edited` | bool | wurde nach Erstellung geändert |

### `shared_plans` (Vorlagen)

`source_plan`, `source_group`, `source_group_name`, `shared_by`,
`shared_by_name`, `name`, `description`, `week_label`, `meals` (json). Speichert
wiederverwendbare Menüvorlagen, die Admins veröffentlichen und übernehmen können.

### `settings` (Key-Value)

`key` (text), `value` (json). Globale Systemwerte – siehe
[Abschnitt 8](#8-settings-schlüssel).

### `roles`

`name`, `slug` (unique), `description`, `permissions` (json: Liste von
Permission-Keys), `is_system` (bool), `group` (text, optional; leer = global).

### `audit_logs`

`user`, `user_name`, `action`
(`login`/`logout`/`create`/`update`/`delete`/`restore`/`import`/`export`/`permission_change`/`group_create`),
`entity_type`, `entity_id`, `group`, `details` (json). Append-only.

### `trash`

`collection_name`, `record_id`, `data` (JSON-Snapshot), `deleted_by`,
`deleted_by_name`, `group`. Ermöglicht Wiederherstellung gelöschter Datensätze.

### `plan_history`

`meal_plan` (cascade), `group`, `user`, `user_name`, `action`
(`created`/`meal_added`/`meal_removed`/`meals_updated`/`status_changed`), `day`,
`summary`, `before` (json), `after` (json). Änderungshistorie je Plan.

### `notifications`

`user` (Empfänger, cascade), `group`, `type`
(`order_deadline`/`new_week`/`plan_changed`/`new_group`/`admin_message`/`system`),
`title`, `message`, `read` (bool).

---

## 6. API-Regeln & Zugriffsmodell

Die Regeln stehen 1:1 in `migrations/setup_collections.js`; die Prosafassung mit
kopierbaren Regel-Strings in [`migrations/README.md` §5–6](../migrations/README.md).
Zentrale Punkte:

- **Gruppen-Scoping über `users.group_id`**, **nicht** über
  `@collection.group_memberships`. Grund: Auf einer leeren DB existiert
  `group_memberships` beim Anlegen von `groups` (wird zuerst erstellt) noch
  nicht, und `=` auf einem Mehrfach-Join ist unzuverlässig (führte früher dazu,
  dass Bestellungen nach Reload „verschwanden", obwohl sie gespeichert waren).
  Damit das greift, setzt die App bei `addMember`/`moveMember` automatisch das
  `group_id` des Nutzers.
- **`meal_plans`** sind für **jeden authentifizierten Nutzer** lesbar (nötig für
  geteilte Pläne); Änderungen nur durch Superuser oder Gruppen-Admin der
  besitzenden Gruppe.
- **`orders`**: Lesen/Erstellen für Gruppenmitglieder; eigene Bestellungen
  änder-/löschbar; Gruppen-Admins verwalten alle Bestellungen ihrer Gruppe.
- **`users.manageRule`** (`is_superuser || is_admin`): erlaubt Admins/Superusern,
  Nutzer zu verwalten (z. B. Passwort-Reset) ohne das alte Passwort.
- **`audit_logs`/`plan_history`**: von jedem authentifizierten Nutzer
  **beschreibbar** (append-only), aber nur von Superusern lesbar/löschbar bzw.
  gruppenweit für `plan_history`.

> ⚠️ **Feldweise Einschränkung nicht per DB-Regel:** Die `users`-`updateRule`
> erlaubt Admins Updates an fremden Nutzern (u. a. `group_id`-Reassignment). Dass
> Admins **nicht** die Flags `is_admin`/`is_superuser` fremder Konten ändern, wird
> in der **App-Logik** sichergestellt – eine PocketBase-Regel kann nicht einzelne
> Felder unterscheiden. Bei einer eigenen API-Anbindung ist das zu beachten.

---

## 7. Rechte- und Rollenmodell

Definiert in `src/lib/permissions.ts`.

**20 Permission-Keys**, gruppiert:

- **Benutzer:** `VIEW_USERS`, `CREATE_USERS`, `EDIT_USERS`, `DELETE_USERS`
- **Essenspläne:** `VIEW_MEALS`, `EDIT_MEALS`, `DELETE_MEALS`, `MANAGE_TEMPLATES`
- **Bestellungen:** `PLACE_ORDERS`, `VIEW_ORDERS`
- **Daten:** `EXPORT_DATA`, `IMPORT_DATA`, `VIEW_STATISTICS`
- **Gruppen:** `CREATE_GROUPS`, `EDIT_GROUPS`, `DELETE_GROUPS`
- **System:** `MANAGE_PERMISSIONS`, `VIEW_AUDIT_LOG`, `MANAGE_TRASH`, `SYSTEM_SETTINGS`

**Auflösung der effektiven Rechte (`resolvePermissions`), erster Treffer gewinnt:**

1. **Superuser** → **alle** Rechte.
2. Ein explizit zugewiesenes DB-**`role`** → dessen Permission-Liste.
3. Sonst Fallback auf die Flags:
   - `is_admin = true` → **Gruppenadministrator**-Set
   - sonst → **Benutzer**-Set (`VIEW_MEALS`, `PLACE_ORDERS`)

**Standardrollen-Sets:**

| Rolle | Rechte |
|-------|--------|
| **Benutzer** | `VIEW_MEALS`, `PLACE_ORDERS` |
| **Gruppenadministrator** | Benutzer-Set + `VIEW_USERS`, `CREATE_USERS`, `EDIT_USERS`, `DELETE_USERS`, `EDIT_MEALS`, `DELETE_MEALS`, `MANAGE_TEMPLATES`, `VIEW_ORDERS`, `EXPORT_DATA`, `IMPORT_DATA`, `VIEW_STATISTICS` |
| **Superuser** | **alle** Permission-Keys |

> Beachte: `MANAGE_TRASH`, `VIEW_AUDIT_LOG`, `SYSTEM_SETTINGS`,
> `MANAGE_PERMISSIONS`, `CREATE_/EDIT_/DELETE_GROUPS` sind standardmäßig **nur**
> beim Superuser. Deshalb sehen z. B. den Menüpunkt **Papierkorb** oder das
> **Protokoll** per Default nur Superuser – es sei denn, eine **eigene Rolle**
> vergibt das jeweilige Recht.

Wichtig zur Konsistenz: Die `Permission`-Union in `src/types/index.ts` und der
`PERMISSION_CATALOG` in `src/lib/permissions.ts` müssen synchron bleiben.

---

## 8. `settings`-Schlüssel

Die `settings`-Collection ist ein globaler Key-Value-Speicher (lesen: alle
Angemeldeten; schreiben: nur Superuser). Bekannte Schlüssel:

| `key` | Inhalt |
|-------|--------|
| `app_defaults` | Globale Standardwerte für **neue Gruppen** (Sprache, Zeitzone, Währung, Bestellschluss, Export-Standard). Pflege: **Einstellungen → Gruppen-Standards**. |
| `maintenance` | Wartungsmodus (`active`, `start_time`, `duration`, `message`). Pflege: **Nutzer → Wartungssteuerung** (nur Superuser). Aktiv → Banner für alle. |
| `statistics_enabled` | Systemweiter Schalter für den Menüpunkt **Statistiken**. Pflege: **Einstellungen → System** (nur Superuser). |

---

## 9. Entwickler-Workflow

**Voraussetzungen:** Node.js ≥ 20, PocketBase ≥ 0.22 (getestet 0.26.8).

```bash
npm install            # Abhängigkeiten
npm run dev            # Vite-Dev-Server (http://localhost:5173)
# Parallel PocketBase starten:
./pocketbase serve     # http://127.0.0.1:8090  (+ Admin-UI unter /_/ )

npm run build          # Typecheck (tsc -b) + Produktions-Build nach dist/
npm run preview        # Produktions-Build lokal ansehen
npm run lint           # ESLint
npm test               # vitest (Unit-Tests)
npm run test:coverage  # Coverage-Report
```

**Qualitätsstand (Referenz):** `tsc`, `vite build` und die Test-Suite laufen
sauber durch. ESLint meldet aktuell einige Hinweise der **strengen React-19-
Regeln** (`react-hooks/set-state-in-effect` beim „Laden-beim-Mounten"-Muster,
`react-refresh/only-export-components` in Context-Dateien) – **keine** Logik-,
Laufzeit- oder Compile-Fehler.

**Knowledge Graph (graphify):** Das Projekt pflegt einen Wissensgraphen unter
`graphify-out/`. Für Codebasis-Fragen zuerst `graphify query "<Frage>"` nutzen;
nach Codeänderungen `graphify update .` ausführen (siehe `CLAUDE.md`).

---

## 10. Betrieb: Superuser, Backups, Wartung

### Ersten Superuser anlegen

Der erste App-Nutzer muss über die **PocketBase-Admin-UI** angelegt werden
(die App erlaubt das Anlegen nur Superusern):

**Admin-UI → Collections → `users` → „+ New record"** mit
`is_admin = true` und `is_superuser = true`.

> Der **PocketBase-Superadmin** (Login des Admin-Panels `/_/`) ist etwas anderes
> als der App-**Superuser** (ein `users`-Datensatz mit `is_superuser = true`).

### Erste Gruppe & Zuweisung

1. Als Superuser in der App **Gruppen → „+ Neue Gruppe"**.
2. **Nutzer** anlegen und der Gruppe zuweisen (setzt `group_id`).
3. Optional in `group_memberships` einen Eintrag mit `role = admin` für
   Gruppen-Admins pflegen.

### Backups

PocketBase legt alle Daten in **`pb_data/`** (SQLite + Uploads) ab.

- **Einfachstes Backup:** `pb_data/` bei gestopptem Dienst kopieren, oder
  regelmäßig snapshotten.
- **Im laufenden Betrieb:** PocketBase-Admin-UI → **Settings → Backups** (erzeugt
  konsistente ZIP-Backups; auch per Cron/API automatisierbar).

### Wartungsmodus

**Nutzer → Wartungssteuerung** (Superuser): Startzeit, Dauer und optionale
Nachricht setzen und aktivieren → alle Nutzer sehen ein Wartungsbanner.

---

## 11. Bekannte Stolperfallen & offene Punkte

- **Zwei Kopien von `setup_collections.js`** (`migrations/` = kanonisch, neuer;
  `pb_migrations/` = älter). Für Deployments die kanonische Version verwenden und
  die Kopie angleichen (siehe [Abschnitt 4](#4-prüfergebnis-erstellt-setup_collectionsjs-das-schema-korrekt)).
- **`ensureCollection` ergänzt keine neuen Felder** auf bereits existierenden
  Collections (außer `groups`). Neue Felder für Bestands-DBs brauchen einen
  `ensureField`-Backstop oder einmaligen Admin-UI-Eingriff.
- **Feldweise Schreibrechte** bei `users` werden nur in der App-Logik, nicht per
  DB-Regel durchgesetzt.
- **Statistik-Button im Dashboard**: navigiert nach `stats`, auch wenn
  `statistics_enabled = false` – dann rendert die Zielansicht nichts (leer). Kein
  Datenrisiko; ggf. den Button an das Feature-Flag koppeln.
- **Legacy-Collection `meals_data`** (Einzel-Dokument-Architektur) existiert nur
  noch für Altmigrationen; für die Migration siehe
  [`migrations/README.md` §7.2](../migrations/README.md).
