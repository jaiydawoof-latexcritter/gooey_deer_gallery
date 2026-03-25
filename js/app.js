// ══ GOOGLE DRIVE CONNECTION ══
const DRIVE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.driveUrl)
  ? window.SITE_CONFIG.driveUrl
    : 'https://script.google.com/macros/s/AKfycbzchULgfbJ0tAJ_6i3YT2_w7iQqci4_I5tXSa59as89d52HmWZ5_Zg0NztnGLHESDYt/exec';

async function fetchFromDrive(type) {
    try {
          const res = await fetch(DRIVE_URL + '?type=' + type);
          const data = await res.json();
          return Array.isArray(data) ? data : [];
    } catch(e) {
          console.error('Drive fetch failed:', e);
          return [];
    }
}

let allGallery=[], allRefs=[];
let nsfwUnlocked=false, nsfwVisible=false;
let galleryTypeFilter='all', galleryRatingFilter='all', refsRatingFilter='all', galleryArtistFilter='all';
let lightboxIndex=0, visibleItems=[];

function normaliseRating(r) {
    if (!r) return 'SFW';
    if (r.toString().trim().toLowerCase() === 'nsfw') return 'NSFW';
    return 'SFW';
}
function ratingVisible(rating) {
    if (!nsfwUnlocked && rating === 'NSFW') return false;
    return true;
}
function badgeClass(r) {
    return r === 'NSFW' ? 'badge-nsfw' : 'badge-sfw';
}

// ══ HERO BANNER ══════════════════════════════════════════════════════════════
function buildHeroBanner(items) {
    const track = document.getElementById('hero-banner-track');
    if (!track || !items.length) return;
    // Prefer SFW items for the banner; fall back to all if not enough
  const sfwItems = items.filter(i => i.rating === 'SFW');
    const pool = sfwItems.length >= 6 ? sfwItems : items;
    // Shuffle randomly so it's different every reload
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 12);
    track.innerHTML = '';
    shuffled.forEach(item => {
          const div = document.createElement('div');
          div.className = 'hero-banner-img';
          div.style.backgroundImage = `url('${item.src}')`;
          track.appendChild(div);
    });
}

// ══ INIT ═════════════════════════════════════════════════════════════════════
async function init() {
    const grid = document.getElementById('gallery-grid');
    if (grid) grid.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted)">Loading gallery...</div>';

  const [galleryData, refsData] = await Promise.all([
        fetchFromDrive('gallery'),
        fetchFromDrive('refs')
      ]);

  allGallery = galleryData.map(i => ({ ...i, rating: normaliseRating(i.rating) }));
    allRefs    = refsData.map(r   => ({ ...r, rating: normaliseRating(r.rating) }));

  buildHeroBanner(allGallery);
    renderGallery();
    renderRefs();
    updateStats();
    populateSidebar();
}

// ══ GALLERY ══════════════════════════════════════════════════════════════════
function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

  visibleItems = allGallery.filter(item => {
        const typeOk   = galleryTypeFilter === 'all' || item.type   === galleryTypeFilter;
        const ratingOk = galleryRatingFilter === 'all' || item.rating === galleryRatingFilter;
        const artistOk = galleryArtistFilter === 'all' || item.artist === galleryArtistFilter;
        return typeOk && ratingOk && artistOk && ratingVisible(item.rating);
  });

  document.getElementById('gallery-empty').classList.toggle('visible', visibleItems.length === 0);

  visibleItems.forEach((item, idx) => {
        const restricted = !nsfwUnlocked && item.rating === 'NSFW';
        const el = document.createElement('div');
        el.className = `gallery-item${restricted ? '' : ' nsfw-unlocked'}`;
        el.style.animationDelay = `${idx * 0.04}s`;
        const imgAttr = restricted ? `data-src="${item.src}" src=""` : `src="${item.src}"`;
        el.innerHTML = `
              <div class="${restricted ? 'nsfw-blur' : ''}">
                      <img ${imgAttr} alt="${item.title}" loading="lazy">
                            </div>
                                  ${restricted ? `<div class="nsfw-cover"><span>NSFW</span><p>Enable NSFW to view</p></div>` : ''}
                                        <div class="item-info">
                                                <span class="item-artist">by ${item.artist}</span>
                                                        <div>
                                                                  <span class="item-type">${item.type}</span>
                                                                            <span class="item-badge ${badgeClass(item.rating)}">${item.rating}</span>
                                                                                    </div>
                                                                                          </div>`;
        el.addEventListener('click', () => { if (restricted) return; openLightbox(idx); });
        grid.appendChild(el);
  });
}

// ══ REFS ═════════════════════════════════════════════════════════════════════
function renderRefs() {
    const grid = document.getElementById('refs-grid');
    if (!grid) return;
    grid.innerHTML = '';

  const filtered = allRefs.filter(r => {
        const ratingOk = refsRatingFilter === 'all' || r.rating === refsRatingFilter;
        return ratingOk && ratingVisible(r.rating);
  });

  const emptyEl = document.getElementById('refs-empty');
    if (emptyEl) emptyEl.classList.toggle('visible', filtered.length === 0);

  filtered.forEach((ref, idx) => {
        const restricted = !nsfwUnlocked && ref.rating === 'NSFW';
        const el = document.createElement('div');
        el.className = `ref-card${restricted ? '' : ' nsfw-unlocked'}`;
        el.style.animationDelay = `${idx * 0.06}s`;
        const imgAttr = restricted ? `data-src="${ref.src}" src=""` : `src="${ref.src}"`;
        el.innerHTML = `
              <div class="ref-img-wrap${restricted ? ' nsfw-blur' : ''}">
                      <img ${imgAttr} alt="${ref.title}" loading="lazy">
                            </div>
                                  ${restricted ? `<div class="ref-nsfw-cover"><span>NSFW</span><p>Enable NSFW to view</p></div>` : ''}
                                        <div class="ref-info">
                                                <div>
                                                          <div class="ref-title">${ref.title}</div>
                                                                    <div class="ref-artist">by ${ref.artist}</div>
                                                                            </div>
                                                                                    <div class="ref-badges">
                                                                                              <span class="ref-version">${ref.version}</span>
                                                                                                        <span class="item-badge ${badgeClass(ref.rating)}">${ref.rating}</span>
                                                                                                                </div>
                                                                                                                      </div>`;
        if (!restricted) el.addEventListener('click', () => openRefLightbox(ref));
        grid.appendChild(el);
  });
}

// ══ SIDEBAR ══════════════════════════════════════════════════════════════════
function filterGalleryArtist(artist, btn) {
    galleryArtistFilter = artist;
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery();
}

function populateSidebar() {
    const list = document.getElementById('artist-list');
    if (!list) return;
    const pool = allGallery.filter(i => galleryTypeFilter === 'all' || i.type === galleryTypeFilter);
    const artists = [...new Set(pool.map(i => i.artist))].sort();
    const totalCount = pool.length;
    list.innerHTML = `<button class="sidebar-btn active" onclick="filterGalleryArtist('all',this)">All Artists (${totalCount})</button>`;
    if (galleryArtistFilter !== 'all' && !artists.includes(galleryArtistFilter)) galleryArtistFilter = 'all';
    artists.forEach(artist => {
          const count = pool.filter(i => i.artist === artist).length;
          const btn = document.createElement('button');
          btn.className = 'sidebar-btn' + (galleryArtistFilter === artist ? ' active' : '');
          btn.title = artist;
          btn.textContent = `${artist} (${count})`;
          btn.onclick = function() { filterGalleryArtist(artist, this); };
          list.appendChild(btn);
    });
    if (galleryArtistFilter === 'all') list.querySelector('.sidebar-btn').classList.add('active');
}

function toggleSidebarSection(titleEl) {
    titleEl.classList.toggle('collapsed');
    titleEl.nextElementSibling.classList.toggle('collapsed');
}

// ══ FILTERS ══════════════════════════════════════════════════════════════════
function filterGalleryType(type, btn) {
    galleryTypeFilter = type;
    document.querySelectorAll('#page-gallery .filter-btn').forEach(b => {
          if (['All','Gooey','Pooltoy','Normal','Fursuit','Latex','Other'].includes(b.textContent))
                  b.classList.remove('active');
    });
    btn.classList.add('active');
    populateSidebar();
    renderGallery();
}

function filterGalleryRating(rating, btn) {
    galleryRatingFilter = rating;
    ['g-r-all','g-r-sfw','g-r-nsfw'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    btn.classList.add('active');
    renderGallery();
}

function filterRefsRating(rating, btn) {
    refsRatingFilter = rating;
    ['r-r-all','r-r-sfw','r-r-nsfw'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    btn.classList.add('active');
    renderRefs();
}

// ══ NSFW GATE ════════════════════════════════════════════════════════════════
function unlockNSFW() {
    nsfwUnlocked = nsfwVisible = true;
    document.getElementById('age-gate').classList.add('hidden');
    document.getElementById('nsfw-toggle').classList.add('on');
    document.getElementById('nsfw-label').classList.add('on');
    renderGallery();
    renderRefs();
}

function dismissGate() {
    document.getElementById('age-gate').classList.add('hidden');
}

function toggleNSFW() {
    if (!nsfwUnlocked) { document.getElementById('age-gate').classList.remove('hidden'); return; }
    nsfwVisible = !nsfwVisible;
    document.getElementById('nsfw-toggle').classList.toggle('on', nsfwVisible);
  js// ══ BOOTSTRAP ════════════════════════════════════════════════════════════════
document.addEventListener('parts-loaded', init);
if (document.getElementById('app-root') && document.getElementById('app-root').innerHTML.trim()) {
  init();
}
