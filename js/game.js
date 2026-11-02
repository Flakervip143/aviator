'use strict';

/* =========================================================
   SkyRocket — Aviator-style crash game
   Fully client-side demo. Virtual coins only.
   ========================================================= */

const CONFIG = {
  GROWTH: 0.07,          // multiplier = e^(GROWTH * seconds)
  BETTING_MS: 5000,
  RESULT_MS: 3000,
  MIN_BET: 10,
  MAX_BET: 50000,
  START_BALANCE: 10000,
  MAX_MULT: 1000,
  HISTORY_LEN: 60,
  INSTANT_CRASH_ONE_IN: 33,
};

const STORE_KEY = 'skyr_state_v1';
const $ = (id) => document.getElementById(id);

/* ------------------------------ helpers ------------------------------ */

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const nfInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt = (n) => nf.format(n);
const fmtInt = (n) => nfInt.format(n);
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

const textEncoder = new TextEncoder();
const bufToHex = (buf) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(message) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(message));
  return bufToHex(digest);
}

async function hmacSha256Hex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(message));
  return bufToHex(sig);
}

/* Provably-fair crash point:
   HMAC_SHA256(serverSeed, clientSeed:nonce) -> first 4 bytes -> multiplier */
async function computeCrash(serverSeed, clientSeed, nonce) {
  const hash = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`);
  const h = parseInt(hash.slice(0, 8), 16);
  const e = 2 ** 32;
  if (h % CONFIG.INSTANT_CRASH_ONE_IN === 0) return 1;
  const crash = Math.floor((100 * e - h) / (e - h)) / 100;
  return clamp(crash, 1, CONFIG.MAX_MULT);
}

/* ------------------------------ persistent state ------------------------------ */

function freshStats() {
  return { rounds: 0, won: 0, lost: 0, wagered: 0, biggest: 0, bestMult: 0, profit: 0 };
}

function defaultState() {
  return {
    balance: CONFIG.START_BALANCE,
    bet: 100,
    sound: true,
    clientSeed: randomHex(8),
    nonce: 0,
    history: [],
    stats: freshStats(),
  };
}

function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return {
      ...base,
      ...saved,
      stats: { ...base.stats, ...(saved.stats || {}) },
      history: Array.isArray(saved.history) ? saved.history : [],
    };
  } catch (err) {
    return base;
  }
}

const state = {
  ...loadState(),
  phase: 'betting',
  mult: 1,
  p: 0,
  t: 0,
  activeBet: null,
  bots: [],
  round: null,
  lastRound: null,
  starting: false,
  bettingEndsAt: 0,
  resultEndsAt: 0,
  flightStart: 0,
  crashFxAt: 0,
  crashPoint2: null,
  lastTickSecond: -1,
};

function save() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        balance: state.balance,
        bet: state.bet,
        sound: state.sound,
        clientSeed: state.clientSeed,
        nonce: state.nonce,
        history: state.history,
        stats: state.stats,
      })
    );
  } catch (err) {
    /* storage might be unavailable */
  }
}

/* ------------------------------ DOM refs ------------------------------ */

const el = {
  stage: $('stage'),
  canvas: $('game'),
  stageCenter: $('stageCenter'),
  phaseLabel: $('phaseLabel'),
  multiplier: $('multiplier'),
  phaseSub: $('phaseSub'),
  history: $('history'),
  toasts: $('toasts'),
  fairHashTop: $('fairHash'),
  roundNo: $('roundNo'),
  balance: $('balance'),
  panelBalance: $('panelBalance'),
  betState: $('betState'),
  betInput: $('betInput'),
  autoCashout: $('autoCashout'),
  actionBtn: $('actionBtn'),
  actionMain: $('actionMain'),
  actionSub: $('actionSub'),
  hint: $('hint'),
  btnHalf: $('btnHalf'),
  btnDouble: $('btnDouble'),
  quickChips: $('quickChips'),
  liveBets: $('liveBets'),
  playersCount: $('playersCount'),
  btnSound: $('btnSound'),
  btnMenu: $('btnMenu'),
  modalMenu: $('modalMenu'),
  modalHow: $('modalHow'),
  modalFair: $('modalFair'),
  modalHistory: $('modalHistory'),
  modalStats: $('modalStats'),
  clientSeedInput: $('clientSeedInput'),
  btnSaveSeed: $('btnSaveSeed'),
  fairNonce: $('fairNonce'),
  fairHashCurrent: $('fairHashCurrent'),
  fairLastSeed: $('fairLastSeed'),
  fairLastHash: $('fairLastHash'),
  fairLastCrash: $('fairLastCrash'),
  fairLastMsg: $('fairLastMsg'),
  btnVerify: $('btnVerify'),
  verifyOut: $('verifyOut'),
  histList: $('histList'),
  statRounds: $('statRounds'),
  statWon: $('statWon'),
  statWagered: $('statWagered'),
  statBiggest: $('statBiggest'),
  statProfit: $('statProfit'),
  statBestMult: $('statBestMult'),
  btnReset: $('btnReset'),
};

/* ------------------------------ audio ------------------------------ */

let audioCtx = null;

function ac() {
  if (!state.sound) return null;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (err) {
    return null;
  }
}

function tone(freq, duration, type = 'sine', volume = 0.04, slideTo = null) {
  const ctx = ac();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration = 0.35, volume = 0.06) {
  const ctx = ac();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2);
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  gain.gain.value = volume;
  src.buffer = buffer;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
}

const Sound = {
  bet: () => tone(520, 0.09, 'triangle', 0.035),
  cancel: () => tone(300, 0.09, 'triangle', 0.03),
  tick: () => tone(880, 0.05, 'square', 0.018),
  takeoff: () => tone(150, 0.55, 'sawtooth', 0.035, 480),
  cashout: () => {
    tone(660, 0.1, 'sine', 0.05);
    setTimeout(() => tone(990, 0.16, 'sine', 0.05), 90);
  },
  crash: () => {
    noiseBurst(0.45, 0.07);
    tone(150, 0.4, 'sawtooth', 0.05, 40);
  },
};

/* ------------------------------ rendering helpers ------------------------------ */

function setMultiplierText(value, suffix = 'x') {
  if (!el.multiplier.firstChild) {
    el.multiplier.textContent = value;
  } else {
    el.multiplier.firstChild.nodeValue = value;
  }
  const span = el.multiplier.querySelector('span');
  if (span) span.textContent = suffix;
}

function renderBalance() {
  el.balance.textContent = fmt(state.balance);
  el.panelBalance.textContent = fmt(state.balance);
}

function setPhase(phase) {
  state.phase = phase;
  el.stageCenter.dataset.phase = phase;
  el.stage.dataset.phase = phase;
  if (phase === 'betting') {
    el.phaseLabel.textContent = 'Place your bets';
    el.betState.textContent = 'Open';
    el.betState.className = 'badge';
  } else if (phase === 'flying') {
    el.phaseLabel.textContent = 'Current multiplier';
    el.betState.textContent = 'In flight';
    el.betState.className = 'badge flying';
  } else {
    el.phaseLabel.textContent = 'Flew away';
    el.betState.textContent = 'Closed';
    el.betState.className = 'badge closed';
  }
  updateBetUI();
}

function renderHistory() {
  const items = state.history.slice(0, 30);
  el.history.innerHTML = items
    .map((h, i) => {
      const cls = h.mult < 2 ? 'low' : h.mult < 10 ? 'mid' : 'high';
      return `<span class="h-chip ${cls}${i === 0 ? ' newest' : ''}" title="${new Date(h.ts).toLocaleTimeString()}">${h.mult.toFixed(2)}x</span>`;
    })
    .join('');
}

function toast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  el.toasts.appendChild(node);
  while (el.toasts.children.length > 4) el.toasts.removeChild(el.toasts.firstChild);
  setTimeout(() => node.remove(), 2400);
}

function hint(message, warn = false) {
  el.hint.textContent = message;
  el.hint.classList.toggle('warn', warn);
}

/* ------------------------------ betting UI ------------------------------ */

function parseAutoTarget() {
  const raw = el.autoCashout.value.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1.01 || value > CONFIG.MAX_MULT) return false;
  return round2(value);
}

function currentBetAmount() {
  const value = Math.floor(Number(el.betInput.value));
  if (!Number.isFinite(value)) return CONFIG.MIN_BET;
  return clamp(value, CONFIG.MIN_BET, CONFIG.MAX_BET);
}

function potentialPayout(amount, mult) {
  return round2(amount * mult);
}

function updateBetUI() {
  const phase = state.phase;
  const bet = state.activeBet;
  const amount = currentBetAmount();
  let mode = 'bet';
  let main = 'BET';
  let sub = `${fmtInt(amount)} coins`;
  let message = 'Place your bet before the rocket takes off.';
  let warn = false;
  let disabled = false;

  if (phase === 'betting') {
    if (bet) {
      mode = 'cancel';
      main = 'CANCEL BET';
      sub = `${fmtInt(bet.amount)} coins`;
      message = 'Bet placed — waiting for takeoff.';
    } else if (state.balance < CONFIG.MIN_BET) {
      main = 'BET';
      sub = 'Balance too low';
      message = 'Your demo balance is too low. Top up to keep playing.';
      warn = true;
    }
  } else if (phase === 'flying') {
    if (bet && !bet.cashed) {
      const livePayout = potentialPayout(bet.amount, state.mult);
      mode = 'cashout';
      main = `CASH OUT ${state.mult.toFixed(2)}x`;
      sub = `+ ${fmt(livePayout)} coins`;
      message = bet.target
        ? `Auto cash out set at ${bet.target.toFixed(2)}x.`
        : 'Tap to lock in your winnings.';
    } else if (bet && bet.cashed) {
      mode = 'done';
      main = 'CASHED OUT';
      sub = `+ ${fmt(bet.payout)} coins`;
      message = `Locked at ${bet.cashoutMult.toFixed(2)}x.`;
      disabled = true;
    } else {
      mode = 'wait';
      main = 'NEXT ROUND';
      sub = 'No active bet';
      message = 'You are watching this round.';
      disabled = true;
    }
  } else {
    if (bet && bet.cashed) {
      mode = 'done';
      main = 'CASHED OUT';
      sub = `+ ${fmt(bet.payout)} coins`;
      message = `Round ended at ${state.round ? state.round.crashPoint.toFixed(2) : '—'}x.`;
      disabled = true;
    } else if (bet && !bet.cashed) {
      mode = 'wait';
      main = 'FLEW AWAY';
      sub = `- ${fmtInt(bet.amount)} coins`;
      message = 'The rocket flew away before you cashed out.';
      warn = true;
      disabled = true;
    } else {
      mode = 'wait';
      main = 'NEXT ROUND';
      sub = 'Get ready…';
      message = 'Next round is starting.';
      disabled = true;
    }
  }

  el.actionBtn.dataset.mode = mode;
  el.actionBtn.disabled = disabled;
  el.actionMain.textContent = main;
  el.actionSub.textContent = sub;
  hint(message, warn);
}

function placeBet() {
  if (state.phase !== 'betting' || state.activeBet) return;
  const amount = currentBetAmount();
  const target = parseAutoTarget();

  if (target === false) {
    hint('Auto cash out must be between 1.01x and 1000x.', true);
    el.autoCashout.focus();
    return;
  }
  if (amount > state.balance) {
    hint('Not enough coins for that bet.', true);
    return;
  }

  state.bet = amount;
  state.balance = round2(state.balance - amount);
  state.activeBet = { amount, cashed: false, payout: 0, cashoutMult: 0, target };
  state.stats.wagered = round2(state.stats.wagered + amount);
  state.stats.profit = round2(state.stats.profit - amount);

  renderBalance();
  renderBots();
  updateBetUI();
  toast(`Bet placed · ${fmtInt(amount)} coins`, 'info');
  Sound.bet();
  save();
}

function cancelBet() {
  if (!state.activeBet || state.phase !== 'betting') return;
  const amount = state.activeBet.amount;
  state.balance = round2(state.balance + amount);
  state.stats.wagered = round2(state.stats.wagered - amount);
  state.stats.profit = round2(state.stats.profit + amount);
  state.activeBet = null;
  renderBalance();
  renderBots();
  updateBetUI();
  Sound.cancel();
  save();
}

function cashOut(auto = false) {
  const bet = state.activeBet;
  if (!bet || bet.cashed || state.phase !== 'flying') return;

  let mult = state.mult;
  if (auto && bet.target) mult = Math.min(bet.target, state.mult);
  mult = Math.max(1, round2(mult));

  const payout = potentialPayout(bet.amount, mult);
  bet.cashed = true;
  bet.cashoutMult = mult;
  bet.payout = payout;

  state.balance = round2(state.balance + payout);
  state.stats.profit = round2(state.stats.profit + payout);
  state.stats.won += 1;
  state.stats.biggest = Math.max(state.stats.biggest, payout);
  state.stats.bestMult = Math.max(state.stats.bestMult, mult);

  renderBalance();
  renderBots();
  updateBetUI();
  toast(`Cashed out ${mult.toFixed(2)}x · +${fmt(payout)} coins`, 'win');
  Sound.cashout();
  save();
}

function handleAction() {
  if (state.phase === 'betting') {
    if (state.activeBet) cancelBet();
    else placeBet();
    return;
  }
  if (state.phase === 'flying' && state.activeBet && !state.activeBet.cashed) {
    cashOut();
  }
}

/* ------------------------------ bots ------------------------------ */

const BOT_NAMES = [
  'Aarav', 'Vivaan', 'Rohan', 'Kabir', 'Ishaan', 'Arjun', 'Reyansh', 'Advait',
  'Ananya', 'Diya', 'Myra', 'Kiara', 'Aadhya', 'Saanvi', 'Riya', 'Neha',
  'Rahul', 'Vikram', 'Priya', 'Pooja', 'Amit', 'Sneha', 'Karan', 'Nisha',
  'Aditya', 'Meera', 'Siddharth', 'Tanvi', 'Yash', 'Ritu', 'Manish', 'Kavya',
];
const AVATAR_COLORS = [
  '#38bdf8', '#facc15', '#16b14a', '#f472b6', '#a78bfa', '#fb923c',
  '#22d3ee', '#4ade80', '#f87171', '#93c5fd', '#fde047', '#c084fc',
];

function makeBots(crashPoint) {
  const count = randInt(12, 22);
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  const stakes = [50, 100, 100, 200, 250, 500, 500, 1000, 1000, 2000, 5000];
  const bots = [];
  for (let i = 0; i < count; i++) {
    const bet = pick(stakes);
    const willCash = Math.random() < 0.74;
    const target = willCash
      ? round2(1.01 + Math.pow(Math.random(), 1.85) * 12)
      : null;
    bots.push({
      id: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: names[i % names.length],
      color: pick(AVATAR_COLORS),
      bet,
      target,
      cashed: false,
      lost: false,
      payout: 0,
    });
  }
  return bots;
}

function botRow(bot) {
  const initials = bot.name.slice(0, 1).toUpperCase();
  let multText = '—';
  let payoutText = '—';
  let cls = '';

  if (bot.cashed) {
    multText = `${bot.target.toFixed(2)}x`;
    payoutText = fmt(bot.payout);
    cls = 'cashed';
  } else if (bot.lost) {
    multText = 'FLEW AWAY';
    payoutText = '0';
    cls = 'lost';
  } else if (state.phase === 'flying') {
    multText = 'live';
  }

  return `<div class="bet-row ${cls}" data-row="${bot.id}">
    <div class="player">
      <span class="avatar" style="background:${bot.color}">${initials}</span>
      <span class="pname">${bot.name}</span>
    </div>
    <div class="stake">${fmtInt(bot.bet)}</div>
    <div class="mult">${multText}</div>
    <div class="payout">${payoutText}</div>
  </div>`;
}

function playerRow() {
  const bet = state.activeBet;
  if (!bet) return '';
  const lost = state.phase === 'result' && !bet.cashed;
  const status = bet.cashed
    ? `${bet.cashoutMult.toFixed(2)}x`
    : lost
      ? 'FLEW AWAY'
      : state.phase === 'flying'
        ? 'live'
        : '—';
  const payout = bet.cashed ? fmt(bet.payout) : lost ? '0' : '—';
  const cls = bet.cashed ? 'cashed' : lost ? 'lost' : '';

  return `<div class="bet-row you ${cls}" data-row="you">
    <div class="player">
      <span class="avatar" style="background:#38bdf8">Y</span>
      <span class="pname">You</span>
    </div>
    <div class="stake">${fmtInt(bet.amount)}</div>
    <div class="mult">${status}</div>
    <div class="payout">${payout}</div>
  </div>`;
}

function renderBots() {
  const scrollTop = el.liveBets.scrollTop;
  el.liveBets.innerHTML = playerRow() + state.bots.map(botRow).join('');
  state.bots.forEach((bot) => {
    const row = el.liveBets.querySelector(`[data-row="${bot.id}"]`);
    if (row) {
      bot._mult = row.querySelector('.mult');
      bot._payout = row.querySelector('.payout');
    }
  });
  el.liveBets.scrollTop = scrollTop;
  const total = state.bots.length + (state.activeBet ? 1 : 0);
  el.playersCount.textContent = `${total} player${total === 1 ? '' : 's'}`;
}

function updateBotLive(mult) {
  for (const bot of state.bots) {
    if (!bot.cashed && !bot.lost && bot._mult) {
      bot._mult.textContent = `${mult.toFixed(2)}x`;
    }
  }
}

function checkBotCashouts(mult) {
  let changed = false;
  for (const bot of state.bots) {
    if (!bot.cashed && !bot.lost && bot.target && mult >= bot.target) {
      bot.cashed = true;
      bot.payout = round2(bot.bet * bot.target);
      changed = true;
    }
  }
  if (changed) renderBots();
}

function settleBots() {
  for (const bot of state.bots) {
    if (!bot.cashed) bot.lost = true;
  }
  renderBots();
}

/* ------------------------------ round flow ------------------------------ */

async function startRound() {
  if (state.starting) return;
  state.starting = true;

  state.activeBet = null;
  state.bots = [];
  state.round = null;
  state.mult = 1;
  state.p = 0;
  state.t = 0;
  state.bettingEndsAt = 0;
  state.lastTickSecond = -1;
  state.crashFxAt = 0;
  state.phase = 'betting';

  renderBots();
  setMultiplierText('5.0', 's');
  el.phaseSub.textContent = 'Preparing round…';
  el.fairHashTop.textContent = 'hash: generating…';
  el.roundNo.textContent = `round #${state.nonce + 1}`;
  setPhase('betting');
  save();

  const serverSeed = randomHex(32);
  const hash = await sha256Hex(serverSeed);
  const nonce = state.nonce + 1;
  const clientSeed = state.clientSeed;
  const crashPoint = await computeCrash(serverSeed, clientSeed, nonce);

  state.nonce = nonce;
  state.round = { serverSeed, hash, crashPoint, nonce, clientSeed };
  state.bots = makeBots(crashPoint);

  el.fairHashTop.textContent = `hash: ${hash.slice(0, 16)}…`;
  el.roundNo.textContent = `round #${nonce}`;
  renderBots();
  updateFairModal();

  state.bettingEndsAt = performance.now() + CONFIG.BETTING_MS;
  state.starting = false;
  setPhase('betting');
}

function takeoff(now) {
  if (state.phase !== 'betting' || !state.round) return;
  state.phase = 'flying';
  state.flightStart = now;
  state.mult = 1;
  state.t = 0;
  state.p = 0;
  setPhase('flying');
  setMultiplierText('1.00', 'x');
  el.phaseSub.textContent = 'Cash out before it flies away!';
  renderBots();
  Sound.takeoff();
  updateBetUI();
}

function crashRound(now) {
  const crashPoint = state.round.crashPoint;
  state.phase = 'result';
  state.mult = crashPoint;
  state.crashFxAt = now;
  state.resultEndsAt = now + CONFIG.RESULT_MS;

  setPhase('result');
  setMultiplierText(crashPoint.toFixed(2), 'x');
  el.phaseSub.textContent = `Next round in ${(CONFIG.RESULT_MS / 1000).toFixed(1)}s`;

  const lost = state.activeBet && !state.activeBet.cashed;
  if (lost) {
    state.stats.lost += 1;
  }

  state.stats.rounds += 1;
  state.history.unshift({ mult: crashPoint, ts: Date.now() });
  state.history = state.history.slice(0, CONFIG.HISTORY_LEN);
  state.lastRound = {
    ...state.round,
    at: Date.now(),
  };

  settleBots();
  renderHistory();
  renderBots();
  updateBetUI();
  updateFairModal();

  if (lost) {
    toast(`Flew away at ${crashPoint.toFixed(2)}x · -${fmtInt(state.activeBet.amount)} coins`, 'lose');
  }
  Sound.crash();
  save();
}

/* ------------------------------ main loop ------------------------------ */

function flightProgress(t) {
  return 0.985 * (1 - Math.exp(-0.135 * t));
}

let lastFrameNow = performance.now();

function update(now) {
  if (state.phase === 'betting') {
    if (!state.round || !state.bettingEndsAt) return;
    const leftMs = Math.max(0, state.bettingEndsAt - now);
    const left = leftMs / 1000;
    setMultiplierText(left.toFixed(1), 's');
    el.phaseSub.textContent = left > 0 ? `Round starts in ${left.toFixed(1)}s` : 'Taking off…';

    const second = Math.ceil(left);
    if (second <= 3 && second > 0 && second !== state.lastTickSecond) {
      state.lastTickSecond = second;
      Sound.tick();
    }

    if (leftMs <= 0) takeoff(now);
    return;
  }

  if (state.phase === 'flying') {
    const t = (now - state.flightStart) / 1000;
    const mult = Math.exp(CONFIG.GROWTH * t);
    state.t = t;
    state.p = flightProgress(t);

    if (mult >= state.round.crashPoint) {
      state.mult = state.round.crashPoint;
      crashRound(now);
      return;
    }

    state.mult = mult;
    setMultiplierText(mult.toFixed(2), 'x');
    const bet = state.activeBet;
    el.phaseSub.textContent =
      bet && !bet.cashed
        ? `Potential payout: ${fmt(potentialPayout(bet.amount, mult))} coins`
        : 'Cash out before it flies away!';

    if (bet && !bet.cashed) {
      el.actionMain.textContent = `CASH OUT ${mult.toFixed(2)}x`;
      el.actionSub.textContent = `+ ${fmt(potentialPayout(bet.amount, mult))} coins`;
      if (bet.target && mult >= bet.target) cashOut(true);
    }

    updateBotLive(mult);
    checkBotCashouts(mult);
    return;
  }

  if (state.phase === 'result') {
    const left = Math.max(0, state.resultEndsAt - now);
    el.phaseSub.textContent = `Next round in ${(left / 1000).toFixed(1)}s`;
    if (left <= 0) startRound();
  }
}

/* ------------------------------ canvas ------------------------------ */

const canvas = el.canvas;
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;
let DPR = 1;
let particles = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = rect.width;
  H = rect.height;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function pointAt(p) {
  p = clamp(p, 0, 1);
  return {
    x: W * (0.06 + 0.9 * p),
    y: H * (0.9 - 0.82 * Math.pow(p, 2.15)),
  };
}

function angleAt(p) {
  const a = pointAt(Math.max(0, p - 0.003));
  const b = pointAt(Math.min(1, p + 0.003));
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function drawGrid(now) {
  const gap = 46;
  const offset = (now * 0.018) % gap;
  ctx.save();
  ctx.strokeStyle = 'rgba(164, 209, 255, 0.055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -offset; x <= W; x += gap) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = -offset; y <= H; y += gap) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  // soft vignette at the bottom
  const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
  grad.addColorStop(0, 'rgba(10, 24, 41, 0)');
  grad.addColorStop(1, 'rgba(10, 24, 41, 0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);
  ctx.restore();
}

function drawTrail(p) {
  if (p <= 0.002) return;
  const steps = 64;
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(pointAt((p * i) / steps));

  // area under the curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, H * 0.98);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.lineTo(pts[pts.length - 1].x, H * 0.98);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, H * 0.15, 0, H);
  area.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
  area.addColorStop(0.7, 'rgba(5, 129, 255, 0.05)');
  area.addColorStop(1, 'rgba(5, 129, 255, 0)');
  ctx.fillStyle = area;
  ctx.fill();
  ctx.restore();

  // glowing path
  ctx.save();
  const line = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
  line.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
  line.addColorStop(0.55, 'rgba(56, 189, 248, 0.85)');
  line.addColorStop(1, '#facc15');
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.65)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.stroke();

  // head glow
  const head = pts[pts.length - 1];
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlane(x, y, angle, scale, alpha, colorA = '#38bdf8', colorB = '#e0f2fe') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
  ctx.shadowBlur = 20;
  const grad = ctx.createLinearGradient(-14, 0, 18, 0);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, 10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function drawIdlePlane(now) {
  const pt = pointAt(0);
  const bob = Math.sin(now / 420) * 3;
  const pulse = 0.85 + Math.sin(now / 380) * 0.1;
  drawPlane(pt.x + 10, pt.y + bob, -0.5, pulse, 0.9);
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pt.x + 10, pt.y + bob, 20 + Math.sin(now / 380) * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function spawnCrashParticles(x, y) {
  particles = [];
  const colors = ['#facc15', '#38bdf8', '#f10033', '#a4d1ff', '#ffffff', '#0581ff'];
  for (let i = 0; i < 44; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(40, 240);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: rand(0.45, 1.05),
      maxLife: 1.05,
      size: rand(1.5, 4.2),
      color: pick(colors),
    });
  }
}

function drawCrashFx(now) {
  const elapsed = (now - state.crashFxAt) / 1000;
  const pos = pointAt(state.p);
  if (elapsed > 1.4) return;

  ctx.save();
  // shockwave
  const wave = Math.min(1, elapsed / 0.55);
  ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - wave) * 0.8})`;
  ctx.lineWidth = 3 * (1 - wave) + 0.5;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 12 + wave * 110, 0, Math.PI * 2);
  ctx.stroke();

  // plane spinning away
  if (elapsed < 0.8) {
    const k = elapsed / 0.8;
    ctx.globalAlpha = 1 - k;
    drawPlane(
      pos.x + k * 90,
      pos.y - k * 70,
      -0.5 + k * 5,
      1 - k * 0.55,
      1 - k
    );
    ctx.globalAlpha = 1;
  }

  // particles
  for (const p of particles) {
    const life = p.life - elapsed;
    if (life <= 0) continue;
    const x = p.x + p.vx * elapsed;
    const y = p.y + p.vy * elapsed + 90 * elapsed * elapsed;
    ctx.globalAlpha = Math.max(0, life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function draw(now) {
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  drawGrid(now);

  if (state.phase === 'betting') {
    drawIdlePlane(now);
  } else if (state.phase === 'flying') {
    drawTrail(state.p);
    const pt = pointAt(state.p);
    drawPlane(pt.x, pt.y, angleAt(state.p), 1, 1);
  } else if (state.phase === 'result') {
    if (state.crashFxAt) {
      drawTrail(state.p);
      drawCrashFx(now);
    }
  }
}

function frame(now) {
  const dt = now - lastFrameNow;
  lastFrameNow = now;
  if (dt > 0) update(now);
  draw(now);
  requestAnimationFrame(frame);
}

/* ------------------------------ modals ------------------------------ */

function openModal(id) {
  closeModals();
  const modal = $(id);
  if (!modal) return;
  if (id === 'modalFair') updateFairModal();
  if (id === 'modalHistory') renderHistoryModal();
  if (id === 'modalStats') renderStats();
  modal.hidden = false;
}

function closeModals() {
  document.querySelectorAll('.modal').forEach((m) => {
    m.hidden = true;
  });
}

function updateFairModal() {
  el.clientSeedInput.value = state.clientSeed;
  el.fairNonce.textContent = state.nonce + 1;
  el.fairHashCurrent.textContent = state.round ? state.round.hash : '—';
  if (state.lastRound) {
    el.fairLastSeed.textContent = state.lastRound.serverSeed;
    el.fairLastHash.textContent = state.lastRound.hash;
    el.fairLastCrash.textContent = `${state.lastRound.crashPoint.toFixed(2)}x`;
    el.fairLastMsg.textContent = `${state.lastRound.clientSeed}:${state.lastRound.nonce}`;
  } else {
    el.fairLastSeed.textContent = '—';
    el.fairLastHash.textContent = '—';
    el.fairLastCrash.textContent = '—';
    el.fairLastMsg.textContent = '—';
  }
  el.verifyOut.textContent = '';
  el.verifyOut.className = 'verify-out';
}

function renderHistoryModal() {
  if (!state.history.length) {
    el.histList.innerHTML = '<p class="fine">No rounds played yet.</p>';
    return;
  }
  el.histList.innerHTML = state.history
    .map((h) => {
      const cls = h.mult < 2 ? 'low' : h.mult < 10 ? 'mid' : 'high';
      return `<div class="hist-item">
        <span>${new Date(h.ts).toLocaleTimeString()}</span>
        <span class="hist-mult ${cls}">${h.mult.toFixed(2)}x</span>
        <span>${new Date(h.ts).toLocaleDateString()}</span>
      </div>`;
    })
    .join('');
}

function renderStats() {
  el.statRounds.textContent = fmtInt(state.stats.rounds);
  el.statWon.textContent = fmtInt(state.stats.won);
  el.statWagered.textContent = fmt(state.stats.wagered);
  el.statBiggest.textContent = fmt(state.stats.biggest);
  el.statProfit.textContent = `${state.stats.profit >= 0 ? '+' : ''}${fmt(state.stats.profit)}`;
  el.statProfit.className = state.stats.profit >= 0 ? 'pos' : 'neg';
  el.statBestMult.textContent = state.stats.bestMult ? `${state.stats.bestMult.toFixed(2)}x` : '—';
}

async function verifyLastRound() {
  const last = state.lastRound;
  if (!last) {
    el.verifyOut.textContent = 'No completed round yet.';
    el.verifyOut.className = 'verify-out bad';
    return;
  }
  const hash = await sha256Hex(last.serverSeed);
  const crash = await computeCrash(last.serverSeed, last.clientSeed, last.nonce);
  const hashOk = hash === last.hash;
  const crashOk = Math.abs(crash - last.crashPoint) < 0.0001;
  if (hashOk && crashOk) {
    el.verifyOut.textContent = '✓ Verified — hash and crash point match';
    el.verifyOut.className = 'verify-out ok';
  } else {
    el.verifyOut.textContent = `✗ Mismatch (hash ${hashOk ? 'ok' : 'bad'}, crash ${crashOk ? 'ok' : 'bad'})`;
    el.verifyOut.className = 'verify-out bad';
  }
}

/* ------------------------------ events ------------------------------ */

el.actionBtn.addEventListener('click', handleAction);

el.btnHalf.addEventListener('click', () => {
  el.betInput.value = Math.max(CONFIG.MIN_BET, Math.floor(currentBetAmount() / 2));
  updateBetUI();
});
el.btnDouble.addEventListener('click', () => {
  el.betInput.value = Math.min(CONFIG.MAX_BET, currentBetAmount() * 2);
  updateBetUI();
});

el.quickChips.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-amount]');
  if (!btn) return;
  el.betInput.value = btn.dataset.amount;
  updateBetUI();
  el.quickChips.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
});

el.betInput.addEventListener('input', updateBetUI);
el.betInput.addEventListener('blur', () => {
  el.betInput.value = currentBetAmount();
  updateBetUI();
});

el.autoCashout.addEventListener('input', () => {
  const target = parseAutoTarget();
  if (target !== false && state.activeBet && !state.activeBet.cashed) {
    state.activeBet.target = target;
    updateBetUI();
  }
});

el.btnSound.addEventListener('click', () => {
  state.sound = !state.sound;
  el.btnSound.classList.toggle('muted', !state.sound);
  el.btnSound.setAttribute('aria-label', state.sound ? 'Mute sound' : 'Unmute sound');
  save();
  if (state.sound) tone(660, 0.1, 'sine', 0.04);
});

el.btnMenu.addEventListener('click', () => openModal('modalMenu'));

document.querySelectorAll('[data-open]').forEach((btn) => {
  btn.addEventListener('click', () => openModal(btn.dataset.open));
});
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', closeModals);
});
document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModals();
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModals();
  if (e.code !== 'Space') return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
  const open = document.querySelector('.modal:not([hidden])');
  if (open) return;
  e.preventDefault();
  handleAction();
});

el.btnSaveSeed.addEventListener('click', () => {
  const value = el.clientSeedInput.value.trim();
  if (!value || value.length > 64) {
    toast('Client seed must be 1–64 characters.', 'lose');
    return;
  }
  state.clientSeed = value;
  save();
  toast('Client seed saved — applied next round.', 'info');
  updateFairModal();
});
el.clientSeedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el.btnSaveSeed.click();
});

el.btnVerify.addEventListener('click', verifyLastRound);

el.btnReset.addEventListener('click', () => {
  if (!window.confirm('Reset demo balance, history and stats?')) return;
  const seed = randomHex(8);
  state.balance = CONFIG.START_BALANCE;
  state.stats = freshStats();
  state.history = [];
  state.nonce = 0;
  state.clientSeed = seed;
  state.activeBet = null;
  save();
  window.location.reload();
});

window.addEventListener('resize', resizeCanvas);
if (window.ResizeObserver) {
  new ResizeObserver(resizeCanvas).observe(el.stage);
}
window.addEventListener('storage', (e) => {
  if (e.key !== STORE_KEY || !e.newValue) return;
  try {
    const data = JSON.parse(e.newValue);
    if (typeof data.balance === 'number') {
      state.balance = data.balance;
      renderBalance();
    }
  } catch (err) {
    /* ignore */
  }
});

/* ------------------------------ boot ------------------------------ */

function boot() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    hint('This browser does not support Web Crypto — fairness features disabled.', true);
  }

  el.btnSound.classList.toggle('muted', !state.sound);
  el.btnSound.setAttribute('aria-label', state.sound ? 'Mute sound' : 'Unmute sound');
  el.betInput.value = state.bet || 100;
  el.autoCashout.value = '';
  renderBalance();
  renderHistory();
  renderBots();
  updateBetUI();
  resizeCanvas();
  requestAnimationFrame(frame);
  startRound();

  if (location.hash === '#fair') {
    openModal('modalFair');
  }
}

boot();
