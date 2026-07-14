#!/usr/bin/env bash
#
# build-docs.sh — erzeugt aus den Markdown-Dateien in doc/ (+ migrations/README.md)
# eine hübsche, self-contained Dokumentations-Website unter public/docs/.
#
# Vite kopiert public/ nach dist/, daher wird die Seite vom bestehenden
# GitHub-Pages-Workflow automatisch unter /docs/ mit veröffentlicht.
#
# Voraussetzung: pandoc (lokal). Die generierten HTML-Dateien werden committet;
# CI braucht kein pandoc.
#
# Nutzung:  bash scripts/build-docs.sh   (oder: npm run build:docs)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCDIR="$ROOT/doc"
OUT="$ROOT/public/docs"
FONTS_SRC="$ROOT/src/assets/fonts"
REPO_URL="https://github.com/NachtsternBuild/essen-seite"
REPO_BLOB="$REPO_URL/blob/main"

command -v pandoc >/dev/null 2>&1 || { echo "FEHLER: pandoc nicht gefunden."; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/assets/fonts"

# ── Fonts (Marken-Match zur App) ────────────────────────────────────────────────
for f in dm-sans-v17-latin-regular dm-sans-v17-latin-500 dm-sans-v17-latin-600 \
         dm-sans-v17-latin-700 dm-mono-v16-latin-regular dm-mono-v16-latin-500; do
  cp "$FONTS_SRC/$f.woff2" "$OUT/assets/fonts/"
done

# ── Navigation (slug|Label|Icon) ────────────────────────────────────────────────
NAV_ITEMS=(
  "index.html|Übersicht|🏠"
  "benutzerhandbuch.html|Benutzerhandbuch|👤"
  "handbuch-admin-entwickler.html|Admin & Entwickler|🛠"
  "quickstart-server.html|Server-Quickstart|🚀"
  "migrations-readme.html|DB-Schema-Referenz|🗄"
)

emit_nav() {
  local active="$1" item slug label icon cls
  for item in "${NAV_ITEMS[@]}"; do
    IFS='|' read -r slug label icon <<< "$item"
    cls="nav__link"
    [ "$slug" = "$active" ] && cls="nav__link nav__link--active"
    printf '        <a class="%s" href="./%s"><span class="nav__icon" aria-hidden="true">%s</span>%s</a>\n' \
      "$cls" "$slug" "$icon" "$label"
  done
}

print_head() { # title active
  local title="$1" active="$2"
  cat <<HEAD
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Essensplaner-Dokumentation</title>
<meta name="description" content="Dokumentation für den Essensplaner: Nutzung, Betrieb und Installation.">
<link rel="stylesheet" href="./assets/style.css">
<script>(function(){try{var t=localStorage.getItem('docs-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
<button class="menu-toggle" type="button" aria-label="Menü umschalten">☰</button>
<div class="layout">
  <aside class="sidebar">
    <a class="brand" href="./index.html">
      <span class="brand__logo" aria-hidden="true">🍽</span>
      <span class="brand__text">Essensplaner<small>Dokumentation</small></span>
    </a>
    <nav class="nav" aria-label="Dokumente">
HEAD
  emit_nav "$active"
  cat <<HEAD
    </nav>
    <div class="sidebar__spacer"></div>
    <div class="sidebar__footer">
      <button id="theme-toggle" class="theme-btn" type="button">🌗 Design wechseln</button>
      <a class="side-link" href="../">← Zur App</a>
      <a class="side-link" href="${REPO_URL}" target="_blank" rel="noopener">GitHub-Repository ↗</a>
    </div>
  </aside>
  <main class="content">
HEAD
}

print_foot() {
  cat <<'FOOT'
    <footer class="doc-footer">
      <p>Essensplaner-Dokumentation · automatisch aus den Markdown-Quellen in <code>doc/</code> erzeugt.</p>
    </footer>
  </main>
</div>
<script src="./assets/app.js"></script>
</body>
</html>
FOOT
}

# ── Ein Markdown-Dokument in eine Seite rendern ─────────────────────────────────
build_doc() { # slug md title active
  local slug="$1" md="$2" title="$3" active="$4"
  local frag; frag="$(mktemp)"
  pandoc -f gfm -t html5 --no-highlight "$md" > "$frag"
  # Cross-Links .md -> .html; Code-Datei-Links -> GitHub
  sed -i \
    -e 's#href="\./BENUTZERHANDBUCH\.md"#href="./benutzerhandbuch.html"#g' \
    -e 's#href="\./HANDBUCH_ADMIN_ENTWICKLER\.md"#href="./handbuch-admin-entwickler.html"#g' \
    -e 's#href="\./QUICKSTART_SERVER\.md"#href="./quickstart-server.html"#g' \
    -e 's#href="\.\./migrations/README\.md"#href="./migrations-readme.html"#g' \
    -e "s#href=\"\./setup_collections\.js\"#href=\"${REPO_BLOB}/migrations/setup_collections.js\"#g" \
    "$frag"
  { print_head "$title" "$active"; echo '<article class="prose">'; } > "$OUT/$slug"
  cat "$frag" >> "$OUT/$slug"
  { echo '</article>'; print_foot; } >> "$OUT/$slug"
  rm -f "$frag"
  echo "  ✓ $slug"
}

# ── Landing-Seite ───────────────────────────────────────────────────────────────
build_index() {
  { print_head "Übersicht" "index.html"; } > "$OUT/index.html"
  cat >> "$OUT/index.html" <<'BODY'
<section class="hero">
  <div class="hero__icon" aria-hidden="true">🍽</div>
  <h1 class="hero__title">Essensplaner – Dokumentation</h1>
  <p class="hero__sub">Alles zur Nutzung, zum Betrieb und zur Installation – an einem Ort.</p>
</section>

<section class="cards">
  <a class="doc-card" href="./benutzerhandbuch.html">
    <div class="doc-card__icon" aria-hidden="true">👤</div>
    <h3>Benutzerhandbuch</h3>
    <p>Für alle Nutzer: Menüs, Bestellen, Bestellschluss, Rollen &amp; Rechte, FAQ.</p>
    <span class="doc-card__cta">Öffnen →</span>
  </a>
  <a class="doc-card" href="./handbuch-admin-entwickler.html">
    <div class="doc-card__icon" aria-hidden="true">🛠</div>
    <h3>Admin &amp; Entwickler</h3>
    <p>Architektur, Datenbank-Setup, vollständiges Schema, Rechtemodell, Betrieb.</p>
    <span class="doc-card__cta">Öffnen →</span>
  </a>
  <a class="doc-card" href="./quickstart-server.html">
    <div class="doc-card__icon" aria-hidden="true">🚀</div>
    <h3>Server-Quickstart</h3>
    <p>Schritt-für-Schritt-Deployment auf Ubuntu Server 26.04 LTS mit nginx &amp; HTTPS.</p>
    <span class="doc-card__cta">Öffnen →</span>
  </a>
  <a class="doc-card" href="./migrations-readme.html">
    <div class="doc-card__icon" aria-hidden="true">🗄</div>
    <h3>DB-Schema-Referenz</h3>
    <p>PocketBase-Setup, alle Collections, Felder und API-Regeln im Detail.</p>
    <span class="doc-card__cta">Öffnen →</span>
  </a>
</section>
BODY
  { print_foot; } >> "$OUT/index.html"
  echo "  ✓ index.html"
}

# ── Stylesheet ──────────────────────────────────────────────────────────────────
cat > "$OUT/assets/style.css" <<'CSS'
/* Essensplaner-Dokumentation — generiert von scripts/build-docs.sh */
@font-face{font-family:'DM Sans';font-weight:400;font-display:swap;src:url(./fonts/dm-sans-v17-latin-regular.woff2) format('woff2');}
@font-face{font-family:'DM Sans';font-weight:500;font-display:swap;src:url(./fonts/dm-sans-v17-latin-500.woff2) format('woff2');}
@font-face{font-family:'DM Sans';font-weight:600;font-display:swap;src:url(./fonts/dm-sans-v17-latin-600.woff2) format('woff2');}
@font-face{font-family:'DM Sans';font-weight:700;font-display:swap;src:url(./fonts/dm-sans-v17-latin-700.woff2) format('woff2');}
@font-face{font-family:'DM Mono';font-weight:400;font-display:swap;src:url(./fonts/dm-mono-v16-latin-regular.woff2) format('woff2');}
@font-face{font-family:'DM Mono';font-weight:500;font-display:swap;src:url(./fonts/dm-mono-v16-latin-500.woff2) format('woff2');}

:root{
  --accent:#d97706; --accent-2:#b45309; --info:#2563eb;
  --bg:#f0ede8; --surface:#fff; --surface-2:#f5f3ef;
  --border:#d8d4ca; --border-strong:#b8b3a8;
  --text:#141210; --text-muted:#5c5449;
  --sidebar-bg:#1c1917; --sidebar-text:#d6d3d1; --sidebar-muted:#8a827a;
  --radius:10px; --radius-lg:14px;
  --shadow-sm:0 1px 3px rgba(0,0,0,.08); --shadow-md:0 4px 12px rgba(0,0,0,.10); --shadow-lg:0 10px 30px rgba(0,0,0,.16);
  --font:'DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'DM Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;
}
[data-theme="dark"]{
  --bg:#171310; --surface:#221c17; --surface-2:#2b231d;
  --border:#3a3129; --border-strong:#554636;
  --text:#faf8f5; --text-muted:#b3aaa0;
  --sidebar-bg:#120f0d;
  --shadow-sm:0 1px 3px rgba(0,0,0,.4); --shadow-md:0 4px 12px rgba(0,0,0,.5); --shadow-lg:0 10px 30px rgba(0,0,0,.6);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme]){
    --bg:#171310; --surface:#221c17; --surface-2:#2b231d;
    --border:#3a3129; --border-strong:#554636;
    --text:#faf8f5; --text-muted:#b3aaa0; --sidebar-bg:#120f0d;
  }
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.65;-webkit-font-smoothing:antialiased;}

.layout{display:flex;min-height:100vh;}

/* ── Sidebar ── */
.sidebar{
  width:264px;flex-shrink:0;background:var(--sidebar-bg);color:var(--sidebar-text);
  position:sticky;top:0;height:100vh;display:flex;flex-direction:column;
  padding:22px 16px;gap:6px;overflow-y:auto;
}
.brand{display:flex;align-items:center;gap:11px;color:#fff;text-decoration:none;padding:6px 8px 16px;}
.brand__logo{font-size:1.7rem;line-height:1;}
.brand__text{display:flex;flex-direction:column;font-weight:700;font-size:1.05rem;}
.brand__text small{font-weight:500;font-size:.72rem;color:var(--sidebar-muted);letter-spacing:.04em;text-transform:uppercase;}
.nav{display:flex;flex-direction:column;gap:2px;}
.nav__link{
  display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;
  color:var(--sidebar-text);text-decoration:none;font-size:.92rem;font-weight:500;
  border:1px solid transparent;transition:background .12s,color .12s;
}
.nav__link:hover{background:rgba(255,255,255,.07);color:#fff;}
.nav__link--active{background:color-mix(in srgb,var(--accent) 26%,transparent);color:#fff;border-color:color-mix(in srgb,var(--accent) 55%,transparent);}
.nav__icon{font-size:1.05rem;width:1.3em;text-align:center;}
.sidebar__spacer{flex:1;}
.sidebar__footer{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1);}
.theme-btn{
  font:inherit;font-size:.85rem;font-weight:600;cursor:pointer;text-align:left;
  background:rgba(255,255,255,.06);color:var(--sidebar-text);
  border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 12px;
}
.theme-btn:hover{background:rgba(255,255,255,.12);color:#fff;}
.side-link{color:var(--sidebar-muted);text-decoration:none;font-size:.82rem;padding:2px 4px;}
.side-link:hover{color:#fff;text-decoration:underline;}

/* ── Content ── */
.menu-toggle{
  display:none;position:fixed;top:12px;left:12px;z-index:60;
  width:42px;height:42px;font-size:1.2rem;cursor:pointer;
  background:var(--surface);color:var(--text);border:1px solid var(--border);
  border-radius:10px;box-shadow:var(--shadow-md);
}
.content{flex:1;min-width:0;padding:44px 40px 64px;display:flex;flex-direction:column;align-items:center;}
.prose{max-width:840px;width:100%;}

/* ── Landing ── */
.hero{
  width:100%;max-width:840px;text-align:center;color:#fff;border-radius:var(--radius-lg);
  padding:46px 28px;margin-bottom:26px;box-shadow:var(--shadow-lg);
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb,var(--accent) 55%,#000) 0%, transparent 60%),
    linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb,var(--accent) 68%,#000) 100%);
}
.hero__icon{font-size:3rem;}
.hero__title{font-size:2.1rem;font-weight:700;margin:8px 0 6px;}
.hero__sub{font-size:1.05rem;opacity:.92;}
.cards{width:100%;max-width:840px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;}
.doc-card{
  display:flex;flex-direction:column;gap:8px;padding:22px;text-decoration:none;color:var(--text);
  background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm);transition:transform .14s,border-color .14s,box-shadow .14s;
}
.doc-card:hover{transform:translateY(-3px);border-color:var(--accent);box-shadow:var(--shadow-md);}
.doc-card__icon{font-size:1.9rem;}
.doc-card h3{font-size:1.15rem;font-weight:700;}
.doc-card p{color:var(--text-muted);font-size:.92rem;flex:1;}
.doc-card__cta{color:var(--accent-2);font-weight:600;font-size:.9rem;}
[data-theme="dark"] .doc-card__cta{color:var(--accent);}

/* ── Prose typography ── */
.prose{font-size:1rem;}
.prose>*+*{margin-top:1rem;}
.prose h1,.prose h2,.prose h3,.prose h4{line-height:1.25;font-weight:700;scroll-margin-top:20px;}
.prose h1{font-size:2rem;margin:.2rem 0 1rem;padding-bottom:.5rem;border-bottom:3px solid var(--accent);}
.prose h2{font-size:1.45rem;margin-top:2.4rem;padding-bottom:.35rem;border-bottom:1px solid var(--border);}
.prose h3{font-size:1.18rem;margin-top:1.8rem;}
.prose h4{font-size:1.02rem;margin-top:1.4rem;color:var(--text-muted);}
.prose p,.prose li{color:var(--text);}
.prose a{color:var(--info);text-decoration:none;font-weight:500;}
.prose a:hover{text-decoration:underline;}
.prose strong{font-weight:700;}
.prose ul,.prose ol{padding-left:1.4rem;}
.prose li+li{margin-top:.3rem;}
.prose li>ul,.prose li>ol{margin-top:.3rem;}
.prose hr{border:none;border-top:1px solid var(--border);margin:2.4rem 0;}
.prose img{max-width:100%;}

/* Inline code */
.prose code{
  font-family:var(--mono);font-size:.86em;background:var(--surface-2);
  padding:.12em .4em;border-radius:5px;border:1px solid var(--border);
  overflow-wrap:anywhere;
}
/* Code blocks */
.prose pre{
  background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px 18px;overflow-x:auto;font-size:.86rem;line-height:1.5;
}
.prose pre code{background:none;border:none;padding:0;font-size:inherit;white-space:pre;}

/* Blockquotes (Hinweise/Warnungen) */
.prose blockquote{
  background:var(--surface-2);border-left:4px solid var(--accent);
  border-radius:0 var(--radius) var(--radius) 0;padding:12px 16px;color:var(--text-muted);
}
.prose blockquote>*+*{margin-top:.5rem;}
.prose blockquote code{background:var(--surface);}

/* Tables */
.prose table{
  display:block;width:max-content;max-width:100%;overflow-x:auto;
  border-collapse:collapse;font-size:.92rem;border:1px solid var(--border);border-radius:var(--radius);
}
.prose thead th{background:var(--surface-2);text-align:left;font-weight:700;}
.prose th,.prose td{border:1px solid var(--border);padding:8px 12px;vertical-align:top;}
.prose tbody tr:nth-child(even){background:color-mix(in srgb,var(--surface-2) 55%,transparent);}
.prose table code{white-space:nowrap;}

.doc-footer{width:100%;max-width:840px;margin-top:48px;padding-top:18px;border-top:1px solid var(--border);}
.doc-footer p{color:var(--text-muted);font-size:.82rem;}

/* ── Responsive ── */
@media (max-width:900px){
  .menu-toggle{display:block;}
  .sidebar{position:fixed;left:0;top:0;z-index:55;transform:translateX(-100%);transition:transform .2s ease;box-shadow:var(--shadow-lg);}
  .sidebar.open{transform:none;}
  .content{padding:70px 18px 48px;}
  .prose h1{font-size:1.6rem;}
  .prose h2{font-size:1.28rem;}
  .hero{padding:34px 18px;}
  .hero__title{font-size:1.6rem;}
}
CSS

# ── Theme-Toggle + Mobile-Menü ──────────────────────────────────────────────────
cat > "$OUT/assets/app.js" <<'JS'
(function () {
  var root = document.documentElement;
  function current() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('docs-theme', next); } catch (e) {}
    });
  }
  var menu = document.querySelector('.menu-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (menu && sidebar) {
    menu.addEventListener('click', function () { sidebar.classList.toggle('open'); });
    document.querySelectorAll('.nav__link').forEach(function (a) {
      a.addEventListener('click', function () { sidebar.classList.remove('open'); });
    });
  }
})();
JS

echo "Erzeuge Dokumentations-Website in public/docs/ …"
build_index
build_doc "benutzerhandbuch.html"          "$DOCDIR/BENUTZERHANDBUCH.md"        "Benutzerhandbuch"       "benutzerhandbuch.html"
build_doc "handbuch-admin-entwickler.html" "$DOCDIR/HANDBUCH_ADMIN_ENTWICKLER.md" "Admin & Entwickler"   "handbuch-admin-entwickler.html"
build_doc "quickstart-server.html"         "$DOCDIR/QUICKSTART_SERVER.md"       "Server-Quickstart"      "quickstart-server.html"
build_doc "migrations-readme.html"         "$ROOT/migrations/README.md"         "DB-Schema-Referenz"     "migrations-readme.html"
echo "Fertig. Öffnen: public/docs/index.html"
