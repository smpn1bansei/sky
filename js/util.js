// Fungsi bantu umum (dipakai halaman siswa & guru).

/** Hash string → bilangan 32-bit (untuk seed acak yang konsisten). */
export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Pembangkit angka acak ber-seed (mulberry32). Seed sama → urutan sama (penting saat refresh). */
export function acakBerseed(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mengacak salinan array (Fisher–Yates). */
export function kocok(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * ID siswa dari NAMA LENGKAP (kunci utama peserta di satu room).
 * Huruf besar/kecil & spasi berlebih diabaikan; karakter terlarang Firebase dibuang.
 */
export function kunciNama(nama) {
  return String(nama).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.#$\[\]\/]/g, '').replace(/ /g, '_').slice(0, 80);
}

export function simpanLokal(kunci, nilai) {
  try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch { /* penyimpanan diblokir */ }
}

export function bacaLokal(kunci, bawaan = null) {
  try {
    const v = localStorage.getItem(kunci);
    return v == null ? bawaan : JSON.parse(v);
  } catch { return bawaan; }
}

export function hapusLokal(kunci) {
  try { localStorage.removeItem(kunci); } catch { /* abaikan */ }
}

let toastTimer;
export function toast(pesan, jenis = 'info', durasi = 3200) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = pesan;
  el.className = `tampil ${jenis}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, durasi);
}

export function formatTanggal(ms) {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const HURUF = ['a', 'b', 'c', 'd'];
