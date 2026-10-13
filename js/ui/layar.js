// Pengatur layar (login, ruang tunggu, hasil) dan efek kilat.

export function tampilkanLayar(id) {
  document.querySelectorAll('.layar').forEach((el) => el.classList.toggle('aktif', el.id === id));
  document.body.dataset.layar = id || 'main';
}

export function kilat(warna = '#ffffff') {
  const el = document.getElementById('kilat');
  el.style.background = warna;
  el.classList.remove('jalan');
  void el.offsetWidth; // restart animasi
  el.classList.add('jalan');
}
