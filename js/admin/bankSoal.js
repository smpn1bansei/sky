// =====================================================================
//  PANEL GURU — Bank soal: paket, tambah/edit/hapus soal, impor CSV/Excel.
// =====================================================================
import { escapeHtml, toast } from '../util.js';
import { bacaFileSoal, unduhTemplate } from './impor.js';
import { konfirmasi } from '../ui/konfirmasi.js';

const $ = (id) => document.getElementById(id);

export function initBankSoal(fb) {
  let data = { paket: {}, soal: {}, kunci: {} };
  let paketAktif = null;
  let soalDiedit = null;
  let paketDiedit = null;
  let hasilImpor = null;

  // ---------- Daftar paket
  function renderDaftarPaket() {
    const ul = $('daftar-paket');
    const entri = Object.entries(data.paket).sort((a, b) => (b[1].dibuatPada || 0) - (a[1].dibuatPada || 0));
    if (!entri.length) {
      ul.innerHTML = '<li class="kosong" style="cursor:default">Belum ada paket. Klik "+ Paket".</li>';
      return;
    }
    ul.innerHTML = entri.map(([id, p]) => `
      <li data-id="${escapeHtml(id)}" class="${id === paketAktif ? 'aktif' : ''}">
        <span><b>${escapeHtml(p.nama)}</b><br><small>${escapeHtml(p.mapel || '-')}</small></span>
        <small>${Object.keys(data.soal[id] || {}).length} soal</small>
      </li>`).join('');
  }

  $('daftar-paket').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    paketAktif = li.dataset.id;
    renderDaftarPaket();
    renderDetail();
  });

  // ---------- Detail paket & soal
  function renderDetail() {
    const el = $('detail-paket');
    const p = data.paket[paketAktif];
    if (!p) {
      paketAktif = null;
      el.innerHTML = '<p class="kosong">Pilih atau buat paket soal terlebih dahulu.</p>';
      return;
    }
    const soal = Object.entries(data.soal[paketAktif] || {}).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const kunci = data.kunci[paketAktif] || {};
    el.innerHTML = `
      <div class="baris" style="justify-content:space-between">
        <div><h2 style="margin:0">${escapeHtml(p.nama)}</h2><span class="redup">${escapeHtml(p.mapel || '')} · ${soal.length} soal</span></div>
        <div class="baris">
          <button class="b utama" data-aksi="tambah">+ Soal</button>
          <button class="b" data-aksi="impor">Impor CSV/Excel</button>
          <button class="b" data-aksi="ubah-paket">Ubah nama</button>
          <button class="b merah" data-aksi="hapus-paket">Hapus paket</button>
        </div>
      </div>
      <div style="margin-top:14px">
        ${soal.length ? soal.map(([id, s], i) => `
          <div class="item-soal" data-id="${escapeHtml(id)}">
            <div class="baris" style="justify-content:space-between;align-items:flex-start">
              <div class="lebar"><b>${i + 1}.</b> ${escapeHtml(s.soal)} ${s.mapel ? `<span class="redup">(${escapeHtml(s.mapel)})</span>` : ''}</div>
              <div class="baris">
                <button class="b kecil" data-aksi="edit">Edit</button>
                <button class="b kecil" data-aksi="hapus">Hapus</button>
              </div>
            </div>
            ${s.gambar ? `<img src="${escapeHtml(s.gambar)}" alt="">` : ''}
            <div class="opsi-mini">
              ${['a', 'b', 'c', 'd'].map((h) => `<span class="${kunci[id] === h ? 'kunci' : ''}">${h.toUpperCase()}. ${escapeHtml(s.opsi?.[h])}${kunci[id] === h ? ' ✓' : ''}</span>`).join('')}
            </div>
          </div>`).join('') : '<p class="kosong">Belum ada soal. Tambah satu per satu atau impor dari CSV/Excel.</p>'}
      </div>`;
  }

  $('detail-paket').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-aksi]');
    if (!b) return;
    const id = b.closest('.item-soal')?.dataset.id;
    switch (b.dataset.aksi) {
      case 'tambah': bukaDialogSoal(null); break;
      case 'edit': bukaDialogSoal(id); break;
      case 'hapus':
        if (await konfirmasi({ judul: 'Hapus soal ini?', pesan: (data.soal[paketAktif]?.[id]?.soal || '').slice(0, 160), ok: 'Hapus', jenis: 'bahaya', ikon: '🗑️' })) {
          await fb.hapusSoal(paketAktif, id).catch(gagal);
          toast('Soal dihapus');
        }
        break;
      case 'impor': bukaDialogImpor(); break;
      case 'ubah-paket': bukaDialogPaket(paketAktif); break;
      case 'hapus-paket':
        if (await konfirmasi({
          judul: 'Hapus paket soal?',
          pesan: `Paket "${data.paket[paketAktif].nama}" beserta SEMUA soal & kunci jawabannya akan dihapus.
Tindakan ini tidak bisa dibatalkan.`,
          ok: 'Hapus paket', jenis: 'bahaya', ikon: '🗑️'
        })) {
          await fb.hapusPaket(paketAktif).catch(gagal);
          paketAktif = null;
          toast('Paket dihapus');
        }
        break;
    }
  });

  // ---------- Dialog paket
  function bukaDialogPaket(id) {
    paketDiedit = id;
    $('dlg-paket-judul').textContent = id ? 'Ubah Paket' : 'Paket Soal Baru';
    $('pk-nama').value = id ? data.paket[id].nama : '';
    $('pk-mapel').value = id ? data.paket[id].mapel || '' : '';
    $('dlg-paket').returnValue = '';
    $('dlg-paket').showModal();
  }
  $('btn-paket-baru').addEventListener('click', () => bukaDialogPaket(null));
  $('form-paket').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'simpan') return;
    try {
      const id = await fb.simpanPaket(paketDiedit, { nama: $('pk-nama').value.trim(), mapel: $('pk-mapel').value.trim() });
      paketAktif = id;
      renderDaftarPaket();
      renderDetail();
      toast('Paket disimpan', 'sukses');
    } catch (e) { gagal(e); }
  });

  // ---------- Dialog soal
  function bukaDialogSoal(id) {
    soalDiedit = id;
    const s = id ? data.soal[paketAktif][id] : null;
    $('dlg-soal-judul').textContent = id ? 'Edit Soal' : 'Tambah Soal';
    $('s-soal').value = s?.soal || '';
    for (const h of ['a', 'b', 'c', 'd']) $(`s-${h}`).value = s?.opsi?.[h] || '';
    $('s-kunci').value = (id && data.kunci[paketAktif]?.[id]) || 'a';
    $('s-mapel').value = s?.mapel || data.paket[paketAktif]?.mapel || '';
    $('s-gambar').value = s?.gambar || '';
    $('dlg-soal').returnValue = '';
    $('dlg-soal').showModal();
  }
  $('form-soal').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'simpan') return;
    const s = {
      soal: $('s-soal').value.trim(),
      a: $('s-a').value.trim(), b: $('s-b').value.trim(), c: $('s-c').value.trim(), d: $('s-d').value.trim(),
      kunci: $('s-kunci').value, mapel: $('s-mapel').value.trim(), gambar: $('s-gambar').value.trim()
    };
    try {
      await fb.simpanSoal(paketAktif, soalDiedit, s);
      toast('Soal disimpan', 'sukses');
    } catch (e) { gagal(e); }
  });

  // ---------- Dialog impor
  function bukaDialogImpor() {
    hasilImpor = null;
    $('impor-file').value = '';
    $('impor-hasil').innerHTML = '';
    $('impor-ok').disabled = true;
    $('dlg-impor').returnValue = '';
    $('dlg-impor').showModal();
  }
  $('unduh-template').addEventListener('click', (e) => { e.preventDefault(); unduhTemplate(); });
  $('impor-file').addEventListener('change', async () => {
    const f = $('impor-file').files[0];
    if (!f) return;
    $('impor-hasil').innerHTML = '<p class="redup">Membaca file…</p>';
    try {
      hasilImpor = await bacaFileSoal(f);
      const { valid, galat } = hasilImpor;
      $('impor-hasil').innerHTML = `
        <div class="pesan ${valid.length ? 'ok' : 'error'}">${valid.length} soal siap diimpor${galat.length ? `, ${galat.length} baris dilewati` : ''}.</div>
        ${galat.length ? `<div class="pesan error" style="max-height:120px;overflow:auto">${galat.map(escapeHtml).join('<br>')}</div>` : ''}
        ${valid.length ? `<div class="gulir" style="max-height:200px"><table class="t">
          <thead><tr><th>Soal</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Kunci</th></tr></thead>
          <tbody>${valid.slice(0, 50).map((s) => `<tr><td>${escapeHtml(s.soal)}</td><td>${escapeHtml(s.a)}</td><td>${escapeHtml(s.b)}</td><td>${escapeHtml(s.c)}</td><td>${escapeHtml(s.d)}</td><td><b>${s.kunci.toUpperCase()}</b></td></tr>`).join('')}</tbody>
        </table></div>` : ''}`;
      $('impor-ok').disabled = !valid.length;
    } catch (e) {
      console.error(e);
      $('impor-hasil').innerHTML = `<div class="pesan error">Gagal membaca file: ${escapeHtml(e.message)}</div>`;
    }
  });
  $('form-impor').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'impor' || !hasilImpor?.valid.length) return;
    try {
      await fb.imporSoal(paketAktif, hasilImpor.valid);
      toast(`${hasilImpor.valid.length} soal berhasil diimpor`, 'sukses');
    } catch (e) { gagal(e); }
  });

  function gagal(e) {
    console.error(e);
    toast('Gagal: ' + (e.message || e), 'error', 5000);
  }

  return {
    perbarui(d) {
      data = d;
      renderDaftarPaket();
      renderDetail();
    }
  };
}
