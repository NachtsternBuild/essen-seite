# Essensplaner – PocketBase Setup Guide

Vollständige Anleitung für eine Neu-Installation sowie für das Upgrade
von der alten Einzel-Dokument-Architektur auf das Multi-Gruppen-System.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [PocketBase starten](#2-pocketbase-starten)
3. [Erstes Admin-Konto anlegen](#3-erstes-admin-konto-anlegen)
4. [Neue Collections anlegen](#4-neue-collections-anlegen)
   - [groups](#41-groups--base)
   - [group_memberships](#42-group_memberships--base)
   - [meal_plans](#43-meal_plans--base)
   - [orders](#44-orders--base)
   - [shared_plans](#45-shared_plans--base)
   - [settings](#46-settings--base)
5. [Users-Collection erweitern](#5-users-collection-erweitern)
6. [Ersten Superuser anlegen](#6-ersten-superuser-anlegen)
7. [Erste Gruppe anlegen](#7-erste-gruppe-anlegen)
8. [App-Konfiguration](#8-app-konfiguration)
9. [Migration vom alten Schema](#9-migration-vom-alten-schema)
10. [API-Rules Referenz](#10-api-rules-referenz)

---

## 1. Voraussetzungen

- PocketBase **≥ 0.22** (getestet mit 0.26.8)
- Download: https://pocketbase.io/docs/ → „Get started"
- Node.js ≥ 20 für die React-App
- Kein weiteres Backend nötig

---

## 2. PocketBase starten

```bash
# Binary herunterladen (Beispiel Linux amd64):
wget https://github.com/pocketbase/pocketbase/releases/download/v0.26.8/pocketbase_0.26.8_linux_amd64.zip
unzip pocketbase_0.26.8_linux_amd64.zip

# Starten
./pocketbase serve
# → läuft auf http://127.0.0.1:8090
# Admin-UI: http://127.0.0.1:8090/_/
```

Für Produktion empfohlen:
```bash
./pocketbase serve --http="0.0.0.0:8090"
```

---

## 3. Erstes Admin-Konto anlegen

Beim ersten Aufruf von `http://127.0.0.1:8090/_/` wird ein Setup-Wizard
angezeigt. E-Mail und Passwort für den PocketBase-**Superadmin** eingeben.

> **Hinweis:** Der PocketBase-Superadmin (für das Admin-Panel) ist
> verschieden vom App-Superuser (ein normaler `users`-Eintrag mit
> `is_superuser = true`).

---

## 4. Neue Collections anlegen

Alle Collections werden unter:
**Admin-UI → Collections → „New collection"** angelegt.

---

### 4.1 `groups` — Base

**Admin-UI → New collection → Type: Base → Name: `groups`**

#### Felder

| Feldname       | Typ    | Required | Einstellungen                                                  |
|----------------|--------|----------|----------------------------------------------------------------|
| `name`         | Text   | ✓        | Max length: `60`                                               |
| `description`  | Text   | –        | Max length: `200`                                              |
| `color`        | Text   | –        | –                                                              |
| `archived`     | Bool   | –        | Default: `false`                                               |
| `linked_group` | Text   | –        | Speichert die ID einer anderen Gruppe, deren Plan geteilt wird |

> **Hinweis:** `linked_group` ist bewusst ein Text-Feld (keine Relation),
> da PocketBase keine Selbstreferenzen in Relation-Feldern erlaubt.

#### API Rules

Im Tab **„API Rules"** folgende Regeln eintragen:

| Rule          | Wert |
|---------------|------|
| List rule     | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| @collection.group_memberships.user.id ?= @request.auth.id)` |
| View rule     | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| @collection.group_memberships.user.id ?= @request.auth.id)` |
| Create rule   | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Update rule   | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Delete rule   | `@request.auth.id != "" && @request.auth.is_superuser = true` |

---

### 4.2 `group_memberships` — Base

**Admin-UI → New collection → Type: Base → Name: `group_memberships`**

#### Felder

| Feldname | Typ      | Required | Einstellungen                              |
|----------|----------|----------|--------------------------------------------|
| `group`  | Relation | ✓        | Collection: `groups`, Max select: 1        |
| `user`   | Relation | ✓        | Collection: `users`, Max select: 1         |
| `role`   | Select   | ✓        | Werte: `admin`, `member` (je einzeln eintragen) |

#### API Rules

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| user.id = @request.auth.id)` |
| View rule   | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| user.id = @request.auth.id)` |
| Create rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Update rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Delete rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |

---

### 4.3 `meal_plans` — Base

**Admin-UI → New collection → Type: Base → Name: `meal_plans`**

#### Felder

| Feldname      | Typ      | Required | Einstellungen                                          |
|---------------|----------|----------|--------------------------------------------------------|
| `group`       | Relation | ✓        | Collection: `groups`, Max select: 1                    |
| `year`        | Number   | ✓        | –                                                      |
| `week_number` | Number   | ✓        | –                                                      |
| `status`      | Select   | ✓        | Werte: `upcoming`, `current`, `archived`               |
| `meals`       | JSON     | –        | Speichert `{tag: [{number, name, price, ...}]}`        |
| `synced_from` | Text     | –        | Speichert die ID eines anderen Plans (keine Relation – PocketBase erlaubt keine Selbstreferenzen) |
| `sync_mode`   | Select   | –        | Werte: `copy`, `sync`                                                                             |

#### API Rules

> **Hinweis zur Plansichtbarkeit:** Da Gruppen fremde Pläne teilen können
> (`linked_group`), muss die List/View Rule für alle authentifizierten Nutzer
> offen sein. Die Speisepläne sind keine sensiblen Daten (öffentliches Menü).
> Schreibzugriff bleibt auf Gruppen-Admins beschränkt.

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != ""` |
| View rule   | `@request.auth.id != ""` |
| Create rule | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")` |
| Update rule | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")` |
| Delete rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |

---

### 4.4 `orders` — Base

**Admin-UI → New collection → Type: Base → Name: `orders`**

#### Felder

| Feldname     | Typ      | Required | Einstellungen                                               |
|--------------|----------|----------|-------------------------------------------------------------|
| `meal_plan`  | Relation | ✓        | Collection: `meal_plans`, Max select: 1                     |
| `group`      | Relation | ✓        | Collection: `groups`, Max select: 1                         |
| `user`       | Relation | ✓        | Collection: `users`, Max select: 1                          |
| `user_name`  | Text     | ✓        | –                                                           |
| `user_info`  | Text     | –        | –                                                           |
| `day`        | Select   | ✓        | Werte: `Montag`, `Dienstag`, `Mittwoch`, `Donnerstag`, `Freitag` |
| `meal_number`| Text     | ✓        | –                                                           |
| `meal_name`  | Text     | ✓        | –                                                           |
| `meal_price` | Number   | ✓        | –                                                           |
| `edited`     | Bool     | –        | Default: `false`                                            |

#### API Rules

> **Hinweis:** Die Rules unterstützen zwei Wege der Gruppenzuordnung:
> formale `group_memberships`-Einträge **und** das einfache `group_id`-Textfeld
> am User-Datensatz (`group = @request.auth.group_id`).

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| group.memberships.user = @request.auth.id \|\| group = @request.auth.group_id)` |
| View rule   | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| group.memberships.user = @request.auth.id \|\| group = @request.auth.group_id)` |
| Create rule | `@request.auth.id != "" && (group.memberships.user = @request.auth.id \|\| group = @request.auth.group_id)` |
| Update rule | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| user.id = @request.auth.id \|\| (group.memberships.user = @request.auth.id && group.memberships.role = "admin"))` |
| Delete rule | `@request.auth.id != "" && (@request.auth.is_superuser = true \|\| user.id = @request.auth.id \|\| (group.memberships.user = @request.auth.id && group.memberships.role = "admin"))` |

---

### 4.5 `shared_plans` — Base

**Admin-UI → New collection → Type: Base → Name: `shared_plans`**

#### Felder

| Feldname            | Typ      | Required | Einstellungen                        |
|---------------------|----------|----------|--------------------------------------|
| `source_plan`       | Relation | –        | Collection: `meal_plans`, Max select: 1 |
| `source_group`      | Relation | ✓        | Collection: `groups`, Max select: 1  |
| `source_group_name` | Text     | ✓        | –                                    |
| `shared_by`         | Relation | ✓        | Collection: `users`, Max select: 1   |
| `shared_by_name`    | Text     | ✓        | –                                    |
| `name`              | Text     | ✓        | –                                    |
| `description`       | Text     | –        | –                                    |
| `week_label`        | Text     | –        | –                                    |
| `meals`             | JSON     | ✓        | –                                    |

#### API Rules

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != "" && (@request.auth.is_admin = true \|\| @request.auth.is_superuser = true)` |
| View rule   | `@request.auth.id != "" && (@request.auth.is_admin = true \|\| @request.auth.is_superuser = true)` |
| Create rule | `@request.auth.id != "" && (@request.auth.is_admin = true \|\| @request.auth.is_superuser = true)` |
| Update rule | `@request.auth.id != "" && (shared_by.id = @request.auth.id \|\| @request.auth.is_superuser = true)` |
| Delete rule | `@request.auth.id != "" && (shared_by.id = @request.auth.id \|\| @request.auth.is_superuser = true)` |

---

### 4.6 `settings` — Base

**Admin-UI → New collection → Type: Base → Name: `settings`**

#### Felder

| Feldname | Typ  | Required | Einstellungen |
|----------|------|----------|---------------|
| `key`    | Text | ✓        | –             |
| `value`  | JSON | –        | –             |

#### API Rules

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != ""` |
| View rule   | `@request.auth.id != ""` |
| Create rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Update rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Delete rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |

---

## 5. Users-Collection erweitern

Die `users`-Collection (Type: **Auth**) existiert bereits. Folgende Felder
müssen **hinzugefügt** werden (sofern noch nicht vorhanden):

**Admin-UI → Collections → users → Stiftsymbol (Edit) → Fields → „+ Add field"**

| Feldname       | Typ  | Required | Einstellungen                    |
|----------------|------|----------|----------------------------------|
| `is_admin`     | Bool | –        | Default: `false` *(falls fehlend)* |
| `is_superuser` | Bool | –        | Default: `false` *(falls fehlend)* |
| `info`         | Text | –        | Max length: `100` *(falls fehlend)* |
| `group_id`     | Text | –        | **NEU** – optionale Gruppen-Referenz |

> `is_admin`, `is_superuser` und `info` existieren bereits, falls die
> App vorher schon lief. Nur `group_id` ist neu.

### API Rules für users

Damit Nutzer ihr eigenes Profil lesen können:

| Rule        | Wert |
|-------------|------|
| List rule   | `@request.auth.id != "" && @request.auth.is_admin = true` |
| View rule   | `@request.auth.id != "" && (id = @request.auth.id \|\| @request.auth.is_admin = true)` |
| Create rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |
| Update rule | `@request.auth.id != "" && (id = @request.auth.id \|\| @request.auth.is_superuser = true)` |
| Delete rule | `@request.auth.id != "" && @request.auth.is_superuser = true` |

---

## 6. Ersten Superuser anlegen

Der erste Nutzer muss manuell über das Admin-Panel angelegt werden, da
die App selbst nur Superusern das Anlegen von Nutzern erlaubt.

**Admin-UI → Collections → users → „+ New record"**

| Feld           | Wert                        |
|----------------|-----------------------------|
| `name`         | z. B. `Admin`               |
| `email`        | deine E-Mail-Adresse        |
| `password`     | sicheres Passwort           |
| `is_admin`     | ✓ (true)                    |
| `is_superuser` | ✓ (true)                    |
| `info`         | *(leer lassen)*             |
| `group_id`     | *(leer lassen)*             |

Anschließend kannst du dich in der App anmelden und weitere Nutzer
über die Benutzerverwaltung anlegen.

---

## 7. Erste Gruppe anlegen

Nach dem ersten Login als Superuser:

1. In der App links auf **„Gruppen"** klicken
2. **„+ Neue Gruppe"** → Name eingeben, Farbe wählen → Speichern
3. Dann unter **„Nutzer"** die gewünschten Nutzer anlegen
4. In PocketBase Admin → `group_memberships` → **„+ New record"** →
   `group` = angelegte Gruppe, `user` = der Nutzer, `role` = `member`
   (oder `admin` für Gruppenadmins)

> Alternativ kann die App-eigene Gruppenverwaltung verwendet werden,
> sobald Mitglieder-Management dort implementiert ist.

---

## 8. App-Konfiguration

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

## 9. Migration vom alten Schema

Falls die App vorher die alte `meals_data`-Collection (Einzel-Dokument) verwendet hat:

```
meals_data
  └── content (json)
       ├── current.meals   → meal_plans (status: "current")
       ├── current.orders  → orders (je ein Datensatz pro Person+Tag)
       ├── upcoming.meals  → meal_plans (status: "upcoming")
       └── upcoming.orders → orders
```

**Schritt-für-Schritt:**

1. Alle neuen Collections und `group_id` auf `users` anlegen (s. oben)
2. In der App (als Superuser) eine Gruppe „Standard" anlegen
3. Alle bestehenden Nutzer dieser Gruppe zuweisen
   (Admin-UI → `group_memberships` → je einen Eintrag pro Nutzer anlegen)
4. Aus dem alten `meals_data`-Datensatz das JSON exportieren
5. Einen neuen `meal_plans`-Datensatz anlegen:
   - `group` = ID der Gruppe „Standard"
   - `status` = `current`
   - `meals` = Wert aus `content.current.meals` (JSON kopieren)
6. Für jede Person + jeden Tag in `content.current.orders` einen `orders`-Datensatz anlegen:
   - `meal_plan` = ID des gerade angelegten Plans
   - `group` = ID der Gruppe
   - `user` = ID des Nutzers (über `users`-Collection nachschlagen)
   - `user_name`, `day`, `meal_number`, `meal_name`, `meal_price` = Werte aus dem alten JSON
7. Analog für `upcoming` wiederholen
8. App testen → danach `meals_data` löschen

---

## 10. API-Rules Referenz

Alle Regeln im Überblick zum schnellen Kopieren:

### `groups`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.user.id ?= @request.auth.id)
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `group_memberships`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id)
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `meal_plans`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id)
Create/Update: @request.auth.id != "" && (@request.auth.is_superuser = true || @collection.group_memberships.group = group && @collection.group_memberships.user = @request.auth.id && @collection.group_memberships.role = "admin")
Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```

### `orders`
```
List/View: @request.auth.id != "" && (@request.auth.is_superuser = true || group.memberships.user = @request.auth.id)
Create: @request.auth.id != "" && group.memberships.user = @request.auth.id
Update/Delete: @request.auth.id != "" && (@request.auth.is_superuser = true || user.id = @request.auth.id || (group.memberships.user = @request.auth.id && group.memberships.role = "admin"))
```

### `shared_plans`
```
List/View/Create: @request.auth.id != "" && (@request.auth.is_admin = true || @request.auth.is_superuser = true)
Update/Delete: @request.auth.id != "" && (shared_by.id = @request.auth.id || @request.auth.is_superuser = true)
```

### `settings`
```
List/View: @request.auth.id != ""
Create/Update/Delete: @request.auth.id != "" && @request.auth.is_superuser = true
```
