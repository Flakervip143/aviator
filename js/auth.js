'use strict';

/* =========================================================
   SkyRocket Casino — demo account system
   Profiles live only in this browser. No server, no KYC,
   no real credentials. Never use a real password here.
   ========================================================= */

const Auth = (function () {
  const USERS_KEY = 'skyr_users_v1';
  const SESSION_KEY = 'skyr_session_v1';
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

  function readUsers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (err) {
      /* storage may be unavailable */
    }
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function cleanName(name) {
    return String(name || '').replace(/[<>]/g, '').trim().slice(0, 20);
  }

  function publicUser(user) {
    if (!user) return null;
    return { name: user.name, email: user.email, created: user.created };
  }

  function randomSalt() {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  }

  function fallbackHash(text) {
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ code, 0x85ebca6b) >>> 0;
    }
    return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  }

  function hashPassword(password, salt) {
    const text = `${salt}:${password}:skyr-demo`;
    if (window.crypto && window.crypto.subtle && encoder) {
      return window.crypto.subtle
        .digest('SHA-256', encoder.encode(text))
        .then((buffer) =>
          Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
        )
        .catch(() => fallbackHash(text));
    }
    return Promise.resolve(fallbackHash(text));
  }

  function validate({ name, email, password, requireName }) {
    if (requireName) {
      if (!name || name.length < 2) return 'Choose a display name with at least 2 characters.';
      if (!/^[\w .\-']{2,20}$/.test(name)) return 'Use letters, numbers, spaces, dots, dashes or underscores only.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return 'Enter a valid email address.';
    if (String(password || '').length < 6) return 'Password must be at least 6 characters.';
    if (String(password || '').length > 72) return 'Password must be 72 characters or fewer.';
    return '';
  }

  function register({ name, email, password }) {
    const clean = cleanName(name);
    const mail = normalizeEmail(email);
    const problem = validate({ name: clean, email: mail, password, requireName: true });
    if (problem) return Promise.resolve({ ok: false, error: problem });

    const users = readUsers();
    if (users[mail]) return Promise.resolve({ ok: false, error: 'An account with that email already exists. Try logging in.' });

    const salt = randomSalt();
    return hashPassword(password, salt).then((hash) => {
      users[mail] = {
        name: clean,
        email: mail,
        salt,
        hash,
        created: Date.now(),
      };
      writeUsers(users);
      try {
        localStorage.setItem(SESSION_KEY, mail);
      } catch (err) {
        /* ignore */
      }
      return { ok: true, user: publicUser(users[mail]) };
    });
  }

  function login({ email, password }) {
    const mail = normalizeEmail(email);
    const problem = validate({ email: mail, password });
    if (problem) return Promise.resolve({ ok: false, error: problem });

    const user = readUsers()[mail];
    if (!user) return Promise.resolve({ ok: false, error: 'No demo account found with that email.' });

    return hashPassword(password, user.salt || '').then((hash) => {
      if (hash !== user.hash) return { ok: false, error: 'Incorrect password. Please try again.' };
      try {
        localStorage.setItem(SESSION_KEY, mail);
      } catch (err) {
        /* ignore */
      }
      return { ok: true, user: publicUser(user) };
    });
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* ignore */
    }
    if (window.Site && Site.toast) Site.toast('Logged out of the demo account.', 'info');
  }

  function current() {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      if (!email) return null;
      const user = readUsers()[email];
      return user ? publicUser(user) : null;
    } catch (err) {
      return null;
    }
  }

  function isLoggedIn() {
    return Boolean(current());
  }

  function updateName(name) {
    const active = current();
    if (!active) return { ok: false, error: 'Log in first.' };
    const clean = cleanName(name);
    if (clean.length < 2) return { ok: false, error: 'Display name must be at least 2 characters.' };
    if (!/^[\w .\-']{2,20}$/.test(clean)) return { ok: false, error: 'That display name contains unsupported characters.' };
    const users = readUsers();
    users[active.email].name = clean;
    writeUsers(users);
    return { ok: true, user: publicUser(users[active.email]) };
  }

  function initial(name) {
    return String(name || 'S').trim().charAt(0).toUpperCase() || 'S';
  }

  return {
    USERS_KEY,
    SESSION_KEY,
    register,
    login,
    logout,
    current,
    isLoggedIn,
    updateName,
    initial,
  };
})();

window.Auth = Auth;
