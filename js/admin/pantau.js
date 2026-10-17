// =====================================================================
//  PANEL GURU — Pantau live (leaderboard realtime), Mulai/Akhiri, ekspor Excel/CSV.
// =====================================================================
import { escapeHtml, toast, formatTanggal } from '../util.js';
import { muatXLSX } from './impor.js';
import { konfirmasi } from '../ui/konfirmasi.js';

const $ = (id) => document.getElementById(id);
const LABEL_STATUS = { menunggu: 'Menunggu', berjalan: 'Berjalan', selesai: 'Selesai' };
const LABEL_KESULITAN = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };

/**
 * Menghitung baris leaderboard. Benar/salah dihitung dari node "jawaban"
 * (sudah divalidasi Security Rules terhadap kunci), bukan dari angka kiriman siswa.
 */
export function hitungBaris(room) {
  const info = room?.info || {};
  const jaw = room?.jawaban || {};
  return Object.entries(room?.siswa || {}).map(([sid, s]) => {
    const ids = Object.entries(s.urutan || {}).sort((a, b) => a[1] - b[1]).map(([id]) => id).slice(0, info.jumlahSoal || 999);
    const j = jaw[sid] || {};
    let benar = 0;
    let dijawab = 0;
    for (const id of ids) {
      if (!j[id]) continue;
      dijawab++;
      if (j[id].benar === true) benar++;
    }
    const total = ids.length || info.jumlahSoal || 1;
    return {
      sid, nama: s.nama || '?', kelas: s.kelas || '',
      tabrakan: s.tabrakan || 0,
      bergabung: s.bergabung, terakhirAktif: s.terakhirAktif,
      total, dijawab, benar, salah: dijawab - benar, skor: s.skor || 0,
      nilai: Math.round((benar / total) * 100),
      selesai: s.status === 'selesai' || dijawab >= total,
      online: s.online === true, jawaban: j
    };
  }).sort((a, b) => b.nilai - a.nilai || b.skor - a.skor || b.dijawab - a.dijawab || a.nama.localeCompare(b.nama));
}

export function initPantau(fb) {
  let lepas = null;
  let room = null;
  let soalPaket = null;
  const api = { pin: null, buka, tutup };

  function buka(pin) {
    tutup();
    api.pin = pin;
    $('kartu-pantau').hidden = false;
    $('p-pin').textContent = pin;
    const link = new URL(`index.html?pin=${pin}`, location.href).href;
    $('p-link').href = link;
    $('p-link').textContent = link;
    $('p-tabel').innerHTML = '<tr><td colspan="11" class="kosong">Memuat…</td></tr>';
    lepas = fb.pantauRoom(pin, (d) => {
      room = d;
      if (!d) { toast('Room tidak ditemukan / sudah dihapus', 'error'); tutup(); return; }
      if (!soalPaket && d.info?.paketId) {
        soalPaket = {};
        fb.ambilSoalDanKunci(d.info.paketId).then((x) => { soalPaket = x; }).catch(() => { soalPaket = null; });
      }
      render();
    });
    $('kartu-pantau').scrollIntoView({ behavior: 'smooth' });
  }

  function tutup() {
    if (lepas) lepas();
    lepas = null;
    room = null;
    soalPaket = null;
    api.pin = null;
    $('kartu-pantau').hidden = true;
  }

  function render() {
    const info = room.info || {};
    $('p-judul').textContent = info.judul || '-';
    $('p-paket').textContent = info.namaPaket || '-';
    $('p-pengaturan').textContent = `${info.jumlahSoal} soal · ${info.waktuPerSoal} dtk/soal · rute ${LABEL_KESULITAN[info.kesulitan] || 'Sedang'} · mode ${info.mode === 'langsung' ? 'Langsung' : 'PIN'}${info.acakSoal ? ' · acak soal' : ''}${info.acakOpsi ? ' · acak opsi' : ''}`;
    const st = $('p-status');
    st.textContent = LABEL_STATUS[info.status] || info.status;
    st.className = `lencana ${info.status}`;
    // Room yang sudah diakhiri bisa dimulai lagi (mis. untuk kelas lain di jam berbeda)
    $('p-mulai').disabled = info.status === 'berjalan';
    $('p-mulai').textContent = info.status === 'selesai' ? '▶ Mulai lagi' : '▶ Mulai';
    $('p-akhiri').disabled = info.status === 'selesai';

    const baris = hitungBaris(room);
    $('r-siswa').textContent = baris.length;
    $('r-online').textContent = baris.filter((b) => b.online && !b.selesai).length;
    $('r-selesai').textContent = baris.filter((b) => b.selesai).length;
    $('r-rata').textContent = baris.length ? Math.round(baris.reduce((t, b) => t + b.nilai, 0) / baris.length) : 0;

    $('p-tabel').innerHTML = baris.length ? baris.map((b, i) => {
      const status = b.selesai
        ? '<span class="lencana selesai">Selesai</span>'
        : b.online ? `<span class="lencana online">${info.status === 'menunggu' ? 'Menunggu' : 'Online'}</span>` : '<span class="lencana offline">Offline</span>';
      const ke = b.selesai ? b.total : Math.min(b.dijawab + 1, b.total);
      return `<tr class="p${i + 1}" data-sid="${escapeHtml(b.sid)}">
        <td class="peringkat">${i + 1}</td>
        <td><b>${escapeHtml(b.nama)}</b></td>
        <td>${escapeHtml(b.kelas)}</td>
        <td>${ke}/${b.total}<div class="bar-progres"><div style="width:${(b.dijawab / b.total) * 100}%"></div></div></td>
        <td style="color:#15803d;font-weight:700">${b.benar}</td>
        <td style="color:#b91c1c">${b.salah}</td>
        <td>${b.skor.toLocaleString('id-ID')}</td>
        <td><b>${b.nilai}</b></td>
        <td>💥 ${b.tabrakan}</td>
        <td>${status}</td>
        <td><button class="b kecil" data-aksi="reset" title="Hapus data siswa ini agar bisa masuk ulang">Reset</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="11" class="kosong">Belum ada siswa. Bagikan PIN <b>${escapeHtml(api.pin)}</b> kepada siswa.</td></tr>`;
  }

  // ---------- Tombol
  $('p-mulai').addEventListener('click', async () => {
    if (room?.info?.status === 'selesai') {
      const ya = await konfirmasi({
        judul: 'Mulai lagi kuis ini?',
        pesan: `Room ${api.pin} akan dibuka kembali dengan soal & pengaturan yang sama.
Nilai siswa yang sudah selesai TETAP tersimpan dan tidak bisa mengulang dengan nama yang sama.
Siswa baru (mis. kelas lain) bisa langsung masuk, dan siswa yang tadi terhenti bisa melanjutkan.`,
        ok: 'Mulai lagi', jenis: 'info', ikon: '▶️'
      });
      if (!ya) return;
    }
    try { await fb.setStatusRoom(api.pin, 'berjalan'); toast('Kuis dimulai!', 'sukses'); }
    catch (e) { toast('Gagal: ' + e.message, 'error'); }
  });
  $('p-akhiri').addEventListener('click', async () => {
    const belum = hitungBaris(room).filter((b) => !b.selesai).length;
    const ya = await konfirmasi({
      judul: 'Akhiri kuis sekarang?',
      pesan: `${belum ? `${belum} siswa belum selesai. ` : ''}Semua siswa akan langsung melihat layar hasil dan tidak bisa menjawab lagi.
Soal yang belum dijawab dihitung tidak dijawab. Room ini bisa dimulai lagi kapan saja.`,
      ok: 'Akhiri kuis', jenis: 'bahaya', ikon: '⏹️'
    });
    if (!ya) return;
    try { await fb.setStatusRoom(api.pin, 'selesai'); toast('Kuis diakhiri'); }
    catch (e) { toast('Gagal: ' + e.message, 'error'); }
  });
  $('p-tutup').addEventListener('click', tutup);
  $('p-salin').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('p-link').href);
      toast('Tautan disalin', 'sukses');
    } catch { toast('Salin manual: ' + $('p-link').href); }
  });
  $('p-tabel').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-aksi="reset"]');
    if (!b) return;
    const sid = b.closest('tr').dataset.sid;
    const s = room?.siswa?.[sid];
    if (!s) return;
    const ya = await konfirmasi({
      judul: `Reset data ${s.nama}?`,
      pesan: `Kelas: ${s.kelas}
Semua jawaban siswa ini di room ini akan dihapus, lalu nama ini bisa dipakai masuk ulang dari soal pertama (mis. setelah ganti perangkat).`,
      ok: 'Reset siswa', jenis: 'bahaya', ikon: '♻️'
    });
    if (!ya) return;
    try { await fb.resetSiswa(api.pin, sid); toast('Data siswa direset'); }
    catch (err) { toast('Gagal: ' + err.message, 'error'); }
  });
  $('p-xlsx').addEventListener('click', () => ekspor('xlsx'));
  $('p-csv').addEventListener('click', () => ekspor('csv'));

  async function ekspor(jenis) {
    if (!room) return;
    let X;
    try { X = await muatXLSX(); }
    catch { return toast('Gagal memuat SheetJS (cek koneksi internet).', 'error'); }
    const info = room.info || {};
    const baris = hitungBaris(room);
    const wb = X.utils.book_new();
    const rekap = baris.map((b, i) => ({
      Peringkat: i + 1, Nama: b.nama, Kelas: b.kelas,
      Benar: b.benar, Salah: b.salah, 'Tidak Dijawab': b.total - b.dijawab, 'Jumlah Soal': b.total,
      Nilai: b.nilai, 'Skor Game': b.skor, Status: b.selesai ? 'Selesai' : 'Belum selesai',
      Tabrakan: b.tabrakan,
      'Waktu Masuk': formatTanggal(b.bergabung), 'Terakhir Aktif': formatTanggal(b.terakhirAktif)
    }));
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rekap.length ? rekap : [{ Keterangan: 'Belum ada siswa' }]), 'Rekap Nilai');

    if (jenis === 'xlsx' && soalPaket?.soal) {
      const ids = Object.keys(soalPaket.soal).sort();
      const kunciBaris = { Nama: 'KUNCI JAWABAN', Kelas: '' };
      ids.forEach((id, i) => { kunciBaris[`S${i + 1}`] = (soalPaket.kunci[id] || '').toUpperCase(); });
      const detail = [kunciBaris, ...baris.map((b) => {
        const o = { Nama: b.nama, Kelas: b.kelas };
        ids.forEach((id, i) => {
          const j = b.jawaban[id];
          o[`S${i + 1}`] = j ? `${j.pilihan === '-' ? 'Habis' : j.pilihan.toUpperCase()} ${j.benar ? '✓' : '✗'}` : '';
        });
        return o;
      })];
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(detail), 'Detail Jawaban');
      const daftarSoal = ids.map((id, i) => {
        const s = soalPaket.soal[id];
        return { No: `S${i + 1}`, Soal: s.soal, A: s.opsi?.a, B: s.opsi?.b, C: s.opsi?.c, D: s.opsi?.d, Kunci: (soalPaket.kunci[id] || '').toUpperCase() };
      });
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(daftarSoal), 'Daftar Soal');
    }
    const aman = (info.judul || 'kuis').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
    X.writeFile(wb, `SkyCruiserQuiz_${api.pin}_${aman}.${jenis}`, { bookType: jenis });
  }

  return api;
}
