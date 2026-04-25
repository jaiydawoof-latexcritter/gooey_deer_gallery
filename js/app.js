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

// ══ FIX 1: ratingVisible now respects BOTH nsfwUnlocked AND nsfwVisible ══
// Previously only checked nsfwUnlocked, so toggling NSFW off had no effect
// on what was rendered.
function ratingVisible(rating) {
  const isRestricted = rating === 'NSFW' || rating === 'Suggestive';
  if (!isRestricted) return true;
  return nsfwUnlocked && nsfwVisible;
}

function badgeClass(r) {
  if (r==='NSFW') return 'badge-nsfw';
  if (r==='Suggestive') return 'badge-suggestive';
  return 'badge-sfw';
}

// ══ FIX 2: Update rating filter button visibility based on NSFW lock state ══
// Suggestive and NSFW filter buttons are hidden when not unlocked so users
// can't select a filter that will always show zero results.
function syncRatingButtons() {
  const restrictedGallery = ['g-r-sug', 'g-r-nsfw'];
  const restrictedRefs    = ['r-r-sug', 'r-r-nsfw'];
  [...restrictedGallery, ...restrictedRefs].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (nsfwUnlocked && nsfwVisible) ? '' : 'none';
  });

  // FIX 3: If a restricted filter was active when NSFW gets toggled off,
  // reset it to 'all' so display state and filter state stay in sync.
  if (!(nsfwUnlocked && nsfwVisible)) {
    if (galleryRatingFilter === 'NSFW' || galleryRatingFilter === 'Suggestive') {
      galleryRatingFilter = 'all';
      const allBtn = document.getElementById('g-r-all');
      document.querySelectorAll('#page-gallery .rating-filter-btn').forEach(b => b.classList.remove('active'));
      if (allBtn) allBtn.classList.add('active');
    }
    if (refsRatingFilter === 'NSFW' || refsRatingFilter === 'Suggestive') {
      refsRatingFilter = 'all';
      const allBtn = document.getElementById('r-r-all');
      document.querySelectorAll('#page-refs .rating-filter-btn').forEach(b => b.classList.remove('active'));
      if (allBtn) allBtn.classList.add('active');
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

  // Add semantic class to rating filter buttons for reliable selection
  document.querySelectorAll('#g-r-sug, #g-r-nsfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#r-r-sug, #r-r-nsfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#g-r-all, #g-r-sfw').forEach(el => el.classList.add('rating-filter-btn'));
  document.querySelectorAll('#r-r-all, #r-r-sfw').forEach(el => el.classList.add('rating-filter-btn'));

  syncRatingButtons();
  renderGallery();
  renderRefs();
  updateStats();
  populateSidebar();
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';
  visibleItems = allGallery.filter(item => {
    const typeOk   = galleryTypeFilter === 'all' || item.type === galleryTypeFilter;
    // FIX 4: Rating filter now also respects ratingVisible so explicit rating
    // filter selection can't surface locked content.
    const ratingOk = galleryRatingFilter === 'all' || item.rating === galleryRatingFilter;
    const artistOk = galleryArtistFilter === 'all' || item.artist === galleryArtistFilter;
    return typeOk && ratingOk && artistOk && ratingVisible(item.rating);
  });

  document.getElementById('gallery-empty').classList.toggle('visible', visibleItems.length === 0);

  visibleItems.forEach((item, idx) => {
    const restricted = !nsfwUnlocked || !nsfwVisible
      ? (item.rating === 'NSFW' || item.rating === 'Suggestive')
      : false;
    const el = document.createElement('div');
    el.className = `gallery-item${restricted ? '' : ' nsfw-unlocked'}`;
    el.style.animationDelay = `${idx * 0.04}s`;
    el.innerHTML = `
      <div class="${restricted ? 'nsfw-blur' : ''}">
        <img src="${item.src}" alt="${item.title}" loading="lazy">
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
}

function renderRefs() {
  const grid = document.getElementById('refs-grid');
  grid.innerHTML = '';
  const filtered = allRefs.filter(r => {
    const ratingOk = refsRatingFilter === 'all' || r.rating === refsRatingFilter;
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

// ══ FIX 5: Artist filter active state managed reliably via data attribute ══
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

  // Reset artist filter if current selection no longer exists in filtered pool
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

  // Ensure All Artists is active when filter is 'all'
  if (galleryArtistFilter === 'all') {
    list.querySelector('.sidebar-btn').classList.add('active');
  }
}

function toggleSidebarSection(titleEl) {
  titleEl.classList.toggle('collapsed');
  titleEl.nextElementSibling.classList.toggle('collapsed');
}

// ══ FIX 6: Type filter active state uses data-type attribute, not fragile ══
// textContent matching against a hardcoded list.
function filterGalleryType(type, btn) {
  galleryTypeFilter = type;
  // Reset artist filter whenever type changes so stale artist selections
  // from the previous type pool don't persist.
  galleryArtistFilter = 'all';
  document.querySelectorAll('#page-gallery .type-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  populateSidebar();
  renderGallery();
}

function filterGalleryRating(rating, btn) {
  // FIX 7: Guard against setting a restricted rating when NSFW is locked.
  if ((rating === 'NSFW' || rating === 'Suggestive') && !(nsfwUnlocked && nsfwVisible)) return;
  galleryRatingFilter = rating;
  document.querySelectorAll('#page-gallery .rating-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGallery();
}

function filterRefsRating(rating, btn) {
  // Same guard for refs page
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
  // Sync buttons and reset any active restricted filters before re-render
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
  document.getElementById('lb-img').src = item.src;
  document.getElementById('lb-title').textContent = item.title;
  document.getElementById('lb-sub').textContent = `by ${item.artist} · ${item.type} · ${item.rating}`;
}

function openRefLightbox(ref) {
  document.getElementById('lb-img').src = ref.src;
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

document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
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
