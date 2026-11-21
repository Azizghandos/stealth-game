// audio.js — QUIET FLOOR: every sound is synthesised with WebAudio.
// No audio files, no network: soft footstep taps, a coin clink, alarm beeps,
// a caught sting and a quiet win chime, all built from oscillators and a
// little filtered noise. Safe to call before any user gesture: the context
// is created lazily and every method no-ops until it exists.

export class QuietAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  // Browsers only allow sound after a gesture; call this from the first
  // key or click and the game stays silent until then.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  // A short burst of low-passed noise: a shoe on office carpet.
  noiseBurst(seconds, volume, cutoff) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // Alternate feet so a walk sounds like walking, not a metronome.
  footstep(sneaking) {
    if (sneaking) this.noiseBurst(0.05, 0.05, 500);
    else this.noiseBurst(0.07, 0.16, 900);
  }

  // A guard's step: a little heavier, a little further away.
  guardStep() {
    this.noiseBurst(0.06, 0.07, 420);
  }

  coinClink() {
    this.tone(2093, 0.12, 'sine', 0.16);
    this.tone(2637, 0.2, 'sine', 0.12, 0.05);
  }

  // Two rising beeps when the alarm trips.
  alarmBeep() {
    this.tone(880, 0.14, 'square', 0.1);
    this.tone(1174, 0.18, 'square', 0.1, 0.16);
  }

  caughtSting() {
    this.tone(220, 0.5, 'sawtooth', 0.14, 0, 110);
    this.tone(233, 0.5, 'sawtooth', 0.1, 0.05, 116);
  }

  winChime() {
    this.tone(523, 0.25, 'sine', 0.16);
    this.tone(659, 0.25, 'sine', 0.16, 0.12);
    this.tone(784, 0.45, 'sine', 0.18, 0.24);
  }
}
