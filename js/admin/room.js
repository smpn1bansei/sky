// =====================================================================
//  PANEL GURU — Buat room (PIN 6 digit) & daftar room.
// =====================================================================
import { escapeHtml, toast, formatTanggal } from '../util.js';
import { initPantau } from './pantau.js';
import { konfirmasi } from '../ui/konfirmasi.js';

const $ = (id) => document.getElementById(id);

export function initRoom(fb) {
  let bank = { paket: {}, soal: {} };
  let daftar = {};
  const pantau = initPantau(fb);

  const jumlahSoalPaket = (id) => Object.keys(bank.soal[id] || {}).length;

  function isiPilihanPaket() {
    const sel = $('rm-paket');
    const lama = sel.value;
    const entri = Object.entries(bank.paket).sort((a, b) => (b[1].dibuatPada || 0) - (a[1].dibuatPada || 0));
    sel.innerHTML = entri.length
      ? entri.map(([id, p]) => `<option value="${escapeHtml(id)}">${escapeHtml(p.nama)} (${jumlahSoalPaket(id)} soal)</option>`).join('')
      : '<option value="">— Belum ada paket, buat di tab Bank Soal —</option>';
    if (lama && bank.paket[lama]) sel.value = lama;
    perbaruiInfoJumlah();
  }

  function perbaruiInfoJumlah() {
    const n = jumlahSoalPaket($('rm-paket').value);
    $('rm-jumlah').max = Math.max(1, n);
    $('rm-jumlah-info').textContent = `dari ${n} soal tersedia`;
    if (Number($('rm-jumlah').value) > n && n > 0) $('rm-jumlah').value = n;
  }
  $('rm-paket').addEventListener('change', perbaruiInfoJumlah);

  $('form-room').addEventListener('submit', async (e) => {
    e.preventDefault();
    const paketId = $('rm-paket').value;
    const n = jumlahSoalPaket(paketId);
    if (!paketId || n === 0) return toast('Paket soal masih kosong. Tambahkan soal dulu di tab Bank Soal.', 'error');
    const jumlah = Math.min(Number($('rm-jumlah').value), n);
    const btn = e.submitter || $('form-room').querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const pin = await fb.buatRoom({
        judul: $('rm-judul').value.trim(),
        paketId,
        namaPaket: bank.paket[paketId].nama,
        jumlahSoal: jumlah,
        waktuPerSoal: Math.max(5, Math.min(600, Number($('rm-waktu').value) || 30)),
        acakSoal: $('rm-acak-soal').checked,
        acakOpsi: $('rm-acak-opsi').checked,
        mode: $('rm-mode').value,
        kesulitan: $('rm-kesulitan').value
      });
      toast(`Room dibuat! PIN: ${pin}`, 'sukses', 5000);
      pantau.buka(pin);
    } catch (err) {
      console.error(err);
      toast('Gagal membuat room: ' + err.message, 'error', 5000);
    } finally {
      btn.disabled = false;
    }
  });

  fb.pantauDaftarRoom((d) => {
    daftar = d;
    const entri = Object.entries(daftar).sort((a, b) => (b[1].dibuatPada || 0) - (a[1].dibuatPada || 0));
    $('daftar-room').innerHTML = entri.length ? entri.map(([pin, r]) => `
      <tr data-pin="${escapeHtml(pin)}">
        <td><b>${escapeHtml(pin)}</b></td>
        <td>${escapeHtml(r.judul)}<br><small class="redup">${escapeHtml(r.namaPaket || '')}</small></td>
        <td><small>${escapeHtml(formatTanggal(r.dibuatPada))}</small></td>
        <td style="white-space:nowrap">
          <button class="b kecil utama" data-aksi="pantau">Pantau</button>
          <button class="b kecil" data-aksi="hapus" title="Hapus room">🗑</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="4" class="kosong">Belum ada room.</td></tr>';
  });

  $('daftar-room').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-aksi]');
    if (!b) return;
    const pin = b.closest('tr').dataset.pin;
    if (b.dataset.aksi === 'pantau') pantau.buka(pin);
    if (b.dataset.aksi === 'hapus') {
      const ya = await konfirmasi({
        judul: `Hapus room ${pin}?`,
        pesan: `"${daftar[pin]?.judul || ''}" beserta seluruh data nilai siswanya akan dihapus permanen.
Ekspor nilai ke Excel terlebih dahulu jika masih diperlukan.`,
        ok: 'Hapus room', jenis: 'bahaya', ikon: '🗑️'
      });
      if (!ya) return;
      try {
        if (pantau.pin === pin) pantau.tutup();
        await fb.hapusRoom(pin);
        toast('Room dihapus');
      } catch (err) { toast('Gagal: ' + err.message, 'error'); }
    }
  });

  return {
    perbaruiBank(d) {
      bank = d;
      isiPilihanPaket();
    }
  };
}
