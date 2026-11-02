# SkyRocket — Aviator-style crash game + demo casino lobby

A fully client-side casino lobby and **Aviator-style crash game** built with plain HTML, CSS and JavaScript. No build step, no dependencies, no backend — just open it in a browser.

**Live demo:** https://flakervip143.github.io/aviator/
**Repository:** https://github.com/Flakervip143/aviator

> **Demo only.** All balances are virtual coins with no monetary value. There are no deposits, withdrawals or real-money gambling features. This is an original interface, not affiliated with Crorebet, Spribe or any other operator.

## Live features

### Casino lobby (`index.html`)
- Dark navy casino UI with category sidebar, sticky header, search and game sections
- Auto-rotating hero carousel with three slides
- 32 game tiles across Crash, Slots, Live Casino, Table and Indian categories
- Category filters, live search and favourites (saved in `localStorage`)
- Free demo top-up (+1,000 coins)
- Mobile drawer + bottom navigation
- Aviator tile and CTAs open the playable game

### Aviator game (`aviator.html`)
- 5s betting countdown → flight → crash → next round loop
- Cash out any time; auto cash-out at a chosen multiplier
- Crash point derived from `HMAC-SHA256(serverSeed, clientSeed:nonce)`
- Server seed hash shown before the round, seed revealed after with a verification button
- Canvas rocket with curved trail, glow, explosion particles and camera grid
- 12–22 simulated players with live bets, cash-outs and losses
- Round history strip, statistics panel, sound effects (WebAudio)
- Balance, bet, fairness seed and stats persisted in `localStorage`
- Mobile-first responsive layout

## Run locally

```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, GitHub Pages, etc.). Opening `index.html` directly with `file://` mostly works, but serving over HTTP is recommended.

## Project structure

```
aviator/
├── index.html        # casino lobby
├── aviator.html      # playable crash game
├── css/
│   ├── lobby.css     # lobby styles
│   └── game.css      # game styles
├── js/
│   ├── lobby.js      # lobby rendering, filters, favourites, top-up, carousel
│   └── game.js       # game engine, fairness, canvas, betting UI
└── README.md
```

## Provably fair algorithm

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

## Notes

- Game tiles other than Aviator are visual placeholders (clicking shows a "coming soon" modal).
- Balance is shared between the lobby and the game through the same `localStorage` key (`skyr_state_v1`).
- Reset demo progress in the game: **Menu → Statistics → Reset demo progress**.

## License

MIT — see [LICENSE](LICENSE).
