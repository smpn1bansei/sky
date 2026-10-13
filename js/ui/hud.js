import { NAMA_TEMA } from '../game/tema.js';

/** HUD: nomor soal, skor, benar, tema, jarak gerbang, peringatan tikungan/bahaya, banner. */
export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = $('hud');
    this.soal = $('hud-soal');
    this.skor = $('hud-skor');
    this.benar = $('hud-benar');
    this.tema = $('hud-tema');
    this.jarak = $('hud-jarak');
    this.banner = $('banner');
    this.popup = $('popup-poin');
    this.belok = $('peringatan-belok');
    this.bahaya = $('peringatan-bahaya');
    this.hancur = $('banner-hancur');
    this.skorTampil = 0;
    this.teksBelok = '';
    this.teksJarak = '';
  }

  tampil(v) {
    this.el.classList.toggle('aktif', v);
    if (!v) { this.setBelok(null); this.setBahaya(null); this.sembunyikanHancur(); this.setBanner(false); }
  }

  perbarui(sesi) {
    const nomor = Math.min(sesi.indeks + 1, sesi.total);
    this.soal.textContent = `${nomor}/${sesi.total}`;
    this.benar.textContent = sesi.benar;
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

  setBanner(v) { this.banner.classList.toggle('aktif', v); }

  setJarak(m) {
    const t = `${Math.round(m)} m`;
    if (t !== this.teksJarak) { this.teksJarak = t; this.jarak.textContent = t; }
  }

  /** info = { arah: 1 kiri | -1 kanan, jarak, sedang } atau null */
  setBelok(info) {
    let t = '';
    if (info) {
      const kiri = info.arah > 0;
      t = info.sedang
        ? `${kiri ? '⟵ TAHAN KIRI' : 'TAHAN KANAN ⟶'}`
        : `${kiri ? '⟵ BELOKAN TAJAM KIRI' : 'BELOKAN TAJAM KANAN ⟶'} · ${Math.round(info.jarak)} m`;
    }
    if (t === this.teksBelok) return;
    this.teksBelok = t;
    this.belok.textContent = t;
    this.belok.classList.toggle('aktif', !!t);
    this.belok.classList.toggle('sedang', !!info?.sedang);
  }

  setBahaya(teks) {
    this.bahaya.textContent = teks || '';
    this.bahaya.classList.toggle('aktif', !!teks);
  }

  tampilkanHancur(alasan, catatan = 'Mengulang dari checkpoint terakhir…') {
    this.hancur.querySelector('.judul').textContent = 'PESAWAT HANCUR!';
    this.hancur.querySelector('.alasan').textContent = alasan;
    this.hancur.querySelector('.catatan').textContent = catatan;
    this.hancur.classList.add('aktif');
  }

  sembunyikanHancur() { this.hancur.classList.remove('aktif'); }

  tampilkanPoin(teks, benar = true) {
    this.popup.textContent = teks;
    this.popup.className = benar ? 'benar' : 'salah';
    void this.popup.offsetWidth;
    this.popup.classList.add('jalan');
  }
}
