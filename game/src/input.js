// input.js — QUIET FLOOR: keyboard and mouse, turned into game intent.
// WASD or arrows move, Shift sneaks, Enter starts, R restarts, M mutes.
// A click throws a coin at that floor tile. Clicks are queued in world
// coordinates (the main loop converts them with the current view) and
// consumed one per frame, so a click never throws two coins.

export class QuietInput {
  constructor(canvas, toWorld) {
    this.keys = new Set();
    this.clicks = [];
    this.toWorld = toWorld;
    this.onFirstGesture = null;
    this.onKey = null;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
        if (this.onFirstGesture) this.onFirstGesture();
        if (this.onKey) this.onKey(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (event) => {
      if (this.onFirstGesture) this.onFirstGesture();
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      this.clicks.push(this.toWorld(px, py));
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // -1, 0 or 1 on each axis, from whatever movement keys are held.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  get sneaking() {
    return this.keys.has('Shift');
  }

  takeClick() {
    return this.clicks.shift() || null;
  }
}
