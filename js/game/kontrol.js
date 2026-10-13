/**
 * Input pemain: keyboard (panah / WASD) + joystick virtual (layar sentuh).
 * Menghasilkan arah x (kiri -1 … kanan 1) dan y (bawah -1 … atas 1).
 */
export class Kontrol {
  constructor(elJoystick) {
    this.tombol = new Set();
    this.joy = { x: 0, y: 0 };
    this.aktif = true;

    const peta = {
      ArrowLeft: 'kiri', KeyA: 'kiri',
      ArrowRight: 'kanan', KeyD: 'kanan',
      ArrowUp: 'atas', KeyW: 'atas',
      ArrowDown: 'bawah', KeyS: 'bawah'
    };
    window.addEventListener('keydown', (e) => {
      const arah = peta[e.code];
      if (!arah || isiFormAktif()) return;
      this.tombol.add(arah);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const arah = peta[e.code];
      if (arah) this.tombol.delete(arah);
    });
    window.addEventListener('blur', () => this.tombol.clear());

    if (elJoystick) this.pasangJoystick(elJoystick);
  }

  pasangJoystick(el) {
    const kenop = el.querySelector('.kenop');
    let idPointer = null;
    let pusat = { x: 0, y: 0 };
    let radius = 50;

    const gerak = (e) => {
      let dx = e.clientX - pusat.x;
      let dy = e.clientY - pusat.y;
      const jarak = Math.hypot(dx, dy);
      if (jarak > radius) { dx *= radius / jarak; dy *= radius / jarak; }
      kenop.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / radius;
      this.joy.y = -dy / radius;
    };
    const lepas = () => {
      idPointer = null;
      kenop.style.transform = '';
      this.joy.x = 0;
      this.joy.y = 0;
      el.classList.remove('ditekan');
    };

    el.addEventListener('pointerdown', (e) => {
      idPointer = e.pointerId;
      const r = el.getBoundingClientRect();
      pusat = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      radius = r.width * 0.38;
      try { el.setPointerCapture(e.pointerId); } catch { /* sebagian browser lama */ }
      el.classList.add('ditekan');
      gerak(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === idPointer) gerak(e); });
    el.addEventListener('pointerup', lepas);
    el.addEventListener('pointercancel', lepas);

    // Tampilkan joystick pada perangkat sentuh
    const tampilkan = () => document.body.classList.add('pakai-sentuh');
    if (window.matchMedia('(pointer: coarse)').matches) tampilkan();
    window.addEventListener('touchstart', tampilkan, { once: true, passive: true });
  }

  /** Arah gabungan keyboard + joystick */
  arah() {
    if (!this.aktif) return { x: 0, y: 0 };
    let x = this.joy.x;
    let y = this.joy.y;
    if (this.tombol.has('kiri')) x -= 1;
    if (this.tombol.has('kanan')) x += 1;
    if (this.tombol.has('atas')) y += 1;
    if (this.tombol.has('bawah')) y -= 1;
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  reset() {
    this.tombol.clear();
    this.joy.x = 0;
    this.joy.y = 0;
  }
}

function isiFormAktif() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
}
