'use strict';

/* =========================================================
   SkyRocket Casino — shared game catalogue
   Original cover art, Crorebet-style game names.
   ========================================================= */

const CASINO_SECTIONS = [
  {
    id: 'crash',
    title: 'Crash & instant',
    blurb: 'Multiply your coins and cash out before the round ends.',
    games: [
      { name: 'Aviator', provider: 'Spribe', badge: 'HOT', url: 'aviator.html', type: 'crash', theme: 0 },
      { name: 'JetX', provider: 'SmartSoft', type: 'crash', theme: 5 },
      { name: 'Aviatrix', provider: 'Aviatrix', badge: 'NEW', type: 'crash', theme: 2 },
      { name: 'Mines', provider: 'Hacksaw', type: 'mines', theme: 7 },
      { name: 'Plinko', provider: 'BGaming', type: 'plinko', theme: 1 },
      { name: 'Chicken Road', provider: 'InOut', type: 'mines', theme: 3 },
      { name: 'Balloon', provider: 'Spribe', type: 'crash', theme: 4 },
      { name: 'Keno', provider: 'Spribe', type: 'dice', theme: 6 },
      { name: 'Tower', provider: 'SmartSoft', type: 'mines', theme: 2 },
      { name: 'Limbo', provider: 'Hacksaw', type: 'crash', theme: 6 },
      { name: 'Dice', provider: 'BGaming', type: 'dice', theme: 0 },
      { name: 'Goal', provider: 'SmartSoft', type: 'dice', theme: 2 },
      { name: 'Penalty', provider: 'SmartSoft', type: 'dice', theme: 3 },
      { name: 'Double', provider: 'SmartSoft', type: 'roulette', theme: 1 },
      { name: 'Wingo', provider: 'SkyRocket', badge: 'NEW', type: 'roulette', theme: 4 },
      { name: 'TRX', provider: 'SkyRocket', type: 'crash', theme: 7 },
    ],
  },
  {
    id: 'slots',
    title: 'Popular slots',
    blurb: 'Spin the reels and chase three of a kind.',
    games: [
      { name: 'Gates of Olympus', provider: 'Pragmatic Play', badge: 'HOT', type: 'slots', theme: 1 },
      { name: 'Sweet Bonanza', provider: 'Pragmatic Play', type: 'slots', theme: 4 },
      { name: 'Fortune Gems 3', provider: 'Jili', type: 'slots', theme: 0 },
      { name: '777 Gems', provider: '3 Oaks', type: 'slots', theme: 6 },
      { name: 'Wild Bounty', provider: 'PGSoft', type: 'slots', theme: 3 },
      { name: 'Super Burning Wins', provider: 'Playson', type: 'slots', theme: 7 },
      { name: 'Fortune Tiger', provider: 'PGSoft', badge: 'HOT', type: 'slots', theme: 3 },
      { name: 'Fortune Ox', provider: 'PGSoft', type: 'slots', theme: 6 },
      { name: 'Mahjong Ways', provider: 'PGSoft', type: 'slots', theme: 2 },
      { name: 'Money Coming', provider: 'Jili', type: 'slots', theme: 1 },
      { name: 'Boxing King', provider: 'Jili', type: 'slots', theme: 7 },
      { name: 'Roma', provider: 'PGSoft', type: 'slots', theme: 0 },
    ],
  },
  {
    id: 'live',
    title: 'Live casino',
    blurb: 'Table classics with a live-dealer feel.',
    games: [
      { name: 'Hindi Roulette', provider: 'Evolution', type: 'roulette', theme: 7 },
      { name: 'Teen Patti Live', provider: 'Ezugi', type: 'highcard', theme: 4 },
      { name: 'Andar Bahar Live', provider: 'Ezugi', type: 'highcard', theme: 0 },
      { name: 'Live Blackjack', provider: 'Evolution', type: 'highcard', theme: 2 },
      { name: 'Speed Baccarat', provider: 'Evolution', type: 'highcard', theme: 5 },
      { name: 'Crazy Time', provider: 'Evolution', badge: 'HOT', type: 'roulette', theme: 1 },
      { name: 'Lightning Roulette', provider: 'Evolution', type: 'roulette', theme: 6 },
      { name: 'Monopoly Live', provider: 'Evolution', type: 'roulette', theme: 3 },
      { name: 'Dream Catcher', provider: 'Evolution', type: 'roulette', theme: 4 },
      { name: 'Fan Tan', provider: 'Evolution', type: 'highcard', theme: 5 },
      { name: 'Sic Bo Live', provider: 'Evolution', type: 'dice', theme: 0 },
      { name: 'Dragon Tiger Live', provider: 'Evolution', type: 'highcard', theme: 7 },
    ],
  },
  {
    id: 'table',
    title: 'Table games',
    blurb: 'Roulette, cards and dice — quick demo rounds.',
    games: [
      { name: 'European Roulette', provider: 'SkyRocket', type: 'roulette', theme: 0 },
      { name: 'Classic Blackjack', provider: 'SkyRocket', type: 'highcard', theme: 2 },
      { name: 'Baccarat', provider: 'SkyRocket', type: 'highcard', theme: 7 },
      { name: 'Dragon Tiger', provider: 'SkyRocket', type: 'highcard', theme: 3 },
      { name: 'Sic Bo', provider: 'SkyRocket', type: 'dice', theme: 5 },
      { name: 'Video Poker', provider: 'SkyRocket', type: 'highcard', theme: 4 },
      { name: 'American Roulette', provider: 'SkyRocket', type: 'roulette', theme: 1 },
      { name: 'French Roulette', provider: 'SkyRocket', type: 'roulette', theme: 4 },
      { name: 'Pontoon', provider: 'SkyRocket', type: 'highcard', theme: 6 },
      { name: "Casino Hold'em", provider: 'SkyRocket', type: 'highcard', theme: 3 },
    ],
  },
  {
    id: 'indian',
    title: 'Indian favourites',
    blurb: 'Teen Patti, Andar Bahar and desi classics.',
    games: [
      { name: 'Teen Patti Gold', provider: 'SkyRocket', type: 'highcard', theme: 4 },
      { name: 'Andar Bahar', provider: 'SkyRocket', type: 'highcard', theme: 0 },
      { name: 'Rummy Circle', provider: 'SkyRocket', type: 'highcard', theme: 2 },
      { name: '7 Up Down', provider: 'SkyRocket', type: 'dice', theme: 6 },
      { name: 'Lucky 7', provider: 'SkyRocket', type: 'slots', theme: 3 },
      { name: 'Muflis Teen Patti', provider: 'SkyRocket', type: 'highcard', theme: 1 },
      { name: 'Teen Patti Laser', provider: 'SkyRocket', type: 'highcard', theme: 6 },
      { name: 'Teen Patti Ruby', provider: 'SkyRocket', badge: 'HOT', type: 'highcard', theme: 7 },
      { name: 'Andar Bahar Go', provider: 'SkyRocket', type: 'highcard', theme: 5 },
      { name: 'Kalar', provider: 'SkyRocket', type: 'highcard', theme: 1 },
    ],
  },
];

const CATEGORY_META = {
  crash: { title: 'Crash & instant games', emoji: '🚀', desc: 'Cash out before the round ends. Aviator, JetX, Mines, Plinko and more — all with virtual coins.' },
  slots: { title: 'Slot games', emoji: '🎰', desc: 'Three-reel demo slots with instant spins and instant payouts in virtual coins.' },
  live: { title: 'Live casino', emoji: '🃏', desc: 'Roulette and card-table classics with a live-casino look. Demo rounds, real fun.' },
  table: { title: 'Table games', emoji: '🎲', desc: 'Roulette, blackjack, baccarat, dragon tiger, sic bo and video poker.' },
  indian: { title: 'Indian favourites', emoji: '♠', desc: 'Teen Patti, Andar Bahar, Rummy and desi classics — playable with demo coins.' },
};

const ART_BY_TYPE = {
  crash: 'assets/thumbs/crash.svg',
  mines: 'assets/thumbs/mines.svg',
  plinko: 'assets/thumbs/plinko.svg',
  slots: 'assets/thumbs/slots.svg',
  roulette: 'assets/thumbs/roulette.svg',
  highcard: 'assets/thumbs/cards.svg',
  dice: 'assets/thumbs/dice.svg',
  live: 'assets/thumbs/live.svg',
};

function casinoSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function casinoGameUrl(game) {
  return game.url || `game.html?g=${casinoSlug(game.name)}`;
}

function casinoFindGame(slug) {
  for (const section of CASINO_SECTIONS) {
    for (const game of section.games) {
      if (casinoSlug(game.name) === slug) return { section, game };
    }
  }
  return null;
}

function casinoArt(game) {
  return ART_BY_TYPE[game.type] || ART_BY_TYPE.live;
}

function casinoCard(sectionId, game) {
  const theme = typeof game.theme === 'number' ? game.theme % 8 : 0;
  const badge = game.badge
    ? `<span class="card-badge ${game.badge.toLowerCase()}">${game.badge}</span>`
    : '';
  const favs = window.Site ? Site.getFavs() : [];
  const isFav = favs.includes(game.name);
  return `<article class="game-card" data-cat="${sectionId}" data-name="${game.name.toLowerCase()}" data-fav="${game.name}">
    <a class="thumb theme-${theme}" href="${casinoGameUrl(game)}" aria-label="Play ${game.name}">
      <img class="thumb-img" src="${casinoArt(game)}" alt="" loading="lazy" draggable="false">
      <span class="thumb-shade" aria-hidden="true"></span>
      <span class="thumb-provider">${game.provider}</span>
      ${badge}
      <span class="play-fab" aria-hidden="true">▶</span>
    </a>
    <div class="card-meta">
      <div class="meta-text"><b>${game.name}</b><span>${game.provider}</span></div>
      <button class="fav${isFav ? ' on' : ''}" data-fav-toggle="${game.name}" aria-label="Favourite ${game.name}">${isFav ? '★' : '☆'}</button>
    </div>
  </article>`;
}

window.CASINO_SECTIONS = CASINO_SECTIONS;
window.CATEGORY_META = CATEGORY_META;
window.ART_BY_TYPE = ART_BY_TYPE;
window.casinoSlug = casinoSlug;
window.casinoGameUrl = casinoGameUrl;
window.casinoFindGame = casinoFindGame;
window.casinoArt = casinoArt;
window.casinoCard = casinoCard;
