import { NAMA_TEMA } from '../game/tema.js';
import { PINTU } from '../game/portal.js';

const NAMA_WARNA = ['MERAH', 'BIRU', 'KUNING', 'HIJAU'];

/** HUD permainan: skor, progres, peringatan, banner tantangan, hitung mundur, efek mentok. */
export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = $('hud');
    this.soal = $('hud-soal');
    this.skor = $('hud-skor');
    this.benar = $('hud-benar');
    this.tema = $('hud-tema');
    this.cincin = $('hud-cincin');
    this.combo = $('hud-combo');
    this.progres = $('hud-progres-isi');
    this.banner = $('banner');
    this.popup = $('popup-poin');
    this.popupKecil = $('popup-kecil');
    this.belok = $('peringatan-belok');
    this.bahaya = $('peringatan-bahaya');
    this.hancur = $('banner-hancur');
    this.hitungEl = $('hitung-mundur');
    this.mentokEl = $('mentok');
    this.skorTampil = 0;
    this.timer = {};
  }

  tampil(v) {
    this.el.classList.toggle('aktif', v);
    if (!v) {
      for (const el of [this.belok, this.bahaya]) el.classList.remove('aktif');
      this.sembunyikanHancur();
      this.setBanner(false);
      this.hitungEl.classList.remove('aktif');
    }
  }

  perbarui(sesi) {
    const nomor = Math.min(sesi.indeks + 1, sesi.total);
    this.soal.textContent = `${nomor}/${sesi.total}`;
    this.benar.textContent = sesi.benar;
    this.cincin.textContent = sesi.stat?.cincin ?? 0;
    this.setCombo(sesi.combo || 0);
    this.animasiSkor(sesi.skor);
  }

  animasiSkor(target) {
    const awal = this.skorTampil;
    const mulai = performance.now();
    const langkah = (t) => {
      const k = Math.min(1, (t - mulai) / 600);
      this.skorTampil = Math.round(awal + (target - awal) * k);
      this.skor.textContent = this.skorTampil.toLocaleString('id-ID');
      if (k < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  }

  setTema(nama) { this.tema.textContent = NAMA_TEMA[nama] || nama; }

  setCincin(n) {
    this.cincin.textContent = n;
    this.cincin.parentElement.classList.remove('denyut');
    void this.cincin.offsetWidth;
    this.cincin.parentElement.classList.add('denyut');
  }

  setCombo(n) {
    this.combo.textContent = n >= 2 ? `COMBO ×${n}` : '';
    this.combo.classList.toggle('aktif', n >= 2);
  }

  /** Bilah progres menuju gerbang (tanpa angka jarak). */
  setProgres(sisa, total) {
    const p = total > 0 ? Math.min(1, Math.max(0, 1 - sisa / total)) : 0;
    this.progres.style.transform = `scaleX(${p})`;
  }

  /**
   * Banner tantangan pintu (efek Stroop): KATA warna ditulis dengan TINTA warna lain.
   * Siswa harus memilih pintu sesuai KATA → melatih fokus & kontrol diri.
   */
  setBanner(v, tantangan) {
    if (v && tantangan) {
      const kata = this.banner.querySelector('.kata');
      kata.textContent = NAMA_WARNA[tantangan.kata];
      kata.style.color = PINTU[tantangan.tinta].css;
    }
    this.banner.classList.toggle('aktif', v);
  }

  /** Peringatan tampil SEKALI selama `durasi` detik (mudah 4, sedang 3, sulit 2). */
  peringatan(jenis, teks, durasi) {
    const el = jenis === 'belok' ? this.belok : this.bahaya;
    el.textContent = teks;
    el.classList.remove('aktif');
    void el.offsetWidth;
    el.classList.add('aktif');
    clearTimeout(this.timer[jenis]);
    this.timer[jenis] = setTimeout(() => el.classList.remove('aktif'), durasi * 1000);
  }

  hitung(n) {
    const el = this.hitungEl;
    el.textContent = n > 0 ? n : 'TERBANG!';
    el.classList.toggle('mulai', n === 0);
    el.classList.remove('aktif');
    void el.offsetWidth;
    el.classList.add('aktif');
    clearTimeout(this.timer.hitung);
    if (n === 0) this.timer.hitung = setTimeout(() => el.classList.remove('aktif'), 700);
  }

  /** Efek tepi layar menyala saat pesawat tertahan di batas jalur. */
  mentok(sisi) {
    const el = this.mentokEl;
    el.dataset.sisi = sisi;
    el.classList.remove('aktif');
    void el.offsetWidth;
    el.classList.add('aktif');
  }

  tampilkanHancur(alasan, catatan = 'Mengulang dari checkpoint terakhir…') {
    this.hancur.querySelector('.alasan').textContent = alasan;
    this.hancur.querySelector('.catatan').textContent = catatan;
    this.hancur.classList.add('aktif');
    for (const el of [this.belok, this.bahaya]) el.classList.remove('aktif');
  }

  sembunyikanHancur() { this.hancur.classList.remove('aktif'); }

  tampilkanPoin(teks, benar = true) {
    this.popup.textContent = teks;
    this.popup.className = benar ? 'benar' : 'salah';
    void this.popup.offsetWidth;
    this.popup.classList.add('jalan');
  }

  tampilkanPoinKecil(teks, jenis = 'cincin') {
    this.popupKecil.textContent = teks;
    this.popupKecil.className = jenis;
    void this.popupKecil.offsetWidth;
    this.popupKecil.classList.add('jalan');
  }
}
