'use strict';

/* =========================================================
   SkyRocket Casino — lobby
   ========================================================= */

const STORE_KEY = 'skyr_state_v1';
const FAV_KEY = 'skyr_favs';
const START_BALANCE = 10000;
const $ = (id) => document.getElementById(id);

const SECTIONS = [
  {
    id: 'crash',
    title: 'Crash & instant',
    games: [
      { name: 'Aviator', provider: 'Spribe', art: '🚀', badge: 'HOT', url: 'aviator.html', theme: 0 },
      { name: 'JetX', provider: 'SmartSoft', art: '✈️', theme: 5 },
      { name: 'Aviatrix', provider: 'Aviatrix', art: '🛩️', badge: 'NEW', theme: 2 },
      { name: 'Mines', provider: 'Hacksaw', art: '💣', theme: 7 },
      { name: 'Plinko', provider: 'BGaming', art: '🔵', theme: 1 },
      { name: 'Chicken Road', provider: 'InOut', art: '🐔', theme: 3 },
      { name: 'Balloon', provider: 'Spribe', art: '🎈', theme: 4 },
      { name: 'Keno', provider: 'Spribe', art: '🔢', theme: 6 },
    ],
  },
  {
    id: 'slots',
    title: 'Popular slots',
    games: [
      { name: 'Gates of Olympus', provider: 'Pragmatic Play', art: '⚡', badge: 'HOT', theme: 1 },
      { name: 'Sweet Bonanza', provider: 'Pragmatic Play', art: '🍭', theme: 4 },
      { name: 'Fortune Gems 3', provider: 'Jili', art: '💎', theme: 0 },
      { name: '777 Gems', provider: '3 Oaks', art: '7️⃣', theme: 6 },
      { name: 'Wild Bounty', provider: 'PGSoft', art: '🤠', theme: 3 },
      { name: 'Super Burning Wins', provider: 'Playson', art: '🔥', theme: 7 },
    ],
  },
  {
    id: 'live',
    title: 'Live casino',
    games: [
      { name: 'Hindi Roulette', provider: 'Evolution', art: '🎡', theme: 7 },
      { name: 'Teen Patti Live', provider: 'Ezugi', art: '🃏', theme: 4 },
      { name: 'Andar Bahar Live', provider: 'Ezugi', art: '♠️', theme: 0 },
      { name: 'Live Blackjack', provider: 'Evolution', art: '🂡', theme: 2 },
      { name: 'Speed Baccarat', provider: 'Evolution', art: '🎴', theme: 5 },
      { name: 'Crazy Time', provider: 'Evolution', art: '🎪', badge: 'HOT', theme: 1 },
    ],
  },
  {
    id: 'table',
    title: 'Table games',
    games: [
      { name: 'European Roulette', provider: 'SkyRocket', art: '🎯', theme: 0 },
      { name: 'Classic Blackjack', provider: 'SkyRocket', art: '♠', theme: 2 },
      { name: 'Baccarat', provider: 'SkyRocket', art: '♦', theme: 7 },
      { name: 'Dragon Tiger', provider: 'SkyRocket', art: '🐉', theme: 3 },
      { name: 'Sic Bo', provider: 'SkyRocket', art: '🎲', theme: 5 },
      { name: 'Video Poker', provider: 'SkyRocket', art: '♥', theme: 4 },
    ],
  },
  {
    id: 'indian',
    title: 'Indian favourites',
    games: [
      { name: 'Teen Patti Gold', provider: 'SkyRocket', art: '🃏', theme: 4 },
      { name: 'Andar Bahar', provider: 'SkyRocket', art: '♠️', theme: 0 },
      { name: 'Rummy Circle', provider: 'SkyRocket', art: '🂡', theme: 2 },
      { name: '7 Up Down', provider: 'SkyRocket', art: '7️⃣', theme: 6 },
      { name: 'Lucky 7', provider: 'SkyRocket', art: '🍀', theme: 3 },
      { name: 'Muflis Teen Patti', provider: 'SkyRocket', art: '🃏', theme: 1 },
    ],
  },
];

/* ------------------------------ storage ------------------------------ */

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    return {};
  }
}

function getBalance() {
  const data = readStore();
  return typeof data.balance === 'number' ? data.balance : START_BALANCE;
}

function setBalance(value) {
  const data = readStore();
  data.balance = Math.round(value * 100) / 100;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (err) {
    /* ignore */
  }
  return data.balance;
}

function getFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function setFavs(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch (err) {
    /* ignore */
  }
}

/* ------------------------------ formatting / ui helpers ------------------------------ */

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function renderBalance() {
  $('balance').textContent = nf.format(getBalance());
  $('bonusBalance').textContent = nf.format(getBalance());
}

function toast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  $('toasts').appendChild(node);
  while ($('toasts').children.length > 3) $('toasts').removeChild($('toasts').firstChild);
  setTimeout(() => node.remove(), 2300);
}

/* ------------------------------ render games ------------------------------ */

function cardHtml(section, game) {
  const theme = typeof game.theme === 'number' ? game.theme % 8 : 0;
  const action = game.url ? `data-url="${game.url}"` : `data-play="${game.name}"`;
  const badge = game.badge
    ? `<span class="card-badge ${game.badge.toLowerCase()}">${game.badge}</span>`
    : '';
  return `<article class="game-card" data-cat="${section.id}" data-name="${game.name.toLowerCase()}" data-fav="${game.name}">
    <button class="thumb theme-${theme}" ${action} aria-label="Play ${game.name}">
      <span class="thumb-art" aria-hidden="true">${game.art}</span>
      <span class="thumb-provider">${game.provider}</span>
      ${badge}
      <span class="play-fab" aria-hidden="true">▶</span>
    </button>
    <div class="card-meta">
      <div class="meta-text"><b>${game.name}</b><span>${game.provider}</span></div>
      <button class="fav" data-fav-toggle="${game.name}" aria-label="Favourite ${game.name}">☆</button>
    </div>
  </article>`;
}

function renderSections() {
  $('sections').innerHTML = SECTIONS.map(
    (section) => `<section class="game-section" id="${section.id}" data-section="${section.id}">
      <div class="section-head">
        <h2>${section.title} <span class="count">${section.games.length}</span></h2>
        <button data-filter="${section.id}">See all ›</button>
      </div>
      <div class="game-grid">${section.games.map((game) => cardHtml(section, game)).join('')}</div>
    </section>`
  ).join('');
  refreshFavStars();
}

/* ------------------------------ filtering ------------------------------ */

let activeFilter = 'all';
let searchQuery = '';

function syncFilterButtons() {
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    const isSectionLink = btn.closest('.section-head');
    if (isSectionLink) return;
    btn.classList.toggle('active', btn.dataset.filter === activeFilter);
  });
}

function applyFilter() {
  const favs = new Set(getFavs());
  let totalVisible = 0;

  document.querySelectorAll('.game-section').forEach((section) => {
    let sectionVisible = 0;
    section.querySelectorAll('.game-card').forEach((card) => {
      const matchesCategory =
        activeFilter === 'all'
          ? true
          : activeFilter === 'favourites'
            ? favs.has(card.dataset.fav)
            : card.dataset.cat === activeFilter;
      const matchesSearch = !searchQuery || card.dataset.name.includes(searchQuery);
      const show = matchesCategory && matchesSearch;
      card.hidden = !show;
      if (show) sectionVisible += 1;
    });
    section.hidden = sectionVisible === 0;
    const counter = section.querySelector('.count');
    if (counter) counter.textContent = sectionVisible;
    totalVisible += sectionVisible;
  });

  $('emptyState').hidden = totalVisible !== 0;
  syncFilterButtons();
}

function setFilter(filter) {
  activeFilter = filter;
  applyFilter();
}

/* ------------------------------ favourites ------------------------------ */

function refreshFavStars() {
  const favs = new Set(getFavs());
  document.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
    const on = favs.has(btn.dataset.favToggle);
    btn.classList.toggle('on', on);
    btn.textContent = on ? '★' : '☆';
  });
}

function toggleFavourite(name) {
  const favs = new Set(getFavs());
  if (favs.has(name)) {
    favs.delete(name);
    toast(`${name} removed from favourites`);
  } else {
    favs.add(name);
    toast(`${name} added to favourites`, 'win');
  }
  setFavs([...favs]);
  refreshFavStars();
  if (activeFilter === 'favourites') applyFilter();
}

/* ------------------------------ modals ------------------------------ */

function openModal(id) {
  closeModals();
  const modal = $(id);
  if (!modal) return;
  if (id === 'modalBonus') renderBalance();
  modal.hidden = false;
}

function closeModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.hidden = true;
  });
}

function showSoon(name) {
  $('soonTitle').textContent = `${name} — coming soon`;
  $('soonText').textContent =
    'This table is a visual placeholder in the demo build. Aviator is the fully playable game right now — with provably fair rounds and virtual coins.';
  openModal('modalSoon');
}

/* ------------------------------ hero carousel ------------------------------ */

let heroIndex = 0;
let heroTimer = null;
let heroCount = 0;

function goToSlide(index) {
  heroCount = document.querySelectorAll('.hero-slide').length;
  heroIndex = (index + heroCount) % heroCount;
  $('heroTrack').style.transform = `translateX(-${heroIndex * 100}%)`;
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === heroIndex);
  });
}

function startHeroTimer() {
  stopHeroTimer();
  heroTimer = setInterval(() => goToSlide(heroIndex + 1), 6500);
}

function stopHeroTimer() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = null;
}

function initHero() {
  const dots = $('heroDots');
  heroCount = document.querySelectorAll('.hero-slide').length;
  dots.innerHTML = Array.from(
    { length: heroCount },
    (_, i) => `<button class="hero-dot${i === 0 ? ' active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
  ).join('');

  dots.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-slide]');
    if (!dot) return;
    goToSlide(Number(dot.dataset.slide));
    startHeroTimer();
  });
  $('heroPrev').addEventListener('click', () => {
    goToSlide(heroIndex - 1);
    startHeroTimer();
  });
  $('heroNext').addEventListener('click', () => {
    goToSlide(heroIndex + 1);
    startHeroTimer();
  });

  const hero = $('hero');
  hero.addEventListener('mouseenter', stopHeroTimer);
  hero.addEventListener('mouseleave', startHeroTimer);

  startHeroTimer();
}

/* ------------------------------ drawer ------------------------------ */

function setDrawer(open) {
  $('sidebar').classList.toggle('open', open);
  $('drawerScrim').classList.toggle('show', open);
}

/* ------------------------------ events ------------------------------ */

function bindEvents() {
  renderSections();
  initHero();
  renderBalance();

  $('sections').addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav-toggle]');
    if (favBtn) {
      e.preventDefault();
      toggleFavourite(favBtn.dataset.favToggle);
      return;
    }
    const thumb = e.target.closest('.thumb');
    if (!thumb) return;
    if (thumb.dataset.url) {
      window.location.href = thumb.dataset.url;
    } else {
      showSoon(thumb.dataset.play);
    }
  });

  // category buttons (sidebar, chips, see-all)
  document.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      setFilter(filterBtn.dataset.filter);
      const section = document.getElementById(filterBtn.dataset.filter);
      if (filterBtn.closest('.section-head') && section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setDrawer(false);
      return;
    }

    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.open);
      setDrawer(false);
      return;
    }

    const closer = e.target.closest('[data-close]');
    if (closer) {
      closeModals();
      return;
    }

    if (e.target.classList.contains('modal')) closeModals();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModals();
      setDrawer(false);
    }
  });

  $('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    applyFilter();
  });

  $('btnDrawer').addEventListener('click', () => {
    setDrawer(!$('sidebar').classList.contains('open'));
  });
  $('drawerScrim').addEventListener('click', () => setDrawer(false));

  $('btnClaim').addEventListener('click', () => {
    const next = setBalance(getBalance() + 1000);
    renderBalance();
    toast(`+1,000 demo coins · balance ${nf.format(next)}`, 'win');
  });

  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) renderBalance();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) setDrawer(false);
  });

  // Deep links: index.html#live etc. reveal that category first
  if (location.hash) {
    const id = location.hash.slice(1);
    if (['crash', 'slots', 'live', 'table', 'indian'].includes(id)) {
      setFilter(id);
    }
  }
}

bindEvents();
