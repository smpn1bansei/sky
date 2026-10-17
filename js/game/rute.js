import { acakBerseed } from '../util.js';

// =====================================================================
//  RUTE TERBANG
//  Rute dibangkitkan per "blok". Satu blok = satu soal:
//    lurus → belokan tajam → lurus → (belokan) → lurus panjang → GERBANG
//  Disimpan sebagai titik per 1 satuan jarak (s): posisi x,z, arah (θ) & kelengkungan (κ).
//  θ = 0 berarti menghadap -Z. κ > 0 = belok kiri, κ < 0 = belok kanan.
// =====================================================================

// durasiPeringatan: lama (detik) peringatan belokan/bahaya tampil di layar
// lurusLangit: panjang rute Langit (lurus tanpa belokan) · pesawatLangit: jumlah pesawat yang lewat
export const KESULITAN = {
  mudah: { belokan: [1, 1], jariJari: [120, 150], sudut: [45, 70], rintangan: 3, lurusAkhir: 400, durasiPeringatan: 4, lurusLangit: 820, pesawatLangit: 7 },
  sedang: { belokan: [1, 2], jariJari: [90, 115], sudut: [60, 90], rintangan: 5, lurusAkhir: 460, durasiPeringatan: 3, lurusLangit: 900, pesawatLangit: 10 },
  sulit: { belokan: [2, 2], jariJari: [68, 90], sudut: [75, 105], rintangan: 7, lurusAkhir: 520, durasiPeringatan: 2, lurusLangit: 980, pesawatLangit: 13 }
};

const JARAK_GERBANG_DARI_UJUNG = 90; // gerbang berada 90 satuan sebelum ujung blok

export class Rute {
  constructor() { this.reset(); }

  reset(kesulitan = 'sedang', seed = Math.floor(Math.random() * 1e9)) {
    this.kesulitan = KESULITAN[kesulitan] ? kesulitan : 'sedang';
    this.cfg = KESULITAN[this.kesulitan];
    this.rng = acakBerseed(seed);
    this.X = [0];
    this.Z = [0];
    this.T = [0];
    this.K = [0];
    this.blok = [];
    this.belokan = [];
    this.modeLurus = false;
  }

  /**
   * Mengatur apakah blok-blok BERIKUTNYA lurus tanpa belokan (rute Langit).
   * Blok yang belum dicapai pesawat (dimulai setelah sSekarang) dibuang lalu dibuat ulang.
   * @returns true bila bentuk rute di depan berubah
   */
  aturLurus(lurus, sSekarang) {
    if (this.modeLurus === lurus) return false;
    this.modeLurus = lurus;
    const i = this.blok.findIndex((b) => b.sAwal > sSekarang);
    if (i < 0) return false;
    const potong = this.blok[i].sAwal;
    this.blok.length = i;
    for (const a of [this.X, this.Z, this.T, this.K]) a.length = potong + 1;
    this.belokan = this.belokan.filter((b) => b.sMulai < potong);
    return true;
  }

  get panjang() { return this.X.length - 1; }

  langkah(k) {
    const i = this.X.length - 1;
    const tMid = this.T[i] + k / 2;
    this.X.push(this.X[i] - Math.sin(tMid));
    this.Z.push(this.Z[i] - Math.cos(tMid));
    this.T.push(this.T[i] + k);
    this.K.push(k);
  }

  lurus(n) { for (let i = 0; i < n; i++) this.langkah(0); }

  belok(jariJari, sudut, arah) {
    const n = Math.round(jariJari * sudut);
    const sMulai = this.panjang;
    for (let i = 0; i < n; i++) this.langkah(arah / jariJari);
    const b = { sMulai, sAkhir: this.panjang, arah, jariJari };
    this.belokan.push(b);
    return b;
  }

  /** Membuat satu blok rute (dipanggil otomatis saat rute kurang panjang). */
  buatBlok() {
    const k = this.blok.length;
    const c = this.cfg;
    const r = this.rng;
    const antara = (a) => a[0] + r() * (a[1] - a[0]);
    const sAwal = this.panjang;
    this.lurus(k === 0 ? 260 : 160);
    if (this.modeLurus) {
      // Rute Langit: lurus saja, tantangannya pesawat-pesawat yang lewat
      this.lurus(c.lurusLangit);
      const blok = { k, sAwal, sAkhir: this.panjang, sGerbang: this.panjang - JARAK_GERBANG_DARI_UJUNG, belokan: [], lurus: true };
      this.blok.push(blok);
      return blok;
    }
    const jml = c.belokan[0] + Math.floor(r() * (c.belokan[1] - c.belokan[0] + 1));
    const belokan = [];
    for (let j = 0; j < jml; j++) {
      const t = this.T[this.panjang];
      // Arah belokan dipilih agar rute tidak berputar balik / memotong dirinya sendiri
      let arah = r() < 0.5 ? 1 : -1;
      if (t > 0.2) arah = -1;
      else if (t < -0.2) arah = 1;
      belokan.push(this.belok(antara(c.jariJari), (antara(c.sudut) * Math.PI) / 180, arah));
      this.lurus(Math.round(180 + r() * 100));
    }
    this.lurus(c.lurusAkhir);
    const blok = { k, sAwal, sAkhir: this.panjang, sGerbang: this.panjang - JARAK_GERBANG_DARI_UJUNG, belokan };
    this.blok.push(blok);
    return blok;
  }

  pastikan(s) {
    while (this.panjang < s + 2) this.buatBlok();
  }

  ambilBlok(k) {
    while (this.blok.length <= k) this.buatBlok();
    return this.blok[k];
  }

  /** Titik pada rute (interpolasi linear). */
  titik(s, out = {}) {
    s = Math.max(0, s);
    this.pastikan(s);
    const i = Math.floor(s);
    const f = s - i;
    out.x = this.X[i] + (this.X[i + 1] - this.X[i]) * f;
    out.z = this.Z[i] + (this.Z[i + 1] - this.Z[i]) * f;
    out.t = this.T[i] + (this.T[i + 1] - this.T[i]) * f;
    out.k = this.K[i + 1];
    return out;
  }

  /** Posisi dunia dari koordinat rute: s (maju), x (kanan +), y (tinggi). */
  posisi(s, x, y, out) {
    const p = this.titik(s, this._tmp || (this._tmp = {}));
    out.set(p.x + Math.cos(p.t) * x, y, p.z - Math.sin(p.t) * x);
    return out;
  }

  arah(s) { return this.titik(s, this._tmp2 || (this._tmp2 = {})).t; }

  kelengkungan(s) {
    this.pastikan(s);
    return this.K[Math.min(this.K.length - 1, Math.floor(s) + 1)];
  }

  /** Belokan berikutnya dalam jarak tertentu: { arah, jarak, sedang } atau null. */
  belokanDepan(s, jarak) {
    for (const b of this.belokan) {
      if (b.sAkhir < s) continue;
      if (b.sMulai > s + jarak) return null;
      return { arah: b.arah, jarak: Math.max(0, b.sMulai - s), sedang: s >= b.sMulai, b };
    }
    return null;
  }

  diLurus(s, margin = 0) {
    return !this.belokan.some((b) => s > b.sMulai - margin && s < b.sAkhir + margin);
  }

  /** Jarak terdekat titik dunia (px,pz) ke rute di sekitar sPusat. */
  jarakKeRute(px, pz, sPusat, rentang = 320) {
    const a = Math.max(0, Math.floor(sPusat - rentang));
    const b = Math.min(this.panjang, Math.floor(sPusat + rentang));
    let min = Infinity;
    for (let i = a; i <= b; i += 3) {
      const d = (this.X[i] - px) ** 2 + (this.Z[i] - pz) ** 2;
      if (d < min) min = d;
    }
    return Math.sqrt(min);
  }
}
