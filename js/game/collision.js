import { PINTU, UKURAN_PINTU } from './portal.js';

/**
 * Ukuran kotak tabrakan pesawat (setengah lebar/tinggi/panjang) dalam koordinat rute.
 * Pesawat bawaan berbentang sayap ±4,5 → setengahnya ±2,2.
 */
export const KOTAK_PESAWAT = { x: 2.1, y: 0.45, s: 1.6 };

/**
 * Pintu yang dimasuki dengan SEMPURNA: seluruh kotak pesawat berada di dalam bingkai pintu.
 * @param toleransi kelonggaran tambahan (mode bantuan)
 * @returns indeks pintu 0–3, atau -1 bila tidak pas (pesawat akan menabrak bingkai)
 */
export function pintuPas(x, y, toleransi = 0) {
  const hx = Math.max(0.6, KOTAK_PESAWAT.x - toleransi);
  const hy = Math.max(0.2, KOTAK_PESAWAT.y - toleransi * 0.3);
  for (let i = 0; i < PINTU.length; i++) {
    const p = PINTU[i];
    const ruangX = UKURAN_PINTU.lebar / 2 - hx;
    const ruangY = UKURAN_PINTU.tinggi / 2 - hy;
    if (Math.abs(x - p.x) <= ruangX && Math.abs(y - p.y) <= ruangY) return i;
  }
  return -1;
}

/**
 * Tabrakan kotak (AABB) dalam koordinat rute, termasuk pengecekan "menyapu"
 * agar benda cepat (pesawat lawan arah) tidak terlewat di antara dua frame.
 */
export function tabrakKotak(pemain, benda) {
  if (Math.abs(pemain.x - benda.x) > KOTAK_PESAWAT.x * 0.85 + benda.hx) return false;
  if (Math.abs(pemain.y - benda.y) > KOTAK_PESAWAT.y + benda.hy) return false;
  const ds = benda.s - pemain.s;
  if (Math.abs(ds) <= KOTAK_PESAWAT.s + benda.hs) return true;
  const dsLama = benda.sLama - pemain.sLama;
  return Math.sign(ds) !== Math.sign(dsLama) && dsLama !== 0;
}
