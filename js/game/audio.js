// Efek suara sintetis (Web Audio API) — tidak perlu file suara, jadi tetap ringan.
// Jika ingin memakai file sendiri, letakkan di /assets/suara dan ganti fungsi di bawah.

let ctx = null;
let senyap = false;

export function aktifkanAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setSenyap(v) { senyap = v; }
export function isSenyap() { return senyap; }

function nada(frek, mulai, durasi, { tipe = 'sine', volume = 0.18, frekAkhir = null } = {}) {
  if (!ctx || senyap) return;
  const t0 = ctx.currentTime + mulai;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipe;
  osc.frequency.setValueAtTime(frek, t0);
  if (frekAkhir) osc.frequency.exponentialRampToValueAtTime(frekAkhir, t0 + durasi);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durasi);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durasi + 0.05);
}

/** Ledakan: derau putih yang diredam (tanpa file audio). */
function ledakan() {
  if (!ctx || senyap) return;
  const durasi = 1.1;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * durasi), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + durasi);
  const gain = ctx.createGain();
  gain.gain.value = 0.55;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();
  nada(90, 0, 0.6, { tipe: 'sine', volume: 0.3, frekAkhir: 40 });
}

export const suara = {
  ledakan,
  waspada() {
    nada(660, 0, 0.09, { tipe: 'square', volume: 0.06 });
    nada(660, 0.14, 0.09, { tipe: 'square', volume: 0.06 });
  },
  muncul() {
    nada(440, 0, 0.12, { tipe: 'triangle', volume: 0.12 });
    nada(660, 0.1, 0.18, { tipe: 'triangle', volume: 0.12 });
  },
  benar() {
    [523, 659, 784, 1047].forEach((f, i) => nada(f, i * 0.08, 0.25, { tipe: 'triangle', volume: 0.2 }));
  },
  salah() {
    nada(220, 0, 0.25, { tipe: 'sawtooth', volume: 0.12, frekAkhir: 140 });
    nada(160, 0.18, 0.35, { tipe: 'sawtooth', volume: 0.1, frekAkhir: 90 });
  },
  pintu() {
    nada(300, 0, 0.35, { tipe: 'sine', volume: 0.15, frekAkhir: 900 });
  },
  tik() {
    nada(1200, 0, 0.05, { tipe: 'square', volume: 0.05 });
  },
  klik() {
    nada(700, 0, 0.06, { tipe: 'triangle', volume: 0.1 });
  },
  mulai() {
    [392, 523, 659].forEach((f, i) => nada(f, i * 0.12, 0.2, { tipe: 'triangle', volume: 0.16 }));
  },
  selesai() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => nada(f, i * 0.13, 0.3, { tipe: 'triangle', volume: 0.18 }));
  },
  peringatan() {
    nada(880, 0, 0.12, { tipe: 'square', volume: 0.08 });
  }
};
