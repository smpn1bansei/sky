import * as THREE from 'three';

// =====================================================================
//  CINCIN BINTANG — rangkaian cincin emas yang bisa dilewati untuk bonus.
//  Melatih fokus & koordinasi mata-tangan: makin banyak cincin berturut-turut,
//  makin besar bonusnya. Melewatkan cincin tidak menghancurkan pesawat.
// =====================================================================

export const JARI_CINCIN = 2.8;   // pesawat dihitung lewat bila pusatnya dalam radius ini
const JARAK_ANTAR = 22;
const PER_RANGKAIAN = 5;

let geo = null;
let mat = null;
let matInti = null;

function bahan() {
  if (!geo) {
    geo = new THREE.TorusGeometry(JARI_CINCIN + 0.2, 0.28, 8, 28);
    mat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    mat.userData.dipakaiBersama = true;
    matInti = new THREE.MeshBasicMaterial({ color: 0xfff7cc, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    matInti.userData.dipakaiBersama = true;
  }
}

export class Cincin {
  constructor(scene, rute, s, x, y) {
    bahan();
    this.scene = scene;
    this.s = s;
    this.x = x;
    this.y = y;
    this.diambil = false;
    this.mesh = new THREE.Group();
    this.mesh.add(new THREE.Mesh(geo, mat));
    const inti = new THREE.Mesh(new THREE.CircleGeometry(JARI_CINCIN, 20), matInti);
    this.mesh.add(inti);
    rute.posisi(s, x, y, this.mesh.position);
    this.mesh.rotation.y = rute.arah(s);
    this.fase = Math.random() * 6;
    scene.add(this.mesh);
  }

  update(dt, waktu) {
    if (this.diambil) return;
    const k = 1 + Math.sin(waktu * 5 + this.fase) * 0.06;
    this.mesh.scale.setScalar(k);
  }

  /** true bila pusat pesawat melewati lubang cincin */
  kena(x, y) { return Math.hypot(x - this.x, y - this.y) <= JARI_CINCIN; }

  ambil() {
    this.diambil = true;
    this.mesh.visible = false;
  }

  reset() {
    this.diambil = false;
    this.mesh.visible = true;
  }

  hapus() {
    this.scene.remove(this.mesh);
    this.mesh.children[1].geometry.dispose();
  }
}

/** Membuat beberapa rangkaian cincin pada bagian lurus blok, jauh dari rintangan. */
export function buatCincinBlok(scene, rute, blok, posisiRintangan, jumlahRangkaian, rng = Math.random) {
  const panjang = (PER_RANGKAIAN - 1) * JARAK_ANTAR;
  const kandidat = [];
  for (let s = blok.sAwal + (blok.k === 0 ? 120 : 60); s < blok.sGerbang - 140 - panjang; s += 10) {
    if (!rute.diLurus(s, 30) || !rute.diLurus(s + panjang, 30)) continue;
    if (posisiRintangan.some((r) => r > s - 40 && r < s + panjang + 40)) continue;
    kandidat.push(s);
  }
  const hasil = [];
  const awalDipakai = [];
  for (let n = 0; n < jumlahRangkaian && kandidat.length; n++) {
    const pilihan = kandidat.filter((s) => awalDipakai.every((a) => Math.abs(a - s) > panjang + 60));
    if (!pilihan.length) break;
    const s0 = pilihan[Math.floor(rng() * pilihan.length)];
    awalDipakai.push(s0);
    // Lintasan cincin berkelok lembut: menuntut pesawat bergeser kiri/kanan & naik/turun
    const x0 = (rng() * 2 - 1) * 6;
    const x1 = (rng() * 2 - 1) * 7;
    const y0 = 3 + rng() * 6;
    const y1 = 3 + rng() * 6;
    const lengkungMaks = rng() < 0.5 ? 2 : -2;
    for (let i = 0; i < PER_RANGKAIAN; i++) {
      const t = i / (PER_RANGKAIAN - 1);
      const lengkung = Math.sin(t * Math.PI) * lengkungMaks;
      hasil.push(new Cincin(scene, rute, s0 + i * JARAK_ANTAR,
        THREE.MathUtils.clamp(x0 + (x1 - x0) * t + lengkung, -8.5, 8.5),
        THREE.MathUtils.clamp(y0 + (y1 - y0) * t, 2.4, 10.4)));
    }
  }
  return hasil;
}
