import * as THREE from 'three';

/**
 * Pesawat low-poly bawaan (dibangun dari bentuk geometri sederhana).
 * Bisa diganti model .glb lewat config.js → pengaturanGame.modelPesawat.
 * Pesawat menghadap ke arah -Z (arah terbang).
 */
export class Pesawat {
  constructor(scene) {
    this.root = new THREE.Group();     // posisi
    this.badan = new THREE.Group();    // rotasi (miring/menukik)
    this.root.add(this.badan);
    scene.add(this.root);

    this.bawaan = buatPesawatBawaan();
    this.bawaan.scale.setScalar(0.8); // bentang sayap ±2,2 agar muat melewati pintu gerbang
    this.badan.add(this.bawaan);
    this.baling = this.bawaan.getObjectByName('baling');

    this.waktu = 0;
  }

  /** Memuat model .glb (opsional). Jika gagal, pesawat bawaan tetap dipakai. */
  async muatModel(url, skala = 1, rotasiY = Math.PI) {
    if (!url) return;
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const model = gltf.scene;
      model.scale.setScalar(skala);
      model.rotation.y = rotasiY;
      // Pusatkan model
      const kotak = new THREE.Box3().setFromObject(model);
      const pusat = kotak.getCenter(new THREE.Vector3());
      model.position.sub(pusat);
      this.badan.remove(this.bawaan);
      this.badan.add(model);
      this.baling = model.getObjectByName('baling') || model.getObjectByName('propeller') || null;
    } catch (e) {
      console.warn('Model pesawat gagal dimuat, memakai pesawat bawaan.', e);
    }
  }

  get posisi() { return this.root.position; }

  /** Animasi miring sesuai kecepatan samping/vertikal. */
  animasi(dt, vx, vy) {
    this.waktu += dt;
    const targetRoll = -vx * 0.045;
    const targetPitch = vy * 0.03;
    this.badan.rotation.z += (targetRoll - this.badan.rotation.z) * Math.min(1, dt * 6);
    this.badan.rotation.x += (targetPitch - this.badan.rotation.x) * Math.min(1, dt * 6);
    // sedikit ayunan supaya hidup
    this.badan.position.y = Math.sin(this.waktu * 2.2) * 0.08;
    if (this.baling) this.baling.rotation.z += dt * 40;
  }

  /** Berkedip saat kebal setelah muncul ulang di checkpoint. */
  kedip(aktif) {
    this.badan.visible = !aktif || Math.floor(this.waktu * 10) % 2 === 0;
  }
}

/** Pesawat low-poly. Warna bisa diganti (dipakai juga untuk pesawat rintangan). */
export function buatPesawatBawaan(warnaUtama = 0xe63946, warnaBadan = 0xf1faee) {
  const g = new THREE.Group();
  const merah = new THREE.MeshLambertMaterial({ color: warnaUtama, flatShading: true });
  const putih = new THREE.MeshLambertMaterial({ color: warnaBadan, flatShading: true });
  const kaca = new THREE.MeshLambertMaterial({ color: 0x7fd4ff, flatShading: true, emissive: 0x113355 });
  const gelap = new THREE.MeshLambertMaterial({ color: 0x2b2d42, flatShading: true });

  // Badan
  const badan = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.32, 3.4, 8), putih);
  badan.rotation.x = Math.PI / 2;
  g.add(badan);

  // Moncong
  const moncong = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 8), merah);
  moncong.rotation.x = -Math.PI / 2;
  moncong.position.z = -2.1;
  g.add(moncong);

  // Kokpit
  const kokpit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), kaca);
  kokpit.scale.set(0.9, 0.8, 1.6);
  kokpit.position.set(0, 0.32, -0.5);
  g.add(kokpit);

  // Sayap utama
  const sayap = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 1.1), merah);
  sayap.position.set(0, -0.1, -0.2);
  g.add(sayap);
  // ujung sayap putih
  for (const s of [-1, 1]) {
    const ujung = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 1.12), putih);
    ujung.position.set(s * 2.55, -0.1, -0.2);
    g.add(ujung);
  }

  // Ekor
  const ekorTegak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.8), merah);
  ekorTegak.position.set(0, 0.55, 1.45);
  g.add(ekorTegak);
  const ekorDatar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.6), merah);
  ekorDatar.position.set(0, 0.05, 1.5);
  g.add(ekorDatar);

  // Baling-baling
  const baling = new THREE.Group();
  baling.name = 'baling';
  baling.position.z = -2.6;
  const daun = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.06), gelap);
  baling.add(daun);
  const daun2 = daun.clone();
  daun2.rotation.z = Math.PI / 2;
  baling.add(daun2);
  const as = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), merah);
  as.rotation.x = -Math.PI / 2;
  as.position.z = -0.12;
  baling.add(as);
  g.add(baling);

  return g;
}
