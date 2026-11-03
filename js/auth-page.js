'use strict';

/* =========================================================
   SkyRocket Casino — login / register page controller
   ========================================================= */

(function () {
  const form = document.getElementById('authForm');
  if (!form) return;

  const mode = form.dataset.mode === 'register' ? 'register' : 'login';
  const errorBox = document.getElementById('authError');
  const submit = form.querySelector('button[type="submit"]');
  const next = new URLSearchParams(location.search).get('next');
  const safeNext = next && /^[a-z0-9_-]+\.html(?:#[a-z0-9_-]*)?$/i.test(next) ? next : 'account.html';

  if (window.Auth && Auth.isLoggedIn()) {
    location.replace('account.html');
    return;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function setBusy(busy) {
    submit.disabled = busy;
    submit.textContent = busy
      ? mode === 'register'
        ? 'Creating account…'
        : 'Logging in…'
      : mode === 'register'
        ? 'Create demo account'
        : 'Log in';
  }

  form.addEventListener('input', clearError);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();

    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');

    if (mode === 'register') {
      const name = String(data.get('name') || '').trim();
      const confirm = String(data.get('confirm') || '');
      const age = form.querySelector('[name="age"]');

      if (password !== confirm) {
        showError('Passwords do not match. Please check both fields.');
        return;
      }
      if (age && !age.checked) {
        showError('Please confirm that you are 18 or older and understand this is a demo.');
        return;
      }

      setBusy(true);
      Auth.register({ name, email, password })
        .then((result) => {
          if (!result.ok) {
            setBusy(false);
            showError(result.error);
            return;
          }
          location.href = `${safeNext}${safeNext.includes('?') ? '&' : '?'}welcome=1`;
        })
        .catch(() => {
          setBusy(false);
          showError('Could not create the account in this browser. Storage may be unavailable.');
        });
      return;
    }

    setBusy(true);
    Auth.login({ email, password })
      .then((result) => {
        if (!result.ok) {
          setBusy(false);
          showError(result.error);
          return;
        }
        location.href = safeNext;
      })
      .catch(() => {
        setBusy(false);
        showError('Could not log in in this browser. Storage may be unavailable.');
      });
  });
})();
