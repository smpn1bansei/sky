import { suara } from '../game/audio.js';

const LABEL = ['A', 'B', 'C', 'D'];
const TOMBOL_KEYBOARD = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 };

/** Modal soal pilihan ganda A–D dengan timer. */
export class ModalSoal {
  constructor() {
    this.el = document.getElementById('modal-soal');
    this.nomor = this.el.querySelector('.nomor-soal');
    this.teks = this.el.querySelector('.teks-soal');
    this.gambar = this.el.querySelector('.gambar-soal');
    this.opsiEl = this.el.querySelector('.opsi');
    this.timerTeks = this.el.querySelector('.timer-teks');
    this.timerBar = this.el.querySelector('.timer-isi');
    this.status = this.el.querySelector('.status-jawab');
    this.kartu = this.el.querySelector('.kartu-soal');
    this.selesaikan = null;

    window.addEventListener('keydown', (e) => {
      if (!this.selesaikan || e.repeat) return;
      if (performance.now() - this.waktuBuka < 600) return; // hindari tombol WASD yang masih ditekan
      const i = TOMBOL_KEYBOARD[e.code];
      if (i !== undefined && this.tombol[i]) {
        e.preventDefault();
        this.pilih(i);
      }
    });
  }

  /**
   * @returns Promise<{ pilihan: 'a'|'b'|'c'|'d'|'-', durasi, sisa, habis }>
   */
  tampilkan({ nomor, total, teks, gambar, opsi, waktu, sisa, warna }) {
    this.opsi = opsi;
    this.nomor.textContent = `Soal ${nomor} dari ${total}`;
    this.teks.textContent = teks;
    if (gambar) {
      this.gambar.src = gambar;
      this.gambar.hidden = false;
    } else {
      this.gambar.hidden = true;
      this.gambar.removeAttribute('src');
    }
    this.kartu.style.setProperty('--warna-pintu', warna || '#3b82f6');
    this.status.textContent = '';
    this.status.className = 'status-jawab';
    this.opsiEl.innerHTML = '';
    this.tombol = opsi.map((o, i) => {
      const b = document.createElement('button');
      b.className = `opsi-btn opsi-${i}`;
      b.innerHTML = `<span class="huruf">${LABEL[i]}</span><span class="isi"></span>`;
      b.querySelector('.isi').textContent = o.teks;
      b.addEventListener('click', () => this.pilih(i));
      this.opsiEl.appendChild(b);
      return b;
    });
    this.el.classList.add('aktif');
    this.waktuBuka = performance.now();

    this.waktu = waktu;
    this.batas = performance.now() + sisa * 1000;
    this.detikTerakhir = Math.ceil(sisa);
    return new Promise((resolve) => {
      this.selesaikan = resolve;
      this.jalankanTimer();
    });
  }

  jalankanTimer() {
    cancelAnimationFrame(this.raf);
    const putar = () => {
      if (!this.selesaikan) return;
      const sisa = Math.max(0, (this.batas - performance.now()) / 1000);
      const detik = Math.ceil(sisa);
      this.timerTeks.textContent = detik;
      this.timerBar.style.transform = `scaleX(${sisa / this.waktu})`;
      this.el.classList.toggle('kritis', sisa <= 5);
      if (detik !== this.detikTerakhir) {
        this.detikTerakhir = detik;
        if (detik <= 5 && detik > 0) suara.tik();
      }
      if (sisa <= 0) {
        this.akhiri('-', 0, true);
        return;
      }
      this.raf = requestAnimationFrame(putar);
    };
    putar();
  }

  pilih(i) {
    if (!this.selesaikan) return;
    suara.klik();
    this.tombol[i].classList.add('dipilih');
    const sisa = Math.max(0, (this.batas - performance.now()) / 1000);
    this.akhiri(this.opsi[i].kunci, sisa, false);
  }

  akhiri(pilihan, sisa, habis) {
    const resolve = this.selesaikan;
    this.selesaikan = null;
    cancelAnimationFrame(this.raf);
    this.tombol.forEach((b) => (b.disabled = true));
    this.el.classList.remove('kritis');
    this.status.textContent = habis ? 'Waktu habis!' : 'Memeriksa jawaban…';
    this.lambat = setTimeout(() => {
      this.status.textContent = 'Menunggu koneksi internet…';
    }, 4000);
    resolve({ pilihan, sisa, habis, durasi: Math.round((this.waktu - sisa) * 10) / 10 });
  }

  /** Menampilkan hasil sejenak lalu resolve. */
  async tampilkanHasil(benar, habis, poin, combo = 0) {
    clearTimeout(this.lambat);
    if (benar) {
      this.status.textContent = combo >= 2 ? `BENAR! +${poin} · COMBO ×${combo} 🔥` : `BENAR! +${poin}`;
      this.status.className = 'status-jawab benar';
    } else {
      this.status.textContent = habis ? 'Waktu habis — tidak dapat poin' : 'Jawaban belum tepat';
      this.status.className = 'status-jawab salah';
    }
    const dipilih = this.tombol.find((b) => b.classList.contains('dipilih'));
    if (dipilih) dipilih.classList.add(benar ? 'benar' : 'salah');
    await new Promise((r) => setTimeout(r, 1300));
  }

  tutup() {
    clearTimeout(this.lambat);
    this.selesaikan = null;
    cancelAnimationFrame(this.raf);
    this.el.classList.remove('aktif', 'kritis');
  }
}
