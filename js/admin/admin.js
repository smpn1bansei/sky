// =====================================================================
//  PANEL GURU — titik masuk: login, cek status guru, navigasi tab.
// =====================================================================
import { firebaseSiap } from '../../config.js';
import { toast } from '../util.js';
import { initBankSoal } from './bankSoal.js';
import { initRoom } from './room.js';
import { initGuru } from './guru.js';
import { konfirmasi } from '../ui/konfirmasi.js';
import { pasangTombolLayarPenuh } from '../ui/layarPenuh.js';

document.querySelectorAll('.btn-layar-penuh').forEach(pasangTombolLayarPenuh);

const $ = (id) => document.getElementById(id);

function tampil(id) {
  for (const x of ['layar-login-guru', 'layar-bukan-guru', 'aplikasi']) $(x).hidden = x !== id;
}

function pesan(teks, jenis = 'error') {
  $('g-pesan').innerHTML = teks ? `<div class="pesan ${jenis}"></div>` : '';
  if (teks) $('g-pesan').firstChild.textContent = teks;
}

// Navigasi tab
document.querySelectorAll('nav.tab button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav.tab button').forEach((x) => x.classList.toggle('aktif', x === b));
    for (const t of ['room', 'bank', 'guru']) $(`tab-${t}`).hidden = t !== b.dataset.tab;
  });
});

if (!firebaseSiap()) {
  $('pesan-belum-config').hidden = false;
  $('form-login-guru').hidden = true;
} else {
  mulai().catch((e) => {
    console.error(e);
    pesan('Gagal memuat Firebase: ' + e.message);
  });
}

async function mulai() {
  const fb = await import('../firebase.js');
  await fb.inisialisasi();

  const email = () => $('g-email').value.trim();
  const sandi = () => $('g-sandi').value;

  $('form-login-guru').addEventListener('submit', async (e) => {
    e.preventDefault();
    pesan('');
    $('g-masuk').disabled = true;
    try { await fb.loginGuru(email(), sandi()); }
    catch (err) { pesan(err.message); }
    finally { $('g-masuk').disabled = false; }
  });

  $('g-daftar').addEventListener('click', async () => {
    pesan('');
    if (!$('form-login-guru').reportValidity()) return;
    const ya = await konfirmasi({
      judul: 'Buat akun guru baru?',
      pesan: `Akun akan dibuat dengan email:
${email()}`,
      ok: 'Buat akun', jenis: 'info'
    });
    if (!ya) return;
    try { await fb.daftarAkunGuru(email(), sandi()); }
    catch (err) { pesan(err.message); }
  });

  $('g-lupa').addEventListener('click', async () => {
    if (!email()) return pesan('Isi email terlebih dahulu.');
    try {
      await fb.resetSandi(email());
      pesan('Tautan reset kata sandi telah dikirim ke email Anda.', 'ok');
    } catch (err) { pesan(err.message); }
  });

  const keluar = async () => {
    const ya = await konfirmasi({
      judul: 'Keluar dari panel guru?',
      pesan: `Anda perlu login kembali untuk mengelola soal dan memantau kuis.
Kuis yang sedang berjalan TIDAK akan berhenti.`,
      ok: 'Keluar', batal: 'Batal', jenis: 'peringatan', ikon: '🚪'
    });
    if (ya) fb.logout().then(() => location.reload());
  };
  $('btn-logout').addEventListener('click', keluar);
  $('btn-logout-2').addEventListener('click', keluar);

  $('g-masuk').disabled = false;
  $('g-masuk').textContent = 'Masuk';
  $('g-daftar').disabled = false;

  let siap = false;
  fb.pantauAuth(async (user) => {
    if (!user || user.isAnonymous) { tampil('layar-login-guru'); return; }
    let status;
    try {
      status = await fb.cekStatusGuru();
    } catch (e) {
      console.error(e);
      tampil('layar-login-guru');
      pesan('Gagal memeriksa akun: ' + e.message + ' — pastikan Security Rules sudah dipasang.');
      return;
    }
    if (status === 'bukan') {
      $('bukan-guru-email').textContent = user.email;
      tampil('layar-bukan-guru');
      return;
    }
    if (status === 'guru-pertama') toast('Akun Anda terdaftar sebagai guru pertama (pengelola).', 'sukses', 6000);
    $('a-email').textContent = user.email;
    tampil('aplikasi');
    if (!siap) {
      siap = true;
      const room = initRoom(fb);
      const bank = initBankSoal(fb);
      initGuru(fb);
      fb.pantauBankSoal((data) => {
        bank.perbarui(data);
        room.perbaruiBank(data);
      });
    }
  });
}
