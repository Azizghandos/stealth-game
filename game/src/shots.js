// shots.js — QUIET FLOOR: the four screenshot scenes.
// Each scene sets the world to one exact, reproducible moment — no random
// numbers, no input — and the main loop draws that single frame. The same
// ?shot=…&seed=… query always gives the same picture, because the picture is
// what the real rules produce from that staged state.
//   cover — the courier crouched behind a desk while a guard's cone sweeps past
//   sneak — mid-floor, sneaking low between patrols
//   exit  — one step from the green door, a cone closing in
//   alarm — the alarm full, a guard chasing, the courier running

import { resetGame } from './world.js';

function placeGuard(state, index, x, y, angle, guardState, target) {
  const g = state.guards[index];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.state = guardState || 'patrol';
  g.target = target || null;
  g.wait = 0;
  g.lookTime = 0;
  g.chaseTime = guardState === 'chase' ? 5 : 0;
  g.loseTime = 0;
}

function placePlayer(state, x, y, angle, sneaking) {
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  state.player.sneaking = !!sneaking;
  state.player.moving = true;
}

/**
 * Stage the named scene on a fresh world and return the screen to draw.
 * Unknown names stage the cover scene.
 */
export function stageShot(name, state) {
  resetGame(state);
  state.screen = 'play';

  if (name === 'sneak') {
    // Mid-floor: the courier creeps between the desk rows while Ivo patrols
    // away down the middle corridor and Mara sweeps the top.
    placePlayer(state, 470, 320, -Math.PI / 2, true);
    placeGuard(state, 0, 500, 160, 0);
    placeGuard(state, 1, 520, 430, Math.PI / 2);
    placeGuard(state, 2, 760, 540, Math.PI);
    state.alarm = 12;
    state.time = 41;
    state.coins = 3;
  } else if (name === 'exit') {
    // One step from the door: Mara's cone reaches for the courier, the
    // alarm half full, the green EXIT glowing.
    placePlayer(state, 830, 130, -Math.PI / 4, true);
    placeGuard(state, 0, 758, 160, 0);
    placeGuard(state, 1, 520, 470, -Math.PI / 2);
    placeGuard(state, 2, 830, 540, Math.PI);
    state.alarm = 54;
    state.time = 96;
    state.coins = 1;
    state.seen = true;
    state.seenBy = 'Mara';
  } else if (name === 'alarm') {
    // The alarm has tripped: Ivo is chasing, the courier is running for the
    // desks, a thrown coin still ringing on the floor.
    placePlayer(state, 500, 540, Math.PI / 2, false);
    placeGuard(state, 0, 420, 160, Math.PI);
    placeGuard(state, 1, 505, 428, Math.PI / 2, 'chase');
    placeGuard(state, 2, 700, 540, Math.PI);
    state.alarm = 100;
    state.time = 73;
    state.coins = 2;
    state.seen = true;
    state.seenBy = 'Ivo';
    state.thrownCoins.push({ x: 596, y: 470 });
    state.coinFx.push({ x: 596, y: 470, t: 0.35 });
  } else {
    // cover (default): the courier crouched behind the second desk row,
    // Mara's cone sweeping just past the desk edge, alarm a third full.
    placePlayer(state, 296, 252, -Math.PI / 2, true);
    placeGuard(state, 0, 330, 160, Math.PI);
    placeGuard(state, 1, 520, 330, Math.PI / 2);
    placeGuard(state, 2, 820, 540, 0);
    state.alarm = 34;
    state.time = 24;
    state.coins = 3;
  }
  return 'play';
}
