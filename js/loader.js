(async function () {

  async function getText(url) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.text(); }
    catch (e) { console.warn('[loader] Could not fetch', url, e.message); return ''; }
  }

  async function getJSON(url) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }
    catch (e) { console.warn('[loader] Could not fetch JSON', url, e.message); return {}; }
  }

  // 1. Config
  const cfg = await getJSON('config.json');
  window.SITE_CONFIG = cfg;
  if (cfg.siteTitle) document.title = cfg.siteTitle;
  if (cfg.googleFontsUrl) document.getElementById('gfonts').href = cfg.googleFontsUrl;
  if (cfg.theme) {
    const root = document.documentElement.style;
    const t = cfg.theme;
    if (t.bg)        root.setProperty('--bg',         t.bg);
    if (t.surface)   root.setProperty('--surface',    t.surface);
    if (t.surface2)  root.setProperty('--surface2',   t.surface2);
    if (t.border)    root.setProperty('--border',     t.border);
    if (t.accent)    root.setProperty('--accent',     t.accent);
    if (t.accent2)   root.setProperty('--accent2',    t.accent2);
    if (t.furBlue)   root.setProperty('--fur-blue',   t.furBlue);
    if (t.furTan)    root.setProperty('--fur-tan',    t.furTan);
    if (t.text)      root.setProperty('--text',       t.text);
    if (t.muted)     root.setProperty('--muted',      t.muted);
    if (t.collarRed) root.setProperty('--collar-red', t.collarRed);
    if (t.pendant)   root.setProperty('--pendant',    t.pendant);
  }

  // 2. Favicon
  const faviconData = await getText('parts/favicon.txt');
  if (faviconData.trim()) document.getElementById('favicon').href = faviconData.trim();

  // 3. HTML parts
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

  // 4. Hero title from config
  if (cfg.heroTitle) {
    const h = root.querySelector('.hero-title');
    if (h) h.innerHTML = cfg.heroTitle;
  }

  // 5. Call init() directly — no event timing issues
  if (typeof init === 'function') {
    init();
  } else {
    // app.js hasn't parsed yet — wait one tick then call
    setTimeout(function() {
      if (typeof init === 'function') init();
    }, 0);
  }

})();
