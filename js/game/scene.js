import * as THREE from 'three';

// Batas resolusi per tingkat kualitas. Chromebook murah biasanya cukup di 1.0 atau lebih rendah.
const RASIO_PIKSEL = { rendah: 0.75, sedang: 1, tinggi: 2, otomatis: 1.25 };

/**
 * Membuat renderer, scene, kamera & cahaya.
 * Bayangan dimatikan (berat di perangkat lemah).
 */
export function buatScene(canvas, kualitas = 'otomatis') {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: kualitas === 'tinggi',
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const batas = RASIO_PIKSEL[kualitas] ?? 1.25;
  let rasio = Math.min(window.devicePixelRatio || 1, batas);
  renderer.setPixelRatio(rasio);

  const scene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(65, 1, 0.5, 900);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.6);
  scene.add(hemi);
  const matahari = new THREE.DirectionalLight(0xffffff, 1.8);
  matahari.position.set(30, 60, 20);
  scene.add(matahari);
  scene.add(matahari.target);

  function ubahUkuran() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    // Layar HP tegak: lebarkan sudut pandang agar keempat pintu tetap terlihat.
    kamera.fov = kamera.aspect < 0.8 ? 85 : 65;
    kamera.updateProjectionMatrix();
  }
  ubahUkuran();
  window.addEventListener('resize', ubahUkuran);

  // Kualitas otomatis: ukur FPS, turunkan resolusi bila < 40 fps.
  let jumlahFrame = 0;
  let waktuUkur = 0;
  function pantauKinerja(dt) {
    if (kualitas !== 'otomatis') return;
    jumlahFrame++;
    waktuUkur += dt;
    if (waktuUkur >= 2.5) {
      const fps = jumlahFrame / waktuUkur;
      if (fps < 40 && rasio > 0.6) {
        rasio = Math.max(0.6, rasio - 0.2);
        renderer.setPixelRatio(rasio);
        ubahUkuran();
      } else if (fps > 58 && rasio < Math.min(window.devicePixelRatio || 1, batas)) {
        rasio = Math.min(rasio + 0.1, batas);
        renderer.setPixelRatio(rasio);
        ubahUkuran();
      }
      jumlahFrame = 0;
      waktuUkur = 0;
    }
  }

  return { renderer, scene, kamera, hemi, matahari, pantauKinerja };
}
