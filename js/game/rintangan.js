import * as THREE from 'three';
import { buatPesawatBawaan } from './pesawat.js';
import { tabrakKotak } from './collision.js';
import { KESULITAN } from './rute.js';

// =====================================================================
//  RINTANGAN — semua posisi dalam koordinat rute (s maju, x kanan, y tinggi).
//  Setiap rintangan selalu menyisakan celah yang bisa dilewati.
// =====================================================================

const lambert = (color, ekstra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...ekstra });
const antara = (rng, a, b) => a + rng() * (b - a);
const JARAK_LINTAS = 34; // pesawat melintas mulai sejauh ini dari titik potong jalurnya
const WARNA_PESAWAT = [[0x1d4ed8, 0xdbeafe], [0x16a34a, 0xf0fdf4], [0xf97316, 0xfff7ed], [0x7c3aed, 0xf5f3ff], [0xdb2777, 0xfdf2f8], [0x0891b2, 0xecfeff]];

let teksturBahaya = null;
function teksturGaris() {
  if (teksturBahaya) return teksturBahaya;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#facc15'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#111827';
  for (let i = -32; i < 160; i += 32) {
    g.beginPath(); g.moveTo(i, 32); g.lineTo(i + 16, 32); g.lineTo(i + 32, 0); g.lineTo(i + 16, 0); g.fill();
  }
  teksturBahaya = new THREE.CanvasTexture(c);
  teksturBahaya.colorSpace = THREE.SRGBColorSpace;
  teksturBahaya.wrapS = teksturBahaya.wrapT = THREE.RepeatWrapping;
  return teksturBahaya;
}

class Rintangan {
  constructor(o) {
    Object.assign(this, { kecepatan: 0, gerak: 'diam', aktif: false, t: 0, hadapBalik: false, putar: 0 }, o);
    this.awal = { s: this.s, x: this.x, y: this.y };
    this.sLama = this.s;
    this.reset();
  }

  reset() {
    this.aktif = false;
    this.diperingatkan = false;
    this.t = 0;
    if (this.gerak === 'lawan') this.s = this.awal.s + this.kecepatan * 7; // bertemu pemain kira-kira di awal.s
    else if (this.gerak === 'lintas') { this.s = this.awal.s; this.x = this.awal.x - this.arahLintas * JARAK_LINTAS; }
    else if (this.gerak === 'jatuh') { this.s = this.awal.s + 45; this.y = 55; }
    else this.s = this.awal.s;
    if (this.gerak !== 'lintas') this.x = this.awal.x;
    if (this.gerak !== 'jatuh') this.y = this.awal.y;
    this.sLama = this.s;
    this.mesh.visible = true;
    if (this.ekor) this.ekor.visible = true;
  }

  update(dt, sPemain, rute) {
    this.sLama = this.s;
    if (this.gerak === 'lawan') {
      if (!this.aktif && sPemain >= this.awal.s - 210) this.aktif = true;
      if (this.aktif) {
        this.t += dt;
        this.s -= this.kecepatan * dt;
        if (this.goyang) this.x = this.awal.x + Math.sin(this.t * 1.6) * this.goyang;
      }
    } else if (this.gerak === 'lintas') {
      // Melintas menyamping: mulai bergerak agar memotong jalur kira-kira saat pemain tiba
      if (!this.aktif && sPemain >= this.awal.s - this.jarakPicu) this.aktif = true;
      if (this.aktif) {
        this.t += dt;
        this.x += this.arahLintas * this.kecepatan * dt;
        if (Math.abs(this.x - this.awal.x) > JARAK_LINTAS + 8) this.mesh.visible = false;
      }
    } else if (this.gerak === 'searah') {
      // Terbang searah tetapi lebih lambat → harus disalip
      if (!this.aktif && sPemain >= this.awal.s - 160) this.aktif = true;
      if (this.aktif) {
        this.t += dt;
        this.s += this.kecepatan * dt;
        if (this.goyang) this.y = this.awal.y + Math.sin(this.t * 1.3) * this.goyang;
      }
    } else if (this.gerak === 'jatuh') {
      if (!this.aktif && sPemain >= this.awal.s - 210) this.aktif = true;
      if (this.aktif && this.t < 1.6) {
        this.t = Math.min(1.6, this.t + dt);
        const k = this.t / 1.6;
        this.s = this.awal.s + 45 * (1 - k);
        this.y = 55 + (this.awal.y - 55) * k * k;
        if (this.t >= 1.6 && this.ekor) this.ekor.visible = false;
      }
    }
    rute.posisi(this.s, this.x, this.yMesh ?? this.y, this.mesh.position);
    this.mesh.rotation.y = rute.arah(this.s) + (this.hadapBalik ? Math.PI : 0) + (this.rotY || 0);
    if (this.putar) { this.inti.rotation.x += this.putar * dt; this.inti.rotation.z += this.putar * 0.7 * dt; }
    if (this.lampu) this.lampu.visible = Math.floor((this.t + this.awal.s) * 4) % 2 === 0;
  }

  tabrak(pemain) {
    if (!this.mesh.visible) return false;
    if (this.gerak === 'jatuh' && this.y > 14) return false;
    return tabrakKotak(pemain, this);
  }

  /** Teks peringatan bila benda bergerak mendekat. */
  peringatan(sPemain) {
    if (this.gerak === 'diam' || !this.aktif) return null;
    const d = this.s - sPemain;
    if (this.gerak === 'lintas') return d > 0 ? this.nama : null;
    return d > 0 && d < 230 ? this.nama : null;
  }

  hapus(scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map !== teksturBahaya) o.material.dispose();
    });
  }
}

// ---------------------------------------------------------------------
//  Pembuat mesh
// ---------------------------------------------------------------------
function meshTiang(tema) {
  const g = new THREE.Group();
  if (tema === 'gurun') {
    const batu = new THREE.Mesh(new THREE.BoxGeometry(1.8, 15, 1.8), lambert(0xc6904d));
    batu.position.y = 7.5;
    const puncak = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 4), lambert(0xe0b36b));
    puncak.position.y = 16.1; puncak.rotation.y = Math.PI / 4;
    g.add(batu, puncak);
  } else {
    const merah = lambert(0xdc2626);
    const putih = lambert(0xf8fafc);
    const geo = new THREE.CylinderGeometry(0.75, 0.85, 2, 8);
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(geo, i % 2 ? putih : merah);
      m.position.y = 1 + i * 2;
      g.add(m);
    }
    const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    lampu.position.y = 16.5;
    g.add(lampu);
  }
  return g;
}

function meshPalang(tema, yBawah, yAtas) {
  const g = new THREE.Group();
  const tinggi = yAtas - yBawah;
  const tekstur = teksturGaris().clone();
  tekstur.needsUpdate = true;
  tekstur.repeat.set(7, 1);
  const warnaTint = tema === 'langit' ? 0xe0f2fe : tema === 'gurun' ? 0xffe2b0 : 0xffffff;
  const matDepan = new THREE.MeshLambertMaterial({ map: tekstur, color: warnaTint });
  const balok = new THREE.Mesh(new THREE.BoxGeometry(28, tinggi, 2.4), matDepan);
  balok.position.y = yBawah + tinggi / 2;
  g.add(balok);
  // Tiang penyangga di kedua sisi (di luar jalur)
  const matTiang = lambert(0x6b7280);
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, 16, 1.6), matTiang);
    t.position.set(sx * 14.6, 8, 0);
    g.add(t);
  }
  return g;
}

function meshPesawatLain([warna, badan], skala = 0.85) {
  const m = new THREE.Group();
  const p = buatPesawatBawaan(warna, badan);
  p.scale.setScalar(skala);
  m.add(p);
  const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  lampu.position.set(0, 0.9, 0);
  m.add(lampu);
  return { m, lampu };
}

function meshMeteor(r, ekorPanjang = 9) {
  const g = new THREE.Group();
  const inti = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lambert(0x7c2d12, { emissive: 0xc2410c, emissiveIntensity: 0.7 }));
  g.add(inti);
  const ekor = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.95, ekorPanjang, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: 0.55, depthWrite: false })
  );
  g.add(ekor);
  return { g, inti, ekor };
}

function meshUfo() {
  const g = new THREE.Group();
  const piring = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.6, 12), lambert(0x94a3b8));
  const kubah = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0x67e8f9, { emissive: 0x0e7490 }));
  kubah.position.y = 0.3;
  const lampu = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 4, 16), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
  lampu.rotation.x = Math.PI / 2;
  g.add(piring, kubah, lampu);
  return { g, lampu };
}

// ---------------------------------------------------------------------
//  Jenis rintangan per tema
// ---------------------------------------------------------------------
const PEMBUAT = {
  tiang(tema, rng, s) {
    return new Rintangan({ jenis: 'tiang', nama: 'Tiang', s, x: antara(rng, -8, 8), y: 8, hx: 0.85, hy: 8, hs: 0.85, mesh: meshTiang(tema), yMesh: 0 });
  },
  palangRendah(tema, rng, s) {
    // Dinding rendah 0–7,5 → harus NAIK dan terbang di atasnya
    return new Rintangan({ jenis: 'palang', nama: 'Palang', s, x: 0, y: 3.75, hx: 14, hy: 3.75, hs: 1.2, yMesh: 0, mesh: meshPalang(tema, 0, 7.5) });
  },
  palangTinggi(tema, rng, s) {
    // Palang tinggi 5,6–16 → harus TURUN dan terbang di bawahnya
    return new Rintangan({ jenis: 'palang', nama: 'Palang', s, x: 0, y: 10.8, hx: 14, hy: 5.2, hs: 1.2, yMesh: 0, mesh: meshPalang(tema, 5.6, 16) });
  },
  pesawat(tema, rng, s) {
    const { m, lampu } = meshPesawatLain(tema === 'langit' ? WARNA_PESAWAT[Math.floor(rng() * WARNA_PESAWAT.length)] : WARNA_PESAWAT[0]);
    return new Rintangan({
      jenis: 'pesawat', nama: '⚠ Pesawat dari depan!', s, x: antara(rng, -7, 7), y: antara(rng, 3, 10),
      hx: 2.0, hy: 0.6, hs: 1.6, gerak: 'lawan', kecepatan: 24, hadapBalik: true, mesh: m, lampu
    });
  },
  pesawatLintas(tema, rng, s) {
    const { m, lampu } = meshPesawatLain(WARNA_PESAWAT[Math.floor(rng() * WARNA_PESAWAT.length)]);
    const arahLintas = rng() < 0.5 ? 1 : -1; // +1: dari kiri ke kanan
    const kecepatan = antara(rng, 13, 18);
    // Saat pemain (±30 satuan/detik) tiba, pesawat sudah sampai di sekitar titik potong
    const jarakPicu = (JARAK_LINTAS / kecepatan) * 30 * antara(rng, 0.8, 1.15);
    return new Rintangan({
      jenis: 'pesawat', nama: arahLintas > 0 ? '⚠ Pesawat melintas dari KIRI!' : '⚠ Pesawat melintas dari KANAN!',
      s, x: antara(rng, -5, 5), y: antara(rng, 3, 10), hx: 1.6, hy: 0.6, hs: 2.0,
      gerak: 'lintas', arahLintas, kecepatan, jarakPicu, rotY: -arahLintas * Math.PI / 2, mesh: m, lampu
    });
  },
  pesawatSearah(tema, rng, s) {
    const { m, lampu } = meshPesawatLain(WARNA_PESAWAT[Math.floor(rng() * WARNA_PESAWAT.length)], 1.15);
    return new Rintangan({
      jenis: 'pesawat', nama: '⚠ Pesawat lambat di depan — salip!', s, x: antara(rng, -7, 7), y: antara(rng, 3, 10),
      hx: 2.4, hy: 0.7, hs: 1.9, gerak: 'searah', kecepatan: 9, goyang: 1.2, mesh: m, lampu
    });
  },
  ufo(tema, rng, s) {
    const { g, lampu } = meshUfo();
    return new Rintangan({
      jenis: 'ufo', nama: '⚠ UFO mendekat!', s, x: antara(rng, -6, 6), y: antara(rng, 3, 10),
      hx: 2.3, hy: 0.7, hs: 2.3, gerak: 'lawan', kecepatan: 20, goyang: 2.5, mesh: g, lampu
    });
  },
  meteor(tema, rng, s) {
    const r = antara(rng, 1.8, 2.6);
    const { g, inti, ekor } = meshMeteor(r);
    ekor.rotation.x = -Math.PI / 2;    // ekor melebar di dekat meteor, meruncing ke belakang
    ekor.position.z = -(9 / 2);
    return new Rintangan({
      jenis: 'meteor', nama: '⚠ Meteor!', s, x: antara(rng, -7, 7), y: antara(rng, 3, 9.5),
      hx: r * 0.8, hy: r * 0.8, hs: r * 0.8, gerak: 'lawan', kecepatan: 18, goyang: 1.5, putar: 2,
      mesh: g, inti, ekor
    });
  },
  meteorJatuh(tema, rng, s) {
    const r = 2.4;
    const { g, inti, ekor } = meshMeteor(r, 14);
    ekor.position.y = 7; // ekor ke atas saat jatuh
    return new Rintangan({
      jenis: 'meteor', nama: '⚠ Meteor jatuh!', s, x: antara(rng, -7, 7), y: r,
      hx: r * 0.85, hy: r * 0.85, hs: r * 0.85, gerak: 'jatuh', putar: 3, mesh: g, inti, ekor
    });
  },
  batu(tema, rng, s) {
    const r = antara(rng, 1.6, 2.8);
    const g = new THREE.Group();
    const inti = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), lambert(0x8d8d99));
    g.add(inti);
    return new Rintangan({
      jenis: 'batu', nama: 'Asteroid', s, x: antara(rng, -8, 8), y: antara(rng, 2.5, 9.5),
      hx: r * 0.8, hy: r * 0.8, hs: r * 0.8, putar: 0.6, mesh: g, inti
    });
  }
};

const JENIS_PER_TEMA = {
  kota: ['tiang', 'tiang', 'pesawat', 'pesawat', 'palangRendah', 'palangTinggi'],
  langit: ['pesawat', 'pesawat', 'pesawatLintas', 'pesawatLintas', 'pesawatLintas', 'pesawatSearah'],
  gurun: ['tiang', 'pesawat', 'meteorJatuh', 'meteorJatuh', 'palangRendah', 'palangTinggi']
};

/**
 * Membuat rintangan untuk satu blok rute (antara gerbang sebelumnya dan gerbang berikutnya).
 * Rintangan hanya diletakkan di bagian lurus, jauh dari belokan dan gerbang.
 */
export function buatRintanganBlok(scene, rute, blok, tema, kesulitan, rng = Math.random, zonaLarangan = []) {
  const cfg = KESULITAN[kesulitan] || KESULITAN.sedang;
  const langit = tema === 'langit';
  const jumlah = langit ? cfg.pesawatLangit : cfg.rintangan;
  const jarakMin = langit ? 58 : 65;
  const kandidat = [];
  for (let s = blok.sAwal + (blok.k === 0 ? 160 : 80); s < blok.sGerbang - 110; s += 5) {
    if (rute.diLurus(s, 45) && !zonaLarangan.some(([a, b]) => s > a && s < b)) kandidat.push(s);
  }
  for (let i = kandidat.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kandidat[i], kandidat[j]] = [kandidat[j], kandidat[i]];
  }
  const terpilih = [];
  for (const s of kandidat) {
    if (terpilih.length >= jumlah) break;
    if (terpilih.every((t) => Math.abs(t - s) >= jarakMin)) terpilih.push(s);
  }
  const daftarJenis = JENIS_PER_TEMA[tema] || JENIS_PER_TEMA.kota;
  return terpilih.sort((a, b) => a - b).map((s) => {
    const r = PEMBUAT[daftarJenis[Math.floor(rng() * daftarJenis.length)]](tema, rng, s);
    scene.add(r.mesh);
    r.update(0, -1e9, rute);
    return r;
  });
}
