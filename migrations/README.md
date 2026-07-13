# Essensplaner – PocketBase Setup Guide

> **TL;DR:** Für jede Neuinstallation genügt eine einzige Datei:
> **[`setup_collections.js`](./setup_collections.js)**. Sie legt alle
> Collections, Felder und API-Regeln an, die die App aktuell braucht (Stand
> Phase 0–4). Kopiere sie nach `pb_migrations/`, starte PocketBase neu, fertig
> — siehe [Abschnitt 1](#1-schnellstart-aktuelles-setup).
>
> Alles andere in diesem Dokument ist Referenz: das vollständige Schema zum
> Nachschlagen, eine Anleitung für manuelles Klicken in der Admin-UI, und ein
> historischer Anhang für ältere Installationen.

---

## Inhaltsverzeichnis

1. [Schnellstart (aktuelles Setup)](#1-schnellstart-aktuelles-setup)
2. [Ersten Superuser anlegen](#2-ersten-superuser-anlegen)
3. [Erste Gruppe anlegen](#3-erste-gruppe-anlegen)
4. [App-Konfiguration](#4-app-konfiguration)
5. [Vollständiges Datenbankschema (Referenz)](#5-vollständiges-datenbankschema-referenz)
6. [Manuelles Setup über die Admin-UI (Referenz)](#6-manuelles-setup-über-die-admin-ui-referenz)
7. [Anhang: Ältere Installationen](#7-anhang-ältere-installationen)

---

## 1. Schnellstart (aktuelles Setup)

Das ist der **einzige Weg, den du für eine Neuinstallation brauchst.**

### 1.1 Voraussetzungen

- PocketBase **≥ 0.22** (getestet mit 0.26.8) — https://pocketbase.io/docs/ → „Get started"
- Node.js ≥ 20 für die React-App
- Kein weiteres Backend nötig

### 1.2 PocketBase starten

```bash
wget https://github.com/pocketbase/pocketbase/releases/download/v0.26.8/pocketbase_0.26.8_linux_amd64.zip
unzip pocketbase_0.26.8_linux_amd64.zip
```

### 1.3 Schema-Migration einspielen

```bash
mkdir -p pb_migrations
cp migrations/setup_collections.js pb_migrations/

./pocketbase serve
# → läuft auf http://127.0.0.1:8090, Admin-UI: http://127.0.0.1:8090/_/
# Die Migration läuft beim Start automatisch einmalig durch und legt alle
# Collections, Felder und API-Regeln an.
```

Für Produktion:
```bash
./pocketbase serve --http="0.0.0.0:8090"
```

> **Wichtig:** Kopiere **nur** `setup_collections.js` nach `pb_migrations/`.
> Nicht zusätzlich die älteren, nummerierten Migrationsdateien
> (`1751284800_*`, `1751299200_*`, `1751385600_*`) — die sind bereits
> vollständig in `setup_collections.js` enthalten. Beide zusammen würden
> versuchen, dieselben Collections doppelt anzulegen und fehlschlagen.
> (Details und wann die alten Dateien stattdessen relevant sind: siehe
> [Anhang](#7-anhang-ältere-installationen).)

Beim allerersten Aufruf von `http://127.0.0.1:8090/_/` erscheint zusätzlich
noch ein Setup-Wizard für den PocketBase-**Superadmin** (E-Mail + Passwort
für das Admin-Panel selbst).

> **Hinweis:** Der PocketBase-Superadmin (Admin-Panel-Login) ist etwas anderes
> als der App-**Superuser** (ein normaler `users`-Eintrag mit
> `is_superuser = true`, siehe nächster Schritt).

### 1.4 Rules erneut anwenden / auffrischen

`setup_collections.js` ist idempotent: sie darf jederzeit erneut in
`pb_migrations/` liegen und PocketBase neu gestartet werden. Bereits
vorhandene Collections/Felder werden übersprungen, aber **alle API-Regeln
werden jedes Mal auf den aktuellen, korrekten Stand gesetzt.** Das ist der
einfachste Weg, um nach einem `git pull` sicherzugehen, dass eure laufende
PocketBase-Instanz die aktuellen Regeln hat — auch auf einer bereits
laufenden Installation.

---

## 2. Ersten Superuser anlegen

Der erste Nutzer muss manuell über das Admin-Panel angelegt werden, da die
App selbst nur Superusern das Anlegen von Nutzern erlaubt.

**Admin-UI → Collections → `users` → „+ New record"**

| Feld           | Wert                        |
|----------------|-----------------------------|
| `name`         | z. B. `Admin`               |
| `email`        | deine E-Mail-Adresse        |
| `password`     | sicheres Passwort           |
| `is_admin`     | ✓ (true)                    |
| `is_superuser` | ✓ (true)                    |
| `info`         | *(leer lassen)*             |
| `group_id`     | *(leer lassen)*             |

Anschließend kannst du dich in der App anmelden und weitere Nutzer über die
Benutzerverwaltung anlegen.

---

## 3. Erste Gruppe anlegen

Nach dem ersten Login als Superuser:

1. In der App links auf **„Gruppen"** klicken
2. **„+ Neue Gruppe"** → Name eingeben, Farbe wählen → Speichern
3. Dann unter **„Nutzer"** die gewünschten Nutzer anlegen
4. In PocketBase Admin → `group_memberships` → **„+ New record"** →
   `group` = angelegte Gruppe, `user` = der Nutzer, `role` = `member`
   (oder `admin` für Gruppenadmins)

> Alternativ kann die App-eigene Gruppenverwaltung verwendet werden, sobald
> Mitglieder-Management dort implementiert ist.

---

## 4. App-Konfiguration

### Entwicklung (lokal)

```bash
# PocketBase URL in src/lib/pocketbase.ts:
# DEV-Modus: http://127.0.0.1:8090 (bereits voreingestellt)
# PROD-Modus: wird über import.meta.env.VITE_PB_URL gesetzt

npm install
npm run dev
```

### Produktion

```bash
# .env.production (oder Umgebungsvariable im Deployment):
VITE_PB_URL=https://deine-domain.de

npm run build
# dist/ auf den Server kopieren
```

In `src/lib/pocketbase.ts` ist die URL so gesetzt:

```ts
export const pb = new PocketBase(
  import.meta.env.DEV ? 'http://127.0.0.1:8090' : undefined
);
```

Für Produktion `undefined` durch `import.meta.env.VITE_PB_URL` ersetzen,
falls die App und PocketBase auf verschiedenen Hosts laufen.

---

## 5. Vollständiges Datenbankschema (Referenz)

Dieser Abschnitt spiegelt exakt wider, was `setup_collections.js` anlegt —
maßgeblich für den aktuellen Stand. Bei Zweifeln gewinnt der Code in
`setup_collections.js`, nicht diese Tabelle.

### `users` (auth-Collection, erweitert)

| Feld | Typ | Hinweis |
|------|-----|---------|
| `is_admin` | bool | |
| `is_superuser` | bool | |
| `info` | text | Freitext |
| `group_id` | text | primäre Gruppe (einfache Zuordnung, Alternative zu `group_memberships`) |
| `role` | relation → roles | optional; wenn gesetzt primäre Rechtequelle, sonst `is_admin`/`is_superuser` |

Rules: List = Admin/Superuser; View = eigener Datensatz oder Admin/Superuser;
Create = Superuser; Update = eigener Datensatz oder Admin/Superuser (die
App-Logik verhindert, dass Admins `is_admin`/`is_superuser` fremder Nutzer
ändern — die DB-Rule kann das nicht feldweise einschränken); Delete = Superuser.

### `groups`

| Feld | Typ | Hinweis |
|------|-----|---------|
| `name` | text (req) | |
| `description` | text | |
| `color` | text | Hex |
| `archived` | bool | Soft-Archiv statt Löschen |
| `linked_group` | text | ID einer anderen Gruppe, deren Plan geteilt wird (Text, keine Relation — PocketBase erlaubt keine Selbstreferenzen) |
| `settings` | json | Logo, Sprache, Zeitzone, Währung, Bestellschluss, Standardexport |
| `parent_group` | text | optionale Hierarchie (Text, keine Relation) |

Rules: List/View = Superuser, Admin, oder Mitglied (`group_memberships`);
Create/Update/Delete = Superuser.

### `group_memberships`

`group` (rel), `user` (rel), `role` (select: `admin`\|`member`).
Rules: List/View = Superuser, Admin, oder eigener Eintrag; Create/Update/Delete = Superuser/Admin.

### `meal_plans`

`group` (rel), `year` (num), `week_number` (num), `status` (select:
`upcoming`\|`current`\|`archived`), `meals` (json), `synced_from` (text, keine
Relation), `sync_mode` (select: `copy`\|`sync`).
Rules: List/View = jeder authentifizierte Nutzer (Speisepläne sind keine
sensiblen Daten, auch nötig für geteilte Pläne); Create/Update/Delete =
Superuser, globaler Admin, oder Gruppen-Admin (`group_memberships`-Eintrag
mit `role = "admin"` für diese Gruppe).

### `orders`

`meal_plan` (rel), `group` (rel), `user` (rel), `user_name`, `user_info`,
`day` (select), `meal_number`, `meal_name`, `meal_price` (num), `edited`
(bool). Rules: Gruppen-scoped über `group_memberships` **oder** das einfache
`group_id`-Feld am User; eigene Bestellungen bearbeitbar, Gruppen-Admins
verwalten alle Bestellungen ihrer Gruppe.

### `shared_plans` (Vorlagen)

`source_plan` (rel), `source_group` (rel), `source_group_name`, `shared_by`
(rel), `shared_by_name`, `name`, `description`, `week_label`, `meals` (json).
Rules: Admin/Superuser lesen und erstellen; nur Ersteller/Superuser ändern.

### `settings` (Key-Value)

`key` (text), `value` (json). Enthält u. a. `app_defaults` (globale
Standardwerte für neue Gruppen), `maintenance` (Wartungsmodus) und
`statistics_enabled` (systemweiter Schalter für die Statistik-Ansicht, siehe
unten). Rules: alle lesen; nur Superuser schreiben.

> **`statistics_enabled`:** Ob der Menüpunkt „Statistiken" überhaupt
> existiert, ist eine globale, superuser-only Einstellung (kein
> Nutzer-Preference) — Admins und normale Nutzer können sie nicht selbst
> umschalten. Steuerung: Einstellungen → System → „Statistiken" (nur für
> Superuser sichtbar).

### `roles`

`name`, `slug` (unique), `description`, `permissions` (json: Liste von
Permission-Keys), `is_system` (bool), `group` (text, optional). Rules: alle
lesen; nur Superuser schreiben. System-Rollen: `user`, `group_admin`,
`superuser`.

### `audit_logs`

`user` (rel), `user_name`, `action` (select:
login/logout/create/update/delete/restore/import/export/permission_change/group_create),
`entity_type`, `entity_id`, `group` (rel), `details` (json). Rules: Create =
jeder authentifizierte Nutzer; List/View/Delete = nur Superuser; kein Update.

### `trash`

`collection_name`, `record_id`, `data` (json-Snapshot), `deleted_by` (rel),
`deleted_by_name`, `group` (rel). Rules: Superuser sehen alles,
Gruppen-Admins ihre eigene Gruppe; Create/Delete = Admin/Superuser; kein Update.

### `plan_history`

`meal_plan` (rel), `group` (rel), `user` (rel), `user_name`, `action`
(select: created/meal_added/meal_removed/meals_updated/status_changed),
`day`, `summary`, `before` (json), `after` (json). Rules: Gruppen-Mitglieder
lesen; Create = jeder authentifizierte Nutzer; Delete = Superuser; kein Update.

### `notifications`

`user` (rel, Empfänger), `group` (rel), `type` (select:
order_deadline/new_week/plan_changed/new_group/admin_message/system),
`title`, `message`, `read` (bool). Rules: Empfänger/Superuser
lesen/ändern/löschen; Create = Admin/Superuser.

### Berechtigungen (Permission-Keys, `src/lib/permissions.ts`)

VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS, VIEW_MEALS, EDIT_MEALS,
DELETE_MEALS, MANAGE_TEMPLATES, PLACE_ORDERS, VIEW_ORDERS, EXPORT_DATA,
IMPORT_DATA, VIEW_STATISTICS, CREATE_GROUPS, EDIT_GROUPS, DELETE_GROUPS,
MANAGE_PERMISSIONS, VIEW_AUDIT_LOG, MANAGE_TRASH, SYSTEM_SETTINGS.

---

## 6. Manuelles Setup über die Admin-UI (Referenz)

Falls du keine Migrationsdatei laufen lassen willst oder eine einzelne
Collection von Hand nachbauen musst, hier die exakten API-Rule-Strings zum
Kopieren — identisch zu dem, was `setup_collections.js` einträgt.
Feldlisten: siehe [Abschnitt 5](#5-vollständiges-datenbankschema-referenz).

**Admin-UI → Collections → „New collection" → Type: Base**

### `groups`
```
List/View:          @request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || @collection.group_memberships.user.id ?= @request.auth.id)
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `group_memberships`
```
List/View:            @request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || user.id = @request.auth.id)
Create/Update/Delete: @request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true)
```

### `meal_plans`
```
List/View:     @request.auth.id != ""
Create/Update/Delete: @request.auth.id != "" && (@request.auth.is_superuser = true || @request.auth.is_admin = true || @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")
```

### `orders`
```
List/View:   @request.auth.id != "" && (@request.auth.is_superuser = true || (@collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id) || group = @request.auth.group_id)
Create:      @request.auth.id != "" && ((@collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id) || group = @request.auth.group_id)
Update/Delete: @request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (@collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin"))
```

### `shared_plans`
```
List/View/Create: @request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)
Update/Delete:    @request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)
```

### `settings`
```
List/View:            @request.auth.id != ""
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `roles`
```
List/View:            @request.auth.id != ""
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `audit_logs`
```
List/View: @request.auth.id != "" && @request.auth.is_superuser = true
Create:    @request.auth.id != ""
Update:    (leer lassen)
Delete:    @request.auth.id != "" && @request.auth.is_superuser = true
```

### `trash`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || (@request.auth.is_admin = true && ((@collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id) || group = @request.auth.group_id)))
Create:    @request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)
Update:    (leer lassen)
Delete:    @request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)
```

### `plan_history`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || (@collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id) || group = @request.auth.group_id)
Create:    @request.auth.id != ""
Update:    (leer lassen)
Delete:    @request.auth.id != "" && @request.auth.is_superuser = true
```

### `notifications`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)
Create:    @request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)
Update/Delete: @request.auth.id != "" && (@request.auth.is_superuser = true || user = @request.auth.id)
```

### `users` (API Rules auf der bestehenden Auth-Collection)
```
List:    @request.auth.id != "" && @request.auth.is_admin = true
View:    @request.auth.id != "" && (id = @request.auth.id || @request.auth.is_admin = true)
Create:  @request.auth.id != "" && @request.auth.is_superuser = true
Update:  @request.auth.id != "" && (id = @request.auth.id || @request.auth.is_superuser = true || @request.auth.is_admin = true)
Delete:  @request.auth.id != "" && @request.auth.is_superuser = true
```

---

## 7. Anhang: Ältere Installationen

Dieser Abschnitt ist nur relevant, wenn deine PocketBase-Instanz **älter** ist
als das aktuelle Schema und du **nicht** einfach `setup_collections.js`
erneut laufen lassen willst (siehe [1.4](#14-rules-erneut-anwenden--auffrischen)
— das ist meistens der einfachere Weg, auch für bestehende Installationen).

### 7.1 Einzelne, historische Migrationsdateien

Diese Dateien wurden inkrementell während der Entwicklung geschrieben und
sind heute vollständig in `setup_collections.js` enthalten:

| Datei | Zweck |
|-------|-------|
| `1751284800_phase0_foundation.js` | `roles`, `audit_logs`, `trash`; `users.role`, `groups.settings`, `groups.parent_group` |
| `1751299200_phase3_history_notifications.js` | `plan_history`, `notifications` |
| `1751385600_fix_meal_plans_delete_rule.js` | `meal_plans.deleteRule` → Gruppen-Admins (Rotation-Fix) |

Nur relevant, wenn eine bestehende Installation Schritt für Schritt über
PocketBase's eingebauten Migrations-Runner nachgezogen werden soll, statt
einmalig `setup_collections.js` erneut anzuwenden.

> **Hinweis:** `1751385600_fix_meal_plans_delete_rule.js` ist überholt – die
> `meal_plans`-Rules werden von `setup_collections.js` jetzt vollständig auf das
> `group_id`-Modell gesetzt (s. u.).

### 7.3 Zugriffsmodell (wichtig – behebt zwei bekannte Fehler)

Die API-Rules prüfen die Gruppenzugehörigkeit über das **`users.group_id`-Feld**,
nicht über `@collection.group_memberships`. Zwei Gründe:

1. **Leere Datenbank:** Die `groups`-Regel referenzierte `@collection.group_memberships`,
   das beim Anlegen von `groups` (wird zuerst erstellt) noch nicht existiert →
   Fehler *„failed to load collection group_memberships"* beim Anwenden der Migration.
2. **Bestellungen verschwanden nach Reload:** `@collection.group_memberships.group = group`
   nutzt `=` auf einem Mehrfach-Join und ist unzuverlässig – die `list`-Regel lieferte
   nichts zurück, obwohl die Datensätze in der DB lagen (das Speichern klappte über die
   `group_id`-Bedingung).

Damit `group_id`-basierte Regeln für alle greifen, setzt die App bei
`addMember`/`moveMember` automatisch das `group_id` des Nutzers.
`group_memberships` bleibt für die Admin-Kennzeichnung erhalten, ist aber nicht
mehr Teil der Zugriffsprüfung.

**Fix anwenden:** `setup_collections.js` ist idempotent – erneut nach
`pb_migrations/` kopieren und PocketBase neu starten; alle Rules werden auf die
korrigierten Werte gesetzt.

### 7.2 Migration von der alten Einzel-Dokument-Architektur (`meals_data`)

Ganz frühe Installationen speicherten alles in einem einzigen JSON-Dokument:

```
meals_data
  └── content (json)
       ├── current.meals   → meal_plans (status: "current")
       ├── current.orders  → orders (je ein Datensatz pro Person+Tag)
       ├── upcoming.meals  → meal_plans (status: "upcoming")
       └── upcoming.orders → orders
```

**Schritt-für-Schritt:**

1. `setup_collections.js` einspielen (siehe [Abschnitt 1](#1-schnellstart-aktuelles-setup))
2. In der App (als Superuser) eine Gruppe „Standard" anlegen
3. Alle bestehenden Nutzer dieser Gruppe zuweisen
   (Admin-UI → `group_memberships` → je einen Eintrag pro Nutzer anlegen)
4. Aus dem alten `meals_data`-Datensatz das JSON exportieren
5. Einen neuen `meal_plans`-Datensatz anlegen:
   - `group` = ID der Gruppe „Standard"
   - `status` = `current`
   - `meals` = Wert aus `content.current.meals` (JSON kopieren)
6. Für jede Person + jeden Tag in `content.current.orders` einen
   `orders`-Datensatz anlegen:
   - `meal_plan` = ID des gerade angelegten Plans
   - `group` = ID der Gruppe
   - `user` = ID des Nutzers (über `users`-Collection nachschlagen)
   - `user_name`, `day`, `meal_number`, `meal_name`, `meal_price` = Werte aus
     dem alten JSON
7. Analog für `upcoming` wiederholen
8. App testen → danach `meals_data` löschen
