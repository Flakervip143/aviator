'use strict';

/* =========================================================
   SkyRocket Casino — local demo account dashboard
   ========================================================= */

(function () {
  const user = window.Auth ? Auth.current() : null;
  const content = document.getElementById('accountContent');
  const guest = document.getElementById('accountGuest');
  const welcome = document.getElementById('accountWelcome');

  if (!user) {
    if (content) content.hidden = true;
    if (welcome) welcome.hidden = true;
    if (guest) guest.hidden = false;
    return;
  }

  if (content) content.hidden = false;
  if (guest) guest.hidden = true;
  if (welcome) welcome.hidden = false;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Site.fmt(n);
  const escapeHtml = (value) =>
    String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);

  function createdText(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function paintProfile() {
    const name = user.name || 'Player';
    $('accountAvatar').textContent = Auth.initial(name);
    $('accountName').textContent = name;
    $('accountEmail').textContent = user.email;
    $('accountCreated').textContent = `Member since ${createdText(user.created)}`;
    $('accountBalance').textContent = fmt(Site.getBalance());
    $('profileName').value = name;
    $('welcomeName').textContent = name;
  }

  function paintStats() {
    const stats = Site.getStats();
    $('statRounds').textContent = fmt(stats.rounds);
    $('statWagered').textContent = fmt(stats.wagered);
    $('statBiggest').textContent = fmt(stats.biggest);
    $('statBest').textContent = stats.bestMult ? `${Number(stats.bestMult).toFixed(2)}x` : '—';

    const profit = Number(stats.profit) || 0;
    const profitEl = $('statProfit');
    profitEl.textContent = `${profit >= 0 ? '+' : ''}${fmt(profit)}`;
    profitEl.className = profit >= 0 ? 'pos' : 'neg';
  }

  function paintTx() {
    const host = $('accountTx');
    const tx = Site.getTx().slice(0, 14);
    if (!tx.length) {
      host.innerHTML = '<p class="fine">No wallet activity yet. Play a demo round or claim a bonus to get started.</p>';
      return;
    }
    host.innerHTML = tx
      .map((entry) => {
        const positive = entry.amount >= 0;
        const when = new Date(entry.ts).toLocaleString([], {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `<div class="tx-row">
          <div class="tx-label">${escapeHtml(entry.label)}<small>${when}</small></div>
          <div class="tx-amount ${positive ? 'pos' : 'neg'}">${positive ? '+' : ''}${fmt(entry.amount)}</div>
        </div>`;
      })
      .join('');
  }

  function paintFavs() {
    const host = $('accountFavs');
    const favs = Site.getFavs();
    if (!favs.length) {
      host.innerHTML = '<p class="fine">No favourites yet. Tap the ☆ on any game tile in the lobby.</p>';
      return;
    }
    host.innerHTML = favs
      .map((name) => {
        const slug = window.casinoSlug(name);
        const found = window.casinoFindGame(slug);
        const url = found ? window.casinoGameUrl(found.game) : 'index.html';
        return `<span class="fav-pill"><a href="${url}">${escapeHtml(name)}</a>
          <button type="button" data-remove-fav="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)} from favourites">×</button></span>`;
      })
      .join('');
  }

  function paintSettings() {
    const prefs = Site.getPrefs();
    const toggle = $('prefMotion');
    toggle.classList.toggle('on', Boolean(prefs.reduceMotion));
    toggle.setAttribute('aria-pressed', String(Boolean(prefs.reduceMotion)));
  }

  function refresh() {
    paintProfile();
    paintStats();
    paintTx();
    paintFavs();
    paintSettings();
  }

  refresh();

  if (new URLSearchParams(location.search).get('welcome')) {
    Site.toast(`Welcome, ${user.name}! Your demo profile is ready.`, 'win');
  }

  $('profileForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = $('profileName').value.trim();
    const result = Auth.updateName(value);
    if (!result.ok) {
      Site.toast(result.error, 'error');
      return;
    }
    Site.toast('Display name updated.', 'win');
    location.reload();
  });

  $('accountFavs').addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-fav]');
    if (!remove) return;
    event.preventDefault();
    Site.toggleFav(remove.dataset.removeFav);
    Site.toast(`${remove.dataset.removeFav} removed from favourites.`, 'info');
    paintFavs();
  });

  $('prefMotion').addEventListener('click', () => {
    const enabled = !Site.getPrefs().reduceMotion;
    Site.setPref('reduceMotion', enabled);
    paintSettings();
    Site.toast(enabled ? 'Reduced motion enabled.' : 'Reduced motion disabled.', 'info');
  });

  $('btnLogout').addEventListener('click', () => {
    Auth.logout();
    setTimeout(() => {
      location.href = 'index.html';
    }, 1200);
  });

  $('btnReset').addEventListener('click', () => {
    if (!window.confirm('Reset demo balance, transactions, favourites, bonuses and game stats? Your local profile will stay.')) return;
    Site.resetAll();
  });
})();
