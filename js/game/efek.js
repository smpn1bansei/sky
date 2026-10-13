import * as THREE from 'three';

/** Ledakan partikel sederhana (konfeti / asap). Ringan: satu objek Points per ledakan. */
export class Efek {
  constructor(scene) {
    this.scene = scene;
    this.aktif = [];
  }

  ledakan(posisi, { warna = [0xffffff], jumlah = 90, kecepatan = 14, gravitasi = 12, umur = 1.3, ukuran = 0.45 } = {}) {
    const pos = new Float32Array(jumlah * 3);
    const col = new Float32Array(jumlah * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < jumlah; i++) {
      pos[i * 3] = posisi.x;
      pos[i * 3 + 1] = posisi.y;
      pos[i * 3 + 2] = posisi.z;
      const arah = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
      vel.push(arah.multiplyScalar(kecepatan * (0.4 + Math.random() * 0.8)));
      c.set(warna[i % warna.length]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: ukuran, vertexColors: true, transparent: true, depthWrite: false });
    const titik = new THREE.Points(geo, mat);
    this.scene.add(titik);
    this.aktif.push({ titik, vel, umur, sisa: umur, gravitasi });
  }

  update(dt) {
    for (let k = this.aktif.length - 1; k >= 0; k--) {
      const e = this.aktif[k];
      e.sisa -= dt;
      const pos = e.titik.geometry.attributes.position;
      for (let i = 0; i < e.vel.length; i++) {
        e.vel[i].y -= e.gravitasi * dt;
        pos.array[i * 3] += e.vel[i].x * dt;
        pos.array[i * 3 + 1] += e.vel[i].y * dt;
        pos.array[i * 3 + 2] += e.vel[i].z * dt;
      }
      pos.needsUpdate = true;
      e.titik.material.opacity = Math.max(0, e.sisa / e.umur);
      if (e.sisa <= 0) {
        this.scene.remove(e.titik);
        e.titik.geometry.dispose();
        e.titik.material.dispose();
        this.aktif.splice(k, 1);
      }
    }
  }
}
