'use strict';

/* =========================================================
   SkyRocket Casino — demo help / local contact form
   ========================================================= */

(function () {
  const form = document.getElementById('supportForm');
  if (!form) return;

  const success = document.getElementById('supportSuccess');
  const error = document.getElementById('supportError');
  const listKey = 'skyr_support_tickets_v1';

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    success.hidden = true;
  }

  function clearMessages() {
    error.hidden = true;
    error.textContent = '';
    success.hidden = true;
  }

  form.addEventListener('input', clearMessages);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessages();

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const topic = String(data.get('topic') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (name.length < 2) {
      showError('Please enter a name with at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }
    if (!topic) {
      showError('Please choose a topic.');
      return;
    }
    if (message.length < 10) {
      showError('Please write at least 10 characters so we can understand the issue.');
      return;
    }

    try {
      const previous = JSON.parse(localStorage.getItem(listKey) || '[]');
      const tickets = Array.isArray(previous) ? previous : [];
      tickets.unshift({ name, email, topic, message, ts: Date.now() });
      localStorage.setItem(listKey, JSON.stringify(tickets.slice(0, 20)));
    } catch (err) {
      showError('Could not save the message in this browser. Storage may be unavailable.');
      return;
    }

    success.textContent = `Thanks, ${name}. Your demo support note has been saved locally. This is a demo — no message was sent to a real support team.`;
    success.hidden = false;
    form.reset();
  });
})();
