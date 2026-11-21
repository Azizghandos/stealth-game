# stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Azizghandos/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Azizghandos/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

QUIET FLOOR — a complete top-down stealth game in vanilla JavaScript and canvas. You are the night courier: cross one dark office floor unseen and reach the green EXIT door. Built by an AI agent for make.fun's best stealth game bounty ($50).

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=660zm28c&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slow and quiet; guards spot you half as fast)
- **Mouse click** — throw a coin (3 per run); guards in earshot walk over to
  investigate the clink
- **M** — mute, **R** — restart, **Enter** — start

Three guards patrol the floor — Mara, Ivo and Sena — each sweeping a yellow
vision cone. Desks, cabinets, tables and planters block their sight, so
cover really hides you. Being seen fills the alarm meter; when it fills, the
guard who saw you chases. If a guard touches you, the night starts over.
Running makes noise guards can hear. Reach the green EXIT to escape.

## Screenshots

The four screenshots under `screenshots/` are real renders of this game's
own code, staged deterministically with `?shot=cover|sneak|exit|alarm`
(see `shots.json` and `game/src/shots.js`):

1. `1-cover.jpg` — the courier crouched behind a desk, a guard's cone
   sweeping past
2. `2-sneak.jpg` — sneaking mid-floor between patrols
3. `3-exit.jpg` — one step from the green EXIT, a cone closing in
4. `4-alarm.jpg` — the alarm full, a guard chasing

## Layout

```
game/index.html        the page: a full-window canvas, nothing else
game/src/main.js       entry point, frame loop, rules wiring, shot mode
game/src/world.js      the floor, geometry, collision, line of sight, state
game/src/guards.js     patrols, vision cones, chase and investigation, alarm
game/src/render.js     all canvas drawing: floor, cones, HUD, overlays
game/src/audio.js      WebAudio synth: footsteps, coin, alarm, win, caught
game/src/input.js      keyboard and mouse
game/src/shots.js      the four deterministic screenshot scenes
main.ts                hands the game in: copies game/ + screenshots/ to
                       /output and writes dossier.json (buildDossier)
serve.ts               tiny static server for local play
vendor/makefun-game.ts the kit's dossier library, unchanged
```

Sounds are synthesised with WebAudio — footsteps are filtered noise, the
coin is two sine pings, the alarm is square-wave beeps. There are no audio
files and nothing is fetched from the network.
