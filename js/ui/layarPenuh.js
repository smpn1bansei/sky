// Tombol layar penuh (fullscreen) — dipakai di halaman siswa & guru.

const IKON_BUKA = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const IKON_TUTUP = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

const el = () => document.fullscreenElement || document.webkitFullscreenElement;

export function pasangTombolLayarPenuh(tombol) {
  const root = document.documentElement;
  const bisa = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!tombol) return;
  if (!bisa) { tombol.hidden = true; return; } // mis. Safari iPhone tidak mendukung

  const perbarui = () => {
    const penuh = !!el();
    tombol.innerHTML = penuh ? IKON_TUTUP : IKON_BUKA;
    tombol.title = penuh ? 'Keluar dari layar penuh' : 'Layar penuh';
    tombol.setAttribute('aria-label', tombol.title);
  };
  tombol.addEventListener('click', async () => {
    try {
      if (el()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else await bisa.call(root);
    } catch (e) { console.warn('Layar penuh tidak tersedia', e); }
    tombol.blur();
  });
  document.addEventListener('fullscreenchange', perbarui);
  document.addEventListener('webkitfullscreenchange', perbarui);
  perbarui();
}
