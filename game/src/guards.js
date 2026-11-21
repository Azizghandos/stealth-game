// guards.js — QUIET FLOOR: what the guards see and how they hunt.
// A guard patrols a loop of waypoints, pauses at each one and sweeps the
// room with a vision cone. The cone is clipped by walls and furniture: cover
// really hides you. Being seen fills the alarm; a full alarm sends the guard
// chasing, and a touch ends the run. A thrown coin, or loud running footsteps,
// pulls a patrolling guard over to investigate instead.

import {
  WORLD_W,
  WORLD_H,
  WALL,
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_RANGE,
  GUARD_HALF_ANGLE,
  OBSTACLES,
  angleDelta,
  angleTo,
  clamp,
  distance,
  lineOfSightClear,
  moveCircle,
  rayRect,
} from './world.js';

const ALARM_FILL = 62; // per second while fully seen, before modifiers
const ALARM_DECAY = 15; // per second while unseen
const ALARM_NOISE = 9; // per second while a guard hears loud footsteps
const CHASE_SECONDS = 5;
const LOSE_SIGHT_SECONDS = 1.6;
const CATCH_DISTANCE = 22;

// Is the player inside this guard's cone, in range, and in plain sight?
export function guardSeesPlayer(state, guard) {
  const p = state.player;
  const d = distance(guard.x, guard.y, p.x, p.y);
  if (d > GUARD_RANGE) return false;
  const toPlayer = angleTo(guard.x, guard.y, p.x, p.y);
  if (Math.abs(angleDelta(guard.angle, toPlayer)) > GUARD_HALF_ANGLE) return false;
  return lineOfSightClear(guard.x, guard.y, p.x, p.y);
}

// The vision cone as a polygon, clipped by walls and furniture: one ray per
// slice, stopped at the first thing it hits. Render draws this directly, so
// what the player sees is exactly what the guard sees.
export function conePolygon(guard) {
  const slices = 20;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= slices; i += 1) {
    const a = guard.angle - GUARD_HALF_ANGLE + (2 * GUARD_HALF_ANGLE * i) / slices;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = GUARD_RANGE;
    const walls = [
      { x: 0, y: 0, w: WORLD_W, h: WALL },
      { x: 0, y: WORLD_H - WALL, w: WORLD_W, h: WALL },
      { x: 0, y: 0, w: WALL, h: WORLD_H },
      { x: WORLD_W - WALL, y: 0, w: WALL, h: WORLD_H },
    ];
    for (const r of walls) {
      const t = rayRect(guard.x, guard.y, dx, dy, r);
      if (t < best) best = t;
    }
    for (const o of OBSTACLES) {
      const t = rayRect(guard.x, guard.y, dx, dy, o);
      if (t < best) best = t;
    }
    points.push({ x: guard.x + dx * best, y: guard.y + dy * best });
  }
  return points;
}

function stepToward(guard, tx, ty, speed, dt) {
  const d = distance(guard.x, guard.y, tx, ty);
  if (d < 1) return true;
  const want = angleTo(guard.x, guard.y, tx, ty);
  guard.angle += clamp(angleDelta(guard.angle, want), -5.5 * dt, 5.5 * dt);
  const step = Math.min(d, speed * dt);
  moveCircle(guard, Math.cos(guard.angle) * step, Math.sin(guard.angle) * step);
  guard.stepPhase += step;
  return distance(guard.x, guard.y, tx, ty) < 4;
}

function updatePatrol(guard, dt) {
  if (guard.wait > 0) {
    guard.wait -= dt;
    // Sweep the room while waiting: look left, then right.
    guard.angle += Math.sin(guard.wait * 2.2) * 0.9 * dt;
    return;
  }
  const target = guard.waypoints[guard.wp];
  if (stepToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
    guard.wp = (guard.wp + 1) % guard.waypoints.length;
    guard.wait = guard.waitAt;
  }
}

function updateInvestigate(guard, dt) {
  if (!guard.target) {
    guard.state = 'patrol';
    return;
  }
  if (stepToward(guard, guard.target.x, guard.target.y, GUARD_PATROL_SPEED * 1.25, dt)) {
    // Arrived: look around for a while, then go back to the patrol.
    guard.lookTime += dt;
    guard.angle += 1.7 * dt;
    if (guard.lookTime > 2.4) {
      guard.state = 'patrol';
      guard.target = null;
      guard.lookTime = 0;
    }
  }
}

function updateChase(state, guard, dt) {
  const p = state.player;
  guard.chaseTime -= dt;
  stepToward(guard, p.x, p.y, GUARD_CHASE_SPEED, dt);
  if (distance(guard.x, guard.y, p.x, p.y) <= CATCH_DISTANCE) {
    state.screen = 'caught';
    state.caughtBy = guard.name;
    return;
  }
  if (!guardSeesPlayer(state, guard)) {
    guard.loseTime += dt;
    if (guard.loseTime > LOSE_SIGHT_SECONDS || guard.chaseTime <= 0) {
      guard.state = 'patrol';
      guard.target = null;
      guard.loseTime = 0;
      state.alarm = Math.min(state.alarm, 55);
    }
  } else {
    guard.loseTime = 0;
  }
  if (guard.chaseTime <= 0 && guard.state === 'chase') {
    guard.state = 'patrol';
    guard.target = null;
    state.alarm = Math.min(state.alarm, 55);
  }
}

// One guard's brain for this frame, plus the shared alarm meter. Call once
// per frame with the player already moved.
export function updateGuards(state, dt) {
  const p = state.player;
  let seen = false;
  let seenBy = null;

  for (const guard of state.guards) {
    if (guard.state === 'patrol') updatePatrol(guard, dt);
    else if (guard.state === 'investigate') updateInvestigate(guard, dt);
    else if (guard.state === 'chase') updateChase(state, guard, dt);
    if (state.screen === 'caught') return;

    // Vision: a sneaking player fills the meter half as fast; a close
    // player fills it faster. The meter is shared: any guard can raise it.
    if (guardSeesPlayer(state, guard)) {
      seen = true;
      seenBy = guard;
      const d = distance(guard.x, guard.y, p.x, p.y);
      const near = d < 95 ? 1.6 : d < 155 ? 1.2 : 0.85;
      const sneak = p.sneaking ? 0.55 : 1;
      state.alarm = clamp(state.alarm + ALARM_FILL * near * sneak * dt, 0, 100);
    }

    // Loud running footsteps carry: a guard close by turns to listen and
    // the alarm creeps up even outside the cone.
    if (p.moving && !p.sneaking && guard.state === 'patrol') {
      const d = distance(guard.x, guard.y, p.x, p.y);
      if (d < 150 && lineOfSightClear(guard.x, guard.y, p.x, p.y)) {
        guard.angle += clamp(angleDelta(guard.angle, angleTo(guard.x, guard.y, p.x, p.y)), -2.4 * dt, 2.4 * dt);
        state.alarm = clamp(state.alarm + ALARM_NOISE * dt, 0, 100);
      }
    }
  }

  state.seen = seen;
  state.seenBy = seenBy ? seenBy.name : null;
  if (!seen) state.alarm = clamp(state.alarm - ALARM_DECAY * dt, 0, 100);

  // A full meter trips the chase: the guard who saw you comes for you.
  if (state.alarm >= 100) {
    const hunter = seenBy || state.guards[0];
    if (hunter.state !== 'chase') {
      hunter.state = 'chase';
      hunter.chaseTime = CHASE_SECONDS;
      hunter.loseTime = 0;
      state.spotted = (state.spotted || 0) + 1;
    }
  }
}
