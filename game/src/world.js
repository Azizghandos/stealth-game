// world.js — QUIET FLOOR: the office floor, its geometry and the game state.
// One dark office floor, seen from above. Walls and furniture are rectangles;
// every rectangle blocks movement and blocks a guard's line of sight, so a
// desk is real cover. Pure geometry and state: no DOM, no audio here, so the
// rules can be stepped headlessly.

export const WORLD_W = 960;
export const WORLD_H = 640;
export const WALL = 16;

export const PLAYER_START = { x: 72, y: 572 };
export const PLAYER_RADIUS = 11;
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 72;

export const EXIT_RECT = { x: 868, y: 16, w: 76, h: 36 };
export const EXIT_LABEL = 'EXIT';

// Furniture: desks, cabinets, a meeting table and planters. kind is only a
// drawing hint; every one of them blocks movement and vision alike.
export const OBSTACLES = [
  { x: 150, y: 92, w: 170, h: 46, kind: 'desk' },
  { x: 150, y: 182, w: 170, h: 46, kind: 'desk' },
  { x: 420, y: 92, w: 170, h: 46, kind: 'desk' },
  { x: 420, y: 182, w: 170, h: 46, kind: 'desk' },
  { x: 680, y: 108, w: 60, h: 132, kind: 'cabinet' },
  { x: 680, y: 300, w: 170, h: 46, kind: 'desk' },
  { x: 180, y: 380, w: 170, h: 46, kind: 'desk' },
  { x: 420, y: 400, w: 60, h: 132, kind: 'cabinet' },
  { x: 680, y: 430, w: 170, h: 46, kind: 'desk' },
  { x: 60, y: 300, w: 46, h: 132, kind: 'cabinet' },
  { x: 330, y: 300, w: 84, h: 42, kind: 'table' },
  { x: 852, y: 252, w: 44, h: 44, kind: 'planter' },
  { x: 252, y: 512, w: 44, h: 44, kind: 'planter' },
];

// Where each guard walks, as a loop of waypoints.
export const GUARD_DEFS = [
  {
    name: 'Mara',
    waypoints: [
      { x: 200, y: 160 },
      { x: 660, y: 160 },
    ],
    wait: 1.4,
  },
  {
    name: 'Ivo',
    waypoints: [
      { x: 520, y: 300 },
      { x: 520, y: 572 },
    ],
    wait: 1.0,
  },
  {
    name: 'Sena',
    waypoints: [
      { x: 700, y: 540 },
      { x: 904, y: 540 },
    ],
    wait: 1.2,
  },
];

export const GUARD_RADIUS = 12;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_CHASE_SPEED = 162;
export const GUARD_RANGE = 215;
export const GUARD_HALF_ANGLE = (32 * Math.PI) / 180;
export const COIN_COUNT = 3;
export const COIN_HEARING = 285;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Shortest signed turn from `from` toward `to`, in (-PI, PI].
export function angleDelta(from, to) {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Does the circle at (x, y) with radius r overlap any wall or furniture?
export function circleHitsObstacle(x, y, r) {
  if (x - r < WALL || x + r > WORLD_W - WALL || y - r < WALL || y + r > WORLD_H - WALL) return true;
  for (const o of OBSTACLES) {
    const cx = clamp(x, o.x, o.x + o.w);
    const cy = clamp(y, o.y, o.y + o.h);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

// Move a circle one axis at a time so it slides along walls instead of
// sticking on corners.
export function moveCircle(entity, dx, dy) {
  const nx = entity.x + dx;
  if (!circleHitsObstacle(nx, entity.y, entity.r)) entity.x = nx;
  const ny = entity.y + dy;
  if (!circleHitsObstacle(entity.x, ny, entity.r)) entity.y = ny;
}

// Slab test: distance along the ray (ox,oy)+t*(dx,dy) to the rectangle,
// or Infinity when the ray misses it. t is in world units (dx,dy unit).
export function rayRect(ox, oy, dx, dy, r) {
  let tmin = 0;
  let tmax = Infinity;
  const axes = [
    [ox - r.x, dx, r.w],
    [oy - r.y, dy, r.h],
  ];
  for (const [o, d, size] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < 0 || o > size) return Infinity;
    } else {
      let t1 = -o / d;
      let t2 = (size - o) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

// True when no wall or furniture stands between the two points.
export function lineOfSightClear(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return true;
  const ux = dx / len;
  const uy = dy / len;
  // The outer walls.
  if (rayRect(x1, y1, ux, uy, { x: 0, y: 0, w: WORLD_W, h: WALL }) < len) return false;
  if (rayRect(x1, y1, ux, uy, { x: 0, y: WORLD_H - WALL, w: WORLD_W, h: WALL }) < len) return false;
  if (rayRect(x1, y1, ux, uy, { x: 0, y: 0, w: WALL, h: WORLD_H }) < len) return false;
  if (rayRect(x1, y1, ux, uy, { x: WORLD_W - WALL, y: 0, w: WALL, h: WORLD_H }) < len) return false;
  for (const o of OBSTACLES) {
    if (rayRect(x1, y1, ux, uy, o) < len - 0.5) return false;
  }
  return true;
}

export function createGuard(def) {
  const start = def.waypoints[0];
  return {
    name: def.name,
    x: start.x,
    y: start.y,
    r: GUARD_RADIUS,
    angle: 0,
    waypoints: def.waypoints,
    wp: 1 % def.waypoints.length,
    wait: 0,
    waitAt: def.wait,
    state: 'patrol', // patrol | investigate | chase
    target: null,
    lookTime: 0,
    chaseTime: 0,
    loseTime: 0,
    stepPhase: 0,
  };
}

export function createGame() {
  return {
    screen: 'title', // title | play | win | caught
    time: 0,
    alarm: 0,
    seen: false,
    seenBy: null,
    coins: COIN_COUNT,
    coinFx: [], // {x, y, t} expanding rings where a coin landed
    thrownCoins: [], // {x, y} resting coins guards walk to
    message: '',
    messageT: 0,
    bestTime: null,
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      r: PLAYER_RADIUS,
      angle: -Math.PI / 2,
      moving: false,
      sneaking: false,
      stepPhase: 0,
    },
    guards: GUARD_DEFS.map(createGuard),
  };
}

export function resetGame(state) {
  const fresh = createGame();
  fresh.screen = 'play';
  Object.assign(state, fresh);
}

export function showMessage(state, text, seconds) {
  state.message = text;
  state.messageT = seconds;
}

// The player throws a coin at a world point: it clinks, guards in earshot
// walk over to look. Returns true when a coin was actually thrown.
export function throwCoin(state, x, y) {
  if (state.screen !== 'play' || state.coins <= 0) return false;
  state.coins -= 1;
  const cx = clamp(x, WALL + 14, WORLD_W - WALL - 14);
  const cy = clamp(y, WALL + 14, WORLD_H - WALL - 14);
  state.thrownCoins.push({ x: cx, y: cy });
  state.coinFx.push({ x: cx, y: cy, t: 0 });
  for (const g of state.guards) {
    if (g.state === 'chase') continue;
    if (distance(g.x, g.y, cx, cy) <= COIN_HEARING) {
      g.state = 'investigate';
      g.target = { x: cx, y: cy };
      g.lookTime = 0;
    }
  }
  showMessage(state, 'Coin thrown — a guard heard it', 1.6);
  return true;
}

export function playerReachedExit(state) {
  const p = state.player;
  return pointInRect(p.x, p.y, EXIT_RECT);
}
