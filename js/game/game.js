import * as THREE from 'three';
import { buatScene } from './scene.js';
import { Pesawat } from './pesawat.js';
import { Lintasan, DAFTAR_TEMA } from './tema.js';
import { Portal, PINTU } from './portal.js';
import { pintuPas } from './collision.js';
import { Kontrol } from './kontrol.js';
import { Efek } from './efek.js';
import { Rute } from './rute.js';
import { buatRintanganBlok } from './rintangan.js';

// Koordinat pesawat memakai koordinat RUTE: s (jarak maju), x (geser kanan +), y (tinggi).
const BATAS_X = 11;          // dinding lunak di bagian lurus
const BATAS_X_BELOK = 12.6;  // di tikungan, melewati batas ini = gagal berbelok → hancur
const Y_MIN = 1.7;
const Y_MAX = 11.2;
const KEC_SAMPING = 15;
const KEC_VERTIKAL = 12;
const GAYA_BELOK = 0.9;      // kekuatan "terlempar" ke sisi luar tikungan
const JARAK_BANNER = 170;    // "PILIH LINTASAN!" muncul
const JARAK_SINAR = 220;     // pintu mulai bersinar bila posisi pesawat pas
const LAMA_HANCUR = 1.9;     // detik animasi hancur sebelum muncul ulang
const LAMA_KEBAL = 2.2;      // detik kebal setelah muncul ulang
const BATAS_BANTUAN = 3;     // setelah 3x hancur di blok yang sama → rintangan blok itu dihapus

const LABEL_RINTANGAN = { tiang: 'tiang', palang: 'palang', pesawat: 'pesawat lain', ufo: 'UFO', meteor: 'meteor', batu: 'asteroid' };
const V = new THREE.Vector3();

/**
 * Mode:
 *  "demo"   : terbang otomatis (latar layar login/tunggu/hasil)
 *  "main"   : siswa mengendalikan pesawat
 *  "jeda"   : pesawat masuk pintu, menunggu jawaban soal
 *  "hancur" : pesawat meledak, sebentar lagi muncul di checkpoint terakhir
 */
export class Game {
  constructor(canvas, elJoystick, opsi = {}) {
    this.opsi = { kecepatan: 30, kualitas: 'otomatis', kesulitan: 'sedang', ...opsi };
    Object.assign(this, buatScene(canvas, this.opsi.kualitas));

    this.rute = new Rute();
    this.rute.reset(this.opsi.kesulitan);
    this.pesawat = new Pesawat(this.scene);
    this.lintasan = new Lintasan(this.scene, this.hemi, this.matahari, this.rute);
    this.kontrol = new Kontrol(elJoystick);
    this.efek = new Efek(this.scene);

    this.mode = 'demo';
    this.s = 0;
    this.x = 0;
    this.y = 6.5;
    this.vel = { x: 0, y: 0 };
    this.boost = 1;
    this.goyang = 0;
    this.waktu = 0;
    this.kebal = 0;
    this.tHancur = 0;
    this.portal = null;
    this.portalLama = [];
    this.rintangan = [];
    this.kBlok = 0;
    this.sCheckpoint = 0;
    this.tabrakanBlok = 0;
    this.bantuan = false;
    this.bannerTampil = false;
    this.bahayaTerakhir = null;
    this.cb = {};
    for (const n of ['pintu', 'banner', 'kilat', 'tema', 'hancur', 'muncul', 'belok', 'jarak', 'bahaya', 'bantuan']) this.cb[n] = () => {};

    this.jam = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  on(nama, fn) { this.cb[nama] = fn; }

  get tema() { return this.lintasan.nama; }

  setTema(nama) {
    this.lintasan.setTema(nama, this.s);
    this.cb.tema(nama);
  }

  temaBerikutnya() {
    const i = DAFTAR_TEMA.indexOf(this.tema);
    return DAFTAR_TEMA[(i + 1) % DAFTAR_TEMA.length];
  }

  async muatModel(url, skala, rotasiY) {
    await this.pesawat.muatModel(url, skala, rotasiY);
  }

  /** Memulai perjalanan baru dari awal rute. */
  mulai({ kesulitan } = {}) {
    if (kesulitan) this.opsi.kesulitan = kesulitan;
    this.bersihkan();
    this.rute.reset(this.opsi.kesulitan);
    this.lintasan.resetRute();
    this.s = 0;
    this.x = 0;
    this.y = 6.5;
    this.vel = { x: 0, y: 0 };
    this.boost = 1;
    this.kebal = 0;
    this.kBlok = 0;
    this.sCheckpoint = 5;
    this.setTema(this.tema || 'kota');
    this.siapkanBlok(this.tema);
    this.mode = 'main';
    this.pesawat.root.visible = true;
    this.kontrol.reset();
    this.snapKamera();
  }

  /** Membuat gerbang & rintangan untuk blok (soal) berikutnya. */
  siapkanBlok(namaTema) {
    const blok = this.rute.ambilBlok(this.kBlok);
    this.tabrakanBlok = 0;
    this.bantuan = false;
    this.portal = new Portal(this.scene, this.rute.posisi(blok.sGerbang, 0, 0, new THREE.Vector3()), this.rute.arah(blok.sGerbang));
    this.portal.s = blok.sGerbang;
    this.rintangan = buatRintanganBlok(this.scene, this.rute, blok, namaTema, this.opsi.kesulitan);
  }

  /** Dipanggil setelah soal dijawab. adaLagi = masih ada soal berikutnya. */
  lanjut(benar, adaLagi) {
    const p = this.pesawat.posisi;
    let temaBaru = this.tema;
    if (benar) {
      this.efek.ledakan(p.clone(), { warna: [0xffd23f, 0xef4444, 0x3b82f6, 0x22c55e, 0xffffff], jumlah: 160, kecepatan: 18 });
      this.boost = 1.8;
      temaBaru = this.temaBerikutnya();
      this.cb.kilat();
      setTimeout(() => this.setTema(temaBaru), 180);
    } else {
      this.efek.ledakan(p.clone(), { warna: [0x555555, 0x888888, 0x333333], jumlah: 60, kecepatan: 6, gravitasi: -2, ukuran: 0.9 });
      this.goyang = 0.6;
    }
    this.sCheckpoint = this.portal.s + 6; // gerbang ini menjadi checkpoint
    this.portalLama.push(this.portal);
    this.portal = null;
    this.hapusRintangan();
    this.kBlok++;
    this.mode = 'main';
    if (adaLagi) this.siapkanBlok(temaBaru);
  }

  /** Kembali ke mode demo (selesai / keluar). */
  akhiri() {
    this.mode = 'demo';
    if (this.portal) this.portalLama.push(this.portal);
    this.portal = null;
    this.hapusRintangan();
    this.pesawat.root.visible = true;
    this.kebal = 0;
    this.pesawat.kedip(false);
    this.setBanner(false);
    this.cb.belok(null);
    this.setBahaya(null);
  }

  hapusRintangan() {
    for (const r of this.rintangan) r.hapus(this.scene);
    this.rintangan = [];
  }

  bersihkan() {
    this.hapusRintangan();
    if (this.portal) this.portal.hapus();
    this.portal = null;
    for (const p of this.portalLama) p.hapus();
    this.portalLama = [];
  }

  setBanner(v) {
    if (v !== this.bannerTampil) {
      this.bannerTampil = v;
      this.cb.banner(v);
    }
  }

  setBahaya(teks) {
    if (teks !== this.bahayaTerakhir) {
      this.bahayaTerakhir = teks;
      this.cb.bahaya(teks);
    }
  }

  // ---------- Hancur & muncul ulang di checkpoint
  hancur(alasan) {
    if (this.mode !== 'main') return;
    this.mode = 'hancur';
    this.tHancur = LAMA_HANCUR;
    const p = this.pesawat.posisi.clone();
    this.efek.ledakan(p, { warna: [0xff5a00, 0xffd23f, 0xff2200, 0xffffff], jumlah: 220, kecepatan: 20, umur: 1.4, ukuran: 0.7 });
    this.efek.ledakan(p, { warna: [0x333333, 0x555555, 0x222222], jumlah: 80, kecepatan: 7, gravitasi: -3, umur: 1.8, ukuran: 1.3 });
    this.pesawat.root.visible = false;
    this.goyang = 1.1;
    this.setBanner(false);
    this.setBahaya(null);
    this.tabrakanBlok++;
    let bantuanBaru = false;
    if (this.tabrakanBlok >= BATAS_BANTUAN && !this.bantuan) {
      this.bantuan = true;
      bantuanBaru = true;
      this.hapusRintangan();
    }
    this.cb.hancur(alasan, this.tabrakanBlok);
    if (bantuanBaru) this.cb.bantuan();
  }

  muncul() {
    this.s = this.sCheckpoint;
    this.x = 0;
    this.y = 6.5;
    this.vel = { x: 0, y: 0 };
    this.boost = 1;
    for (const r of this.rintangan) r.reset();
    this.pesawat.root.visible = true;
    this.kebal = LAMA_KEBAL;
    this.mode = 'main';
    this.snapKamera();
    this.cb.muncul();
  }

  posisiKamera(out, lihat) {
    this.rute.posisi(this.s - 9.5, this.x * 0.55, this.y + 2.7, out);
    if (lihat) this.rute.posisi(this.s + 14, this.x * 0.7, this.y + 0.6, lihat);
  }

  snapKamera() {
    this.posisiKamera(this.kamera.position);
  }

  frame() {
    const dt = Math.min(this.jam.getDelta(), 0.05);
    this.waktu += dt;
    const sLama = this.s;
    const main = this.mode === 'main';
    const bergerak = main || this.mode === 'demo';
    const kec = this.opsi.kecepatan * this.boost;

    if (bergerak) {
      this.boost += (1 - this.boost) * Math.min(1, dt * 0.9);
      this.s += kec * dt;
    }

    // --- Kendali
    let tx = 0;
    let ty = 0;
    if (main) {
      const a = this.kontrol.arah();
      tx = a.x * KEC_SAMPING;
      ty = a.y * KEC_VERTIKAL;
    } else if (this.mode === 'demo') {
      tx = (Math.sin(this.waktu * 0.45) * 4 - this.x) * 1.5;
      ty = (6.5 + Math.sin(this.waktu * 0.7) * 2.2 - this.y) * 1.5;
    }
    const k = Math.min(1, dt * 8);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.y += (ty - this.vel.y) * k;

    if (bergerak) {
      this.x += this.vel.x * dt;
      this.y += this.vel.y * dt;
      const kap = this.rute.kelengkungan(this.s);
      // Di tikungan pesawat terdorong ke sisi luar → siswa harus menahan arah belokan
      if (main) this.x += kap * kec * kec * GAYA_BELOK * dt;
      if (main && kap !== 0 && Math.abs(this.x) > BATAS_X_BELOK) {
        this.hancur('Gagal berbelok! Pesawat keluar jalur.');
      } else if ((kap === 0 || !main) && Math.abs(this.x) > BATAS_X) {
        this.x = Math.sign(this.x) * BATAS_X;
        this.vel.x = 0;
      }
      if (this.y < Y_MIN || this.y > Y_MAX) { this.y = THREE.MathUtils.clamp(this.y, Y_MIN, Y_MAX); this.vel.y = 0; }
    }

    // --- Rintangan
    const pemain = { s: this.s, sLama, x: this.x, y: this.y };
    let bahaya = null;
    for (const r of this.rintangan) {
      r.update(dt, this.s, this.rute);
      if (this.mode === 'main' && this.kebal <= 0 && r.tabrak(pemain)) {
        this.hancur(`Pesawat menabrak ${LABEL_RINTANGAN[r.jenis] || 'rintangan'}!`);
      }
      if (!bahaya && this.mode === 'main') bahaya = r.peringatan(this.s);
    }
    if (this.mode === 'main' || this.mode === 'demo') this.setBahaya(bahaya);

    // --- Gerbang
    if (this.portal) {
      const jarak = this.portal.s - this.s;
      const tol = this.bantuan ? 0.7 : 0;
      const pas = this.mode === 'main' && jarak > 0 && jarak < JARAK_SINAR ? pintuPas(this.x, this.y, tol) : -1;
      this.portal.update(dt, pas);
      this.setBanner(this.mode === 'main' && jarak > 0 && jarak < JARAK_BANNER);
      if (this.mode === 'main') this.cb.jarak(Math.max(0, jarak));
      if (this.mode === 'main' && sLama < this.portal.s && this.s >= this.portal.s) {
        const i = pintuPas(this.x, this.y, tol);
        if (i >= 0) {
          this.s = this.portal.s;
          this.mode = 'jeda';
          this.portal.sorot(i);
          this.setBanner(false);
          this.setBahaya(null);
          this.rute.posisi(this.s, PINTU[i].x, PINTU[i].y, V);
          this.efek.ledakan(V.clone(), { warna: [PINTU[i].warna, 0xffffff], jumlah: 70, kecepatan: 10 });
          this.cb.pintu(i);
        } else {
          this.hancur('Pesawat tidak pas masuk pintu gerbang!');
        }
      }
    } else {
      this.setBanner(false);
    }
    for (let i = this.portalLama.length - 1; i >= 0; i--) {
      const pl = this.portalLama[i];
      pl.update(dt);
      if (this.s > pl.s + 40 || this.mode === 'demo' && this.s > pl.s + 5) { pl.hapus(); this.portalLama.splice(i, 1); }
    }

    // --- Info tikungan untuk HUD
    this.cb.belok(this.mode === 'main' ? this.rute.belokanDepan(this.s, 190) : null);

    // --- Hancur & kebal
    if (this.mode === 'hancur') {
      this.tHancur -= dt;
      if (this.tHancur <= 0) this.muncul();
    }
    if (this.kebal > 0) this.kebal = Math.max(0, this.kebal - dt);
    this.pesawat.kedip(this.kebal > 0);

    // --- Pesawat di dunia
    const p = this.pesawat.posisi;
    this.rute.posisi(this.s, this.x, this.y, p);
    this.pesawat.root.rotation.y = this.rute.arah(this.s) - this.vel.x * 0.012;
    const diam = this.mode === 'jeda' || this.mode === 'hancur';
    this.pesawat.animasi(dt, diam ? 0 : this.vel.x, diam ? 0 : this.vel.y);

    // --- Kamera
    const kam = this.kamera;
    const tujuan = new THREE.Vector3();
    const lihat = new THREE.Vector3();
    this.posisiKamera(tujuan, lihat);
    kam.position.lerp(tujuan, 1 - Math.exp(-dt * 6));
    if (this.goyang > 0) {
      this.goyang = Math.max(0, this.goyang - dt);
      kam.position.x += (Math.random() - 0.5) * this.goyang;
      kam.position.y += (Math.random() - 0.5) * this.goyang;
    }
    kam.lookAt(lihat);
    this.matahari.position.set(p.x + 30, 60, p.z + 20);
    this.matahari.target.position.set(p.x, 0, p.z);

    this.efek.update(dt);
    this.lintasan.update(this.s, dt, kam.position);
    this.renderer.render(this.scene, kam);
    this.pantauKinerja(dt);
  }
}
