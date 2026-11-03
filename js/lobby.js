'use strict';

/* =========================================================
   SkyRocket Casino — lobby
   ========================================================= */

(function () {
  const SECTIONS = window.CASINO_SECTIONS || [];
  const $ = (id) => document.getElementById(id);

  let activeFilter = 'all';
  let searchQuery = '';

  /* ---------------- render ---------------- */

  function renderSections() {
    $('sections').innerHTML = SECTIONS.map(
      (section) => `<section class="game-section" id="${section.id}" data-section="${section.id}">
        <div class="section-head">
          <h2>${section.title} <span class="count">${section.games.length}</span></h2>
          <a href="${section.id}.html">See all ›</a>
        </div>
        <div class="game-grid">${section.games
          .map((game) => window.casinoCard(section.id, game))
          .join('')}</div>
      </section>`
    ).join('');
    refreshFavStars();
  }

  function syncFilterButtons() {
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === activeFilter);
    });
  }

  function applyFilter() {
    const favs = new Set(Site.getFavs());
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

  /* ---------------- favourites ---------------- */

  function refreshFavStars() {
    const favs = new Set(Site.getFavs());
    document.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
      const on = favs.has(btn.dataset.favToggle);
      btn.classList.toggle('on', on);
      btn.textContent = on ? '★' : '☆';
    });
  }

  function onFavourite(name) {
    const added = Site.toggleFav(name);
    Site.toast(added ? `${name} added to favourites` : `${name} removed from favourites`, added ? 'win' : 'info');
    refreshFavStars();
    if (activeFilter === 'favourites') applyFilter();
  }

  /* ---------------- hero carousel ---------------- */

  let heroIndex = 0;
  let heroTimer = null;

  function goToSlide(index) {
    const count = document.querySelectorAll('.hero-slide').length;
    if (!count) return;
    heroIndex = (index + count) % count;
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
    const count = document.querySelectorAll('.hero-slide').length;
    if (!dots || !count) return;
    dots.innerHTML = Array.from(
      { length: count },
      (_, i) =>
        `<button class="hero-dot${i === 0 ? ' active' : ''}" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
    ).join('');

    dots.addEventListener('click', (event) => {
      const dot = event.target.closest('[data-slide]');
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

  /* ---------------- drawer ---------------- */

  function setDrawer(open) {
    const sidebar = $('sidebar');
    const scrim = $('drawerScrim');
    if (!sidebar || !scrim) return;
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('show', open);
  }

  /* ---------------- events ---------------- */

  function bindEvents() {
    renderSections();
    initHero();

    // card favourites
    $('sections').addEventListener('click', (event) => {
      const favBtn = event.target.closest('[data-fav-toggle]');
      if (!favBtn) return;
      event.preventDefault();
      onFavourite(favBtn.dataset.favToggle);
    });

    // category filters
    document.addEventListener('click', (event) => {
      const filterBtn = event.target.closest('[data-filter]');
      if (!filterBtn) return;
      event.preventDefault();
      setFilter(filterBtn.dataset.filter);
      setDrawer(false);
      const content = document.querySelector('.content');
      if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // search from the shared header
    document.addEventListener('site:search', (event) => {
      searchQuery = event.detail || '';
      applyFilter();
    });

    $('btnDrawer').addEventListener('click', () => {
      setDrawer(!$('sidebar').classList.contains('open'));
    });
    $('drawerScrim').addEventListener('click', () => setDrawer(false));

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) setDrawer(false);
    });

    document.addEventListener('site:favs', refreshFavStars);

    const q = new URLSearchParams(location.search).get('q');
    if (q) {
      searchQuery = q.toLowerCase();
      const input = $('searchInput');
      if (input) input.value = q;
    }

    applyFilter();
  }

  bindEvents();
})();
