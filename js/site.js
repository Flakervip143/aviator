'use strict';

/* =========================================================
   SkyRocket Casino — shared shell, wallet, modals, nav
   ========================================================= */

const Site = (function () {
  const STORE_KEY = 'skyr_state_v1';
  const FAV_KEY = 'skyr_favs';
  const CLAIM_KEY = 'skyr_claims';
  const PREF_KEY = 'skyr_prefs_v1';
  const START_BALANCE = 10000;
  const TX_LIMIT = 40;
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const fmt = (n) => nf.format(Number(n) || 0);
  const round2 = (n) => Math.round(n * 100) / 100;

  const PAGE = (location.pathname.split('/').pop() || 'index.html');
  const CAT = document.body ? document.body.dataset.cat || '' : '';

  /* ---------------- storage ---------------- */

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

  function writeStore(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (err) {
      /* storage may be unavailable */
    }
  }

  function getBalance() {
    const value = readStore().balance;
    return typeof value === 'number' && isFinite(value) ? value : START_BALANCE;
  }

  function updateBalances() {
    const text = fmt(getBalance());
    document.querySelectorAll('[data-balance]').forEach((node) => {
      node.textContent = text;
    });
    ['balance', 'bonusBalance', 'accountBalance', 'authBalance'].forEach((id) => {
      const node = $(id);
      if (node) node.textContent = text;
    });
  }

  function addBalance(amount, label, type) {
    const data = readStore();
    const current = typeof data.balance === 'number' ? data.balance : START_BALANCE;
    data.balance = Math.max(0, round2(current + Number(amount)));
    if (label) {
      const tx = Array.isArray(data.tx) ? data.tx : [];
      tx.unshift({
        type: type || (amount >= 0 ? 'bonus' : 'bet'),
        label,
        amount: round2(amount),
        ts: Date.now(),
      });
      data.tx = tx.slice(0, TX_LIMIT);
    }
    writeStore(data);
    updateBalances();
    return data.balance;
  }

  function setBalance(value) {
    return addBalance(round2(Number(value) || 0) - getBalance(), 'Balance adjusted', 'adjust');
  }

  function getTx() {
    const tx = readStore().tx;
    return Array.isArray(tx) ? tx : [];
  }

  function getStats() {
    const saved = readStore().stats;
    return Object.assign(
      { rounds: 0, won: 0, lost: 0, wagered: 0, biggest: 0, bestMult: 0, profit: 0 },
      saved && typeof saved === 'object' ? saved : {}
    );
  }

  function recordRound({ bet, payout, mult, game }) {
    const data = readStore();
    const stats = getStats();
    const stake = round2(Math.max(0, Number(bet) || 0));
    const win = round2(Math.max(0, Number(payout) || 0));
    const multiplier = Number(mult) || 0;

    stats.rounds += 1;
    stats.wagered = round2(stats.wagered + stake);
    stats.profit = round2(stats.profit + win - stake);
    if (win > stake) stats.won += 1;
    else if (win <= 0) stats.lost += 1;
    stats.biggest = Math.max(stats.biggest, win);
    stats.bestMult = Math.max(stats.bestMult, multiplier);
    if (game) stats.lastGame = game;

    data.stats = stats;
    writeStore(data);
    return stats;
  }

  /* ---------------- preferences ---------------- */

  function getPrefs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function setPref(key, value) {
    const prefs = getPrefs();
    prefs[key] = value;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (err) {
      /* ignore */
    }
    applyPrefs();
    return prefs;
  }

  function applyPrefs() {
    const prefs = getPrefs();
    document.documentElement.classList.toggle('reduce-motion', Boolean(prefs.reduceMotion));
  }

  /* ---------------- favourites ---------------- */

  function getFavs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
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

  function toggleFav(name) {
    const favs = new Set(getFavs());
    const added = !favs.has(name);
    if (added) favs.add(name);
    else favs.delete(name);
    setFavs([...favs]);
    document.dispatchEvent(new CustomEvent('site:favs'));
    return added;
  }

  /* ---------------- claims ---------------- */

  function getClaims() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CLAIM_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function markClaim(key) {
    const claims = getClaims();
    claims[key] = Date.now();
    try {
      localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
    } catch (err) {
      /* ignore */
    }
  }

  function isClaimed(key, cooldown) {
    const at = getClaims()[key];
    if (!at) return false;
    if (!cooldown) return true;
    return Date.now() - at < cooldown;
  }

  /* ---------------- toast / modals ---------------- */

  function toast(message, type) {
    const host = $('toasts');
    if (!host) return;
    const node = document.createElement('div');
    node.className = `toast ${type || 'info'}`;
    node.textContent = message;
    host.appendChild(node);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    setTimeout(() => node.remove(), 2600);
  }

  function closeModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.hidden = true;
    });
  }

  function openModal(id) {
    closeModals();
    const modal = $(id);
    if (!modal) return;
    if (id === 'modalBonus') updateBalances();
    if (id === 'modalAuth') {
      updateBalances();
      const rounds = $('authRounds');
      if (rounds) {
        const stats = readStore().stats || {};
        rounds.textContent = fmt(stats.rounds || 0);
      }
    }
    modal.hidden = false;
  }

  function resetAll() {
    [STORE_KEY, FAV_KEY, CLAIM_KEY, 'skyr_game_hist'].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        /* ignore */
      }
    });
    location.href = 'index.html';
  }

  /* ---------------- chrome ---------------- */

  function navActive(href, cat) {
    if (PAGE === href) return 'active';
    if (PAGE === 'game.html' && cat && CAT === cat) return 'active';
    return '';
  }

  function headerHtml() {
    const user = window.Auth ? Auth.current() : null;
    const displayName = user ? user.name : '';
    const initial = user ? Auth.initial(user.name) : 'S';
    const accountArea = user
      ? `<a class="user-pill" href="account.html" title="Open demo account">
           <span class="user-avatar">${initial}</span><span class="user-name">${displayName}</span>
         </a>
         <a class="btn gold header-deposit" href="cashier.html">Deposit</a>`
      : `<a class="btn ghost header-login" href="login.html">Log in</a>
         <a class="btn gold header-deposit" href="register.html">Sign up</a>`;
    return `<header class="header">
      <div class="header-left">
        <button class="burger" id="btnDrawer" aria-label="Open menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
        <a class="logo" href="index.html">
          <svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
            <path d="M26 6 8 13.5l7.5 2.8L18.7 24z" fill="url(#lg1)"/>
            <path d="M26 6 15.5 16.3" stroke="#fff7c2" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="26" cy="6" r="2" fill="#facc15"/>
            <defs>
              <linearGradient id="lg1" x1="8" y1="13" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#38bdf8"/><stop offset="1" stop-color="#0581ff"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="logo-text">SKY<em>ROCKET</em><small>CASINO</small></span>
        </a>
      </div>
      <nav class="main-nav">
        <a class="${navActive('index.html')}" href="index.html">Casino</a>
        <a class="${navActive('crash.html', 'crash')}" href="crash.html">Crash Games</a>
        <a class="${navActive('slots.html', 'slots')}" href="slots.html">Slots</a>
        <a class="${navActive('live.html', 'live')}" href="live.html">Live Dealers</a>
        <a class="${navActive('bonuses.html')}" href="bonuses.html">Bonuses</a>
      </nav>
      <div class="header-right">
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input id="searchInput" type="search" placeholder="Search games" autocomplete="off" aria-label="Search games">
        </label>
        <div class="balance-chip" title="Demo balance">
          <span>Balance</span>
          <strong data-balance>10,000</strong>
          <em>coins</em>
        </div>
        ${accountArea}
      </div>
    </header>`;
  }

  function footerHtml() {
    return `<footer class="footer">
      <div class="footer-top">
        <a class="logo small" href="index.html">
          <span class="logo-text">SKY<em>ROCKET</em><small>CASINO</small></span>
        </a>
        <div class="footer-links">
          <a href="aviator.html">Aviator</a>
          <a href="crash.html">Crash games</a>
          <a href="slots.html">Slots</a>
          <a href="live.html">Live casino</a>
          <a href="table.html">Table games</a>
          <a href="indian.html">Indian games</a>
          <a href="bonuses.html">Bonuses</a>
          <a href="cashier.html">Cashier</a>
          <a href="support.html">Support</a>
          <a href="terms.html">Terms</a>
          <a href="privacy.html">Privacy</a>
          <a href="responsible.html">Responsible play</a>
        </div>
        <span class="badge-18">18+</span>
      </div>
      <p class="footer-legal">
        SkyRocket is a <b>demo casino</b> built for entertainment. All balances are virtual coins with no monetary value.
        No deposits, withdrawals or real-money gambling are offered. Play responsibly.
        This project is an original interface and is not affiliated with Crorebet, Spribe or any other operator.
      </p>
      <p class="footer-copy">© 2026 SkyRocket · Demo build</p>
    </footer>`;
  }

  function modalsHtml() {
    return `<div class="modal" id="modalBonus" hidden>
      <div class="modal-card">
        <button class="modal-close" data-close aria-label="Close">×</button>
        <div class="modal-icon">🪙</div>
        <h2>Demo top-up</h2>
        <p>Add <b>1,000 virtual coins</b> to your demo balance. Coins are free and have no real-world value.</p>
        <div class="bonus-balance">Current balance <strong id="bonusBalance">10,000</strong> coins</div>
        <button class="btn gold full" id="btnClaim">+ Claim 1,000 coins</button>
        <a class="btn ghost full" href="cashier.html">Open cashier (demo)</a>
        <p class="fine">You can top up as often as you like. No purchase necessary.</p>
      </div>
    </div>
    <div class="modal" id="modalAuth" hidden>
      <div class="modal-card">
        <button class="modal-close" data-close aria-label="Close">×</button>
        <div class="modal-icon">👤</div>
        <h2>${window.Auth && Auth.current() ? `Hi, ${Auth.current().name}` : 'Demo account'}</h2>
        <p>${window.Auth && Auth.current()
          ? 'Your demo profile, balance and stats are stored only in this browser.'
          : 'Create a free demo profile to save your name and stats. No KYC, no deposit and no real money.'}</p>
        <div class="bonus-balance">Balance <strong id="authBalance">10,000</strong> coins</div>
        <div class="bonus-balance">Rounds played <strong id="authRounds">0</strong></div>
        ${window.Auth && Auth.current()
          ? '<a class="btn gold full" href="account.html">Open my account</a>'
          : '<a class="btn gold full" href="register.html">Create free account</a><a class="btn ghost full" href="login.html">Log in</a>'}
        <a class="btn ghost full" href="support.html">Get help</a>
        <p class="fine">Demo profile only — never use a real password.</p>
      </div>
    </div>
    <div class="modal" id="modalHow" hidden>
      <div class="modal-card">
        <button class="modal-close" data-close aria-label="Close">×</button>
        <h2>How the demo works</h2>
        <ol class="steps">
          <li><b>Start with 10,000 coins</b> — top up any time, free.</li>
          <li><b>Pick any game</b> from the lobby — all tiles are playable.</li>
          <li><b>Cash out</b> before the round ends to keep your winnings.</li>
          <li><b>Verify fairness</b> in the provably fair panel on Aviator.</li>
        </ol>
        <p class="fine">Everything uses virtual coins. No real money is involved at any point.</p>
        <a class="btn gold full" href="aviator.html">Open Aviator</a>
      </div>
    </div>
    <div class="modal" id="modalSoon" hidden>
      <div class="modal-card small">
        <button class="modal-close" data-close aria-label="Close">×</button>
        <div class="modal-icon">🛠</div>
        <h2 id="soonTitle">Coming soon</h2>
        <p id="soonText">This table is a layout placeholder in the demo build.</p>
        <a class="btn gold full" href="index.html">Back to casino</a>
      </div>
    </div>
    <div class="toasts" id="toasts" aria-live="polite"></div>`;
  }

  function bottomNavHtml() {
    return `<nav class="bottom-nav" aria-label="Mobile navigation">
      <a class="${navActive('index.html')}" href="index.html"><span>▦</span>Casino</a>
      <a class="${navActive('crash.html', 'crash')}" href="crash.html"><span>🚀</span>Crash</a>
      <a class="${navActive('cashier.html')}" href="cashier.html"><span>🪙</span>Top up</a>
      <a class="${navActive('account.html')}" href="account.html"><span>👤</span>Account</a>
      <a class="${navActive('support.html')}" href="support.html"><span>?</span>Help</a>
    </nav>`;
  }

  function injectChrome() {
    const header = $('siteHeader');
    if (header) header.innerHTML = headerHtml();
    const footer = $('siteFooter');
    if (footer) footer.innerHTML = footerHtml();
    const modals = $('siteModals');
    if (modals) {
      modals.innerHTML = modalsHtml();
      document.body.insertAdjacentHTML('beforeend', bottomNavHtml());
    }
    updateBalances();
  }

  /* ---------------- events ---------------- */

  function onGlobalClick(event) {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      openModal(opener.dataset.open);
      return;
    }
    const closer = event.target.closest('[data-close]');
    if (closer) {
      closeModals();
      return;
    }
    if (event.target.classList && event.target.classList.contains('modal')) closeModals();
  }

  function bind() {
    if ($('siteModals')) {
      document.addEventListener('click', onGlobalClick);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModals();
      });
      const claim = $('btnClaim');
      if (claim) {
        claim.addEventListener('click', () => {
          const next = addBalance(1000, 'Demo top-up', 'topup');
          toast(`+1,000 demo coins · balance ${fmt(next)}`, 'win');
        });
      }
    }

    const search = $('searchInput');
    if (search) {
      search.addEventListener('input', () => {
        document.dispatchEvent(
          new CustomEvent('site:search', { detail: search.value.trim().toLowerCase() })
        );
      });
      search.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        if (document.body.dataset.searchLocal) {
          event.preventDefault();
          return;
        }
        const q = search.value.trim();
        if (q) location.href = `index.html?q=${encodeURIComponent(q)}`;
      });
    }

    const burger = $('btnDrawer');
    if (burger && !$('sidebar')) {
      burger.addEventListener('click', () => {
        location.href = 'index.html';
      });
    }

    window.addEventListener('storage', (event) => {
      if (event.key === STORE_KEY) updateBalances();
    });
  }

  applyPrefs();
  injectChrome();
  bind();

  return {
    STORE_KEY,
    FAV_KEY,
    START_BALANCE,
    fmt,
    round2,
    getBalance,
    setBalance,
    addBalance,
    getTx,
    getStats,
    recordRound,
    getPrefs,
    setPref,
    getFavs,
    toggleFav,
    getClaims,
    markClaim,
    isClaimed,
    toast,
    openModal,
    closeModals,
    updateBalances,
    resetAll,
  };
})();

window.Site = Site;
