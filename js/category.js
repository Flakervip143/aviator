'use strict';

/* =========================================================
   SkyRocket Casino — category page renderer
   ========================================================= */

(function () {
  const $ = (id) => document.getElementById(id);
  const CAT = document.body.dataset.cat || '';
  const section = (window.CASINO_SECTIONS || []).find((item) => item.id === CAT);
  if (!section) return;

  let searchQuery = '';
  let favouritesOnly = false;

  const slugOf = (name) => window.casinoSlug(name);

  /* ---------------- rendering ---------------- */

  function renderGrid() {
    $('catGrid').innerHTML = section.games
      .map((game) => window.casinoCard(section.id, game))
      .join('');
    if ($('catCount')) {
      $('catCount').textContent = `Showing ${section.games.length} of ${section.games.length} demo games.`;
    }
    applyFilter();
    refreshFavStars();
  }

  function applyFilter() {
    const favs = new Set(Site.getFavs());
    let visible = 0;

    document.querySelectorAll('#catGrid .game-card').forEach((card) => {
      const matchesSearch = !searchQuery || card.dataset.name.includes(searchQuery);
      const matchesFav = !favouritesOnly || favs.has(card.dataset.fav);
      const show = matchesSearch && matchesFav;
      card.hidden = !show;
      if (show) visible += 1;
    });

    $('catEmpty').hidden = visible !== 0;
    if ($('catCount')) {
      $('catCount').textContent = favouritesOnly || searchQuery
        ? `Showing ${visible} of ${section.games.length} games${favouritesOnly ? ' in your favourites' : ''}.`
        : `Showing ${section.games.length} demo games.`;
    }

    const chip = $('favChip');
    if (chip) chip.classList.toggle('active', favouritesOnly);
  }

  function refreshFavStars() {
    const favs = new Set(Site.getFavs());
    document.querySelectorAll('[data-fav-toggle]').forEach((btn) => {
      const on = favs.has(btn.dataset.favToggle);
      btn.classList.toggle('on', on);
      btn.textContent = on ? '★' : '☆';
    });
  }

  /* ---------------- events ---------------- */

  function bind() {
    renderGrid();

    $('catGrid').addEventListener('click', (event) => {
      const fav = event.target.closest('[data-fav-toggle]');
      if (!fav) return;
      event.preventDefault();
      const added = Site.toggleFav(fav.dataset.favToggle);
      Site.toast(
        added ? `${fav.dataset.favToggle} added to favourites` : `${fav.dataset.favToggle} removed from favourites`,
        added ? 'win' : 'info'
      );
      refreshFavStars();
      if (favouritesOnly) applyFilter();
    });

    $('favChip').addEventListener('click', () => {
      favouritesOnly = !favouritesOnly;
      applyFilter();
      if (favouritesOnly && !Site.getFavs().length) {
        Site.toast('No favourites yet — tap the ☆ on any game tile.', 'info');
      }
    });

    document.addEventListener('site:search', (event) => {
      searchQuery = event.detail || '';
      applyFilter();
    });

    document.addEventListener('site:favs', refreshFavStars);

    const q = new URLSearchParams(location.search).get('q');
    if (q) {
      searchQuery = q.trim().toLowerCase();
      const input = $('searchInput');
      if (input) input.value = q;
      applyFilter();
    }

    /* Also filter locally when the URL hash points at a game. */
    const hash = location.hash.replace('#', '');
    if (hash) {
      const match = section.games.find((game) => slugOf(game.name) === hash);
      if (match) {
        searchQuery = match.name.toLowerCase();
        const input = $('searchInput');
        if (input) input.value = match.name;
        applyFilter();
      }
    }
  }

  bind();
})();
