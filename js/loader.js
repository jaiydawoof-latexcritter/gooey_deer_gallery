/**
 * loader.js
 * ─────────
 * Loads config.json and all HTML parts, then assembles the page.
 * Edit individual files in /parts/ or /config.json without touching
 * the full codebase.
 *
 * Load order:
 *   1. config.json          → sets title, fonts, Drive URL, theme vars
 *   2. parts/favicon.txt    → sets favicon
 *   3. parts/*.html         → injected into #app-root in order
 *   4. app.js               → runs after parts are ready (DOMContentLoaded)
 */

(async function () {
  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Fetch a text file (returns '' on error so the page still loads) */
  async function getText(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      return r.text();
    } catch (e) {
      console.warn('[loader] Could not fetch', url, e.message);
      return '';
    }
  }

  /** Fetch JSON (returns {} on error) */
  async function getJSON(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    } catch (e) {
      console.warn('[loader] Could not fetch JSON', url, e.message);
      return {};
    }
  }

  // ── 1. Load config ────────────────────────────────────────────────────────
  const cfg = await getJSON('config.json');

  // Expose config globally so app.js can read driveUrl etc.
  window.SITE_CONFIG = cfg;

  // Page title
  if (cfg.siteTitle) document.title = cfg.siteTitle;

  // Google Fonts
  if (cfg.googleFontsUrl) {
    document.getElementById('gfonts').href = cfg.googleFontsUrl;
  }

  // CSS theme variables — override defaults from config.json if provided
  if (cfg.theme) {
    const root = document.documentElement.style;
    const t = cfg.theme;
    if (t.bg)        root.setProperty('--bg',          t.bg);
    if (t.surface)   root.setProperty('--surface',     t.surface);
    if (t.surface2)  root.setProperty('--surface2',    t.surface2);
    if (t.border)    root.setProperty('--border',      t.border);
    if (t.accent)    root.setProperty('--accent',      t.accent);
    if (t.accent2)   root.setProperty('--accent2',     t.accent2);
    if (t.furBlue)   root.setProperty('--fur-blue',    t.furBlue);
    if (t.furTan)    root.setProperty('--fur-tan',     t.furTan);
    if (t.text)      root.setProperty('--text',        t.text);
    if (t.muted)     root.setProperty('--muted',       t.muted);
    if (t.collarRed) root.setProperty('--collar-red',  t.collarRed);
    if (t.pendant)   root.setProperty('--pendant',     t.pendant);
  }

  // ── 2. Favicon ────────────────────────────────────────────────────────────
  const faviconData = await getText('parts/favicon.txt');
  if (faviconData.trim()) {
    document.getElementById('favicon').href = faviconData.trim();
  }

  // ── 3. HTML parts — fetched in parallel then inserted in order ────────────
  const partFiles = [
    'parts/collar.html',
    'parts/agegate.html',
    'parts/nav.html',
    'parts/gallery.html',
    'parts/refs.html',
    'parts/about.html',
    'parts/contact.html',
    'parts/lightbox.html',
  ];

  const htmlParts = await Promise.all(partFiles.map(getText));

  const root = document.getElementById('app-root');
  root.innerHTML = htmlParts.join('\n');

  // ── 4. Apply config values into injected HTML ─────────────────────────────

  // Hero title
  if (cfg.heroTitle) {
    const h = root.querySelector('.hero h1');
    if (h) h.innerHTML = cfg.heroTitle;
  }

  // Hero description text
  if (cfg.heroText) {
    const p = root.querySelector('.hero-desc');
    if (p) p.textContent = cfg.heroText;
  }

  // Dynamically build type-filter buttons from config
  if (cfg.filterTypes && cfg.filterTypes.length) {
    const bar = root.querySelector('.type-filters');
    if (bar) {
      bar.innerHTML = cfg.filterTypes.map((t, i) =>
        `<button class="filter-btn${i === 0 ? ' active' : ''}" onclick="filterGalleryType('${t}',this)">${t === 'all' ? 'All Types' : t}</button>`
      ).join('');
    }
  }

  // Signal to app.js that the DOM is fully assembled
  document.dispatchEvent(new Event('parts-loaded'));

})();
