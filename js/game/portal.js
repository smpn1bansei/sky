import * as THREE from 'three';

// 4 pintu berwarna dalam susunan 2×2 (koordinat lokal rute: x kanan, y tinggi)
export const PINTU = [
  { nama: 'Merah', warna: 0xef4444, css: '#ef4444', x: -5.0, y: 9.3 },
  { nama: 'Biru', warna: 0x3b82f6, css: '#3b82f6', x: 5.0, y: 9.3 },
  { nama: 'Kuning', warna: 0xfacc15, css: '#facc15', x: -5.0, y: 3.9 },
  { nama: 'Hijau', warna: 0x22c55e, css: '#22c55e', x: 5.0, y: 3.9 }
];
export const UKURAN_PINTU = { lebar: 9.0, tinggi: 5.0 };

let teksturTanya = null;
function teksturTandaTanya() {
  if (teksturTanya) return teksturTanya;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = 'bold 110px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.strokeText('?', 64, 70);
  g.fillStyle = '#ffffff';
  g.fillText('?', 64, 70);
  teksturTanya = new THREE.CanvasTexture(c);
  teksturTanya.colorSpace = THREE.SRGBColorSpace;
  return teksturTanya;
}

const PUTIH = new THREE.Color(0xffffff);

/** Gerbang 4 pintu. Pintu yang "pas" dengan posisi pesawat akan bersinar. */
export class Portal {
  constructor(scene, posisi, arah) {
    this.scene = scene;
    this.grup = new THREE.Group();
    this.grup.position.copy(posisi);
    this.grup.rotation.y = arah;
    this.panel = [];
    this.bingkai = [];
    this.waktu = Math.random() * 10;
    this.pas = -1;

    const { lebar, tinggi } = UKURAN_PINTU;
    const tebal = 0.5;
    const matRangka = new THREE.MeshLambertMaterial({ color: 0x4b5563, flatShading: true });
    const geoBatang = new THREE.BoxGeometry(1, 1, 1);

    const batang = (w, h, d, x, y) => {
      const m = new THREE.Mesh(geoBatang, matRangka);
      m.scale.set(w, h, d);
      m.position.set(x, y, 0);
      this.grup.add(m);
    };
    batang(1.2, 13.6, 1.2, -10.2, 6.8);
    batang(1.2, 13.6, 1.2, 10.2, 6.8);
    batang(21.6, 1.0, 1.2, 0, 13.1);
    batang(21.6, 0.4, 1.0, 0, 6.6);  // palang tengah horizontal
    batang(0.6, 12.4, 1.0, 0, 6.6);  // palang tengah vertikal

    const geoTanya = new THREE.PlaneGeometry(2.6, 2.6);
    const matTanya = new THREE.MeshBasicMaterial({ map: teksturTandaTanya(), transparent: true, depthWrite: false });

    for (const p of PINTU) {
      const matBingkai = new THREE.MeshBasicMaterial({ color: p.warna });
      matBingkai.userData.warnaAsli = new THREE.Color(p.warna);
      this.bingkai.push(matBingkai);
      const bingkai = (w, h, x, y) => {
        const m = new THREE.Mesh(geoBatang, matBingkai);
        m.scale.set(w, h, tebal);
        m.position.set(p.x + x, p.y + y, 0);
        this.grup.add(m);
      };
      bingkai(lebar + tebal, tebal, 0, tinggi / 2);
      bingkai(lebar + tebal, tebal, 0, -tinggi / 2);
      bingkai(tebal, tinggi, -lebar / 2, 0);
      bingkai(tebal, tinggi, lebar / 2, 0);

      const matPanel = new THREE.MeshBasicMaterial({
        color: p.warna, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(lebar, tinggi), matPanel);
      panel.position.set(p.x, p.y, 0);
      this.grup.add(panel);
      this.panel.push(panel);

      const tanya = new THREE.Mesh(geoTanya, matTanya);
      tanya.position.set(p.x, p.y, 0.05);
      this.grup.add(tanya);
    }
    scene.add(this.grup);
  }

  /**
   * @param pas indeks pintu yang posisinya pas dengan pesawat (-1 jika tidak ada / masih jauh)
   */
  update(dt, pas = -1) {
    this.waktu += dt;
    this.pas = pas;
    const denyut = (Math.sin(this.waktu * 10) + 1) / 2;
    this.panel.forEach((pn, i) => {
      const m = this.bingkai[i];
      if (this.terpilih === i) {
        pn.material.opacity = 0.85;
        m.color.copy(PUTIH);
      } else if (pas === i) {
        pn.material.opacity = 0.6 + denyut * 0.3;
        m.color.copy(m.userData.warnaAsli).lerp(PUTIH, 0.35 + denyut * 0.45);
      } else {
        pn.material.opacity = pas >= 0 ? 0.14 : 0.24 + Math.sin(this.waktu * 3 + i) * 0.06;
        m.color.copy(m.userData.warnaAsli).multiplyScalar(pas >= 0 ? 0.55 : 1);
      }
    });
  }

  sorot(indeks) { this.terpilih = indeks; }

  hapus() {
    this.scene.remove(this.grup);
    this.grup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose(); // tekstur "?" dipakai bersama, tidak ikut dibuang
    });
  }
}
