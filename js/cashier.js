'use strict';

/* =========================================================
   SkyRocket Casino — demo cashier (simulated checkout)
   No payment provider, no network calls, no real money.
   ========================================================= */

(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Site.fmt(n);
  const round2 = (n) => Site.round2(n);

  const DEPOSIT_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  const WITHDRAW_AMOUNTS = [500, 1000, 2500, 5000, 10000];

  const METHODS = {
    upi: {
      label: 'UPI',
      icon: '📱',
      fields: [
        { name: 'upi', label: 'Demo UPI ID', value: 'demo@upi', placeholder: 'demo@upi' },
      ],
    },
    card: {
      label: 'Card',
      icon: '💳',
      fields: [
        { name: 'number', label: 'Demo card number', value: '4242 4242 4242 4242', placeholder: '4242 4242 4242 4242', inputmode: 'numeric', maxlength: 19 },
        { name: 'name', label: 'Name on card', value: 'DEMO PLAYER', placeholder: 'DEMO PLAYER' },
        { name: 'exp', label: 'Expiry', value: '12/30', placeholder: 'MM/YY', inputmode: 'numeric', maxlength: 5 },
        { name: 'cvv', label: 'CVV', value: '123', placeholder: '123', inputmode: 'numeric', maxlength: 4 },
      ],
    },
    netbanking: {
      label: 'Net banking',
      icon: '🏦',
      fields: [
        {
          name: 'bank',
          label: 'Demo bank',
          type: 'select',
          options: ['SBI (demo)', 'HDFC Bank (demo)', 'ICICI Bank (demo)', 'Axis Bank (demo)', 'Kotak (demo)', 'Yes Bank (demo)'],
        },
      ],
    },
    wallet: {
      label: 'Wallet',
      icon: '👛',
      fields: [
        {
          name: 'wallet',
          label: 'Demo wallet',
          type: 'select',
          options: ['Paytm (demo)', 'PhonePe (demo)', 'Google Pay (demo)', 'MobiKwik (demo)'],
        },
        { name: 'phone', label: 'Demo mobile number', value: '9876543210', placeholder: '9876543210', inputmode: 'numeric', maxlength: 10 },
      ],
    },
    crypto: {
      label: 'Crypto',
      icon: '₿',
      fields: [
        {
          name: 'network',
          label: 'Demo network',
          type: 'select',
          options: ['USDT · TRC20', 'USDT · ERC20', 'Bitcoin', 'Ethereum'],
        },
        { name: 'address', label: 'Demo wallet address', value: 'TDemoAddress9xK2mQ7', placeholder: 'TDemoAddress9xK2mQ7' },
      ],
    },
  };

  const state = {
    deposit: { method: 'upi', amount: 1000, processing: false },
    withdraw: { method: 'upi', amount: 1000, processing: false },
  };

  /* ---------------- render ---------------- */

  function methodGrid(pane) {
    const host = $(`${pane}Methods`);
    host.innerHTML = Object.entries(METHODS)
      .map(
        ([key, method]) => `<button type="button" class="method${state[pane].method === key ? ' active' : ''}" data-method="${key}" data-pane="${pane}">
          <span class="m-icon">${method.icon}</span>${method.label}
        </button>`
      )
      .join('');
  }

  function amountGrid(pane) {
    const amounts = pane === 'deposit' ? DEPOSIT_AMOUNTS : WITHDRAW_AMOUNTS;
    const host = $(`${pane}Amounts`);
    host.innerHTML = amounts
      .map(
        (value) => `<button type="button" class="amount-chip${state[pane].amount === value ? ' active' : ''}" data-amount="${value}" data-pane="${pane}">${fmt(value)}</button>`
      )
      .join('');
  }

  function fields(pane) {
    const method = METHODS[state[pane].method];
    const host = $(`${pane}Fields`);
    host.innerHTML =
      method.fields
        .map((field) => {
          const id = `${pane}-${field.name}`;
          if (field.type === 'select') {
            return `<div class="field">
              <label for="${id}">${field.label}</label>
              <select id="${id}" data-field="${field.name}">
                ${field.options.map((option) => `<option>${option}</option>`).join('')}
              </select>
            </div>`;
          }
          return `<div class="field">
            <label for="${id}">${field.label}</label>
            <input id="${id}" data-field="${field.name}" value="${field.value || ''}"
              placeholder="${field.placeholder || ''}" inputmode="${field.inputmode || 'text'}"
              maxlength="${field.maxlength || 80}" autocomplete="off" spellcheck="false">
          </div>`;
        })
        .join('') +
      `<button type="button" class="test-fill" data-fill="${pane}">Use demo details</button>`;
  }

  function summary(pane) {
    const host = $(`${pane}Summary`);
    const amount = state[pane].amount;
    if (pane === 'deposit') {
      const bonus = round2(amount * 0.05);
      host.innerHTML = `
        <div class="summary-row"><span>Deposit</span><strong>${fmt(amount)}</strong></div>
        <div class="summary-row"><span>Demo bonus (5%)</span><strong>+ ${fmt(bonus)}</strong></div>
        <div class="summary-row"><span>Processing fee</span><strong>0</strong></div>
        <div class="summary-row total"><span>Coins credited</span><strong>${fmt(round2(amount + bonus))}</strong></div>`;
    } else {
      host.innerHTML = `
        <div class="summary-row"><span>Withdrawal</span><strong>${fmt(amount)}</strong></div>
        <div class="summary-row"><span>Payout fee</span><strong>0</strong></div>
        <div class="summary-row total"><span>Coins debited</span><strong>${fmt(amount)}</strong></div>`;
    }
  }

  function renderAll(pane) {
    amountGrid(pane);
    methodGrid(pane);
    fields(pane);
    summary(pane);
    const input = $(`${pane}Amount`);
    input.value = state[pane].amount;
  }

  /* ---------------- validation ---------------- */

  function fieldValue(pane, name) {
    const node = $(`${pane}-${name}`);
    return node ? node.value.trim() : '';
  }

  function validateMethod(pane) {
    const key = state[pane].method;
    if (key === 'upi') {
      const upi = fieldValue(pane, 'upi');
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) return 'Enter a demo UPI ID like demo@upi.';
    }
    if (key === 'card') {
      const number = fieldValue(pane, 'number').replace(/\s/g, '');
      const name = fieldValue(pane, 'name');
      const exp = fieldValue(pane, 'exp');
      const cvv = fieldValue(pane, 'cvv');
      if (!/^\d{16}$/.test(number)) return 'Demo card number must be 16 digits.';
      if (name.length < 3) return 'Enter a demo name on the card.';
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) return 'Expiry must look like MM/YY.';
      if (!/^\d{3,4}$/.test(cvv)) return 'CVV must be 3 or 4 digits.';
    }
    if (key === 'netbanking' && !fieldValue(pane, 'bank')) {
      return 'Choose a demo bank.';
    }
    if (key === 'wallet') {
      if (!fieldValue(pane, 'wallet')) return 'Choose a demo wallet.';
      if (!/^\d{10}$/.test(fieldValue(pane, 'phone'))) return 'Demo mobile number must be 10 digits.';
    }
    if (key === 'crypto') {
      if (!fieldValue(pane, 'network')) return 'Choose a demo network.';
      if (fieldValue(pane, 'address').length < 12) return 'Demo wallet address is too short.';
    }
    return '';
  }

  function showResult(pane, message, isError) {
    const box = $(`${pane}Result`);
    box.hidden = false;
    box.className = `cashier-result${isError ? ' error' : ''}`;
    box.textContent = message;
  }

  function clearResult(pane) {
    const box = $(`${pane}Result`);
    box.hidden = true;
    box.textContent = '';
  }

  /* ---------------- wallet history ---------------- */

  function renderWalletTx() {
    const host = $('walletTx');
    if (!host) return;
    const tx = Site.getTx().slice(0, 10);
    if (!tx.length) {
      host.innerHTML = '<p class="fine">No wallet activity yet.</p>';
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
          <div class="tx-label">${entry.label}<small>${when}</small></div>
          <div class="tx-amount ${positive ? 'pos' : 'neg'}">${positive ? '+' : ''}${fmt(entry.amount)}</div>
        </div>`;
      })
      .join('');
  }

  /* ---------------- actions ---------------- */

  function processDeposit() {
    if (state.deposit.processing) return;
    const amount = Math.floor(Number(state.deposit.amount));
    if (!Number.isFinite(amount) || amount < 100) {
      showResult('deposit', 'Minimum demo deposit is 100 coins.', true);
      return;
    }
    if (amount > 100000) {
      showResult('deposit', 'Maximum demo deposit is 100,000 coins.', true);
      return;
    }
    const problem = validateMethod('deposit');
    if (problem) {
      showResult('deposit', problem, true);
      return;
    }

    state.deposit.processing = true;
    const button = $('btnDeposit');
    button.classList.add('processing');
    button.textContent = 'Processing demo payment';

    setTimeout(() => {
      const bonus = round2(amount * 0.05);
      const total = round2(amount + bonus);
      Site.addBalance(total, `Demo deposit · ${METHODS[state.deposit.method].label}`, 'deposit');
      showResult(
        'deposit',
        `✓ Simulated payment approved. ${fmt(total)} demo coins credited (${fmt(amount)} + ${fmt(bonus)} bonus). No real money was charged.`,
        false
      );
      state.deposit.processing = false;
      button.classList.remove('processing');
      button.textContent = 'Add demo coins';
      renderWalletTx();
    }, 950);
  }

  function processWithdraw() {
    if (state.withdraw.processing) return;
    const amount = Math.floor(Number(state.withdraw.amount));
    const balance = Site.getBalance();
    if (!Number.isFinite(amount) || amount < 500) {
      showResult('withdraw', 'Minimum demo withdrawal is 500 coins.', true);
      return;
    }
    if (amount > balance) {
      showResult('withdraw', `Not enough demo coins. Available: ${fmt(balance)}.`, true);
      return;
    }
    const problem = validateMethod('withdraw');
    if (problem) {
      showResult('withdraw', problem, true);
      return;
    }

    state.withdraw.processing = true;
    const button = $('btnWithdraw');
    button.classList.add('processing');
    button.textContent = 'Simulating payout';

    setTimeout(() => {
      Site.addBalance(-amount, `Demo withdrawal · ${METHODS[state.withdraw.method].label}`, 'withdraw');
      showResult(
        'withdraw',
        `✓ Demo payout simulated. ${fmt(amount)} virtual coins removed. This is not a real withdrawal — no money is sent anywhere.`,
        false
      );
      state.withdraw.processing = false;
      button.classList.remove('processing');
      button.textContent = 'Simulate withdrawal';
      renderWalletTx();
    }, 950);
  }

  /* ---------------- events ---------------- */

  function bind() {
    renderAll('deposit');
    renderAll('withdraw');
    renderWalletTx();

    document.querySelectorAll('.cashier-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const which = tab.dataset.tab;
        document.querySelectorAll('.cashier-tab').forEach((node) => {
          node.classList.toggle('active', node === tab);
          node.setAttribute('aria-selected', String(node === tab));
        });
        $('depositPane').hidden = which !== 'deposit';
        $('withdrawPane').hidden = which !== 'withdraw';
      });
    });

    document.querySelectorAll('.amount-grid, .method-grid').forEach((grid) => {
      grid.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-amount]');
        if (chip) {
          const pane = chip.dataset.pane;
          state[pane].amount = Number(chip.dataset.amount);
          $(`${pane}Amount`).value = state[pane].amount;
          amountGrid(pane);
          summary(pane);
          clearResult(pane);
          return;
        }
        const method = event.target.closest('[data-method]');
        if (method) {
          const pane = method.dataset.pane;
          state[pane].method = method.dataset.method;
          methodGrid(pane);
          fields(pane);
          clearResult(pane);
        }
      });
    });

    ['deposit', 'withdraw'].forEach((pane) => {
      const input = $(`${pane}Amount`);
      input.addEventListener('input', () => {
        state[pane].amount = Math.floor(Number(input.value) || 0);
        amountGrid(pane);
        summary(pane);
        clearResult(pane);
      });

      $(`${pane}Fields`).addEventListener('click', (event) => {
        const fill = event.target.closest('[data-fill]');
        if (!fill) return;
        METHODS[state[pane].method].fields.forEach((field) => {
          if (field.type === 'select') return;
          const node = $(`${pane}-${field.name}`);
          if (node) node.value = field.value || '';
        });
        clearResult(pane);
      });
    });

    $('btnDeposit').addEventListener('click', processDeposit);
    $('btnWithdraw').addEventListener('click', processWithdraw);

    window.addEventListener('storage', (event) => {
      if (event.key === Site.STORE_KEY) renderWalletTx();
    });
  }

  bind();
})();
