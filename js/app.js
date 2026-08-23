// ══ GOOGLE DRIVE CONNECTION ══
const DRIVE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.driveUrl)
  ? window.SITE_CONFIG.driveUrl
  : 'https://script.google.com/macros/s/AKfycbzchULgfbJ0tAJ_6i3YT2_w7iQqci4_I5tXSa59as89d52HmWZ5_Zg0NztnGLHESDYt/exec';

// ══ API KEY FIX: reads apiKey from config.json and sends it as a header ══
async function fetchFromDrive(type) {
  try {
    const apiKey = window.SITE_CONFIG?.apiKey || '';
    const res = await fetch(DRIVE_URL + '?type=' + type, {
      headers: {
        'x-api-key': apiKey
      }
    });
    if (!res.ok) throw new Error('API responded with ' + res.status);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) {
    console.error('Drive fetch failed:', e);
    return [];
  }
}

let allGallery=[], allRefs=[];
let nsfwUnlocked=false, nsfwVisible=false;
let galleryTypeFilter='all', galleryRatingFilter='all', refsRatingFilter='all', galleryArtistFilter='all', galleryCharacterFilter='all';
let lightboxIndex=0, visibleItems=[];

// ratingVisible: can this rating be shown given current unlock state?
function ratingVisible(rating) {
  if (rating === 'SFW') return true;
  return nsfwUnlocked && nsfwVisible;
}

// ratingMatchesFilter: does this item's rating match the active rating filter?
// Hierarchy: SFW < Suggestive < NSFW
// 'SFW Only' → only SFW
// 'Suggestive' → SFW + Suggestive
// 'NSFW' → all three
// 'all' → all (subject to ratingVisible)
function ratingMatchesFilter(itemRating, filter) {
  if (filter === 'all') return true;
  if (filter === 'SFW') return itemRating === 'SFW';
  if (filter === 'Suggestive') return itemRating === 'SFW' || itemRating === 'Suggestive';
  if (filter === 'NSFW') return true; // all ratings
  return true;
}

function badgeClass(r) {
  if (r==='NSFW') return 'badge-nsfw';
  if (r==='Suggestive') return 'badge-suggestive';
  return 'badge-sfw';
}

// ══ FIX 2: Update rating filter button visibility based on NSFW lock state ══
function syncRatingButtons() {
  // Suggestive and NSFW buttons only visible when unlocked
  ['g-r-sug', 'g-r-nsfw', 'r-r-sug', 'r-r-nsfw'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (nsfwUnlocked && nsfwVisible) ? '' : 'none';
  });

  // Reset to 'all' if current filter is now hidden
  if (!(nsfwUnlocked && nsfwVisible)) {
    if (galleryRatingFilter === 'NSFW' || galleryRatingFilter === 'Suggestive') {
      galleryRatingFilter = 'all';
      document.querySelectorAll('#page-gallery .rating-filter-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('g-r-all')?.classList.add('active');
    }
    if (refsRatingFilter === 'NSFW' || refsRatingFilter === 'Suggestive') {
      refsRatingFilter = 'all';
      document.querySelectorAll('#page-refs .rating-filter-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('r-r-all')?.classList.add('active');
    }
  }
}

async function init() {
  document.getElementById('gallery-grid').innerHTML =
    '<div style="padding:60px;text-align:center;color:var(--muted)">Loading gallery from Google Drive...</div>';

  const [galleryData, refsData] = await Promise.all([
    fetchFromDrive('gallery'),
    fetchFromDrive('refs')
  ]);

  allGallery = galleryData.length ? galleryData : [];
  allRefs    = refsData.length   ? refsData    : [];

  document.querySelectorAll('#g-r-sug, #g-r-nsfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#r-r-sug, #r-r-nsfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#g-r-all, #g-r-sfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#r-r-all, #r-r-sfw').forEach(el => el.classList.add('rating-filter-btn'));

  syncRatingButtons();
  renderGallery();
  renderRefs();
  updateStats();
  populateSidebar();
  // ── LIGHTBOX FIX: called here so the element exists in DOM ──
  initLightboxListeners();
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  // Preserve scroll position so filter changes don't jump to top
  const scrollY = window.scrollY;
  grid.innerHTML = '';
  visibleItems = allGallery.filter(item => {
    const typeOk      = galleryTypeFilter === 'all' || item.type === galleryTypeFilter;
    const ratingOk    = ratingMatchesFilter(item.rating, galleryRatingFilter);
    const artistOk    = galleryArtistFilter === 'all' || item.artist === galleryArtistFilter;
    const chars       = Array.isArray(item.characters) ? item.characters : [];
    const characterOk = galleryCharacterFilter === 'all' || chars.includes(galleryCharacterFilter);
    return typeOk && ratingOk && artistOk && characterOk && ratingVisible(item.rating);
  });

  document.getElementById('gallery-empty').classList.toggle('visible', visibleItems.length === 0);

  visibleItems.forEach((item, idx) => {
    const restricted = !nsfwUnlocked || !nsfwVisible
      ? (item.rating === 'NSFW' || item.rating === 'Suggestive')
      : false;
    const el = document.createElement('div');
    el.className = `gallery-item${restricted ? '' : ' nsfw-unlocked'}`;
    el.style.animationDelay = `${idx * 0.04}s`;
    const isVideo = item.src && item.src.toLowerCase().endsWith('.mp4');
    const mediaEl = isVideo
      ? `<video src="${item.src}" autoplay loop muted playsinline preload="metadata" style="width:100%;display:block;"></video>`
      : `<img src="${item.src}" alt="${item.title}" loading="lazy" width="400" height="400" style="width:100%;height:auto;display:block;">`;
    el.innerHTML = `
      <div class="${restricted ? 'nsfw-blur' : ''}">
        ${mediaEl}
        ${isVideo ? '<div class="anim-badge">▶ Animation</div>' : ''}
      </div>
      ${restricted ? `<div class="nsfw-cover"><span>${item.rating.toUpperCase()}</span><p>Enable NSFW to view</p></div>` : ''}
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
  // Restore scroll after DOM update
  requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }));
}

function renderRefs() {
  const grid = document.getElementById('refs-grid');
  grid.innerHTML = '';
  const filtered = allRefs.filter(r => {
    const ratingOk = ratingMatchesFilter(r.rating, refsRatingFilter);
    return ratingOk && ratingVisible(r.rating);
  });

  document.getElementById('refs-empty').classList.toggle('visible', filtered.length === 0);

  filtered.forEach((ref, idx) => {
    const restricted = !nsfwUnlocked || !nsfwVisible
      ? (ref.rating === 'NSFW' || ref.rating === 'Suggestive')
      : false;
    const el = document.createElement('div');
    el.className = `ref-card${restricted ? '' : ' nsfw-unlocked'}`;
    el.style.animationDelay = `${idx * 0.06}s`;
    el.innerHTML = `
      <div class="ref-img-wrap${restricted ? ' nsfw-blur' : ''}">
        <img src="${ref.src}" alt="${ref.title}" loading="lazy">
      </div>
      ${restricted ? `<div class="ref-nsfw-cover"><span>${ref.rating.toUpperCase()}</span><p>Enable NSFW to view</p></div>` : ''}
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

function filterGalleryArtist(artist, btn) {
  galleryArtistFilter = artist;
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery();
}

function populateSidebar() {
  const list = document.getElementById('artist-list');
  const pool = allGallery.filter(i =>
    galleryTypeFilter === 'all' || i.type === galleryTypeFilter
  );
  const artists = [...new Set(pool.map(i => i.artist))].sort();
  const totalCount = pool.length;

  list.innerHTML = `<button class="sidebar-btn active" onclick="filterGalleryArtist('all',this)">All Artists (${totalCount})</button>`;

  if (galleryArtistFilter !== 'all' && !artists.includes(galleryArtistFilter)) {
    galleryArtistFilter = 'all';
  }

  artists.forEach(artist => {
    const count = pool.filter(i => i.artist === artist).length;
    const btn = document.createElement('button');
    btn.className = 'sidebar-btn' + (galleryArtistFilter === artist ? ' active' : '');
    btn.title = artist;
    btn.textContent = `${artist} (${count})`;
    btn.onclick = function() { filterGalleryArtist(artist, this); };
    list.appendChild(btn);
  });

  if (galleryArtistFilter === 'all') {
    list.querySelector('.sidebar-btn').classList.add('active');
  }
}

function toggleSidebarSection(titleEl) {
  titleEl.classList.toggle('collapsed');
  titleEl.nextElementSibling.classList.toggle('collapsed');
}

function filterGalleryType(type, btn) {
  galleryTypeFilter = type;
  galleryArtistFilter = 'all';
  document.querySelectorAll('#page-gallery .type-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  populateSidebar();
  renderGallery();
}

function filterGalleryRating(rating, btn) {
  if ((rating === 'NSFW' || rating === 'Suggestive') && !(nsfwUnlocked && nsfwVisible)) return;
  galleryRatingFilter = rating;
  document.querySelectorAll('#page-gallery .rating-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery();
}

function filterGalleryCharacter(character, btn) {
  galleryCharacterFilter = character;
  document.querySelectorAll('#page-gallery .char-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery();
}

function filterRefsRating(rating, btn) {
  if ((rating === 'NSFW' || rating === 'Suggestive') && !(nsfwUnlocked && nsfwVisible)) return;
  refsRatingFilter = rating;
  document.querySelectorAll('#page-refs .rating-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRefs();
}

function unlockNSFW() {
  nsfwUnlocked = true;
  nsfwVisible  = true;
  document.getElementById('age-gate').classList.add('hidden');
  document.getElementById('nsfw-toggle').classList.add('on');
  document.getElementById('nsfw-label').classList.add('on');
  syncRatingButtons();
  renderGallery();
  renderRefs();
}

function dismissGate() {
  document.getElementById('age-gate').classList.add('hidden');
}

function toggleNSFW() {
  if (!nsfwUnlocked) {
    document.getElementById('age-gate').classList.remove('hidden');
    return;
  }
  nsfwVisible = !nsfwVisible;
  document.getElementById('nsfw-toggle').classList.toggle('on', nsfwVisible);
  document.getElementById('nsfw-label').classList.toggle('on', nsfwVisible);
  syncRatingButtons();
  renderGallery();
  renderRefs();
}

function openLightbox(idx) {
  lightboxIndex = idx;
  showLightboxItem();
  document.querySelector('.lb-nav').style.display = 'flex';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function showLightboxItem() {
  const item = visibleItems[lightboxIndex];
  if (!item) return;
  const wrap = document.querySelector('.lb-img-wrap');
  const isVideo = item.src && item.src.toLowerCase().endsWith('.mp4');
  if (isVideo) {
    wrap.innerHTML = `<video src="${item.src}" autoplay loop muted playsinline controls style="max-width:100%;max-height:70vh;display:block;"></video>`;
  } else {
    wrap.innerHTML = `<img id="lb-img" src="${item.src}" alt="${item.title}" style="max-width:100%;max-height:70vh;object-fit:contain;display:block;">`;
  }
  document.getElementById('lb-title').textContent = item.title;
  document.getElementById('lb-sub').textContent = `by ${item.artist} · ${item.type} · ${item.rating}`;
}

function openRefLightbox(ref) {
  const wrap = document.querySelector('.lb-img-wrap');
  wrap.innerHTML = `<img id="lb-img" src="${ref.src}" alt="${ref.title}" style="max-width:100%;max-height:70vh;object-fit:contain;display:block;">`;
  document.getElementById('lb-title').textContent = ref.title;
  document.getElementById('lb-sub').textContent = `by ${ref.artist} · ${ref.version} · ${ref.rating}`;
  document.querySelector('.lb-nav').style.display = 'none';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function navLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + visibleItems.length) % visibleItems.length;
  showLightboxItem();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

// ── LIGHTBOX FIX: moved into a function called from init() so the
//    lightbox element exists in the DOM before we try to attach listeners.
//    Previously this ran at script parse time, before loader.js had
//    injected the HTML parts, causing "Cannot read properties of null". ──
function initLightboxListeners() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.addEventListener('click', e => {
    if (e.target === lb) closeLightbox();
  });
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   navLightbox(-1);
  if (e.key === 'ArrowRight')  navLightbox(1);
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  const map = { gallery: 'Gallery', refs: 'Ref Sheets', about: 'About', contact: 'Contact' };
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.textContent === map[name]) l.classList.add('active');
  });
}

function updateStats() {
  document.getElementById('stat-total').textContent = allGallery.length;
  document.getElementById('stat-refs').textContent = allRefs.length;
  const artists = new Set([...allGallery.map(i => i.artist), ...allRefs.map(r => r.artist)]);
  document.getElementById('stat-artists').textContent = artists.size;
}

function submitForm() {
  const n = document.getElementById('cf-name').value.trim();
  const e = document.getElementById('cf-email').value.trim();
  const m = document.getElementById('cf-message').value.trim();
  if (!n || !e || !m) { alert('Please fill in all required fields.'); return; }
  document.getElementById('contact-form').style.display = 'none';
  document.getElementById('form-success').classList.add('visible');
}

document.addEventListener('parts-loaded', init);
if (document.getElementById('app-root') && document.getElementById('app-root').innerHTML.trim()) {
  init();
}
