// render.js — QUIET FLOOR: everything the player sees, drawn on one canvas.
// A dark office floor at night: cool floor tiles, warm pools of light under
// the ceiling lamps, desks and cabinets as solid cover, guards in amber with
// yellow vision cones that hug the furniture, a green exit door, and a HUD
// that always shows the alarm, the time and the coins left. All drawing is
// in world coordinates through a view {scale, ox, oy}; the HUD and the
// title/win/caught overlays are drawn in screen coordinates.

import { WORLD_W, WORLD_H, WALL, OBSTACLES, EXIT_RECT, EXIT_LABEL } from './world.js';
import { conePolygon } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx) {
  // Dark blue-grey carpet tiles with a faint grid, so movement reads.
  ctx.fillStyle = '#232a38';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 64; x < WORLD_W; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
  }
  for (let y = 64; y < WORLD_H; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
  }
  ctx.stroke();
  // Worn carpet runners along the two main corridors.
  ctx.fillStyle = 'rgba(120,140,170,0.07)';
  ctx.fillRect(WALL, 236, WORLD_W - WALL * 2, 56);
  ctx.fillRect(WALL, 480, WORLD_W - WALL * 2, 48);
  // Warm lamplight pools, so the player can read what is safe at a glance.
  const lamps = [
    [240, 160],
    [520, 160],
    [790, 380],
    [300, 470],
    [560, 470],
  ];
  for (const [x, y] of lamps) {
    const g = ctx.createRadialGradient(x, y, 8, x, y, 150);
    g.addColorStop(0, 'rgba(255,214,140,0.10)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 150, y - 150, 300, 300);
  }
  // Outer walls.
  ctx.fillStyle = '#39445a';
  ctx.fillRect(0, 0, WORLD_W, WALL);
  ctx.fillRect(0, WORLD_H - WALL, WORLD_W, WALL);
  ctx.fillRect(0, 0, WALL, WORLD_H);
  ctx.fillRect(WORLD_W - WALL, 0, WALL, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.strokeRect(WALL, WALL, WORLD_W - WALL * 2, WORLD_H - WALL * 2);
}

function drawObstacle(ctx, o) {
  if (o.kind === 'desk' || o.kind === 'table') {
    ctx.fillStyle = '#5a4632';
    roundRect(ctx, o.x, o.y, o.w, o.h, 5);
    ctx.fill();
    ctx.fillStyle = '#6d5942';
    roundRect(ctx, o.x + 4, o.y + 4, o.w - 8, o.h - 8, 3);
    ctx.fill();
    // A monitor and a coffee cup on each desk: cover you can read.
    ctx.fillStyle = '#1b2432';
    ctx.fillRect(o.x + 14, o.y + 8, 26, 16);
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(o.x + 16, o.y + 10, 22, 12);
    ctx.fillStyle = '#c8b28a';
    ctx.fillRect(o.x + o.w - 26, o.y + o.h - 16, 9, 9);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  } else if (o.kind === 'cabinet') {
    ctx.fillStyle = '#46536b';
    roundRect(ctx, o.x, o.y, o.w, o.h, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    for (let i = 1; i < 4; i += 1) {
      const t = o.h > o.w ? o.y + (o.h * i) / 4 : o.x + (o.w * i) / 4;
      if (o.h > o.w) {
        ctx.moveTo(o.x + 5, t);
        ctx.lineTo(o.x + o.w - 5, t);
      } else {
        ctx.moveTo(t, o.y + 5);
        ctx.lineTo(t, o.y + o.h - 5);
      }
    }
    ctx.stroke();
    ctx.fillStyle = '#d8d3c0';
    ctx.fillRect(o.x + o.w / 2 - 5, o.y + 8, 10, 3);
  } else if (o.kind === 'planter') {
    ctx.fillStyle = '#7a4a2e';
    ctx.beginPath();
    ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7d44';
    ctx.beginPath();
    ctx.arc(o.x + o.w / 2 - 6, o.y + o.h / 2 - 6, 12, 0, Math.PI * 2);
    ctx.arc(o.x + o.w / 2 + 7, o.y + o.h / 2 - 4, 10, 0, Math.PI * 2);
    ctx.arc(o.x + o.w / 2, o.y + o.h / 2 + 6, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, state) {
  const e = EXIT_RECT;
  const pulse = 0.55 + 0.25 * Math.sin(state.time * 3);
  ctx.fillStyle = `rgba(46,204,113,${pulse})`;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = '#a9f5c8';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#0b2e1a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(EXIT_LABEL, e.x + e.w / 2, e.y + e.h / 2 + 1);
  ctx.fillStyle = 'rgba(46,204,113,0.25)';
  ctx.fillRect(e.x - 4, e.y + e.h, e.w + 8, 10);
}

function drawCones(ctx, state) {
  for (const guard of state.guards) {
    const poly = conePolygon(guard);
    const hot = guard.state === 'chase' || state.alarm > 70;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = hot ? 'rgba(255,80,60,0.30)' : 'rgba(255,205,60,0.26)';
    ctx.fill();
    ctx.strokeStyle = hot ? 'rgba(255,120,90,0.5)' : 'rgba(255,215,90,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCoins(ctx, state) {
  for (const c of state.thrownCoins) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const fx of state.coinFx) {
    const t = fx.t / 0.7;
    if (t > 1) continue;
    ctx.strokeStyle = `rgba(255,217,74,${1 - t})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 8 + 60 * t, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGuard(ctx, guard, state) {
  const chasing = guard.state === 'chase';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(guard.x + 2, guard.y + 4, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = chasing ? '#e74c3c' : '#f39c12';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c1a05';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick and a tiny torch dot, so the guard's direction reads.
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.angle) * 15, guard.y + Math.sin(guard.angle) * 15);
  ctx.stroke();
  ctx.fillStyle = '#2c1a05';
  ctx.beginPath();
  ctx.arc(guard.x - Math.sin(guard.angle) * 4, guard.y + Math.cos(guard.angle) * 4, 1.6, 0, Math.PI * 2);
  ctx.arc(guard.x + Math.sin(guard.angle) * 4, guard.y - Math.cos(guard.angle) * 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (chasing) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 18);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + 4, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // The night courier: a teal hood, darker when sneaking low.
  ctx.fillStyle = p.sneaking ? '#1f8f7a' : '#2ec4a6';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d3f36';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#eafaf5';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // A soft pocket of light around the courier, so the eye finds them.
  const g = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, 70);
  g.addColorStop(0, 'rgba(120,230,200,0.10)');
  g.addColorStop(1, 'rgba(120,230,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(p.x - 70, p.y - 70, 140, 140);
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.42,
    WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.85,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawHud(ctx, state, view) {
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(10,14,22,0.82)';
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('QUIET FLOOR', 14, 23);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#9aa7bd';
  ctx.fillText('night courier', 138, 24);

  // Alarm meter, centre.
  const bw = 240;
  const bx = w / 2 - bw / 2;
  ctx.fillStyle = '#202634';
  roundRect(ctx, bx, 13, bw, 18, 9);
  ctx.fill();
  const frac = state.alarm / 100;
  ctx.fillStyle = frac > 0.7 ? '#e74c3c' : frac > 0.35 ? '#f39c12' : '#f5c542';
  if (frac > 0.01) {
    roundRect(ctx, bx + 2, 15, (bw - 4) * frac, 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, 13, bw, 18, 9);
  ctx.stroke();
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', bx + bw / 2, 22);

  // SEEN indicator: flashes while any guard has eyes on the courier.
  if (state.seen && Math.floor(state.time * 6) % 2 === 0) {
    ctx.fillStyle = '#ff4d3d';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('SEEN!', w / 2, 66);
  } else if (state.alarm > 55) {
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('SUSPICIOUS…', w / 2, 64);
  }

  // Timer and coins, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(formatTime(state.time), w - 14, 18);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94a';
  ctx.fillText(`coins ${'●'.repeat(state.coins)}${'○'.repeat(3 - state.coins)}`, w - 14, 35);

  // Bottom hint line.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8b96ab';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(
    'WASD / arrows move · Shift sneak · click throws a coin · M mute · R restart',
    14, h - 12,
  );
  if (state.player.sneaking) {
    ctx.fillStyle = '#2ec4a6';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('SNEAKING', 14, h - 32);
  }
  if (state.messageT > 0) {
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, w / 2, h - 12);
  }
  ctx.restore();
}

function overlay(ctx, view, lines, accent) {
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(6,9,15,0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = h / 2 - (lines.length - 1) * 22;
  for (const line of lines) {
    ctx.fillStyle = line.color || '#e8ecf4';
    ctx.font = line.font || '16px system-ui, sans-serif';
    ctx.fillText(line.text, w / 2, y);
    y += line.gap || 34;
  }
  ctx.restore();
}

export function drawGame(ctx, state, view) {
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  drawFloor(ctx);
  drawExit(ctx, state);
  drawCones(ctx, state);
  for (const o of OBSTACLES) drawObstacle(ctx, o);
  drawCoins(ctx, state);
  for (const guard of state.guards) drawGuard(ctx, guard, state);
  drawPlayer(ctx, state);
  drawVignette(ctx);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawHud(ctx, state, view);

  if (state.screen === SCREEN_TITLE) {
    overlay(ctx, view, [
      { text: 'QUIET FLOOR', font: 'bold 44px system-ui, sans-serif', color: '#2ec4a6', gap: 52 },
      { text: 'You are the night courier. Cross the dark office floor unseen', font: '17px system-ui, sans-serif' },
      { text: 'and reach the green EXIT. Three guards patrol with yellow cones —', font: '15px system-ui, sans-serif', color: '#b9c2d4', gap: 26 },
      { text: 'desks and cabinets block their sight. Shift sneaks. Click throws a coin.', font: '15px system-ui, sans-serif', color: '#b9c2d4', gap: 26 },
      { text: 'If the alarm fills, they chase. If they touch you, the night starts over.', font: '15px system-ui, sans-serif', color: '#b9c2d4', gap: 44 },
      { text: 'Click or press Enter to start', font: 'bold 18px system-ui, sans-serif', color: '#ffd94a' },
    ]);
  } else if (state.screen === SCREEN_WIN) {
    overlay(ctx, view, [
      { text: 'ESCAPED!', font: 'bold 44px system-ui, sans-serif', color: '#2ecc71', gap: 52 },
      { text: `You slipped out in ${formatTime(state.time)} — unseen, unheard.`, font: '17px system-ui, sans-serif' },
      { text: 'Press R to run the floor again', font: '15px system-ui, sans-serif', color: '#b9c2d4', gap: 44 },
    ]);
  } else if (state.screen === SCREEN_CAUGHT) {
    overlay(ctx, view, [
      { text: 'CAUGHT!', font: 'bold 44px system-ui, sans-serif', color: '#ff4d3d', gap: 52 },
      { text: `${state.caughtBy || 'A guard'} caught the courier under the lamps.`, font: '17px system-ui, sans-serif' },
      { text: 'The night starts over. Press R to try again', font: '15px system-ui, sans-serif', color: '#b9c2d4', gap: 44 },
    ]);
  }
}
