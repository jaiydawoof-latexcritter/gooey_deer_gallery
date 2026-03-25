// GOOGLE DRIVE
const DRIVE_URL = (window.SITE_CONFIG && window.SITE_CONFIG.driveUrl)
  ? window.SITE_CONFIG.driveUrl
  : 'https://script.google.com/macros/s/AKfycbzchULgfbJ0tAJ_6i3YT2_w7iQqci4_I5tXSa59as89d52HmWZ5_Zg0NztnGLHESDYt/exec';

async function fetchFromDrive(type) {
  try {
    const res = await fetch(DRIVE_URL + "?type=" + type);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) { console.error("Drive fetch failed:", e); return []; }
}

let allGallery = [], allRefs = [];
let nsfwUnlocked = false;
let galleryTypeFilter = "all", galleryRatingFilter = "SFW", refsRatingFilter = "SFW", galleryArtistFilter = "all";
let lightboxIndex = 0, visibleItems = [];

function normaliseRating(r) {
  if (!r) return "SFW";
  if (r.toString().trim().toLowerCase() === "nsfw") return "NSFW";
  return "SFW";
}
function ratingVisible(rating) {
  if (!nsfwUnlocked && rating === "NSFW") return false;
  return true;
}
function badgeClass(r) { return r === "NSFW" ? "badge-nsfw" : "badge-sfw"; }

// HERO BANNER
function buildHeroBanner(items) {
  const track = document.getElementById("hero-banner-track");
  if (!track || !items.length) return;
  const sfwItems = items.filter(function(i) { return i.rating === "SFW"; });
  const pool = sfwItems.length >= 6 ? sfwItems : items;
  const shuffled = pool.slice().sort(function() { return Math.random() - 0.5; }).slice(0, 12);
  track.innerHTML = "";
  shuffled.forEach(function(item) {
    const div = document.createElement("div");
    div.className = "hero-banner-img";
    div.style.backgroundImage = "url(" + item.src + ")";
    track.appendChild(div);
  });
}

// INIT
async function init() {
  const grid = document.getElementById("gallery-grid");
  if (grid) grid.innerHTML = "<div style=\"padding:60px;text-align:center;color:var(--muted)\">Loading gallery...</div>";
  const results = await Promise.all([fetchFromDrive("gallery"), fetchFromDrive("ref")]);
  allGallery = results[0].map(function(i) { return Object.assign({}, i, { rating: normaliseRating(i.rating) }); });
  allRefs    = results[1].map(function(r) { return Object.assign({}, r, { rating: normaliseRating(r.rating) }); });
  buildHeroBanner(allGallery);
  renderGallery();
  renderRefs();
  updateStats();
  populateSidebar();
  // Set the SFW filter button active on load
  const sfwBtn = document.getElementById("g-r-sfw");
  if (sfwBtn) { document.querySelectorAll("#page-gallery .filter-btn").forEach(function(b) { b.classList.remove("active"); }); sfwBtn.classList.add("active"); }
  const rSfwBtn = document.getElementById("r-r-sfw");
  if (rSfwBtn) { document.querySelectorAll("#page-refs .filter-btn").forEach(function(b) { b.classList.remove("active"); }); rSfwBtn.classList.add("active"); }
}

// GALLERY
function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;
  grid.innerHTML = "";
  visibleItems = allGallery.filter(function(item) {
    const typeOk   = galleryTypeFilter === "all" || item.type   === galleryTypeFilter;
    const ratingOk = galleryRatingFilter === "all" || item.rating === galleryRatingFilter;
    const artistOk = galleryArtistFilter === "all" || item.artist === galleryArtistFilter;
    return typeOk && ratingOk && artistOk && ratingVisible(item.rating);
  });
  const emptyEl = document.getElementById("gallery-empty");
  if (emptyEl) emptyEl.classList.toggle("visible", visibleItems.length === 0);
  visibleItems.forEach(function(item, idx) {
    const restricted = !nsfwUnlocked && item.rating === "NSFW";
    const el = document.createElement("div");
    el.className = "gallery-item" + (restricted ? "" : " nsfw-unlocked");
    el.style.animationDelay = (idx * 0.04) + "s";
    const imgData = restricted ? ("data-src=\"" + item.src + "\" src=\"\"") : ("src=\"" + item.src + "\"");
    el.innerHTML = "<div class=\"" + (restricted ? "nsfw-blur" : "") + "\"><img " + imgData + " alt=\"" + item.title + "\" loading=\"lazy\"></div>" +
      (restricted ? "<div class=\"nsfw-cover\"><span>NSFW</span><p>Enable NSFW to view</p></div>" : "") +
      "<div class=\"item-info\"><span class=\"item-artist\">by " + item.artist + "</span>" +
      "<div><span class=\"item-type\">" + item.type + "</span><span class=\"item-badge " + badgeClass(item.rating) + "\">" + item.rating + "</span></div></div>";
    el.addEventListener("click", (function(i) { return function() { if (restricted) return; openLightbox(i); }; })(idx));
    grid.appendChild(el);
  });
}

// REFS
function renderRefs() {
  const grid = document.getElementById("refs-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const filtered = allRefs.filter(function(r) {
    return (refsRatingFilter === "all" || r.rating === refsRatingFilter) && ratingVisible(r.rating);
  });
  const emptyEl = document.getElementById("refs-empty");
  if (emptyEl) emptyEl.classList.toggle("visible", filtered.length === 0);
  filtered.forEach(function(ref, idx) {
    const restricted = !nsfwUnlocked && ref.rating === "NSFW";
    const el = document.createElement("div");
    el.className = "ref-card" + (restricted ? "" : " nsfw-unlocked");
    el.style.animationDelay = (idx * 0.06) + "s";
    const imgData = restricted ? ("data-src=\"" + ref.src + "\" src=\"\"") : ("src=\"" + ref.src + "\"");
    el.innerHTML = "<div class=\"ref-img-wrap" + (restricted ? " nsfw-blur" : "") + "\"><img " + imgData + " alt=\"" + ref.title + "\" loading=\"lazy\"></div>" +
      (restricted ? "<div class=\"ref-nsfw-cover\"><span>NSFW</span><p>Enable NSFW to view</p></div>" : "") +
      "<div class=\"ref-info\"><div><div class=\"ref-title\">" + ref.title + "</div><div class=\"ref-artist\">by " + ref.artist + "</div></div>" +
      "<div class=\"ref-badges\"><span class=\"ref-version\">" + ref.version + "</span><span class=\"item-badge " + badgeClass(ref.rating) + "\">" + ref.rating + "</span></div></div>";
    if (!restricted) { el.addEventListener("click", (function(ref) { return function() { openRefLightbox(ref); }; })(ref)); }
    grid.appendChild(el);
  });
}

// SIDEBAR
function filterGalleryArtist(artist, btn) {
  galleryArtistFilter = artist;
  document.querySelectorAll(".sidebar-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  renderGallery();
}
function populateSidebar() {
  const list = document.getElementById("artist-list");
  if (!list) return;
  const pool = allGallery.filter(function(i) { return galleryTypeFilter === "all" || i.type === galleryTypeFilter; });
  const artists = Array.from(new Set(pool.map(function(i) { return i.artist; }))).sort();
  list.innerHTML = "<button class=\"sidebar-btn active\" onclick=\"filterGalleryArtist('all',this)\">All Artists (" + pool.length + ")</button>";
  if (galleryArtistFilter !== "all" && !artists.includes(galleryArtistFilter)) galleryArtistFilter = "all";
  artists.forEach(function(artist) {
    const count = pool.filter(function(i) { return i.artist === artist; }).length;
    const btn = document.createElement("button");
    btn.className = "sidebar-btn" + (galleryArtistFilter === artist ? " active" : "");
    btn.title = artist;
    btn.textContent = artist + " (" + count + ")";
    btn.onclick = function() { filterGalleryArtist(artist, this); };
    list.appendChild(btn);
  });
  if (galleryArtistFilter === "all") { const first = list.querySelector(".sidebar-btn"); if (first) first.classList.add("active"); }
}
function toggleSidebarSection(titleEl) {
  titleEl.classList.toggle("collapsed");
  titleEl.nextElementSibling.classList.toggle("collapsed");
}

// FILTERS
function filterGalleryType(type, btn) {
  galleryTypeFilter = type;
  document.querySelectorAll("#page-gallery .filter-btn").forEach(function(b) {
    if (["All","Gooey","Pooltoy","Normal","Fursuit","Latex","Other"].indexOf(b.textContent) >= 0) b.classList.remove("active");
  });
  btn.classList.add("active");
  populateSidebar();
  renderGallery();
}
function filterGalleryRating(rating, btn) {
  galleryRatingFilter = rating;
  if (rating === "NSFW" && !nsfwUnlocked) { nsfwUnlocked = true; }
  ["g-r-all","g-r-sfw","g-r-nsfw"].forEach(function(id) { const el = document.getElementById(id); if (el) el.classList.remove("active"); });
  btn.classList.add("active");
  renderGallery();
}
function filterRefsRating(rating, btn) {
  refsRatingFilter = rating;
  if (rating === "NSFW" && !nsfwUnlocked) { nsfwUnlocked = true; }
  ["r-r-all","r-r-sfw","r-r-nsfw"].forEach(function(id) { const el = document.getElementById(id); if (el) el.classList.remove("active"); });
  btn.classList.add("active");
  renderRefs();
}

// NSFW TOGGLE (nav toggle still works)
function toggleNSFW() {
  nsfwUnlocked = !nsfwUnlocked;
  const toggle = document.getElementById("nsfw-toggle");
  const label  = document.getElementById("nsfw-label");
  if (toggle) toggle.classList.toggle("on", nsfwUnlocked);
  if (label)  label.classList.toggle("on", nsfwUnlocked);
  renderGallery();
  renderRefs();
}
// Stubs so no errors if agegate buttons remain in DOM
function unlockNSFW() { toggleNSFW(); }
function dismissGate() {}

// LIGHTBOX
function openLightbox(idx) {
  lightboxIndex = idx; showLightboxItem();
  document.querySelector(".lb-nav").style.display = "flex";
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}
function showLightboxItem() {
  const item = visibleItems[lightboxIndex];
  if (!item) return;
  document.getElementById("lb-img").src = item.src;
  document.getElementById("lb-title").textContent = item.title;
  document.getElementById("lb-sub").textContent = "by " + item.artist + " · " + item.type + " · " + item.rating;
}
function openRefLightbox(ref) {
  document.getElementById("lb-img").src = ref.src;
  document.getElementById("lb-title").textContent = ref.title;
  document.getElementById("lb-sub").textContent = "by " + ref.artist + " · " + ref.version + " · " + ref.rating;
  document.querySelector(".lb-nav").style.display = "none";
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}
function navLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + visibleItems.length) % visibleItems.length;
  showLightboxItem();
}
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}
document.getElementById("lightbox").addEventListener("click", function(e) {
  if (e.target === document.getElementById("lightbox")) closeLightbox();
});
document.addEventListener("keydown", function(e) {
  if (!document.getElementById("lightbox").classList.contains("open")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") navLightbox(-1);
  if (e.key === "ArrowRight") navLightbox(1);
});

// PAGE NAV
function showPage(name) {
  document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
  document.querySelectorAll(".nav-link").forEach(function(l) { l.classList.remove("active"); });
  document.getElementById("page-" + name).classList.add("active");
  const map = { gallery:"Gallery", refs:"Ref Sheets", about:"About", contact:"Contact" };
  document.querySelectorAll(".nav-link").forEach(function(l) { if (l.textContent === map[name]) l.classList.add("active"); });
}

// STATS
function updateStats() {
  const t = document.getElementById("stat-total");   if (t) t.textContent = allGallery.length;
  const r = document.getElementById("stat-refs");    if (r) r.textContent = allRefs.length;
  const a = document.getElementById("stat-artists");
  if (a) { const s = new Set(allGallery.map(function(i){return i.artist;}).concat(allRefs.map(function(r){return r.artist;}))); a.textContent = s.size; }
}

// CONTACT
function submitForm() {
  const n = document.getElementById("cf-name").value.trim();
  const e = document.getElementById("cf-email").value.trim();
  const m = document.getElementById("cf-message").value.trim();
  if (!n || !e || !m) { alert("Please fill in all required fields."); return; }
  document.getElementById("contact-form").style.display = "none";
  document.getElementById("form-success").classList.add("visible");
}

// BOOTSTRAP
document.addEventListener("parts-loaded", init);
if (document.getElementById("app-root") && document.getElementById("app-root").innerHTML.trim()) { init(); }
