# Essensplaner – Quickstart: Produktiv-Setup auf Ubuntu Server 26.04 LTS

Diese Anleitung führt **Schritt für Schritt** durch ein vollständiges,
produktionsreifes Deployment auf einem frischen **Ubuntu Server 26.04 LTS**:
PocketBase als systemd-Dienst, die React-App als statisches Build, **nginx** als
Reverse Proxy und **HTTPS** via Let's Encrypt – alles unter **einer** Domain.

Zielarchitektur:

```
        Internet
           │ 443 (HTTPS)
        ┌──▼───────────────────────── nginx ─────────────────────────┐
        │  /            → statische SPA aus /var/www/essensplaner/dist │
        │  /api/  /_/   → Reverse Proxy auf 127.0.0.1:8090            │
        └──────────────────────────────┬──────────────────────────────┘
                                        │ localhost
                                 ┌──────▼────────┐
                                 │  PocketBase   │  (systemd-Dienst)
                                 │  127.0.0.1:8090│  pb_data/ = SQLite
                                 └───────────────┘
```

Weil der Produktions-Build der App **Same-Origin** spricht (siehe
`src/lib/pocketbase.ts` → Basis-URL `undefined`), genügt es, dass nginx SPA und
API unter derselben Adresse ausliefert – **kein CORS, keine `VITE_PB_URL` nötig**.

### Zwei Varianten – welche passt zu dir?

| | **Variante A – Öffentlich** | **Variante B – Lokal / firmenintern** |
|---|---|---|
| Zugriff aus dem Internet | ja | nein (nur im LAN/VPN) |
| Öffentliche Domain nötig | **ja** (z. B. `essen.example.de`) | **nein** – IP, interner DNS- oder `.local`-Name genügt |
| HTTPS-Zertifikat | Let's Encrypt (automatisch, kostenlos) | mkcert / selbstsigniert – oder HTTP im vertrauenswürdigen LAN |
| Passt für | Zugriff von unterwegs, mehrere Standorte | Kantine/Firma im eigenen Netz, keine (reservierte) Domain |

**Die Schritte [1](#1-grundabsicherung-des-servers)–[8](#8-ersten-admin--superuser-anlegen)
und [12](#12-backups-einrichten)–[15](#15-checkliste) sind für beide Varianten
identisch.** Nur bei **Adressierung, Reverse Proxy und Zertifikat** (Schritte
9–11) unterscheiden sie sich:

- **Variante A:** Schritte [9](#9-nginx-als-reverse-proxy)–[11](#11-firewall-finalisieren) (Domain + Let's Encrypt).
- **Variante B:** [Variante B: Lokales oder firmeninternes Netz (ohne Domain)](#variante-b-lokales-oder-firmeninternes-netz-ohne-domain) – als Ersatz für 9–11.

> **Zeitbedarf:** ca. 30–45 Minuten. **Voraussetzungen:**
> – **Variante A:** ein Server mit **öffentlicher IP**, eine **Domain**
>   (Beispiel `essen.example.de`) mit **A/AAAA-Record** auf die Server-IP.
> – **Variante B:** nur ein Server im **lokalen Netz** mit **fester interner IP**
>   (Beispiel `192.168.1.50`) – keine Domain, kein öffentliches DNS nötig.
> Für beide: SSH-Zugang als Benutzer mit `sudo`.

---

## Inhaltsverzeichnis

1. [Grundabsicherung des Servers](#1-grundabsicherung-des-servers)
2. [Benötigte Pakete installieren](#2-benötigte-pakete-installieren)
3. [Node.js installieren](#3-nodejs-installieren)
4. [Anwendungsbenutzer & Verzeichnisse](#4-anwendungsbenutzer--verzeichnisse)
5. [Projektcode holen & App bauen](#5-projektcode-holen--app-bauen)
6. [PocketBase installieren & Schema einspielen](#6-pocketbase-installieren--schema-einspielen)
7. [PocketBase als systemd-Dienst](#7-pocketbase-als-systemd-dienst)
8. [Ersten Admin & Superuser anlegen](#8-ersten-admin--superuser-anlegen)
9. [nginx als Reverse Proxy](#9-nginx-als-reverse-proxy) · *Variante A*
10. [HTTPS mit Let's Encrypt](#10-https-mit-lets-encrypt) · *Variante A*
11. [Firewall finalisieren](#11-firewall-finalisieren) · *Variante A*
   - ⮑ *Alternative:* [Variante B – Lokales oder firmeninternes Netz (ohne Domain)](#variante-b-lokales-oder-firmeninternes-netz-ohne-domain)
12. [Backups einrichten](#12-backups-einrichten)
13. [Updates & Wartung](#13-updates--wartung)
14. [Fehlersuche](#14-fehlersuche)
15. [Checkliste](#15-checkliste)

---

## 1. Grundabsicherung des Servers

Als Benutzer mit `sudo` einloggen und das System aktualisieren:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot        # falls Kernel-Updates kamen
```

Zeitzone setzen (wichtig, weil der Bestellschluss **08:30 lokale Serverzeit**
nutzt – die App rechnet clientseitig, aber konsistente Serverzeit hilft bei Logs
und Backups):

```bash
sudo timedatectl set-timezone Europe/Berlin
timedatectl        # prüfen
```

Firewall vorbereiten (wir öffnen die Ports gleich; Regeln aktivieren wir in
[Schritt 11](#11-firewall-finalisieren), damit die SSH-Sitzung nicht abbricht):

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
```

Optional, empfohlen: Brute-Force-Schutz für SSH:

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

---

## 2. Benötigte Pakete installieren

```bash
sudo apt install -y nginx git unzip curl ca-certificates
```

---

## 3. Node.js installieren

Für den Build der React-App wird Node.js **≥ 20** benötigt. Wir installieren die
aktuelle LTS über das NodeSource-Repository (Beispiel: Node 22 LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v      # Version prüfen (Node ≥ 20)
```

> Alternativ kannst du die App auf einem **anderen** Rechner bauen und nur den
> Ordner `dist/` auf den Server kopieren. Dann ist Node auf dem Server nicht nötig.

---

## 4. Anwendungsbenutzer & Verzeichnisse

Einen dedizierten, dienst-eigenen Systembenutzer ohne Login-Shell anlegen (der
PocketBase-Dienst läuft nicht als root):

```bash
sudo useradd --system --home /opt/pocketbase --shell /usr/sbin/nologin pocketbase
```

Verzeichnisse:

```bash
# PocketBase (Binary + Daten + Migrationen)
sudo mkdir -p /opt/pocketbase/pb_migrations

# Web-Wurzel für den statischen App-Build
sudo mkdir -p /var/www/essensplaner
```

---

## 5. Projektcode holen & App bauen

Code holen (Repo-URL anpassen) und in ein Build-Verzeichnis legen:

```bash
cd /opt
sudo git clone <REPO-URL> essen-seite
cd /opt/essen-seite
```

App bauen:

```bash
sudo npm ci            # exakte Abhängigkeiten aus package-lock.json
sudo npm run build     # tsc -b + vite build → erzeugt dist/
```

Den fertigen Build in die Web-Wurzel kopieren:

```bash
sudo rsync -a --delete /opt/essen-seite/dist/ /var/www/essensplaner/dist/
sudo chown -R www-data:www-data /var/www/essensplaner
```

> **Same-Origin (Standard):** Nichts weiter zu tun – der Produktions-Build
> spricht dieselbe Domain wie die ausgelieferte Seite.
>
> **Sonderfall – API auf anderem Host/Domain:** Dann in `src/lib/pocketbase.ts`
> die Basis-URL auf `import.meta.env.VITE_PB_URL` umstellen, vor dem Build eine
> `.env.production` mit `VITE_PB_URL=https://api.example.de` anlegen, neu bauen –
> und in PocketBase CORS entsprechend konfigurieren.

---

## 6. PocketBase installieren & Schema einspielen

PocketBase-Binary herunterladen (Version bei Bedarf auf die aktuelle anpassen –
getestet mit **0.26.8**):

```bash
cd /tmp
PB_VERSION=0.26.8
curl -fsSL -o pocketbase.zip \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
unzip pocketbase.zip pocketbase
sudo mv pocketbase /opt/pocketbase/pocketbase
sudo chmod +x /opt/pocketbase/pocketbase
```

Die **maßgebliche** Schema-Migration einspielen (nur diese eine Datei!):

```bash
sudo cp /opt/essen-seite/migrations/setup_collections.js /opt/pocketbase/pb_migrations/
```

> **Nur `setup_collections.js`** kopieren – nicht zusätzlich alte nummerierte
> Migrationen. Sie enthält bereits das komplette Schema (alle Collections,
> Felder, API-Regeln) und ist idempotent. Details:
> [`../migrations/README.md`](../migrations/README.md).

Rechte setzen, damit der Dienstbenutzer alles besitzt:

```bash
sudo chown -R pocketbase:pocketbase /opt/pocketbase
```

Einmalig testweise starten, damit die Migration läuft und `pb_data/` entsteht:

```bash
sudo -u pocketbase /opt/pocketbase/pocketbase serve --http=127.0.0.1:8090 --dir=/opt/pocketbase/pb_data
# In den Logs sollte "Essensplaner schema setup complete." erscheinen.
# Mit Strg+C wieder stoppen.
```

---

## 7. PocketBase als systemd-Dienst

Damit PocketBase dauerhaft läuft und nach Reboots automatisch startet:

```bash
sudo tee /etc/systemd/system/pocketbase.service >/dev/null <<'EOF'
[Unit]
Description=PocketBase (Essensplaner)
After=network.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090 --dir=/opt/pocketbase/pb_data
Restart=always
RestartSec=5

# Härtung
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/pocketbase

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl status pocketbase --no-pager
```

PocketBase lauscht jetzt **nur** auf `127.0.0.1:8090` (nicht öffentlich) – der
Zugriff von außen läuft ausschließlich über nginx.

---

## 8. Ersten Admin & Superuser anlegen

**a) PocketBase-Superadmin** (Login des Admin-Panels). Am einfachsten per CLI:

```bash
sudo -u pocketbase /opt/pocketbase/pocketbase superuser create \
  admin@example.de 'EinSicheresPasswort' --dir=/opt/pocketbase/pb_data
```

(Alternativ erscheint beim ersten Öffnen der Admin-UI ein Setup-Wizard.)

**b) App-Superuser** (ein `users`-Datensatz mit `is_superuser = true`). Sobald
nginx + HTTPS stehen ([Schritt 9–10](#9-nginx-als-reverse-proxy)), im Browser:

**`https://essen.example.de/_/` → Collections → `users` → „+ New record"**

| Feld | Wert |
|------|------|
| `name` | z. B. `Admin` |
| `email` | deine E-Mail |
| `password` | sicheres Passwort |
| `is_admin` | ✓ true |
| `is_superuser` | ✓ true |

Danach kannst du dich in der App unter `https://essen.example.de/` anmelden und
Gruppen, Nutzer und Menüs anlegen (siehe [BENUTZERHANDBUCH.md](./BENUTZERHANDBUCH.md)).

> Der **PocketBase-Superadmin** (a) ≠ App-**Superuser** (b). Ersterer verwaltet
> die Datenbank/Admin-UI, letzterer ist die höchste Rolle **innerhalb** der App.

---

## 9. nginx als Reverse Proxy

> **Variante A (öffentlich, mit Domain).** Die Schritte 9–11 beschreiben das
> Setup mit öffentlicher Domain und Let's Encrypt. Für ein **lokales/internes
> Netz ohne Domain** überspringe 9–11 und nutze stattdessen
> [Variante B](#variante-b-lokales-oder-firmeninternes-netz-ohne-domain).

Site-Konfiguration anlegen (Domain anpassen):

```bash
sudo tee /etc/nginx/sites-available/essensplaner >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name essen.example.de;

    root /var/www/essensplaner/dist;
    index index.html;

    # Uploads (z. B. Gruppen-Logos) etwas großzügiger erlauben
    client_max_body_size 10M;

    # PocketBase-API und Admin-UI an den lokalen Dienst weiterreichen
    location ~ ^/(api|_)/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        # Für den Event-Stream (/api/realtime) Pufferung aus:
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    # Statische Assets lange cachen (Vite hasht die Dateinamen)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA-Fallback: alles andere auf index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/essensplaner /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Test (noch via HTTP): `http://essen.example.de/` sollte die App zeigen,
`http://essen.example.de/api/health` ein JSON von PocketBase liefern.

---

## 10. HTTPS mit Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d essen.example.de --redirect --agree-tos -m admin@example.de --no-eff-email
```

Certbot passt die nginx-Konfiguration automatisch an (Port 443, Zertifikat,
HTTP→HTTPS-Redirect) und richtet die **automatische Erneuerung** ein. Prüfen:

```bash
sudo certbot renew --dry-run
```

Danach ist die App unter **`https://essen.example.de/`** erreichbar, die
Admin-UI unter **`https://essen.example.de/_/`**.

---

## 11. Firewall finalisieren

```bash
sudo ufw allow 'Nginx Full'     # öffnet 80 + 443
sudo ufw enable
sudo ufw status verbose
```

Port **8090** bleibt bewusst **geschlossen** – PocketBase ist nur lokal über
nginx erreichbar.

---

## Variante B: Lokales oder firmeninternes Netz (ohne Domain)

Läuft der Server in einem **LAN oder Firmennetz** und gibt es **keine
(reservierte) öffentliche Domain**, brauchst du weder öffentliches DNS noch
Let's Encrypt. Dieser Abschnitt **ersetzt die Schritte 9–11** der Variante A.
**Alle übrigen Schritte ([1](#1-grundabsicherung-des-servers)–[8](#8-ersten-admin--superuser-anlegen)
und [12](#12-backups-einrichten)–[15](#15-checkliste)) bleiben identisch.**

Zielarchitektur (alles im internen Netz):

```
     Clients im LAN  (192.168.1.0/24)
            │  http(s)://192.168.1.50  bzw.  essensplaner.local
     ┌──────▼─────────────────────── nginx ───────────────────────┐
     │  /            → statische SPA aus /var/www/essensplaner/dist │
     │  /api/  /_/   → Reverse Proxy auf 127.0.0.1:8090            │
     └──────────────────────────────┬──────────────────────────────┘
                             ┌───────▼────────┐
                             │  PocketBase    │  127.0.0.1:8090
                             └────────────────┘
```

### B.1 Adressierung – wie erreichen die Clients den Server?

Zuerst braucht der Server eine **feste interne IP** (sonst ändert sie sich per
DHCP). Am einfachsten im Router eine **DHCP-Reservierung** für die MAC-Adresse
des Servers anlegen. Alternativ statisch per netplan:

```bash
# MAC/Interface ermitteln
ip a
sudo tee /etc/netplan/60-static.yaml >/dev/null <<'EOF'
network:
  version: 2
  ethernets:
    eth0:                      # ← Interface-Name aus `ip a`
      dhcp4: false
      addresses: [192.168.1.50/24]
      routes:
        - to: default
          via: 192.168.1.1     # ← Gateway/Router
      nameservers:
        addresses: [192.168.1.1, 9.9.9.9]
EOF
sudo chmod 600 /etc/netplan/60-static.yaml
sudo netplan apply
```

Dann **einen** der folgenden Wege wählen, wie Clients den Server ansprechen:

| Weg | Aufwand | Client-Adresse | Wann geeignet |
|-----|---------|----------------|---------------|
| **Nur IP** | keiner | `http://192.168.1.50/` | schnell, wenige Nutzer |
| **`.local`-Name (mDNS)** | Avahi auf dem Server | `http://essensplaner.local/` | ohne DNS-Server, hübscher Name |
| **Interner DNS-Eintrag** | A-Record im Firmen-DNS/Router | `http://essensplaner.firma.local/` | vorhandene DNS-Infrastruktur |
| **hosts-Datei je Client** | Eintrag pro Rechner | `http://essensplaner/` | sehr wenige, feste Clients |

**`.local`-Name per Avahi (Zeroconf, empfohlen ohne DNS-Server):**

```bash
sudo apt install -y avahi-daemon
sudo hostnamectl set-hostname essensplaner
sudo systemctl enable --now avahi-daemon
# Clients (Windows 10+/macOS/Linux) erreichen den Server nun als
# essensplaner.local – ohne weitere Konfiguration.
```

**hosts-Datei (falls kein DNS/mDNS):** auf jedem Client eintragen –
Linux/macOS `/etc/hosts`, Windows `C:\Windows\System32\drivers\etc\hosts`:

```
192.168.1.50   essensplaner
```

### B.2 nginx für den internen Zugriff

Wie in Variante A, nur der `server_name` zeigt auf den **internen Namen/die IP**
(`_` akzeptiert jeden Host-Header – praktisch, wenn per IP **und** Name
zugegriffen wird):

```bash
sudo tee /etc/nginx/sites-available/essensplaner >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name essensplaner.local 192.168.1.50 _;   # Name, IP, oder beliebig

    root /var/www/essensplaner/dist;
    index index.html;
    client_max_body_size 10M;

    location ~ ^/(api|_)/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/essensplaner /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Test: `http://192.168.1.50/` zeigt die App, `http://192.168.1.50/api/health`
liefert JSON.

> **Noch minimaler – ganz ohne nginx:** PocketBase kann die SPA selbst
> ausliefern. Lege den Build nach `pb_public/`, binde PocketBase ans LAN und
> spare den Reverse Proxy:
> ```bash
> sudo cp -r /opt/essen-seite/dist/* /opt/pocketbase/pb_public/
> sudo chown -R pocketbase:pocketbase /opt/pocketbase/pb_public
> # in der systemd-Unit ExecStart auf --http=0.0.0.0:8090 ändern, dann:
> sudo systemctl daemon-reload && sudo systemctl restart pocketbase
> ```
> Clients nutzen dann `http://192.168.1.50:8090/` (SPA **und** API sind
> same-origin – funktioniert ohne Weiteres). Nachteil: nur HTTP, und Port 8090
> muss im LAN offen sein (siehe B.4).

### B.3 HTTPS im internen Netz – drei Optionen

> **Warum überhaupt HTTPS im LAN?** Über **HTTP** wird das Login-Passwort im
> Klartext durchs Netz geschickt, und **Desktop-Benachrichtigungen** der App
> funktionieren nur in einem *secure context* (HTTPS oder `localhost`) – über
> eine IP/einen Namen per HTTP also **nicht**. Im vertrauenswürdigen LAN ist
> reines HTTP oft vertretbar; für Passwort-Login und Benachrichtigungen ist
> HTTPS aber klar besser.

**Option 1 – Nur HTTP (einfachster Weg).** Nichts weiter tun; die App läuft
über `http://…`. Die obigen Einschränkungen beachten.

**Option 2 – `mkcert` (lokal vertrauenswürdig, empfohlen).** Erzeugt eine
eigene Mini-CA; deren Root-Zertifikat einmalig auf den Clients installieren →
**grünes Schloss ohne Warnung** im ganzen Netz:

```bash
sudo apt install -y libnss3-tools
# mkcert-Binary holen (GitHub-Release)
curl -fsSL -o mkcert "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert && sudo mv mkcert /usr/local/bin/

mkcert -install                                   # legt die lokale Root-CA an
sudo mkdir -p /etc/nginx/certs
sudo mkcert -cert-file /etc/nginx/certs/essensplaner.pem \
            -key-file  /etc/nginx/certs/essensplaner-key.pem \
            essensplaner.local 192.168.1.50       # Name(n)/IP(s) eintragen
# Root-CA für die Client-Verteilung finden:
mkcert -CAROOT     # → diese rootCA.pem auf jeden Client importieren (s. u.)
```

**Option 3 – Selbstsigniert (schnell, aber Browser-Warnung).** Ohne Zusatztool;
Clients zeigen bis zum Import des Zertifikats eine Warnung:

```bash
sudo mkdir -p /etc/nginx/certs
sudo openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/essensplaner-key.pem \
  -out    /etc/nginx/certs/essensplaner.pem \
  -subj "/CN=essensplaner.local" \
  -addext "subjectAltName=DNS:essensplaner.local,IP:192.168.1.50"
```

**nginx auf HTTPS umstellen** (für Option 2 **oder** 3 identisch) – den
`server`-Block aus B.2 so anpassen bzw. ergänzen:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name essensplaner.local 192.168.1.50 _;
    return 301 https://$host$request_uri;        # HTTP → HTTPS
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name essensplaner.local 192.168.1.50 _;

    ssl_certificate     /etc/nginx/certs/essensplaner.pem;
    ssl_certificate_key /etc/nginx/certs/essensplaner-key.pem;

    root /var/www/essensplaner/dist;
    index index.html;
    client_max_body_size 10M;

    location ~ ^/(api|_)/ { proxy_pass http://127.0.0.1:8090; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
        proxy_buffering off; proxy_read_timeout 3600s; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location / { try_files $uri $uri/ /index.html; }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Root-CA / Zertifikat auf den Clients vertrauen** (nur Option 2 & 3):
`rootCA.pem` (mkcert) bzw. `essensplaner.pem` (selbstsigniert) verteilen –
- **Windows:** Doppelklick → „Zertifikat installieren" → *Lokaler Computer* →
  *Vertrauenswürdige Stammzertifizierungsstellen* (per GPO netzweit verteilbar).
- **macOS:** in die *Schlüsselbundverwaltung* importieren, auf „Immer
  vertrauen" setzen.
- **Linux:** nach `/usr/local/share/ca-certificates/` kopieren, dann
  `sudo update-ca-certificates`.

> **Real-Domain nur intern auflösbar?** Wer eine **echte** registrierte Domain
> besitzt, sie aber nur intern nutzt (Split-Horizon-DNS), kann trotzdem ein
> echtes Let's-Encrypt-Zertifikat über die **DNS-01-Challenge** beziehen
> (`certbot` mit DNS-Plugin) – dann entfällt das Verteilen einer eigenen CA.

### B.4 Firewall im LAN

```bash
# Web-Ports nur aus dem internen Netz zulassen (Subnetz anpassen):
sudo ufw allow from 192.168.1.0/24 to any port 80 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 443 proto tcp
# Minimal-Variante ohne nginx (B.2-Kasten): stattdessen 8090 freigeben
# sudo ufw allow from 192.168.1.0/24 to any port 8090 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Hat der Server **auch** eine öffentliche Schnittstelle, sorgt das `from
<Subnetz>` dafür, dass die App **nicht** aus dem Internet erreichbar ist. Reiner
LAN-Server ohne öffentliche IP: `sudo ufw allow 80,443/tcp` genügt.

### B.5 Zugriff & Superuser

Der App-Superuser wird genauso angelegt wie in [Schritt 8](#8-ersten-admin--superuser-anlegen),
nur über die **interne Adresse**, z. B. `https://essensplaner.local/_/` bzw.
`http://192.168.1.50/_/`. Danach ist die App unter der internen Adresse für alle
Geräte im Netz erreichbar.

---

## 12. Backups einrichten

Alle Nutzdaten liegen in **`/opt/pocketbase/pb_data/`** (SQLite + Uploads).

**Einfaches nächtliches Dateisystem-Backup** per Cron (2:30 Uhr):

```bash
sudo mkdir -p /var/backups/essensplaner
sudo tee /usr/local/bin/pb-backup.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F_%H%M)
DEST=/var/backups/essensplaner
tar -C /opt/pocketbase -czf "${DEST}/pb_data_${STAMP}.tar.gz" pb_data
# Nur die letzten 14 Backups behalten
ls -1t "${DEST}"/pb_data_*.tar.gz | tail -n +15 | xargs -r rm -f
EOF
sudo chmod +x /usr/local/bin/pb-backup.sh

echo "30 2 * * * root /usr/local/bin/pb-backup.sh" | sudo tee /etc/cron.d/essensplaner-backup
```

> SQLite verträgt ein `tar` im laufenden Betrieb meist problemlos; für garantiert
> konsistente Backups nutze zusätzlich die **PocketBase-eigene Backup-Funktion**
> (Admin-UI → *Settings → Backups*, auch per Cron/API automatisierbar) oder
> stoppe den Dienst kurz vor dem Kopieren.

**Wiederherstellen:**

```bash
sudo systemctl stop pocketbase
sudo tar -C /opt/pocketbase -xzf /var/backups/essensplaner/pb_data_<STAMP>.tar.gz
sudo chown -R pocketbase:pocketbase /opt/pocketbase/pb_data
sudo systemctl start pocketbase
```

---

## 13. Updates & Wartung

**App aktualisieren** (neue Version bauen und ausrollen):

```bash
cd /opt/essen-seite
sudo git pull
sudo npm ci
sudo npm run build
sudo rsync -a --delete dist/ /var/www/essensplaner/dist/
sudo chown -R www-data:www-data /var/www/essensplaner
# Falls sich API-Regeln geändert haben: setup_collections.js erneut einspielen
sudo cp migrations/setup_collections.js /opt/pocketbase/pb_migrations/
sudo chown pocketbase:pocketbase /opt/pocketbase/pb_migrations/setup_collections.js
sudo systemctl restart pocketbase
```

Die Migration ist **idempotent** – ein erneuter Lauf legt nichts doppelt an,
setzt aber alle API-Regeln auf den aktuellen, korrekten Stand.

**PocketBase aktualisieren:**

```bash
sudo systemctl stop pocketbase
cd /tmp && PB_VERSION=<neu>
curl -fsSL -o pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
unzip -o pb.zip pocketbase
sudo mv pocketbase /opt/pocketbase/pocketbase
sudo chown pocketbase:pocketbase /opt/pocketbase/pocketbase
sudo systemctl start pocketbase
```

**Wartungshinweis für Nutzer** (App-intern): als Superuser in
**Nutzer → Wartungssteuerung** planen – zeigt allen ein Banner.

---

## 14. Fehlersuche

| Symptom | Prüfen |
|---------|--------|
| App lädt nicht / 502 | `sudo systemctl status pocketbase`, `journalctl -u pocketbase -e` |
| `/api/health` liefert nichts | Läuft PocketBase auf `127.0.0.1:8090`? `curl 127.0.0.1:8090/api/health` |
| Login schlägt fehl | Existiert ein `users`-Datensatz? Richtige E-Mail/Passwort? App-Superuser angelegt? |
| „failed to load collection …" beim Setup | Nur **eine** `setup_collections.js` in `pb_migrations/`; keine alten Migrationen daneben |
| Nutzer sehen „Keine Gruppe ausgewählt" | Nutzer haben kein `group_id` → Gruppe zuweisen |
| Statische Assets 404 | Wurde `dist/` korrekt nach `/var/www/essensplaner/dist/` kopiert? nginx `root` korrekt? |
| Zertifikat erneuert nicht (Variante A) | `sudo certbot renew --dry-run`, nginx-Reload |
| nginx-Konfig fehlerhaft | `sudo nginx -t` |
| `essensplaner.local` nicht erreichbar (Variante B) | Avahi läuft? `systemctl status avahi-daemon`; Client unterstützt mDNS? Alternativ per IP testen |
| Zertifikat-Warnung im Browser (Variante B) | Root-CA (mkcert) bzw. selbstsigniertes Zertifikat auf dem Client importieren (siehe B.3) |
| Desktop-Benachrichtigungen gehen nicht (Variante B) | Nur im *secure context* – HTTPS aktivieren (B.3), über reines HTTP funktionieren sie nur auf `localhost` |

Logs:

```bash
journalctl -u pocketbase -f        # PocketBase live
sudo tail -f /var/log/nginx/error.log
```

---

## 15. Checkliste

- [ ] System aktualisiert, Zeitzone gesetzt
- [ ] Node.js ≥ 20 installiert (oder Build extern)
- [ ] Dienstbenutzer `pocketbase` + Verzeichnisse angelegt
- [ ] App gebaut, `dist/` in Web-Wurzel kopiert
- [ ] PocketBase-Binary installiert, `setup_collections.js` eingespielt
- [ ] systemd-Dienst läuft und ist `enabled`
- [ ] PocketBase-Superadmin + App-Superuser angelegt
- [ ] nginx als Reverse Proxy konfiguriert (`nginx -t` grün)
- [ ] **Variante A:** Domain zeigt auf Server, HTTPS via certbot aktiv, Auto-Renewal getestet, ufw (22/80/443)
- [ ] **Variante B:** interne Adresse (IP oder `.local`) erreichbar, HTTPS via mkcert/selbstsigniert (oder bewusst HTTP), ufw auf LAN-Subnetz beschränkt
- [ ] Backups per Cron eingerichtet und einmal getestet
- [ ] Erste Gruppe + Nutzer angelegt, Testbestellung durchgeführt

---

**Verwandte Dokumente:**
[BENUTZERHANDBUCH.md](./BENUTZERHANDBUCH.md) ·
[HANDBUCH_ADMIN_ENTWICKLER.md](./HANDBUCH_ADMIN_ENTWICKLER.md) ·
[../migrations/README.md](../migrations/README.md)
