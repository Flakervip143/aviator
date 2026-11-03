# SkyRocket — Aviator-style crash game + demo casino lobby

A fully client-side demo casino with a **playable Aviator-style crash game**, 59 additional playable demo titles, local profiles, a simulated cashier and free virtual-coin bonuses. Built with plain HTML, CSS and JavaScript — no build step, no dependencies and no backend.

**Live demo:** https://flakervip143.github.io/aviator/
**Repository:** https://github.com/Flakervip143/aviator

> **Demo only.** All balances are virtual coins with no monetary value. There are no deposits, withdrawals, cash prizes or real-money gambling features. This is an original interface and is not affiliated with Crorebet, Spribe or any other operator.

## Features

### Casino lobby (`index.html`)
- Dark navy casino UI with category sidebar, sticky header, search and responsive game sections
- Auto-rotating hero carousel with three slides
- **60 game tiles** across Crash, Slots, Live Casino, Table and Indian categories
- Category filters, live search and favourites saved in `localStorage`
- Shared demo wallet with free top-ups
- Mobile drawer and bottom navigation
- Local demo profiles with login — no server account, KYC or real password required

### Playable games
- **Aviator** (`aviator.html`) — full crash game with canvas rocket, live bets, stats, sound and provably fair seed verification
- **59 catalogue games** (`game.html?g=slug`) — original demo engines for:
  - crash / multiplier games
  - dice and over/under
  - mines
  - Plinko
  - roulette
  - three-reel slots
  - high-card table games
- Shared betting controls, quick bets, auto cash-out where relevant, round history, related games and local stats

### Demo wallet and cashier (`cashier.html`)
- Simulated UPI, card, net banking, wallet and crypto checkout
- **No payment provider, no network calls, no real charges**
- 5% demo deposit match and simulated withdrawals
- Wallet activity stored locally
- Clear warnings against entering real financial details

### Profiles, bonuses and support
- **Local account** (`account.html`) — display name, balance, stats, activity, favourites and settings
- **Bonuses** (`bonuses.html`) — one-time welcome, daily and weekly virtual-coin top-ups with local cooldowns
- **Support** (`support.html`) — FAQs and a demo contact form that saves notes locally only
- **Policies** — terms, privacy and responsible-play pages
- **Accessibility** — reduced-motion preference, keyboard-friendly controls and visible focus styles

## Run locally

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, GitHub Pages, etc.). Opening `index.html` directly with `file://` mostly works, but serving over HTTP is recommended for same-origin storage and consistent behaviour.

## Project structure

```
aviator/
├── index.html           # casino lobby
├── aviator.html         # full Aviator-style crash game
├── game.html            # shared demo game shell (?g=game-slug)
├── crash.html           # category pages
├── slots.html
├── live.html
├── table.html
├── indian.html
├── cashier.html         # simulated checkout
├── bonuses.html         # demo bonus claims
├── login.html
├── register.html
├── account.html
├── support.html
├── terms.html
├── privacy.html
├── responsible.html
├── 404.html
├── css/
│   ├── lobby.css        # lobby, shell, header, modals and footer
│   ├── pages.css        # inner pages, games, cashier, account and docs
│   └── game.css         # standalone Aviator game
├── js/
│   ├── data.js          # game catalogue and artwork mapping
│   ├── auth.js          # local demo profiles and password hashing
│   ├── site.js          # shared header/footer, wallet, favourites, preferences
│   ├── lobby.js         # lobby rendering, filters, search and carousel
│   ├── category.js      # category page grid
│   ├── play.js          # demo game engines
│   ├── cashier.js       # simulated checkout flow
│   ├── bonuses.js       # bonus claims and cooldowns
│   ├── auth-page.js     # login / register forms
│   ├── account.js       # account dashboard
│   ├── support.js       # local support form
│   └── game.js          # standalone Aviator engine
├── assets/thumbs/       # original SVG game artwork
└── README.md
```

## Aviator provably fair algorithm

Each round uses a fresh 32-byte server seed and an incrementing nonce:

```
hash  = HMAC_SHA256(serverSeed, clientSeed + ":" + nonce)
h     = int(hash[0..8], 16)          // first 4 bytes
e     = 2^32
crash = (h % 33 === 0)
      ? 1.00
      : floor((100·e − h) / (e − h)) / 100
```

The result is capped at `1000x`. The server seed hash is displayed before the round and the full seed afterwards, so the result can be recomputed and checked in the game's **Provably fair** panel.

Because this demo runs fully in the browser, seeds are generated locally. The panel demonstrates the verification algorithm; a production service would generate and commit to seeds on a server.

## Local data

Progress is saved in browser `localStorage`; there is no backend. Main keys:

- `skyr_state_v1` — balance, transactions and stats
- `skyr_favs` — favourite games
- `skyr_claims` — bonus claim timestamps
- `skyr_prefs_v1` — display preferences
- `skyr_users_v1` / `skyr_session_v1` — optional local demo profile
- `skyr_support_tickets_v1` — support notes saved by the demo form

Clear site data or use **Reset demo progress** in the account page to start fresh. A different browser or device has separate progress.

## Notes and limitations

- All games use original demo engines and simulated outcomes. They are not licensed reproductions of real casino titles.
- The cashier is a UI demonstration only and never contacts a payment provider.
- Aviator has full canvas graphics and audio; the catalogue uses lightweight DOM-based demo engines.
- Bonus cooldowns and balances are client-side and can be reset by clearing storage. This is intentional for a demo.
- No analytics, tracking or server accounts are included. Google Fonts is the only third-party request.

## License

MIT — see [LICENSE](LICENSE).
