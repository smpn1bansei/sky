// =====================================================================
//  HALAMAN SISWA (index.html) — menghubungkan game 3D, UI, dan sesi kuis.
// =====================================================================
import { firebaseSiap, pengaturanGame } from '../config.js';
import { Game } from './game/game.js';
import { DAFTAR_TEMA } from './game/tema.js';
import { PINTU } from './game/portal.js';
import { aktifkanAudio, suara, setSenyap, isSenyap } from './game/audio.js';
import { HUD } from './ui/hud.js';
import { ModalSoal } from './ui/modalSoal.js';
import { tampilkanLayar, kilat } from './ui/layar.js';
import { isiLayarHasil } from './ui/layarHasil.js';
import { SesiOffline, SesiOnline } from './kuis.js';
import { bacaLokal, simpanLokal, toast } from './util.js';
import { pasangTombolLayarPenuh } from './ui/layarPenuh.js';
import { konfirmasi } from './ui/konfirmasi.js';

const ONLINE = firebaseSiap();
const $ = (id) => document.getElementById(id);

// ---------- Game & UI
const game = new Game($('kanvas'), $('joystick'), pengaturanGame);
if (pengaturanGame.modelPesawat) game.muatModel(pengaturanGame.modelPesawat, pengaturanGame.skalaModel, pengaturanGame.rotasiModelY);
const hud = new HUD();
const modal = new ModalSoal();
let sesi = null;
let sedangMain = false;
let sedangMenjawab = false;

game.on('banner', (v) => hud.setBanner(v));
game.on('kilat', () => kilat());
game.on('tema', (n) => hud.setTema(n));
game.on('pintu', (i) => prosesPintu(i));
game.on('jarak', (sisa, total) => hud.setProgres(sisa, total));
// Peringatan tampil sekali saja selama 4/3/2 detik (mudah/sedang/sulit)
game.on('peringatan', (jenis, teks, durasi) => {
  hud.peringatan(jenis, teks, durasi);
  suara.waspada();
});
game.on('hitung', (n) => {
  hud.hitung(n);
  if (n > 0) suara.tik(); else suara.mulai();
});
game.on('mentok', (sisi) => hud.mentok(sisi));
game.on('hancur', (alasan, ke) => {
  suara.ledakan();
  sesi?.catatTabrakan();
  sesi?.sinkronStat();
  hud.tampilkanHancur(alasan, ke >= 2 ? `Percobaan ke-${ke + 1}. Mengulang dari gerbang terakhir…` : 'Mengulang dari gerbang terakhir…');
});
game.on('muncul', () => {
  hud.sembunyikanHancur();
});
game.on('bantuan', () => toast('Mode bantuan aktif: rintangan di bagian ini dihilangkan dan pintu lebih longgar.', 'info', 5000));
pasangTombolLayarPenuh($('btn-layar-penuh'));

// ---------- Pilihan tema awal
let temaPilihan = bacaLokal('sq_tema', 'kota');
if (!DAFTAR_TEMA.includes(temaPilihan)) temaPilihan = 'kota'; // mis. tema lama "angkasa"
game.setTema(temaPilihan);
document.querySelectorAll('.pilih-tema button').forEach((b) => {
  b.classList.toggle('aktif', b.dataset.tema === temaPilihan);
  b.addEventListener('click', () => {
    temaPilihan = b.dataset.tema;
    simpanLokal('sq_tema', temaPilihan);
    document.querySelectorAll('.pilih-tema button').forEach((x) => x.classList.toggle('aktif', x === b));
    kilat();
    setTimeout(() => game.setTema(temaPilihan), 150);
  });
});

// ---------- Tombol suara
setSenyap(bacaLokal('sq_senyap', false));
const btnSuara = $('btn-suara');
const ikonSuara = () => { btnSuara.textContent = isSenyap() ? '🔇' : '🔊'; };
ikonSuara();
btnSuara.addEventListener('click', () => {
  setSenyap(!isSenyap());
  simpanLokal('sq_senyap', isSenyap());
  ikonSuara();
  btnSuara.blur();
});

// ---------- Layar login
const form = $('form-login');
const inNama = $('in-nama');
const inKelas = $('in-kelas');
const inPin = $('in-pin');
const errEl = $('login-error');
const btnMasuk = $('btn-masuk');

const tersimpan = bacaLokal('sq_siswa');
const pinUrl = new URLSearchParams(location.search).get('pin');
if (tersimpan) {
  inNama.value = tersimpan.nama || '';
  inKelas.value = tersimpan.kelas || '';
  if (ONLINE) inPin.value = tersimpan.pin || '';
}
if (pinUrl && /^\d{6}$/.test(pinUrl)) inPin.value = pinUrl;

if (ONLINE) {
  if (tersimpan?.pin && tersimpan?.nama && (!pinUrl || pinUrl === tersimpan.pin)) {
    $('info-lanjut').hidden = false;
    $('info-lanjut').textContent = `Halaman dimuat ulang? Tekan MASUK untuk melanjutkan sebagai ${tersimpan.nama}.`;
  }
} else {
  $('info-offline').hidden = false;
  $('lbl-pin').hidden = true;
  $('btn-lanjut-offline').addEventListener('click', async () => {
    aktifkanAudio();
    try {
      sesi = await SesiOffline.buat({ lanjut: true });
      mulaiMain();
    } catch (e) { tampilkanError(e); }
  });
  perbaruiTombolLanjutOffline();
}

/** Tombol "Lanjutkan latihan" hanya tampil bila ada progres offline yang belum selesai. */
function perbaruiTombolLanjutOffline() {
  const p = SesiOffline.adaProgres();
  const b = $('btn-lanjut-offline');
  b.hidden = !p;
  if (p) b.textContent = `Lanjutkan latihan ${p.nama} (soal ${p.indeks + 1}/${p.urutan.length})`;
}

inPin.addEventListener('input', () => { inPin.value = inPin.value.replace(/\D/g, '').slice(0, 6); });

function tampilkanError(e) {
  console.error(e);
  errEl.textContent = e?.message || 'Terjadi kesalahan.';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  aktifkanAudio();
  errEl.textContent = '';
  const nama = inNama.value.trim().replace(/\s+/g, ' ');
  const kelas = inKelas.value.trim();
  const pin = inPin.value.trim();
  if (nama.length < 2) return (errEl.textContent = 'Nama minimal 2 huruf.');
  if (!kelas) return (errEl.textContent = 'Kelas wajib diisi.');
  if (ONLINE && !/^\d{6}$/.test(pin)) return (errEl.textContent = 'PIN harus 6 digit angka.');

  btnMasuk.disabled = true;
  const labelLama = btnMasuk.textContent;
  btnMasuk.textContent = 'Memuat…';
  try {
    if (ONLINE) {
      sesi = await SesiOnline.masuk({ pin, nama, kelas });
      simpanLokal('sq_siswa', { nama: sesi.nama, kelas: sesi.kelas, pin });
      sesi.pantauStatus(saatStatusBerubah);
      if (sesi.sudahSelesai || sesi.selesaiSemua) tampilkanHasilAkhir();
      else if (sesi.statusRoom === 'menunggu') tampilkanTunggu();
      else mulaiMain();
    } else {
      simpanLokal('sq_siswa', { nama, kelas });
      sesi = await SesiOffline.buat({ nama, kelas });
      mulaiMain();
    }
  } catch (err) {
    tampilkanError(err);
  } finally {
    btnMasuk.disabled = false;
    btnMasuk.textContent = labelLama;
  }
});

// ---------- Ruang tunggu
function tampilkanTunggu() {
  $('tunggu-nama').textContent = sesi.nama;
  $('tunggu-judul').textContent = sesi.judul;
  $('tunggu-pin').textContent = sesi.pin;
  tampilkanLayar('layar-tunggu');
}

$('btn-keluar-tunggu').addEventListener('click', async () => {
  const ya = await konfirmasi({
    judul: 'Keluar dari ruang tunggu?',
    pesan: 'Kamu tetap terdaftar di kuis ini. Untuk kembali, masukkan nama, kelas, dan PIN yang sama.',
    ok: 'Keluar', batal: 'Tetap di sini', jenis: 'peringatan'
  });
  if (ya) keluar();
});

function saatStatusBerubah(status) {
  if (status === 'berjalan' && document.body.dataset.layar === 'layar-tunggu') {
    mulaiMain();
  } else if (status === 'selesai' || status === null) {
    if (sedangMain) selesaiMain('Kuis telah diakhiri oleh guru.');
    else if (document.body.dataset.layar === 'layar-tunggu') {
      tampilkanLayar('layar-login');
      errEl.textContent = 'Kuis diakhiri oleh guru sebelum dimulai.';
    }
  }
}

// ---------- Permainan
function mulaiMain() {
  if (sedangMain) return;
  if (sesi.selesaiSemua) { tampilkanHasilAkhir(); return; }
  sedangMain = true;
  tampilkanLayar(null);
  hud.tampil(true);
  hud.perbarui(sesi);
  document.body.classList.add('bermain');
  if (sesi.indeks > 0) toast(`Melanjutkan dari soal ${sesi.indeks + 1}`, 'info');
  suara.mulai();
  sesi.mulaiBermain?.();
  game.mulai({ kesulitan: sesi.kesulitan || pengaturanGame.kesulitan });
}

async function prosesPintu(i) {
  if (!sedangMain || sedangMenjawab) return;
  sedangMenjawab = true;
  suara.pintu();
  const soal = sesi.soalSekarang;
  const sisa = sesi.mulaiSoal(soal.id);
  const h = await modal.tampilkan({
    nomor: sesi.indeks + 1, total: sesi.total, teks: soal.teks, gambar: soal.gambar,
    opsi: soal.opsi, waktu: sesi.waktuPerSoal, sisa, warna: PINTU[i].css
  });

  let benar = false;
  let gagal = false;
  try {
    benar = await sesi.jawab(soal.id, h.pilihan, h.durasi, h.sisa);
  } catch (e) {
    console.error(e);
    gagal = true;
    toast(e.message || 'Gagal mengirim jawaban. Soal akan diulang.', 'error', 5000);
  }
  if (!sedangMain) { sedangMenjawab = false; modal.tutup(); return; }

  if (!gagal) {
    if (benar) suara.benar(); else suara.salah();
    hud.tampilkanPoin(benar ? `+${sesi.poinTerakhir}` : (h.habis ? 'Waktu habis' : 'Salah'), benar);
    await modal.tampilkanHasil(benar, h.habis, sesi.poinTerakhir, sesi.combo);
  }
  modal.tutup();
  sedangMenjawab = false;
  if (!sedangMain) return;
  hud.perbarui(sesi);
  game.lanjut(benar, !sesi.selesaiSemua);
  if (sesi.selesaiSemua) setTimeout(() => selesaiMain(), 1800);
}

async function selesaiMain(catatan = '') {
  if (!sedangMain) return;
  sedangMain = false;
  modal.tutup();
  game.akhiri();
  hud.tampil(false);
  document.body.classList.remove('bermain');
  await sesi.selesai();
  suara.selesai();
  tampilkanHasilAkhir(catatan);
}

function tampilkanHasilAkhir(catatan = '') {
  isiLayarHasil(sesi, { offline: !ONLINE, catatan: catatan || (ONLINE ? 'Nilaimu sudah terkirim ke guru.' : 'Mode offline: nilai hanya tersimpan di perangkat ini.') });
  tampilkanLayar('layar-hasil');
}

$('btn-main-lagi').addEventListener('click', async () => {
  try {
    sesi = await SesiOffline.buat({ nama: sesi.nama, kelas: sesi.kelas });
    mulaiMain();
  } catch (e) { toast(e.message, 'error'); }
});
$('btn-keluar').addEventListener('click', keluar);

function keluar() {
  sesi?.lepasStatus?.();
  if (sesi?.sudahSelesai || sesi?.selesaiSemua) {
    // Perangkat dipakai bergantian: kosongkan nama agar siswa berikutnya bisa langsung masuk
    $('info-lanjut').hidden = true;
    inNama.value = '';
    inKelas.value = '';
    const t = bacaLokal('sq_siswa');
    if (t) simpanLokal('sq_siswa', { pin: t.pin });
  }
  sesi = null;
  if (!ONLINE) perbaruiTombolLanjutOffline();
  tampilkanLayar('layar-login');
}

tampilkanLayar('layar-login');
btnMasuk.textContent = ONLINE ? 'MASUK' : 'MULAI LATIHAN';
btnMasuk.disabled = false;
window.__skyQuizSiap = true;

// Mode debug untuk pengujian: buka index.html?debug=1 lalu akses window.SQ di konsol.
if (new URLSearchParams(location.search).has('debug')) {
  window.SQ = { game, hud, modal, get sesi() { return sesi; } };
}
