import { escapeHtml, formatTanggal, bacaLokal } from '../util.js';

function pesanNilai(n) {
  if (n >= 90) return 'Luar biasa! 🏆';
  if (n >= 75) return 'Hebat, pertahankan! ✈️';
  if (n >= 60) return 'Bagus, terus berlatih!';
  return 'Jangan menyerah, ayo belajar lagi!';
}

/** Mengisi layar hasil akhir. */
export function isiLayarHasil(sesi, { offline, catatan = '' }) {
  const n = sesi.nilai;
  document.getElementById('hasil-nama').textContent = `${sesi.nama} · ${sesi.kelas}`;
  document.getElementById('hasil-nilai').textContent = n;
  document.getElementById('hasil-pesan').textContent = pesanNilai(n);
  document.getElementById('hasil-benar').textContent = sesi.benar;
  document.getElementById('hasil-salah').textContent = sesi.salah;
  document.getElementById('hasil-kosong').textContent = Math.max(0, sesi.total - sesi.benar - sesi.salah);
  document.getElementById('hasil-skor').textContent = sesi.skor.toLocaleString('id-ID');
  document.getElementById('hasil-catatan').textContent = catatan;
  const st = sesi.stat || {};
  document.getElementById('hasil-combo').textContent = st.comboTerbaik || 0;
  document.getElementById('hasil-tabrakan').textContent = st.tabrakan || 0;
  document.querySelector('.lingkar-nilai').style.setProperty('--persen', n);

  document.getElementById('btn-main-lagi').hidden = !offline;
  const riwayatEl = document.getElementById('hasil-riwayat');
  if (offline) {
    const r = bacaLokal('sq_riwayat', []);
    riwayatEl.hidden = r.length === 0;
    riwayatEl.querySelector('tbody').innerHTML = r.slice(0, 5).map((x) => `
      <tr><td>${escapeHtml(formatTanggal(x.waktu))}</td><td>${escapeHtml(x.nama)}</td>
      <td>${x.benar}/${x.total}</td><td><b>${x.nilai}</b></td></tr>`).join('');
  } else {
    riwayatEl.hidden = true;
  }
}
