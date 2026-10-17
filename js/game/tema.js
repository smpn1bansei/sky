import * as THREE from 'three';
import { buatPesawatBawaan } from './pesawat.js';

// =====================================================================
//  TEMA & DUNIA DI SEPANJANG RUTE
//  Dekorasi diletakkan relatif terhadap rute (jarak s + geser samping) dan
//  didaur ulang ke depan → jumlah objek tetap sedikit (ringan untuk Chromebook).
// =====================================================================

export const DAFTAR_TEMA = ['kota', 'langit', 'gurun'];
export const NAMA_TEMA = { kota: 'Kota', langit: 'Langit', gurun: 'Gurun' };

const PANJANG_DEK = 760;   // rentang dekorasi di sekitar pesawat
const BELAKANG = 60;       // dekorasi sejauh ini di belakang pesawat dipindah ke depan
const PITA_SEG = 120;      // panjang satu potongan jalan
const UKURAN_TANAH = 2400;
export const TEPI_JALUR = 14.5; // posisi papan chevron (sisi luar tikungan)

const DEFINISI = {
  kota: {
    langitAtas: 0x2f80d8, langitBawah: 0xcfe9ff, kabut: 0xcfe9ff, kabutDekat: 90, kabutJauh: 460,
    hemiAtas: 0xffffff, hemiBawah: 0x5b6b7a, hemiKuat: 1.5, matahari: 0xfff2d6, matahariKuat: 1.8,
    warnaTanah: 0x6f8f5a
  },
  langit: {
    langitAtas: 0x1f8ef1, langitBawah: 0xc4e6ff, kabut: 0xc9e7ff, kabutDekat: 180, kabutJauh: 720,
    hemiAtas: 0xffffff, hemiBawah: 0xa9cdef, hemiKuat: 1.9, matahari: 0xfffaf0, matahariKuat: 1.6
  },
  gurun: {
    langitAtas: 0xe9773f, langitBawah: 0xffdca3, kabut: 0xffd9a0, kabutDekat: 90, kabutJauh: 460,
    hemiAtas: 0xfff1d6, hemiBawah: 0x9c6b3c, hemiKuat: 1.5, matahari: 0xffe0b0, matahariKuat: 2.0,
    warnaTanah: 0xe2b56f
  }
};

const lambert = (color, ekstra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...ekstra });
const antara = (a, b) => a + Math.random() * (b - a);
const V = new THREE.Vector3();

export class Lintasan {
  constructor(scene, hemi, matahari, rute) {
    this.scene = scene;
    this.hemi = hemi;
    this.matahari = matahari;
    this.rute = rute;
    this.langit = buatLangit();
    scene.add(this.langit);
    this.grup = null;
    this.nama = null;
    this.pita = new Map();
    this.chevron = new Map();
    this.grupChevron = new THREE.Group();
    scene.add(this.grupChevron);
  }

  /** Dipanggil saat rute dibuat ulang (permainan baru). */
  resetRute() {
    for (const m of this.chevron.values()) this.buangObjek(m, this.grupChevron);
    this.chevron.clear();
    this.hapusPita();
  }

  setTema(nama, sAwal = 0) {
    const def = DEFINISI[nama] || DEFINISI.kota;
    this.nama = nama;
    this.def = def;
    if (this.grup) this.hapusGrup();
    this.hapusPita();

    warnaiLangit(this.langit, def.langitAtas, def.langitBawah);
    this.scene.fog = new THREE.Fog(def.kabut, def.kabutDekat, def.kabutJauh);
    this.scene.background = new THREE.Color(def.kabut);
    this.hemi.color.set(def.hemiAtas);
    this.hemi.groundColor.set(def.hemiBawah);
    this.hemi.intensity = def.hemiKuat;
    this.matahari.color.set(def.matahari);
    this.matahari.intensity = def.matahariKuat;

    this.grup = new THREE.Group();
    this.daur = [];        // dekorasi yang didaur ulang di sepanjang rute
    this.ikutKamera = [];  // objek yang selalu mengikuti kamera (bintang, matahari)
    this.putar = [];       // objek berputar
    this.tanah = null;
    this.matPita = null;
    this.scene.add(this.grup);

    if (nama === 'langit') bangunLangit(this);
    else if (nama === 'gurun') bangunGurun(this, def);
    else bangunKota(this, def);

    for (const o of this.daur) {
      o.userData.s = sAwal - BELAKANG + Math.random() * PANJANG_DEK;
      this.tempatkan(o);
    }
    this.update(sAwal, 0);
  }

  /** Meletakkan dekorasi di samping rute; dipindah/disembunyikan bila terlalu dekat jalur. */
  tempatkan(o) {
    const u = o.userData;
    for (let coba = 0; coba < 3; coba++) {
      const lat = u.sisi * antara(u.latMin, u.latMax);
      this.rute.posisi(u.s, lat, u.y, o.position);
      if (!u.aman || this.rute.jarakKeRute(o.position.x, o.position.z, u.s) >= u.aman) {
        o.visible = true;
        o.rotation.y = this.rute.arah(u.s) + (u.rotY || 0);
        return;
      }
      u.sisi *= -1;
    }
    o.visible = false;
  }

  update(sP, dt, posKamera) {
    const rute = this.rute;
    rute.pastikan(sP + PANJANG_DEK + 200);

    for (const o of this.daur) {
      if (o.userData.s < sP - BELAKANG) {
        o.userData.s += PANJANG_DEK;
        this.tempatkan(o);
      }
    }
    for (const a of this.putar) {
      a.rotation.x += a.userData.vx * dt;
      a.rotation.z += a.userData.vy * dt;
    }
    if (posKamera) {
      this.langit.position.copy(posKamera);
      for (const { obj, offset } of this.ikutKamera) obj.position.copy(posKamera).add(offset);
    }
    if (this.tanah) {
      rute.posisi(sP, 0, 0, V);
      const u = this.tanah.userData.ubin;
      this.tanah.position.set(Math.round(V.x / u) * u, this.tanah.userData.y || 0, Math.round(V.z / u) * u);
    }
    this.updatePita(sP);
    this.updateChevron(sP);
  }

  // ---------- Jalan / jejak berbentuk pita mengikuti rute
  updatePita(sP) {
    if (!this.matPita) return;
    const kMin = Math.max(0, Math.floor((sP - 80) / PITA_SEG));
    const kMax = Math.floor((sP + 700) / PITA_SEG);
    for (const [k, m] of this.pita) {
      if (k < kMin || k > kMax) { this.buangObjek(m, this.scene, false); this.pita.delete(k); }
    }
    for (let k = kMin; k <= kMax; k++) {
      if (this.pita.has(k)) continue;
      const m = buatPita(this.rute, k * PITA_SEG, PITA_SEG, this.lebarPita, this.matPita, this.ubinPita);
      this.scene.add(m);
      this.pita.set(k, m);
    }
  }

  hapusPita() {
    for (const m of this.pita.values()) this.buangObjek(m, this.scene, false);
    this.pita.clear();
  }

  // ---------- Papan chevron di sisi luar setiap tikungan
  updateChevron(sP) {
    for (const [b, g] of this.chevron) {
      if (b.sAkhir < sP - 40) { this.buangObjek(g, this.grupChevron); this.chevron.delete(b); }
    }
    for (const b of this.rute.belokan) {
      if (b.sMulai > sP + 600) break;
      if (b.sAkhir < sP - 40 || this.chevron.has(b)) continue;
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: teksturChevron(b.arah), side: THREE.DoubleSide });
      const matTiang = lambert(0x374151);
      const geoPapan = new THREE.PlaneGeometry(4, 2.6);
      const geoTiang = new THREE.BoxGeometry(0.25, 1, 0.25);
      for (let s = b.sMulai - 40; s <= b.sAkhir + 10; s += 13) {
        for (const y of [3.2, 9.4]) {
          const p = new THREE.Mesh(geoPapan, mat);
          this.rute.posisi(s, b.arah * TEPI_JALUR, y, p.position);
          p.rotation.y = this.rute.arah(s);
          g.add(p);
        }
        const t = new THREE.Mesh(geoTiang, matTiang);
        this.rute.posisi(s, b.arah * TEPI_JALUR, 0, t.position);
        t.scale.y = 12.6; t.position.y = 6.3;
        g.add(t);
      }
      this.grupChevron.add(g);
      this.chevron.set(b, g);
    }
  }

  buangObjek(obj, induk, buangMaterial = true) {
    induk.remove(obj);
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (buangMaterial && o.material && !o.material.userData?.dipakaiBersama) o.material.dispose();
    });
  }

  hapusGrup() {
    this.scene.remove(this.grup);
    this.grup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) { if (m.map) m.map.dispose(); m.dispose(); }
      }
    });
    if (this.matPita) { this.matPita.map?.dispose(); this.matPita.dispose(); }
    this.grup = null;
  }
}

// ---------------------------------------------------------------------
//  Bantuan
// ---------------------------------------------------------------------
function buatLangit() {
  const geo = new THREE.SphereGeometry(800, 16, 12);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -1;
  return m;
}

function warnaiLangit(langit, atas, bawah) {
  const pos = langit.geometry.attributes.position;
  const warna = langit.geometry.attributes.color;
  const cA = new THREE.Color(atas);
  const cB = new THREE.Color(bawah);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, (pos.getY(i) / 800) * 1.6));
    c.copy(cB).lerp(cA, Math.pow(t, 0.7));
    warna.setXYZ(i, c.r, c.g, c.b);
  }
  warna.needsUpdate = true;
}

function teksturKanvas(w, h, gambar, ulangX = 1, ulangY = 1) {
  const kanvas = document.createElement('canvas');
  kanvas.width = w;
  kanvas.height = h;
  gambar(kanvas.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(kanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ulangX, ulangY);
  t.anisotropy = 2;
  return t;
}

const cacheChevron = {};
function teksturChevron(arah) {
  if (cacheChevron[arah]) return cacheChevron[arah];
  const t = teksturKanvas(128, 84, (g, w, h) => {
    g.fillStyle = '#111827'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#facc15';
    for (const dx of [18, 62]) {
      g.beginPath();
      if (arah > 0) { // panah ke kiri
        g.moveTo(dx + 40, 8); g.lineTo(dx + 14, h / 2); g.lineTo(dx + 40, h - 8);
        g.lineTo(dx + 26, h - 8); g.lineTo(dx, h / 2); g.lineTo(dx + 26, 8);
      } else {        // panah ke kanan
        g.moveTo(dx, 8); g.lineTo(dx + 26, h / 2); g.lineTo(dx, h - 8);
        g.lineTo(dx + 14, h - 8); g.lineTo(dx + 40, h / 2); g.lineTo(dx + 14, 8);
      }
      g.closePath(); g.fill();
    }
  });
  t.repeat.set(1, 1);
  cacheChevron[arah] = t;
  return t;
}

/** Pita (jalan) mengikuti rute dari s0 sepanjang n. */
function buatPita(rute, s0, n, lebar, material, ubinV) {
  const langkah = 4;
  const jml = Math.floor(n / langkah) + 1;
  const pos = new Float32Array(jml * 2 * 3);
  const uv = new Float32Array(jml * 2 * 2);
  const idx = [];
  for (let i = 0; i < jml; i++) {
    const s = s0 + i * langkah;
    rute.posisi(s, -lebar / 2, 0.04, V);
    pos.set([V.x, V.y, V.z], i * 6);
    rute.posisi(s, lebar / 2, 0.04, V);
    pos.set([V.x, V.y, V.z], i * 6 + 3);
    uv.set([0, s / ubinV, 1, s / ubinV], i * 4);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function buatTanah(L, material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(UKURAN_TANAH, UKURAN_TANAH), material);
  m.rotation.x = -Math.PI / 2;
  m.userData.ubin = UKURAN_TANAH / (material.map ? material.map.repeat.x : 24);
  L.grup.add(m);
  L.tanah = m;
}

/** Mendaftarkan dekorasi yang mengikuti rute. aman = jarak minimum ke jalur. */
function dek(L, obj, { latMin, latMax, y = 0, aman = 0, i = 0, rotY }) {
  obj.userData = { ...obj.userData, latMin, latMax, y, aman, sisi: i % 2 === 0 ? -1 : 1, rotY: rotY ?? Math.random() * Math.PI * 2 };
  L.grup.add(obj);
  L.daur.push(obj);
  return obj;
}

// ---------------------------------------------------------------------
//  TEMA KOTA
// ---------------------------------------------------------------------
function bangunKota(L, def) {
  buatTanah(L, lambert(def.warnaTanah));

  // Jalan: aspal + trotoar, mengikuti tikungan
  L.lebarPita = 34;
  L.ubinPita = 10;
  L.matPita = new THREE.MeshLambertMaterial({
    map: teksturKanvas(128, 64, (g, w, h) => {
      g.fillStyle = '#b8b2a7'; g.fillRect(0, 0, w, h);                 // trotoar
      g.fillStyle = '#3d4148'; g.fillRect(15, 0, w - 30, h);           // aspal
      g.fillStyle = '#e5e7eb'; g.fillRect(18, 0, 3, h); g.fillRect(w - 21, 0, 3, h);
      g.fillStyle = '#ffd23f'; g.fillRect(w / 2 - 2, 0, 4, h * 0.5);   // marka putus-putus
    })
  });
  L.matPita.map.repeat.set(1, 1);

  const teksJendela = teksturKanvas(64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 4; y += 14) {
      for (let x = 6; x < w - 4; x += 15) {
        g.fillStyle = Math.random() < 0.25 ? '#fff4b8' : '#8fb3cf';
        g.fillRect(x, y, 9, 9);
      }
    }
  });
  const geoGedung = new THREE.BoxGeometry(1, 1, 1);
  geoGedung.translate(0, 0.5, 0);
  const matGedung = [0xe8d5b7, 0x9fb7c9, 0xc97b63, 0xf2f2f2, 0x7f8fa6, 0xd6a2ad]
    .map((c) => new THREE.MeshLambertMaterial({ color: c, map: teksJendela }));
  const matAtap = lambert(0x555b66);
  for (let i = 0; i < 46; i++) {
    const b = new THREE.Group();
    const lebar = antara(7, 13);
    const tinggi = antara(12, i % 7 === 0 ? 70 : 42);
    const gd = new THREE.Mesh(geoGedung, matGedung[i % matGedung.length]);
    gd.scale.set(lebar, tinggi, lebar);
    const atap = new THREE.Mesh(geoGedung, matAtap);
    atap.scale.set(lebar * 0.5, 1.6, lebar * 0.5);
    atap.position.y = tinggi;
    b.add(gd, atap);
    dek(L, b, { latMin: 25, latMax: 75, aman: 15 + lebar * 0.72, i, rotY: 0 });
  }

  const geoDaun = new THREE.ConeGeometry(1.6, 3.6, 6);
  const geoBatang = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 5);
  const matDaun = lambert(0x3f9b4b);
  const matBatang = lambert(0x7a4e2d);
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Group();
    const bt = new THREE.Mesh(geoBatang, matBatang); bt.position.y = 0.7;
    const dn = new THREE.Mesh(geoDaun, matDaun); dn.position.y = 3.0;
    p.add(bt, dn);
    dek(L, p, { latMin: 18.5, latMax: 21, aman: 16, i });
  }

  const geoAwan = new THREE.IcosahedronGeometry(1, 0);
  const matAwan = lambert(0xffffff, { emissive: 0x666666 });
  for (let i = 0; i < 12; i++) {
    const a = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(geoAwan, matAwan);
      m.scale.set(antara(4, 7), antara(2.5, 3.5), antara(3, 5));
      m.position.set(k * 4 - 4, Math.random() * 1.5, Math.random() * 2);
      a.add(m);
    }
    dek(L, a, { latMin: 0, latMax: 80, y: antara(32, 55), i });
  }
}

// ---------------------------------------------------------------------
//  TEMA LANGIT — di atas awan, terang & cerah. Rutenya lurus (lihat rute.js),
//  tantangannya pesawat-pesawat yang lewat.
// ---------------------------------------------------------------------
function bangunLangit(L) {
  // Lautan awan jauh di bawah pesawat
  const lautAwan = new THREE.MeshLambertMaterial({
    map: teksturKanvas(256, 256, (g, w, h) => {
      g.fillStyle = '#d6eaff'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 12 + Math.random() * 34;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,255,255,0.95)' : 'rgba(205,224,245,0.6)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.restore(); }
      }
    }, 30, 30),
    emissive: 0x5a6f8a
  });
  buatTanah(L, lautAwan);
  L.tanah.userData.y = -34;

  // Matahari cerah
  const mthr = new THREE.Mesh(new THREE.CircleGeometry(46, 24), new THREE.MeshBasicMaterial({ color: 0xfffbe6, fog: false }));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(95, 24), new THREE.MeshBasicMaterial({ color: 0xfff4c2, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
  const offset = new THREE.Vector3(-260, 230, -600);
  for (const m of [halo, mthr]) {
    m.lookAt(offset.clone().negate());
    L.grup.add(m);
    L.ikutKamera.push({ obj: m, offset });
  }

  // Gumpalan awan: di samping, di atas, dan di bawah jalur (tidak menutupi jalur terbang)
  const geoAwan = new THREE.IcosahedronGeometry(1, 1);
  const matAwan = [lambert(0xffffff, { emissive: 0x8a9bb0 }), lambert(0xf3f8ff, { emissive: 0x7d8ea6 })];
  const buatAwan = (i, besar) => {
    const a = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geoAwan, matAwan[(i + k) % 2]);
      const r = besar * antara(0.6, 1.1);
      m.scale.set(r * antara(1.1, 1.6), r * antara(0.6, 0.85), r);
      m.position.set((k - n / 2) * besar * 0.95, Math.random() * besar * 0.35, (Math.random() - 0.5) * besar);
      a.add(m);
    }
    return a;
  };
  for (let i = 0; i < 26; i++) {           // samping jalur
    const besar = antara(4, 8);
    dek(L, buatAwan(i, besar), { latMin: 22, latMax: 90, y: antara(-6, 18), aman: 16 + besar * 2.4, i });
  }
  for (let i = 0; i < 16; i++) {           // di bawah jalur
    dek(L, buatAwan(i, antara(6, 11)), { latMin: 0, latMax: 70, y: antara(-26, -12), i });
  }
  for (let i = 0; i < 12; i++) {           // tinggi di atas
    dek(L, buatAwan(i, antara(7, 12)), { latMin: 0, latMax: 110, y: antara(34, 60), i });
  }

  // Pesawat-pesawat kecil di kejauhan (hiasan) supaya langit terasa ramai
  const warna = [0xef4444, 0x2563eb, 0x16a34a, 0xf59e0b];
  for (let i = 0; i < 6; i++) {
    const p = buatPesawatBawaan(warna[i % warna.length], 0xffffff);
    p.scale.setScalar(antara(1.2, 2));
    dek(L, p, { latMin: 60, latMax: 140, y: antara(14, 40), aman: 40, i, rotY: (Math.random() < 0.5 ? 1 : -1) * antara(0.4, 2.6) });
  }
  // Tanpa jalan & penanda tepi: bila terlalu melebar, pesawat hanya tertahan di batas jalur.
}

// ---------------------------------------------------------------------
//  TEMA GURUN
// ---------------------------------------------------------------------
function bangunGurun(L, def) {
  buatTanah(L, new THREE.MeshLambertMaterial({
    map: teksturKanvas(128, 128, (g, w, h) => {
      g.fillStyle = '#e2b56f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(160,110,50,0.18)' : 'rgba(255,240,200,0.25)';
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.strokeStyle = 'rgba(170,120,60,0.35)'; g.lineWidth = 3;
      for (let y = 16; y < h; y += 32) {
        g.beginPath();
        for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / 20) * 6);
        g.stroke();
      }
    }, 80, 80)
  }));

  // Jejak jalur pasir padat (penunjuk arah tikungan)
  L.lebarPita = 28;
  L.ubinPita = 14;
  L.matPita = new THREE.MeshLambertMaterial({
    map: teksturKanvas(64, 64, (g, w, h) => {
      g.fillStyle = '#c98f48'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,230,180,0.35)';
      for (let i = 0; i < 120; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      g.fillStyle = '#a86f33'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h);
    })
  });

  // Matahari besar (selalu jauh di satu arah)
  const mthr = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: 0xfff1b8, fog: false }));
  const offset = new THREE.Vector3(250, 180, -620);
  mthr.lookAt(offset.clone().negate());
  L.grup.add(mthr);
  L.ikutKamera.push({ obj: mthr, offset });

  const matPir = [lambert(0xd9a35b), lambert(0xc98f48)];
  for (let i = 0; i < 9; i++) {
    const r = antara(16, 34);
    const p = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.2, 4), matPir[i % 2]);
    dek(L, p, { latMin: 60, latMax: 150, y: r * 0.6, aman: 15 + r * 1.42, i, rotY: Math.PI / 4 });
  }

  const matKaktus = lambert(0x3e8e41);
  const geoBatang = new THREE.CylinderGeometry(0.6, 0.7, 5, 6);
  const geoLengan = new THREE.CylinderGeometry(0.4, 0.4, 2.2, 6);
  for (let i = 0; i < 26; i++) {
    const k = new THREE.Group();
    const b = new THREE.Mesh(geoBatang, matKaktus); b.position.y = 2.5;
    const l1 = new THREE.Mesh(geoLengan, matKaktus); l1.position.set(1.0, 3.0, 0);
    const l2 = new THREE.Mesh(geoLengan, matKaktus); l2.position.set(-1.0, 2.2, 0);
    k.add(b, l1, l2);
    k.scale.setScalar(antara(0.8, 1.5));
    dek(L, k, { latMin: 17, latMax: 55, aman: 16, i });
  }

  const geoBatu = new THREE.DodecahedronGeometry(1, 0);
  const matBatu = lambert(0xa0673b);
  for (let i = 0; i < 18; i++) {
    const b = new THREE.Mesh(geoBatu, matBatu);
    b.scale.set(antara(1.5, 4), antara(1, 2.5), antara(1.5, 4));
    dek(L, b, { latMin: 17, latMax: 70, y: 0.5, aman: 18, i });
  }
}
