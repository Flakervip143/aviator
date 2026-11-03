'use strict';

/* =========================================================
   SkyRocket Casino — original demo game engines
   All outcomes are simulated locally. Virtual coins only.
   ========================================================= */

(function () {
  const $ = (id) => document.getElementById(id);
  const round2 = (n) => Math.round(n * 100) / 100;
  const fmt = (n) => Site.fmt(n);

  const params = new URLSearchParams(location.search);
  const slug = params.get('g') || '';
  const found = window.casinoFindGame(slug);

  const stage = $('gameStage');
  const controls = $('controlArea');
  const actionBtn = $('actionBtn');
  const betInput = $('betAmount');
  const statusEl = $('gameStatus');
  const historyEl = $('gameHistory');
  const histCount = $('histCount');
  const payValue = $('payValue');
  const payLabel = $('payLabel');
  const betNote = $('betNote');

  let engine = null;
  let history = [];

  /* ---------------- helpers ---------------- */

  function rand() {
    if (window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] / 4294967296;
    }
    return Math.random();
  }

  function setStatus(text, tone) {
    statusEl.textContent = text;
    statusEl.className = `stage-status${tone ? ` ${tone}` : ''}`;
  }

  function setAction(label, mode, disabled) {
    actionBtn.textContent = label;
    actionBtn.dataset.mode = mode || 'play';
    actionBtn.disabled = Boolean(disabled);
  }

  function setBetLocked(locked) {
    betInput.disabled = locked;
    $('btnHalf').disabled = locked;
    $('btnDouble').disabled = locked;
    document.querySelectorAll('.quick-bet').forEach((btn) => {
      btn.disabled = locked;
      btn.classList.toggle('active', !locked && Number(btn.dataset.bet.replace(/,/g, '')) === Number(betInput.value));
    });
  }

  function setPayout(label, value) {
    payLabel.textContent = label;
    payValue.textContent = value;
  }

  function setNote(text) {
    betNote.textContent = text;
  }

  function peekBet() {
    const value = Math.floor(Number(betInput.value));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function getBet() {
    const value = peekBet();
    if (value < 10) {
      Site.toast('Minimum demo bet is 10 coins.', 'error');
      return 0;
    }
    if (value > 100000) {
      Site.toast('Maximum demo bet is 100,000 coins.', 'error');
      return 0;
    }
    if (value > Site.getBalance()) {
      Site.toast(`Not enough demo coins. Balance: ${fmt(Site.getBalance())}.`, 'error');
      return 0;
    }
    return value;
  }

  function debit(amount, label) {
    if (amount > Site.getBalance()) return false;
    Site.addBalance(-amount, label, 'bet');
    return true;
  }

  function credit(amount, label) {
    if (amount > 0) Site.addBalance(round2(amount), label, 'win');
  }

  function pushHistory(label, low) {
    history.unshift({ label, low: Boolean(low) });
    history = history.slice(0, 14);
    historyEl.innerHTML = history
      .map((item) => `<span class="hist-chip${item.low ? ' low' : ''}">${item.label}</span>`)
      .join('');
    histCount.textContent = String(history.length);
  }

  function lock(locked) {
    setBetLocked(locked);
  }

  /* ---------------- engines ---------------- */

  const ENGINES = {
    /* ============ CRASH ============ */
    crash: {
      note: 'Start a flight and cash out before the rocket crashes. Virtual coins only.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Auto cash out</span>
          <label class="auto-row">
            <input type="checkbox" id="autoToggle">
            <span>Cash out automatically at</span>
            <input id="autoMult" type="number" min="1.01" max="1000" step="0.01" value="2.00" inputmode="decimal">
            <span>x</span>
          </label>
        </div>`,
      stage: `
        <div class="crash-view">
          <div class="crash-mult" id="crashMult">1.00<span>x</span></div>
          <p class="crash-note" id="crashNote">Press start and cash out before the rocket crashes.</p>
          <div class="crash-bar"><span id="crashBar"></span></div>
          <div class="crash-meta">
            <div><small>Round</small><b id="crashRound">1</b></div>
            <div><small>Last crash</small><b id="crashLast">—</b></div>
            <div><small>Best cash out</small><b id="crashBest">—</b></div>
          </div>
        </div>`,
      mount() {
        const multEl = $('crashMult');
        const noteEl = $('crashNote');
        const barEl = $('crashBar');
        const roundEl = $('crashRound');
        const lastEl = $('crashLast');
        const bestEl = $('crashBest');
        const autoToggle = $('autoToggle');
        const autoMult = $('autoMult');

        let running = false;
        let cashed = false;
        let bet = 0;
        let crashAt = 0;
        let startedAt = 0;
        let frame = null;
        let roundNo = 0;
        let best = 0;

        function nextCrash() {
          const roll = rand();
          if (roll < 0.01) return 1.0;
          const point = 0.99 / (1 - roll);
          return Math.min(1000, Math.max(1.01, Math.floor(point * 100) / 100));
        }

        function paint(mult, crashed) {
          multEl.classList.toggle('crashed', Boolean(crashed));
          multEl.innerHTML = `${mult.toFixed(2)}<span>x</span>`;
          barEl.style.width = `${Math.min(100, (mult - 1) * 7 + 2)}%`;
        }

        function finish(win, mult, message) {
          cancelAnimationFrame(frame);
          frame = null;
          running = false;
          lock(false);
          setAction('Start flight', 'play', false);
          setStatus(message, win ? 'win' : 'lose');
          if (win) {
            best = Math.max(best, mult);
            bestEl.textContent = `${best.toFixed(2)}x`;
            setPayout('Last payout', fmt(round2(bet * mult)));
            pushHistory(`${mult.toFixed(2)}x`, false);
          } else {
            setPayout('Last payout', '0');
            pushHistory(`${mult.toFixed(2)}x`, true);
          }
          Site.recordRound({
            bet,
            payout: win ? round2(bet * mult) : 0,
            mult,
            game: engine.game.name,
          });
        }

        function cashOut(mult, automatic) {
          if (!running || cashed) return;
          cashed = true;
          running = false;
          cancelAnimationFrame(frame);
          frame = null;
          const payout = round2(bet * mult);
          credit(payout, `Crash cash out ${mult.toFixed(2)}x · ${engine.game.name}`);
          paint(mult, false);
          finish(true, mult, `${automatic ? 'Auto cash out' : 'Cashed out'} at ${mult.toFixed(2)}x — won ${fmt(payout)} coins!`);
        }

        function crash(mult) {
          if (cashed) return;
          running = false;
          cancelAnimationFrame(frame);
          frame = null;
          paint(mult, true);
          noteEl.textContent = `Crashed at ${mult.toFixed(2)}x. Start another flight.`;
          lastEl.textContent = `${mult.toFixed(2)}x`;
          finish(false, mult, `Crashed at ${mult.toFixed(2)}x — the bet of ${fmt(bet)} coins was lost.`);
        }

        function tick(now) {
          if (!running) return;
          const elapsed = now - startedAt;
          const mult = Math.min(crashAt, Math.pow(1.00017, elapsed));
          paint(mult, false);
          noteEl.textContent = `Current multiplier ${mult.toFixed(2)}x · cash out any time.`;
          setAction(`Cash out ${mult.toFixed(2)}x`, 'cashout', false);
          setPayout('Cash out value', fmt(round2(bet * mult)));
          if (autoToggle.checked && mult >= Number(autoMult.value) && !cashed) {
            cashOut(Number(autoMult.value), true);
            return;
          }
          if (mult >= crashAt) {
            crash(crashAt);
            return;
          }
          frame = requestAnimationFrame(tick);
        }

        function start() {
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Crash bet · ${engine.game.name}`)) return;
          bet = amount;
          cashed = false;
          running = true;
          crashAt = nextCrash();
          startedAt = performance.now();
          roundNo += 1;
          roundEl.textContent = String(roundNo);
          paint(1, false);
          noteEl.textContent = 'Flying… cash out before it crashes.';
          lock(true);
          setAction('Cash out 1.00x', 'cashout', false);
          setPayout('Cash out value', fmt(amount));
          frame = requestAnimationFrame(tick);
        }

        setAction('Start flight', 'play', false);
        setPayout('Potential payout', '—');
        setNote(this.note);
        setStatus('Choose a bet and start a flight. Cash out before the crash.', '');
        paint(1, false);

        actionBtn.addEventListener('click', () => {
          if (running) cashOut(Math.pow(1.00017, performance.now() - startedAt), false);
          else start();
        });

        this.onBetChange = () => {
          if (!running) setPayout('Potential payout', '—');
        };
      },
    },

    /* ============ DICE / NUMBER ============ */
    dice: {
      note: 'Roll under or over your target. Payout is 97% of the true odds.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Prediction</span>
          <div class="choice-row" id="diceChoice">
            <button class="choice-btn active" type="button" data-mode="under">Under</button>
            <button class="choice-btn" type="button" data-mode="over">Over</button>
          </div>
          <div class="slider-line">
            <span>Target <b id="diceTarget">50.00</b></span>
            <input id="diceRange" type="range" min="2" max="98" value="50" step="0.5">
          </div>
        </div>`,
      stage: `
        <div class="number-big" id="diceValue">—</div>
        <p class="crash-note" id="diceHint">Roll under 50.00</p>
        <div class="dice-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>`,
      mount() {
        const valueEl = $('diceValue');
        const hintEl = $('diceHint');
        const targetEl = $('diceTarget');
        const rangeEl = $('diceRange');
        let mode = 'under';
        let busy = false;

        function stats() {
          const target = Number(rangeEl.value);
          const chance = (mode === 'under' ? target : 100 - target) / 100;
          const multiplier = round2(0.97 / chance);
          return { target, chance, multiplier };
        }

        function refresh() {
          const { target, multiplier } = stats();
          targetEl.textContent = target.toFixed(2);
          hintEl.textContent = `Roll ${mode} ${target.toFixed(2)} · win ${multiplier.toFixed(2)}x`;
          setPayout('Potential payout', `${fmt(round2(peekBet() * multiplier))} coins`);
        }

        document.querySelectorAll('#diceChoice .choice-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (busy) return;
            mode = btn.dataset.mode;
            document.querySelectorAll('#diceChoice .choice-btn').forEach((node) => {
              node.classList.toggle('active', node === btn);
            });
            refresh();
          });
        });

        rangeEl.addEventListener('input', refresh);

        function rollRound() {
          if (busy) return;
          const amount = getBet();
          if (!amount) return;
          const { target, multiplier } = stats();
          if (!debit(amount, `Dice bet · ${engine.game.name}`)) return;

          busy = true;
          lock(true);
          setAction('Rolling…', 'wait', true);
          setStatus('Rolling the demo dice…', 'gold');

          let ticks = 0;
          const spin = setInterval(() => {
            ticks += 1;
            valueEl.textContent = (Math.floor(rand() * 10000) / 100).toFixed(2);
            valueEl.className = 'number-big gold';
            if (ticks < 9) return;
            clearInterval(spin);

            const roll = Math.floor(rand() * 10000) / 100;
            const won = mode === 'under' ? roll < target : roll >= target;
            valueEl.textContent = roll.toFixed(2);
            valueEl.className = `number-big ${won ? 'green' : 'red'}`;
            setStatus(
              won
                ? `Rolled ${roll.toFixed(2)} — win! ${fmt(round2(amount * multiplier))} coins paid.`
                : `Rolled ${roll.toFixed(2)} — no win. Try another round.`,
              won ? 'win' : 'lose'
            );
            const payout = won ? round2(amount * multiplier) : 0;
            if (won) credit(payout, `Dice win ${multiplier.toFixed(2)}x · ${engine.game.name}`);
            pushHistory(`${roll.toFixed(2)}`, !won);
            Site.recordRound({ bet: amount, payout, mult: multiplier, game: engine.game.name });

            busy = false;
            lock(false);
            setAction('Roll again', 'play', false);
            setPayout('Last payout', won ? fmt(payout) : '0');
          }, 65);
        }

        this.onBetChange = refresh;
        refresh();
        setAction('Roll dice', 'play', false);
        setNote(this.note);
        setStatus('Choose under or over, then roll. 0.00–99.99 is the range.', '');
        actionBtn.addEventListener('click', rollRound);
      },
    },

    /* ============ MINES ============ */
    mines: {
      note: 'Reveal safe tiles and cash out any time. One mine ends the round.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Mines on the board</span>
          <div class="choice-row" id="mineChoice">
            <button class="choice-btn active" type="button" data-mines="3">3</button>
            <button class="choice-btn" type="button" data-mines="5">5</button>
            <button class="choice-btn" type="button" data-mines="10">10</button>
            <button class="choice-btn" type="button" data-mines="15">15</button>
          </div>
        </div>`,
      stage: `
        <div class="mines-grid" id="minesGrid"></div>
        <div class="mine-mult" id="mineMult">1.00x</div>
        <p class="crash-note" id="mineHint">Start a round and pick a safe tile.</p>`,
      mount() {
        const grid = $('minesGrid');
        const multEl = $('mineMult');
        const hintEl = $('mineHint');
        let mineCount = 3;
        let active = false;
        let mines = new Set();
        let revealed = new Set();
        let safeCount = 0;
        let multiplier = 1;
        let bet = 0;

        function buildGrid() {
          grid.innerHTML = Array.from(
            { length: 25 },
            (_, i) => `<button class="mine-tile" type="button" data-index="${i}" aria-label="Tile ${i + 1}"></button>`
          ).join('');
        }

        function multiplierFor(safe) {
          let value = 0.97;
          for (let i = 0; i < safe; i += 1) {
            value *= (25 - i) / (25 - mineCount - i);
          }
          return Math.max(1, round2(value));
        }

        function refresh() {
          if (!active) {
            multEl.textContent = '1.00x';
            setPayout('Potential payout', '—');
            return;
          }
          const amount = round2(bet * multiplier);
          multEl.textContent = `${multiplier.toFixed(2)}x`;
          setAction(`Cash out ${fmt(amount)}`, 'cashout', false);
          setPayout('Cash out value', `${fmt(amount)} coins`);
          hintEl.textContent = `${safeCount} safe tile${safeCount === 1 ? '' : 's'} revealed · ${mineCount} mines hidden.`;
        }

        function finish(win, message) {
          active = false;
          lock(false);
          grid.querySelectorAll('.mine-tile').forEach((tile) => {
            tile.classList.add('revealed');
            tile.disabled = true;
          });
          setAction('New round', 'play', false);
          setStatus(message, win ? 'win' : 'lose');
          if (!win) setPayout('Last payout', '0');
        }

        function cashOut() {
          if (!active) return;
          const payout = round2(bet * multiplier);
          credit(payout, `Mines cash out ${multiplier.toFixed(2)}x · ${engine.game.name}`);
          pushHistory(`${multiplier.toFixed(2)}x`, false);
          Site.recordRound({ bet, payout, mult: multiplier, game: engine.game.name });
          finish(true, `Cashed out at ${multiplier.toFixed(2)}x — won ${fmt(payout)} coins!`);
        }

        function start() {
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Mines bet · ${engine.game.name}`)) return;
          bet = amount;
          active = true;
          safeCount = 0;
          multiplier = 1;
          mines = new Set();
          revealed = new Set();
          while (mines.size < mineCount) mines.add(Math.floor(rand() * 25));
          buildGrid();
          lock(true);
          refresh();
          setStatus('Round started. Pick tiles and cash out before you hit a mine.', 'gold');
        }

        function reveal(tile) {
          if (!active) return;
          const index = Number(tile.dataset.index);
          if (revealed.has(index)) return;
          revealed.add(index);

          if (mines.has(index)) {
            tile.classList.add('bomb', 'revealed');
            tile.textContent = '💥';
            grid.querySelectorAll('.mine-tile').forEach((node) => {
              const i = Number(node.dataset.index);
              if (mines.has(i)) {
                node.classList.add('bomb', 'revealed');
                node.textContent = '💣';
              }
              node.disabled = true;
            });
            pushHistory('BOOM', true);
            Site.recordRound({ bet, payout: 0, mult: 0, game: engine.game.name });
            finish(false, `Boom! That was a mine. The bet of ${fmt(bet)} coins was lost.`);
            return;
          }

          safeCount += 1;
          tile.classList.add('safe', 'revealed');
          tile.textContent = '💎';
          tile.disabled = true;
          multiplier = multiplierFor(safeCount);

          if (safeCount === 25 - mineCount) {
            const payout = round2(bet * multiplier);
            credit(payout, `Mines cleared ${multiplier.toFixed(2)}x · ${engine.game.name}`);
            pushHistory(`${multiplier.toFixed(2)}x`, false);
            Site.recordRound({ bet, payout, mult: multiplier, game: engine.game.name });
            finish(true, `Board cleared at ${multiplier.toFixed(2)}x — won ${fmt(payout)} coins!`);
            return;
          }

          refresh();
          setStatus(`Safe! Current multiplier ${multiplier.toFixed(2)}x.`, 'win');
        }

        document.querySelectorAll('#mineChoice .choice-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (active) return;
            mineCount = Number(btn.dataset.mines);
            document.querySelectorAll('#mineChoice .choice-btn').forEach((node) => {
              node.classList.toggle('active', node === btn);
            });
            hintEl.textContent = `${mineCount} mines selected. Start a round and pick a safe tile.`;
          });
        });

        grid.addEventListener('click', (event) => {
          const tile = event.target.closest('.mine-tile');
          if (tile) reveal(tile);
        });

        actionBtn.addEventListener('click', () => {
          if (active) cashOut();
          else start();
        });

        this.onBetChange = refresh;
        buildGrid();
        setAction('Start round', 'play', false);
        setNote(this.note);
        setStatus('Pick the number of mines, then start a round.', '');
        refresh();
      },
    },

    /* ============ PLINKO ============ */
    plinko: {
      note: 'Drop a ball through the pegs. Bucket multipliers decide the payout.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Risk level</span>
          <div class="choice-row" id="riskChoice">
            <button class="choice-btn active" type="button" data-risk="low">Low</button>
            <button class="choice-btn" type="button" data-risk="medium">Medium</button>
            <button class="choice-btn" type="button" data-risk="high">High</button>
          </div>
        </div>`,
      stage: `
        <div class="plinko-wrap">
          <div class="plinko-pegs" id="plinkoPegs"></div>
          <div class="plinko-ball" id="plinkoBall" hidden></div>
          <div class="plinko-buckets" id="plinkoBuckets"></div>
        </div>
        <p class="crash-note" id="plinkoNote">Press drop and watch the ball land.</p>`,
      mount() {
        const pegHost = $('plinkoPegs');
        const bucketHost = $('plinkoBuckets');
        const ball = $('plinkoBall');
        const noteEl = $('plinkoNote');

        const TABLES = {
          low: [5.6, 2.1, 1.1, 1.0, 0.5, 0.3, 0.3, 0.5, 1.0, 1.1, 2.1, 5.6],
          medium: [13, 3, 1.3, 0.7, 0.4, 0.2, 0.2, 0.4, 0.7, 1.3, 3, 13],
          high: [29, 4, 1.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.3, 1.5, 4, 29],
        };

        let risk = 'low';
        let busy = false;

        function buildBoard() {
          pegHost.innerHTML = Array.from({ length: 8 }, (_, row) => {
            const dots = Array.from({ length: row + 3 }, () => '<i></i>').join('');
            return `<div class="plinko-row">${dots}</div>`;
          }).join('');
          bucketHost.innerHTML = TABLES[risk]
            .map((mult, index) => `<div class="plinko-bucket" data-bucket="${index}">${mult}x</div>`)
            .join('');
        }

        function refresh() {
          const amount = peekBet();
          const middle = TABLES[risk][5];
          setPayout('Average bucket', `${fmt(round2(amount * middle))} coins`);
        }

        document.querySelectorAll('#riskChoice .choice-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (busy) return;
            risk = btn.dataset.risk;
            document.querySelectorAll('#riskChoice .choice-btn').forEach((node) => {
              node.classList.toggle('active', node === btn);
            });
            buildBoard();
            refresh();
          });
        });

        function drop() {
          if (busy) return;
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Plinko bet · ${engine.game.name}`)) return;

          busy = true;
          lock(true);
          setAction('Dropping…', 'wait', true);
          setStatus('Ball is bouncing through the pegs…', 'gold');

          let rights = 0;
          for (let i = 0; i < 11; i += 1) {
            if (rand() < 0.5) rights += 1;
          }
          const bucketIndex = rights;
          const finalLeft = ((bucketIndex + 0.5) / 12) * 100;

          ball.hidden = false;
          ball.style.transition = 'none';
          ball.style.top = '3%';
          ball.style.left = '50%';
          bucketHost.querySelectorAll('.plinko-bucket').forEach((node) => node.classList.remove('active'));

          let step = 0;
          const timer = setInterval(() => {
            step += 1;
            const progress = step / 11;
            const left = 50 + (finalLeft - 50) * progress + (step % 2 ? 1.6 : -1.6);
            const top = 3 + 72 * progress;
            ball.style.transition = 'top 0.09s linear, left 0.09s linear';
            ball.style.top = `${top}%`;
            ball.style.left = `${left}%`;

            if (step < 11) return;
            clearInterval(timer);
            ball.hidden = true;

            const multiplier = TABLES[risk][bucketIndex];
            const payout = round2(amount * multiplier);
            credit(payout, `Plinko ${multiplier}x · ${engine.game.name}`);
            const bucketNode = bucketHost.querySelector(`[data-bucket="${bucketIndex}"]`);
            if (bucketNode) bucketNode.classList.add('active');

            const won = multiplier >= 1;
            setStatus(
              `${won ? 'Win' : 'Small return'} — landed in ${multiplier}x and received ${fmt(payout)} coins.`,
              won ? 'win' : 'lose'
            );
            noteEl.textContent = `Landed in bucket ${bucketIndex + 1} of 12 · ${multiplier}x.`;
            setPayout('Last payout', `${fmt(payout)} coins`);
            pushHistory(`${multiplier}x`, !won);
            Site.recordRound({ bet: amount, payout, mult: multiplier, game: engine.game.name });

            busy = false;
            lock(false);
            setAction('Drop ball', 'play', false);
          }, 80);
        }

        buildBoard();
        refresh();
        this.onBetChange = refresh;
        setAction('Drop ball', 'play', false);
        setNote(this.note);
        setStatus('Choose a risk level and drop the ball.', '');
        actionBtn.addEventListener('click', drop);
      },
    },

    /* ============ ROULETTE ============ */
    roulette: {
      note: 'European roulette, 0–36. Red or black pays 2× and green 0 pays 14×.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Your bet</span>
          <div class="choice-row" id="rouletteChoice">
            <button class="choice-btn red active" type="button" data-colour="red">Red · 2×</button>
            <button class="choice-btn" type="button" data-colour="black">Black · 2×</button>
            <button class="choice-btn green" type="button" data-colour="green">Green 0 · 14×</button>
          </div>
        </div>`,
      stage: `
        <div class="roulette-result" id="rouletteBall">—</div>
        <p class="crash-note" id="rouletteHint">Pick red, black or green, then spin.</p>
        <div class="roulette-history" id="rouletteHist"></div>`,
      mount() {
        const resultEl = $('rouletteBall');
        const histEl = $('rouletteHist');
        const hintEl = $('rouletteHint');
        const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

        let colour = 'red';
        let busy = false;
        let recent = [];

        function colourOf(n) {
          if (n === 0) return 'green';
          return RED.has(n) ? 'red' : 'black';
        }

        document.querySelectorAll('#rouletteChoice .choice-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (busy) return;
            colour = btn.dataset.colour;
            document.querySelectorAll('#rouletteChoice .choice-btn').forEach((node) => {
              node.classList.toggle('active', node === btn);
            });
            hintEl.textContent = `Betting on ${colour}. Spin when ready.`;
          });
        });

        function spin() {
          if (busy) return;
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Roulette bet · ${engine.game.name}`)) return;

          busy = true;
          lock(true);
          setAction('Spinning…', 'wait', true);
          setStatus('The demo wheel is spinning…', 'gold');
          resultEl.className = 'roulette-result spinning';

          let ticks = 0;
          const timer = setInterval(() => {
            ticks += 1;
            const preview = Math.floor(rand() * 37);
            resultEl.textContent = String(preview);
            if (ticks < 14) return;

            clearInterval(timer);
            const number = Math.floor(rand() * 37);
            const landed = colourOf(number);
            resultEl.className = `roulette-result ${landed}`;
            resultEl.textContent = String(number);

            recent.unshift({ number, colour: landed });
            recent = recent.slice(0, 12);
            histEl.innerHTML = recent
              .map((item) => `<span class="${item.colour}">${item.number}</span>`)
              .join('');

            const won = landed === colour;
            const multiplier = colour === 'green' ? 14 : 2;
            const payout = won ? round2(amount * multiplier) : 0;
            if (won) credit(payout, `Roulette ${landed} ${number} · ${engine.game.name}`);

            setStatus(
              won
                ? `${number} ${landed} — win! ${fmt(payout)} coins paid.`
                : `${number} ${landed} — no win this spin.`,
              won ? 'win' : 'lose'
            );
            setPayout('Last payout', won ? `${fmt(payout)} coins` : '0');
            pushHistory(String(number), !won);
            Site.recordRound({ bet: amount, payout, mult: multiplier, game: engine.game.name });
            busy = false;
            lock(false);
            setAction('Spin again', 'play', false);
          }, 70);
        }

        setAction('Spin wheel', 'play', false);
        setNote(this.note);
        setStatus('Pick red, black or green. 0–36 European wheel.', '');
        actionBtn.addEventListener('click', spin);
      },
    },

    /* ============ SLOTS ============ */
    slots: {
      note: 'Three matching symbols pay. Two matching symbols return 1.5×.',
      controls: `
        <div class="control-box">
          <span class="mini-label">Paytable</span>
          <div class="slot-paytable">
            <span>🍒 4×</span><span>🍋 5×</span><span>🔔 8×</span>
            <span>💎 12×</span><span>7️⃣ 25×</span><span>⭐ 50×</span>
          </div>
        </div>`,
      stage: `
        <div class="reels" id="reels">
          <div class="reel" id="reel0">🍒</div>
          <div class="reel" id="reel1">🔔</div>
          <div class="reel" id="reel2">⭐</div>
        </div>
        <div class="slot-win" id="slotWin">Press spin to play</div>
        <p class="crash-note" id="slotHint">Match all three symbols for the top payout.</p>`,
      mount() {
        const SYMBOLS = [
          { symbol: '🍒', weight: 30, pay: 4 },
          { symbol: '🍋', weight: 25, pay: 5 },
          { symbol: '🔔', weight: 18, pay: 8 },
          { symbol: '💎', weight: 12, pay: 12 },
          { symbol: '7️⃣', weight: 8, pay: 25 },
          { symbol: '⭐', weight: 7, pay: 50 },
        ];
        const TOTAL = SYMBOLS.reduce((sum, item) => sum + item.weight, 0);
        const reels = [$('reel0'), $('reel1'), $('reel2')];
        const winEl = $('slotWin');
        const hintEl = $('slotHint');
        let busy = false;

        function pick() {
          let roll = rand() * TOTAL;
          for (const item of SYMBOLS) {
            roll -= item.weight;
            if (roll <= 0) return item;
          }
          return SYMBOLS[0];
        }

        function spin() {
          if (busy) return;
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Slots bet · ${engine.game.name}`)) return;

          busy = true;
          lock(true);
          setAction('Spinning…', 'wait', true);
          setStatus('Reels are spinning…', 'gold');
          winEl.textContent = '…';
          reels.forEach((reel) => reel.classList.add('spinning'));

          let ticks = 0;
          const timer = setInterval(() => {
            ticks += 1;
            reels.forEach((reel, index) => {
              if (index === 2 && ticks > 6) return;
              if (index === 1 && ticks > 3) return;
              reel.textContent = pick().symbol;
            });
            if (ticks < 9) return;

            clearInterval(timer);
            reels.forEach((reel) => reel.classList.remove('spinning'));

            const result = [pick(), pick(), pick()];
            result.forEach((item, index) => {
              reels[index].textContent = item.symbol;
            });

            const same = result[0].symbol === result[1].symbol && result[1].symbol === result[2].symbol;
            const pairs =
              (result[0].symbol === result[1].symbol) ||
              (result[1].symbol === result[2].symbol) ||
              (result[0].symbol === result[2].symbol);

            let multiplier = 0;
            if (same) multiplier = result[0].pay;
            else if (pairs) multiplier = 1.5;

            const payout = round2(amount * multiplier);
            if (payout > 0) credit(payout, `Slots ${multiplier}x · ${engine.game.name}`);

            if (same) {
              winEl.textContent = `${multiplier}× — big win!`;
              hintEl.textContent = `Three ${result[0].symbol} — ${fmt(payout)} coins won.`;
              setStatus(`Three of a kind! ${multiplier}× paid ${fmt(payout)} coins.`, 'win');
            } else if (pairs) {
              winEl.textContent = `${multiplier}× — small win`;
              hintEl.textContent = `Two matching symbols — ${fmt(payout)} coins returned.`;
              setStatus(`Two matching symbols — ${multiplier}× returned ${fmt(payout)} coins.`, 'win');
            } else {
              winEl.textContent = 'No match';
              hintEl.textContent = 'No matching symbols. Spin again.';
              setStatus('No matching symbols — try another spin.', 'lose');
            }

            setPayout('Last payout', payout > 0 ? `${fmt(payout)} coins` : '0');
            pushHistory(same ? `${multiplier}x` : pairs ? '2 match' : '—', payout === 0);
            Site.recordRound({ bet: amount, payout, mult: multiplier, game: engine.game.name });
            busy = false;
            lock(false);
            setAction('Spin again', 'play', false);
          }, 70);
        }

        setAction('Spin reels', 'play', false);
        setNote(this.note);
        setStatus('Match three symbols to win. Two of a kind returns 1.5×.', '');
        actionBtn.addEventListener('click', spin);
      },
    },

    /* ============ HIGH CARD / TABLE ============ */
    highcard: {
      note: 'Higher card wins 2×. A tie refunds your bet. Ranks A high, 2 low.',
      controls: `
        <div class="control-box">
          <span class="mini-label">How to play</span>
          <p class="control-text">One card each. The higher rank wins. Suits do not matter, and a tie returns your stake.</p>
        </div>`,
      stage: `
        <div class="card-row">
          <div class="card-stack">
            <small>You</small>
            <div class="playing-card back" id="playerCard">★</div>
          </div>
          <div class="card-vs">VS</div>
          <div class="card-stack">
            <small>Dealer</small>
            <div class="playing-card back" id="dealerCard">★</div>
          </div>
        </div>
        <p class="crash-note" id="cardHint">Deal a card and beat the dealer.</p>`,
      mount() {
        const playerEl = $('playerCard');
        const dealerEl = $('dealerCard');
        const hintEl = $('cardHint');
        const RANKS = [
          { label: '2', value: 2 },
          { label: '3', value: 3 },
          { label: '4', value: 4 },
          { label: '5', value: 5 },
          { label: '6', value: 6 },
          { label: '7', value: 7 },
          { label: '8', value: 8 },
          { label: '9', value: 9 },
          { label: '10', value: 10 },
          { label: 'J', value: 11 },
          { label: 'Q', value: 12 },
          { label: 'K', value: 13 },
          { label: 'A', value: 14 },
        ];
        const SUITS = [
          { symbol: '♠', red: false },
          { symbol: '♥', red: true },
          { symbol: '♦', red: true },
          { symbol: '♣', red: false },
        ];

        let busy = false;

        function draw() {
          const rank = RANKS[Math.floor(rand() * RANKS.length)];
          const suit = SUITS[Math.floor(rand() * SUITS.length)];
          return { rank: rank.label, value: rank.value, suit: suit.symbol, red: suit.red };
        }

        function paint(el, card) {
          el.className = `playing-card${card.red ? ' red' : ''}`;
          el.innerHTML = `<span class="rank">${card.rank}</span><span class="big-suit">${card.suit}</span><span class="suit">${card.suit}</span>`;
        }

        function deal() {
          if (busy) return;
          const amount = getBet();
          if (!amount) return;
          if (!debit(amount, `Table bet · ${engine.game.name}`)) return;

          busy = true;
          lock(true);
          setAction('Dealing…', 'wait', true);
          setStatus('Dealing the cards…', 'gold');
          playerEl.className = 'playing-card back';
          dealerEl.className = 'playing-card back';
          playerEl.textContent = '★';
          dealerEl.textContent = '★';
          hintEl.textContent = 'Dealing…';

          setTimeout(() => {
            const player = draw();
            const dealer = draw();
            paint(playerEl, player);
            paint(dealerEl, dealer);
            hintEl.textContent = `You ${player.rank}${player.suit} · Dealer ${dealer.rank}${dealer.suit}`;

            let payout = 0;
            let multiplier = 0;
            if (player.value > dealer.value) {
              payout = round2(amount * 2);
              multiplier = 2;
              credit(payout, `Cards win · ${engine.game.name}`);
              setStatus(`You win! ${player.rank}${player.suit} beats ${dealer.rank}${dealer.suit} — ${fmt(payout)} coins paid.`, 'win');
              setPayout('Last payout', `${fmt(payout)} coins`);
              pushHistory(`${player.rank}${player.suit} > ${dealer.rank}${dealer.suit}`, false);
            } else if (player.value === dealer.value) {
              payout = amount;
              multiplier = 1;
              credit(amount, `Cards tie refund · ${engine.game.name}`);
              setStatus(`Tie — ${player.rank} vs ${dealer.rank}. Your ${fmt(amount)} coin bet was returned.`, 'gold');
              setPayout('Last payout', `${fmt(amount)} coins`);
              pushHistory('Tie', true);
            } else {
              setStatus(`Dealer wins — ${dealer.rank}${dealer.suit} beats ${player.rank}${player.suit}.`, 'lose');
              setPayout('Last payout', '0');
              pushHistory(`${player.rank}${player.suit} < ${dealer.rank}${dealer.suit}`, true);
            }
            Site.recordRound({ bet: amount, payout, mult: multiplier, game: engine.game.name });

            busy = false;
            lock(false);
            setAction('Deal again', 'play', false);
          }, 550);
        }

        setAction('Deal cards', 'play', false);
        setNote(this.note);
        setStatus('Deal one card each. Higher rank wins 2×.', '');
        actionBtn.addEventListener('click', deal);
      },
    },
  };

  /* ---------------- page chrome ---------------- */

  function renderRelated(section, game) {
    const pool = [];
    (window.CASINO_SECTIONS || []).forEach((item) => {
      item.games.forEach((candidate) => {
        if (candidate.name !== game.name) pool.push({ section: item, game: candidate });
      });
    });
    const sameSection = pool.filter((item) => item.section.id === section.id);
    const picks = [...sameSection, ...pool].slice(0, 5);
    $('relatedGames').innerHTML = picks
      .map((item) => window.casinoCard(item.section.id, item.game))
      .join('');
    $('relatedGames').addEventListener('click', (event) => {
      const fav = event.target.closest('[data-fav-toggle]');
      if (!fav) return;
      event.preventDefault();
      const added = Site.toggleFav(fav.dataset.favToggle);
      Site.toast(
        added ? `${fav.dataset.favToggle} added to favourites` : `${fav.dataset.favToggle} removed from favourites`,
        added ? 'win' : 'info'
      );
    });
  }

  function notFound() {
    $('gameTitle').textContent = 'Game not found';
    $('gameDesc').textContent = 'That game is not in the demo catalogue. Browse the lobby to pick another title.';
    $('stageName').textContent = 'Unknown game';
    $('stageProvider').textContent = 'SkyRocket';
    stage.innerHTML = '<div class="number-big">404</div><p class="crash-note">This demo game does not exist.</p>';
    setStatus('Choose a game from the lobby to keep playing.', 'lose');
    setAction('Back to lobby', 'play', false);
    actionBtn.addEventListener('click', () => {
      location.href = 'index.html';
    });
    betInput.disabled = true;
    $('btnHalf').disabled = true;
    $('btnDouble').disabled = true;
    document.querySelectorAll('.quick-bet').forEach((btn) => {
      btn.disabled = true;
    });
    $('relatedBlock').hidden = true;
    setNote('All games are free demos with virtual coins.');
  }

  /* ---------------- boot ---------------- */

  function boot() {
    if (!found) {
      notFound();
      return;
    }

    const { section, game } = found;
    if (game.url) {
      location.replace(game.url);
      return;
    }

    engine = Object.assign({}, ENGINES[game.type] || ENGINES.dice, { game });

    document.title = `${game.name} — SkyRocket Casino (Demo)`;
    $('gameTitle').textContent = game.name;
    $('gameDesc').textContent = `${game.name} by ${game.provider} — an original demo game engine with free virtual coins. No real money.`;
    $('stageName').textContent = game.name;
    $('stageProvider').textContent = game.provider;
    $('crumbGame').textContent = game.name;
    const crumb = $('crumbCat');
    crumb.textContent = window.CATEGORY_META[section.id] ? window.CATEGORY_META[section.id].title : section.title;
    crumb.href = `${section.id}.html`;
    $('gameChip').textContent = `Demo · ${section.title}`;

    stage.innerHTML = engine.stage;
    controls.innerHTML = engine.controls;

    betInput.addEventListener('input', () => {
      document.querySelectorAll('.quick-bet').forEach((btn) => {
        btn.classList.toggle('active', Number(btn.dataset.bet.replace(/,/g, '')) === Number(betInput.value));
      });
      if (engine.onBetChange) engine.onBetChange();
    });

    $('btnHalf').addEventListener('click', () => {
      betInput.value = String(Math.max(10, Math.floor(Number(betInput.value) / 2 / 10) * 10));
      betInput.dispatchEvent(new Event('input'));
    });
    $('btnDouble').addEventListener('click', () => {
      betInput.value = String(Math.min(100000, Math.max(10, Math.floor((Number(betInput.value) || 0) * 2))));
      betInput.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('.quick-bet').forEach((btn) => {
      btn.addEventListener('click', () => {
        betInput.value = btn.dataset.bet.replace(/,/g, '');
        betInput.dispatchEvent(new Event('input'));
      });
    });

    engine.mount();
    setBetLocked(false);

    renderRelated(section, game);
  }

  boot();
})();
