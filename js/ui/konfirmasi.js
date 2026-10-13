// Modal konfirmasi bergaya CSS (pengganti confirm() bawaan browser).
import { escapeHtml } from '../util.js';

let dialog = null;
let selesaikan = null;

function tutup(hasil) {
  if (!selesaikan) return;
  const r = selesaikan;
  selesaikan = null;
  if (dialog.open) dialog.close();
  r(hasil);
}

function buatDialog() {
  dialog = document.createElement('dialog');
  dialog.className = 'modal-konfirmasi';
  dialog.innerHTML = `
    <div class="mk-isi">
      <div class="mk-ikon" aria-hidden="true"></div>
      <h2 class="mk-judul"></h2>
      <div class="mk-pesan"></div>
      <div class="mk-aksi">
        <button class="mk-batal" type="button"></button>
        <button class="mk-ok" type="button"></button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.mk-ok').addEventListener('click', () => tutup(true));
  dialog.querySelector('.mk-batal').addEventListener('click', () => tutup(false));
  // Tombol Esc atau klik di luar kotak = batal
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); tutup(false); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) tutup(false); });
}

/**
 * Menampilkan konfirmasi. Mengembalikan Promise<boolean>.
 * @param {object} o { judul, pesan (baris baru = paragraf), ok, batal, jenis: 'bahaya'|'peringatan'|'info', ikon }
 */
export function konfirmasi({ judul = 'Konfirmasi', pesan = '', ok = 'Ya', batal = 'Batal', jenis = 'peringatan', ikon } = {}) {
  if (!dialog) buatDialog();
  tutup(false); // tutup konfirmasi sebelumnya bila masih terbuka
  const ikonBawaan = { bahaya: '⚠️', peringatan: '❓', info: 'ℹ️' };
  dialog.dataset.jenis = jenis;
  dialog.querySelector('.mk-ikon').textContent = ikon || ikonBawaan[jenis] || '❓';
  dialog.querySelector('.mk-judul').textContent = judul;
  dialog.querySelector('.mk-pesan').innerHTML = String(pesan).split('\n').filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  dialog.querySelector('.mk-ok').textContent = ok;
  dialog.querySelector('.mk-batal').textContent = batal;
  return new Promise((resolve) => {
    selesaikan = resolve;
    dialog.showModal();
    dialog.querySelector('.mk-batal').focus();
  });
}
