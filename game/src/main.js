// main.js — QUIET FLOOR: the entry point. Owns the canvas, the frame loop
// and the rules that tie the modules together: move the courier, let the
// guards think, throw coins, win at the exit, restart when caught. With a
// ?shot=… query it instead stages one frozen scene for a screenshot and
// draws that single frame.

import { WORLD_W, WORLD_H, WALK_SPEED, SNEAK_SPEED, createGame, resetGame, moveCircle, throwCoin, playerReachedExit } from './world.js';
import { updateGuards } from './guards.js';
import { drawGame } from './render.js';
import { QuietAudio } from './audio.js';
import { QuietInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const audio = new QuietAudio();
const state = createGame();

// The world is 960x640; the canvas fills the window and the view letterboxes
// it, keeping the whole floor visible at once.
const view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = w;
  view.h = h;
  view.scale = Math.min(w / WORLD_W, h / WORLD_H);
  view.ox = (w - WORLD_W * view.scale) / 2;
  view.oy = (h - WORLD_H * view.scale) / 2;
}
window.addEventListener('resize', resize);
resize();

const input = new QuietInput(canvas, (px, py) => ({
  x: (px - view.ox) / view.scale,
  y: (py - view.oy) / view.scale,
}));
input.onFirstGesture = () => audio.ensure();
input.onKey = (key) => {
  if (key === 'Enter' && state.screen === 'title') startRun();
  if (key === 'r' || key === 'R') {
    if (state.screen === 'win' || state.screen === 'caught') startRun();
    else if (state.screen === 'play') startRun();
  }
  if (key === 'm' || key === 'M') audio.toggleMute();
};

function startRun() {
  resetGame(state);
  state.screen = 'play';
  announce('A new night begins. Reach the green exit unseen.');
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

let lastAlarmBeep = 0;
let lastSeen = false;

let frozen = false;

function update(dt) {
  if (frozen || state.screen !== 'play') return;
  state.time += dt;
  if (state.messageT > 0) state.messageT -= dt;

  // Movement: sneak is slow and quiet, walking is quick and loud.
  const move = input.moveVector();
  const sneaking = input.sneaking;
  const speed = sneaking ? SNEAK_SPEED : WALK_SPEED;
  const p = state.player;
  p.sneaking = sneaking;
  p.moving = move.x !== 0 || move.y !== 0;
  if (p.moving) {
    p.angle = Math.atan2(move.y, move.x);
    moveCircle(p, move.x * speed * dt, move.y * speed * dt);
    p.stepPhase += speed * dt;
    if (p.stepPhase > 34) {
      p.stepPhase = 0;
      audio.footstep(sneaking);
    }
  }

  // A click throws a coin where the player points.
  const click = input.takeClick();
  if (click) {
    if (throwCoin(state, click.x, click.y)) audio.coinClink();
  }

  updateGuards(state, dt);

  for (const fx of state.coinFx) fx.t += dt;
  state.coinFx = state.coinFx.filter((fx) => fx.t < 0.7);

  // Guard footsteps: the nearer a patrolling guard, the clearer the tread.
  for (const g of state.guards) {
    if (g.stepPhase > 46) {
      g.stepPhase = 0;
      audio.guardStep();
    }
  }

  if (state.seen && !lastSeen) {
    announce('Seen! Break line of sight — the alarm is rising.');
  }
  lastSeen = state.seen;

  if (state.alarm >= 100 && state.time - lastAlarmBeep > 1.1) {
    lastAlarmBeep = state.time;
    audio.alarmBeep();
  }

  if (playerReachedExit(state)) {
    state.screen = 'win';
    state.bestTime = state.time;
    audio.winChime();
    announce(`Escaped in ${Math.round(state.time)} seconds.`);
  }
  if (state.screen === 'caught') {
    audio.caughtSting();
    announce(`${state.caughtBy || 'A guard'} caught the courier. Press R to try again.`);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawGame(ctx, state, view);
  requestAnimationFrame(frame);
}

// Screenshot mode: ?shot=cover|sneak|exit|alarm (any other value is cover).
// The scene is staged once, drawn once, and never stepped, so the frame is
// exactly the moment the scene describes.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot !== null) {
  frozen = true;
  stageShot(shot, state);
  drawGame(ctx, state, view);
  window.__shotReady = true;
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}
