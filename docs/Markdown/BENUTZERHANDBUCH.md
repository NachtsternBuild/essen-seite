# Essensplaner – Benutzerhandbuch

Willkommen beim **Essensplaner**! Diese Anleitung erklärt, was du in der App
tun kannst, wofür jedes Menü da ist und was die verschiedenen Rollen und Rechte
bedeuten. Sie richtet sich an alle Nutzerinnen und Nutzer – vom normalen
Teilnehmer bis zum Administrator.

---

## Inhaltsverzeichnis

1. [Was ist der Essensplaner?](#1-was-ist-der-essensplaner)
2. [Anmelden & Abmelden](#2-anmelden--abmelden)
3. [Der Aufbau der Oberfläche](#3-der-aufbau-der-oberfläche)
4. [Die Menüs im Detail](#4-die-menüs-im-detail)
5. [Essen bestellen – Schritt für Schritt](#5-essen-bestellen--schritt-für-schritt)
6. [Der Bestellschluss (08:30-Regel)](#6-der-bestellschluss-0830-regel)
7. [Rollen & Rechte](#7-rollen--rechte)
8. [Häufige Fragen (FAQ)](#8-häufige-fragen-faq)

---

## 1. Was ist der Essensplaner?

Der Essensplaner ist eine Web-App, mit der eine Gruppe (z. B. eine Firma, eine
Kantine oder ein Team) das **Wochenmenü** verwaltet und **Essen bestellt**.

- Für jede Woche gibt es einen Menüplan mit den fünf Werktagen (Montag–Freitag).
- Jeder Tag kann mehrere Gerichte enthalten – nummeriert, mit Preis, optional
  mit Kennzeichnung „vegetarisch/vegan", Allergenen und Beschreibung.
- Jede Person bestellt für sich selbst pro Tag genau ein Gericht.
- Administratoren pflegen die Menüs; Superuser verwalten das Gesamtsystem mit
  mehreren Gruppen.

Die Daten sind nach **Gruppen** getrennt: Du siehst immer nur die Menüs und
Bestellungen deiner eigenen Gruppe.

---

## 2. Anmelden & Abmelden

- **Anmelden:** Öffne die App-Adresse im Browser und melde dich mit deiner
  **E-Mail-Adresse** und deinem **Passwort** an. Diese Zugangsdaten legt ein
  Administrator oder Superuser für dich an.
- **Abmelden:** Unten links in der Seitenleiste auf **„Abmelden"** klicken.
- **Passwort vergessen?** Wende dich an deinen Administrator – er kann dein
  Passwort zurücksetzen.

> Es gibt keine Selbstregistrierung: Konten werden immer von einem
> Administrator/Superuser erstellt.

---

## 3. Der Aufbau der Oberfläche

Die App ist zweigeteilt:

### Seitenleiste (links)

- **Logo & Name** oben.
- **Gruppenauswahl** – nur für Superuser sichtbar, um zwischen Gruppen zu
  wechseln.
- **Navigationsmenü** (siehe [Abschnitt 4](#4-die-menüs-im-detail)).
- **Fußbereich** mit:
  - 🔔 **Benachrichtigungsglocke** – zeigt neue Hinweise (neue Woche,
    Planänderungen …).
  - 🌗 **Theme-Umschalter** – Hell/Dunkel.
  - **Verbindungsanzeige** – „● Online" / „○ Offline" bzw. „Syncing…".
  - **Abmelden**-Schaltfläche.

### Hauptbereich (rechts)

Zeigt den Inhalt des gewählten Menüpunkts. Ganz oben können hier zwei Banner
erscheinen:

- ⚠️ **Wartungsbanner** – wenn eine Wartung angekündigt ist.
- **Gruppen-Banner** – zeigt Name und Farbe deiner aktiven Gruppe.

---

## 4. Die Menüs im Detail

| Menüpunkt | Wer sieht es? | Wofür ist es da? |
|-----------|---------------|------------------|
| 📊 **Übersicht** | alle | Persönliches Dashboard: Begrüßung, deine Wochenzusammenfassung, heutiges Menü. Admins/Superuser sehen zusätzlich Kennzahlen und ein Verwaltungs-Panel. |
| 📅 **Planung** | alle (Bestellen); Menü pflegen nur Admins | Die **nächste** Woche: hier wird das kommende Menü geplant und man kann vorbestellen. |
| 🗓 **Aktuelle Woche** | alle | Die **laufende** Woche: Menü ansehen und (bis zum Bestellschluss) bestellen. |
| 📦 **Archiv** | alle | Die **Vorwoche** – nur zum Nachschauen (schreibgeschützt). |
| 📈 **Statistiken** | wenn systemweit aktiviert + Recht | Auswertungen: Bestellungen, Umsatz, beliebteste Gerichte usw. |
| 👥 **Nutzer** | Admins & Superuser | Benutzerverwaltung: Konten anlegen, bearbeiten, Gruppen zuweisen, Passwörter zurücksetzen. |
| 🏢 **Gruppen** | nur Superuser | Gruppen anlegen, bearbeiten, archivieren und verknüpfen. |
| 🗑 **Papierkorb** | Superuser (bzw. Recht „Papierkorb verwalten") | Gelöschte Einträge ansehen und wiederherstellen. |
| ⚙️ **Einstellungen** | alle | Darstellung, Benachrichtigungen und – je nach Rolle – System-Optionen. |

### 📊 Übersicht (Dashboard)

Deine Startseite. Sie zeigt:

- **Begrüßung** mit Name, Datum und deiner Rolle/Gruppe.
- **Meine Woche** – deine persönliche Zusammenfassung: wie viele Tage du schon
  bestellt hast (`x/5`), dein Gesamtbetrag, noch offene Tage und – für die
  aktuelle Woche – das heutige Menü.
- **Für Admins zusätzlich:** eine **Gruppenwoche**-Übersicht (Bestellungen,
  Teilnehmer, Umsatz, Top-Menü).
- **Für Superuser zusätzlich:** eine **Systemübersicht** (aktive Gruppen,
  Nutzer, Admins, Superuser).
- **Für Admins & Superuser:** ein Panel **„Verwaltung & Werkzeuge"** mit
  Schnellzugriffen (Nutzer, Gruppen, Planung, Statistiken). Normale Nutzer sehen
  dieses Panel nicht.

### 📅 Planung / 🗓 Aktuelle Woche

Beide zeigen die fünf Werktage als Karten mit den Gerichten.

- **Bestellen:** Über das Bestellformular unten wählst du je Tag ein Gericht.
- **Details ansehen:** Auf ein Gericht klicken, um Beschreibung, Allergene und
  Zusatzstoffe aufzuklappen.
- **Für Admins:** Buttons zum Anlegen/Löschen von Plänen, „Aus Vorlage",
  „Als Vorlage", „Verlauf" und „Woche abschließen & rotieren" (schiebt die
  aktuelle Woche ins Archiv und macht die geplante zur aktuellen).

### 📦 Archiv

Zeigt die Vorwoche als reine Ansicht. Bestellungen können hier nicht mehr
geändert werden.

### 📈 Statistiken

Grafische und tabellarische Auswertung (Balkenlisten, Kennzahlen). Superuser
können außerdem **Gruppen vergleichen**. Der Menüpunkt existiert nur, wenn ein
Superuser die Funktion systemweit eingeschaltet hat.

### 👥 Nutzer

Für Admins/Superuser. Hier kannst du Konten **anlegen, bearbeiten, löschen**,
**Gruppen zuweisen** und **Passwörter zurücksetzen**. Superuser sehen hier
zusätzlich die **Wartungssteuerung** (Wartungshinweis für alle Nutzer planen).

### 🏢 Gruppen

Nur für Superuser: Gruppen **anlegen, bearbeiten, archivieren** (statt löschen)
und **verknüpfen** (eine Gruppe kann den Plan einer anderen mitnutzen –
„geteilter Plan"; Bestellungen werden trotzdem getrennt abgerechnet).

### 🗑 Papierkorb

Gelöschte Datensätze landen zunächst im Papierkorb und können von dort
**wiederhergestellt** werden.

### ⚙️ Einstellungen

Enthält mehrere Reiter:

- **Darstellung:** Theme (Hell/Dunkel/System) und **Akzentfarbe** wählen.
- **Benachrichtigungen:** Desktop-Benachrichtigungen ein-/ausschalten.
- **Gruppen-Standards** *(nur Superuser):* Standardwerte für neue Gruppen.
- **Protokoll** *(mit Recht „Audit-Log einsehen"):* Aktivitätsprotokoll.
- **System:** App-Infos; Superuser können hier die **Statistiken**-Funktion
  systemweit ein-/ausschalten.

---

## 5. Essen bestellen – Schritt für Schritt

1. Gehe zu **🗓 Aktuelle Woche** (oder **📅 Planung** für die nächste Woche).
2. Sieh dir die Gerichte je Tag an. Klicke ein Gericht an, um Details zu sehen.
3. Nutze das **Bestellformular** unten: Wähle pro Tag die gewünschte
   Gericht-Nummer.
4. Deine Bestellung wird sofort gespeichert. In **Übersicht → Meine Woche**
   siehst du deinen Stand (`x/5` Tage, Gesamtbetrag, offene Tage).
5. **Ändern/Stornieren:** solange der Tag noch nicht gesperrt ist (siehe
   nächster Abschnitt), kannst du deine Bestellung anpassen.

> Pro Tag ist genau **eine** Bestellung möglich. Wählst du ein anderes Gericht,
> ersetzt es die vorige Bestellung für diesen Tag.

---

## 6. Der Bestellschluss (08:30-Regel)

In der **aktuellen Woche** sind Tage automatisch gesperrt, sobald der
Bestellschluss erreicht ist:

- **Vergangene Tage** der Woche sind gesperrt.
- Der **heutige Tag** ist ab **08:30 Uhr** gesperrt.
- Am **Wochenende** (Sa/So) ist die gesamte laufende Woche gesperrt.

Gesperrte Tage lassen sich nicht mehr bestellen oder ändern. Für die **Planung
(nächste Woche)** gibt es keine Sperre – dort kannst du jederzeit vorbestellen.

---

## 7. Rollen & Rechte

Es gibt drei Standardrollen. Sie bestimmen, was du sehen und tun darfst.

### 👤 Benutzer

Die Standardrolle. Darf:

- Essenspläne **ansehen** (`Essenspläne ansehen`)
- **Eigene Bestellungen** aufgeben und ändern (`Bestellungen aufgeben`)

Ein Benutzer verwaltet ausschließlich seine eigenen Bestellungen und sieht nur
seine eigene Gruppe.

### 🛠 Administrator (Gruppenadministrator)

Alles, was ein Benutzer darf, **plus** für die **eigene Gruppe**:

- Benutzer ansehen, erstellen, bearbeiten, löschen
- Essenspläne bearbeiten und löschen, **Vorlagen** verwalten
- **Alle Bestellungen** der Gruppe ansehen und verwalten
- Daten **exportieren/importieren**
- **Statistiken** ansehen

Ein Administrator wirkt immer nur innerhalb seiner Gruppe.

### 🛡 Superuser

Hat **alle Rechte** und arbeitet **gruppenübergreifend**. Zusätzlich zu den
Admin-Rechten:

- **Gruppen** anlegen, bearbeiten, löschen, verknüpfen
- **Rollen & Rechte** verwalten
- **Audit-Log** (Protokoll) einsehen
- **Papierkorb** verwalten
- **Systemeinstellungen** (inkl. Wartungsmodus und Statistik-Schalter)

### Was bedeuten die einzelnen Rechte?

| Recht | Bedeutung |
|-------|-----------|
| Essenspläne ansehen | Menüs sehen |
| Bestellungen aufgeben | Eigene Bestellungen erstellen/ändern |
| Benutzer ansehen/erstellen/bearbeiten/löschen | Kontenverwaltung |
| Essenspläne bearbeiten/löschen | Menüs pflegen |
| Vorlagen verwalten | Menüvorlagen speichern/übernehmen |
| Alle Bestellungen ansehen | Bestellungen anderer in der Gruppe sehen |
| Daten exportieren/importieren | z. B. PDF-Export, Datenübernahme |
| Statistiken ansehen | Auswertungen öffnen |
| Gruppen erstellen/bearbeiten/löschen | Gruppenverwaltung |
| Rollen & Rechte verwalten | Berechtigungen anpassen |
| Audit-Log einsehen | Aktivitätsprotokoll lesen |
| Papierkorb verwalten | Gelöschtes wiederherstellen |
| Systemeinstellungen | Globale Optionen ändern |

> Hinweis: Neben den Standardrollen können Superuser eigene **Rollen** mit einer
> individuellen Rechtekombination anlegen und Nutzern zuweisen.

---

## 8. Häufige Fragen (FAQ)

**Ich sehe keine Menüs – nur „Keine Gruppe ausgewählt".**
Du bist noch keiner Gruppe zugewiesen. Bitte einen Administrator, dich einer
Gruppe hinzuzufügen.

**Warum kann ich für heute nicht mehr bestellen?**
Der Bestellschluss war um 08:30 Uhr. Bestelle rechtzeitig oder nutze die
Planung für die nächste Woche.

**Wo sehe ich, was ich diese Woche schon bestellt habe?**
In **📊 Übersicht → Meine Woche**.

**Ich bekomme keine Desktop-Benachrichtigungen.**
Aktiviere sie in **Einstellungen → Benachrichtigungen** und erlaube sie im
Browser. Die 🔔 Glocke in der Seitenleiste zeigt Hinweise immer an – unabhängig
davon.

**Kann ich die Farben/das Design ändern?**
Ja: **Einstellungen → Darstellung** (Theme und Akzentfarbe).

**Ich habe versehentlich etwas gelöscht.**
Ein Superuser (oder ein Nutzer mit dem Recht „Papierkorb verwalten") kann es im
**🗑 Papierkorb** wiederherstellen.
