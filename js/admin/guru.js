// PANEL GURU — Kelola daftar akun guru yang boleh mengelola soal & room.
import { escapeHtml, toast } from '../util.js';
import { konfirmasi } from '../ui/konfirmasi.js';

const $ = (id) => document.getElementById(id);

export function initGuru(fb) {
  const saya = fb.emailSaya().toLowerCase();

  fb.pantauGuru((daftar) => {
    $('daftar-guru').innerHTML = daftar.sort().map((email) => `
      <tr data-email="${escapeHtml(email)}">
        <td>${escapeHtml(email)} ${email === saya ? '<span class="lencana online">Anda</span>' : ''}</td>
        <td style="text-align:right">${email === saya ? '' : '<button class="b kecil" data-aksi="hapus">Hapus</button>'}</td>
      </tr>`).join('');
  });

  $('form-guru').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('guru-email').value.trim().toLowerCase();
    try {
      await fb.tambahGuru(email);
      $('guru-email').value = '';
      toast(`${email} ditambahkan sebagai guru`, 'sukses');
    } catch (err) { toast('Gagal: ' + err.message, 'error'); }
  });

  $('daftar-guru').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-aksi="hapus"]');
    if (!b) return;
    const email = b.closest('tr').dataset.email;
    if (!(await konfirmasi({ judul: 'Cabut akses guru?', pesan: `${email} tidak akan bisa lagi mengelola soal dan room.`, ok: 'Cabut akses', jenis: 'bahaya' }))) return;
    try { await fb.hapusGuru(email); toast('Akses guru dicabut'); }
    catch (err) { toast('Gagal: ' + err.message, 'error'); }
  });
}
