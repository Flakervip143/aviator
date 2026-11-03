'use strict';

/* =========================================================
   SkyRocket Casino — demo bonus claims
   ========================================================= */

(function () {
  const host = document.getElementById('bonusGrid');
  if (!host) return;

  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;

  const BONUSES = [
    {
      key: 'welcome',
      icon: '🎁',
      title: 'Welcome boost',
      amount: 2500,
      cooldown: 0,
      desc: 'A one-time head start for every demo player. Claim it whenever you are ready.',
    },
    {
      key: 'daily',
      icon: '🗓',
      title: 'Daily top-up',
      amount: 1000,
      cooldown: DAY,
      desc: 'Free coins once every 24 hours. Come back tomorrow for another top-up.',
    },
    {
      key: 'weekly',
      icon: '⚡',
      title: 'Weekly rocket boost',
      amount: 5000,
      cooldown: WEEK,
      desc: 'A bigger boost once every 7 days. Perfect for trying higher demo bets.',
    },
    {
      key: 'cashier',
      icon: '🏦',
      title: 'Cashier match',
      amount: 0,
      cooldown: 0,
      desc: 'Every simulated cashier deposit includes a 5% demo bonus automatically.',
      link: 'cashier.html',
      linkText: 'Open cashier',
    },
  ];

  const fmt = (n) => Site.fmt(n);
  const $ = (id) => document.getElementById(id);

  function remainingText(ms) {
    if (ms <= 0) return '';
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  function stateOf(bonus) {
    if (!bonus.amount) return { available: false, label: '' };
    if (bonus.cooldown) {
      const claims = Site.getClaims();
      const at = claims[bonus.key];
      if (!at) return { available: true, label: 'Ready to claim' };
      const left = bonus.cooldown - (Date.now() - at);
      if (left > 0) return { available: false, label: `Next claim in ${remainingText(left)}` };
      return { available: true, label: 'Ready to claim' };
    }
    if (Site.isClaimed(bonus.key)) return { available: false, label: 'Already claimed' };
    return { available: true, label: 'One-time claim' };
  }

  function render() {
    const balance = Site.getBalance();
    if ($('bonusBalance')) $('bonusBalance').textContent = fmt(balance);

    host.innerHTML = BONUSES.map((bonus) => {
      const state = stateOf(bonus);
      const claimed = !bonus.link && !state.available;
      const button = bonus.link
        ? `<a class="btn ghost full" href="${bonus.link}">${bonus.linkText}</a>`
        : `<button class="btn gold full" type="button" data-claim="${bonus.key}"
             ${state.available ? '' : 'disabled'}>${state.available ? `Claim ${fmt(bonus.amount)} coins` : 'Claimed'}</button>`;
      return `<article class="bonus-card${claimed ? ' claimed' : ''}">
        <span class="bonus-icon">${bonus.icon}</span>
        <h3>${bonus.title}</h3>
        <div class="bonus-amount">${bonus.amount ? `+${fmt(bonus.amount)}` : '+5%'} <small>${bonus.amount ? 'coins' : 'on deposits'}</small></div>
        <p>${bonus.desc}</p>
        <span class="bonus-state">${state.label}</span>
        ${button}
      </article>`;
    }).join('');
  }

  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-claim]');
    if (!button) return;
    const bonus = BONUSES.find((item) => item.key === button.dataset.claim);
    if (!bonus || !bonus.amount) return;
    const state = stateOf(bonus);
    if (!state.available) return;

    Site.markClaim(bonus.key, bonus.cooldown);
    const next = Site.addBalance(bonus.amount, `Bonus · ${bonus.title}`, 'bonus');
    Site.toast(`Bonus claimed! +${fmt(bonus.amount)} coins · balance ${fmt(next)}`, 'win');
    render();
  });

  render();
  setInterval(render, 1000);
})();
