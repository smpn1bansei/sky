// =====================================================================
//  SEMUA FUNGSI BACA/TULIS FIREBASE (siswa & guru)
//  SDK Firebase v10 (modular) dimuat dari CDN hanya bila config.js diisi,
//  sehingga mode offline tetap jalan tanpa internet ke Firebase.
// =====================================================================
import { firebaseConfig, firebaseSiap } from '../config.js';
import { kunciNama, acakBerseed, hashString, kocok } from './util.js';

const CDN = 'https://www.gstatic.com/firebasejs/10.12.2';
let auth = null;
let db = null;
let A = null; // modul firebase-auth
let D = null; // modul firebase-database

/** Error dengan pesan yang aman ditampilkan ke pengguna. */
export class PesanError extends Error {}

export async function inisialisasi() {
  if (db) return;
  if (!firebaseSiap()) throw new PesanError('config.js belum diisi.');
  const [appMod, authMod, dbMod] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-database.js`)
  ]);
  A = authMod;
  D = dbMod;
  const app = appMod.initializeApp(firebaseConfig);
  auth = A.getAuth(app);
  db = D.getDatabase(app);
}

const r = (path) => D.ref(db, path);
export const kunciEmail = (email) => String(email).toLowerCase().trim().replaceAll('.', ',');

export function izinDitolak(e) {
  return String(e?.code || e?.message || e).toUpperCase().includes('PERMISSION_DENIED');
}

// =====================================================================
//  SISWA
// =====================================================================

async function loginAnonim() {
  await auth.authStateReady();
  if (!auth.currentUser) {
    try {
      await A.signInAnonymously(auth);
    } catch (e) {
      console.error(e);
      throw new PesanError('Gagal masuk ke server. Pastikan internet tersambung dan "Anonymous" sudah diaktifkan di Firebase Authentication.');
    }
  }
  return auth.currentUser.uid;
}

/**
 * Siswa bergabung ke room.
 * - ID siswa = NAMA LENGKAP yang dinormalkan (huruf kecil, spasi dirapikan).
 *   Nama yang sama tidak bisa dipakai dua kali di satu room.
 * - Satu perangkat boleh dipakai bergantian oleh beberapa siswa dengan nama berbeda.
 * - Nama yang sama di perangkat yang sama = siswa yang sama → lanjut dari soal terakhir.
 */
export async function masukSiswa({ pin, nama, kelas }) {
  const uid = await loginAnonim();
  let info;
  try {
    info = (await D.get(r(`rooms/${pin}/info`))).val();
  } catch (e) {
    if (izinDitolak(e)) throw new PesanError('Akses ditolak. Pastikan Security Rules terbaru sudah dipasang (lihat README).');
    throw e;
  }
  if (!info) throw new PesanError('PIN tidak ditemukan. Periksa kembali 6 digit PIN dari guru.');
  if (info.status === 'selesai') throw new PesanError('Kuis dengan PIN ini sedang ditutup oleh guru. Tunggu guru membukanya lagi.');

  const sid = kunciNama(nama);
  if (!sid) throw new PesanError('Nama tidak valid.');
  // Mengklaim nama: berhasil bila nama belum dipakai, atau dipakai oleh perangkat ini sendiri.
  try {
    await D.set(r(`rooms/${pin}/namaIndex/${sid}`), uid);
  } catch (e) {
    if (izinDitolak(e)) {
      throw new PesanError(`Nama "${nama}" sudah dipakai peserta lain di kuis ini. Gunakan nama lengkapmu yang berbeda, atau minta guru menekan "Reset" bila itu memang kamu (pindah perangkat).`);
    }
    throw e;
  }

  const siswaRef = r(`rooms/${pin}/siswa/${sid}`);
  let siswa = (await D.get(siswaRef)).val();
  const semuaSoal = (await D.get(r(`soal/${info.paketId}`))).val() || {};

  if (!siswa) {
    const ids = Object.keys(semuaSoal).sort();
    if (!ids.length) throw new PesanError('Paket soal untuk kuis ini masih kosong. Hubungi guru.');
    const rng = acakBerseed(hashString(sid + pin));
    const terpilih = (info.acakSoal ? kocok(ids, rng) : ids).slice(0, Math.min(info.jumlahSoal, ids.length));
    siswa = {
      nama, kelas, pemilik: uid,
      soalKe: 0, benar: 0, salah: 0, skor: 0, nilai: 0, tabrakan: 0,
      status: info.status === 'berjalan' ? 'bermain' : 'menunggu',
      online: true,
      bergabung: D.serverTimestamp(),
      terakhirAktif: D.serverTimestamp(),
      urutan: Object.fromEntries(terpilih.map((id, i) => [id, i]))
    };
    await D.update(siswaRef, siswa);
  }

  const jawaban = (await D.get(r(`rooms/${pin}/jawaban/${sid}`))).val() || {};
  try { pasangPresence(pin, sid); } catch (e) { console.warn('Status online gagal dipasang', e); }
  return { sid, info, siswa, semuaSoal, jawaban };
}

// Status online siswa. Bila perangkat dipakai siswa lain, status siswa sebelumnya dimatikan.
let presence = null;
function pasangPresence(pin, sid) {
  const path = `rooms/${pin}/siswa/${sid}/online`;
  if (presence?.path === path) return;
  if (presence) {
    presence.lepas();
    D.onDisconnect(presence.ref).cancel().catch(() => {});
    D.set(presence.ref, false).catch(() => {});
  }
  const onlineRef = r(path);
  const lepas = D.onValue(r('.info/connected'), (s) => {
    if (s.val() === true) {
      D.onDisconnect(onlineRef).set(false)
        .then(() => D.set(onlineRef, true))
        .catch(() => {});
    }
  });
  presence = { path, ref: onlineRef, lepas };
}

/**
 * Mengirim jawaban. Kunci jawaban TIDAK ada di browser siswa:
 * jawaban ditulis dengan klaim benar=true; Security Rules membandingkan dengan
 * /kunci (yang hanya bisa dibaca guru). Jika ditolak → tulis ulang benar=false.
 */
export async function kirimJawaban(pin, sid, soalId, pilihan, durasi) {
  const jr = r(`rooms/${pin}/jawaban/${sid}/${soalId}`);
  const data = (benar) => ({ pilihan, benar, waktu: D.serverTimestamp(), durasi: Math.round(durasi * 10) / 10 });
  if (pilihan !== '-') {
    try {
      await D.set(jr, data(true));
      return true;
    } catch (e) {
      if (!izinDitolak(e)) throw e;
    }
  }
  try {
    await D.set(jr, data(false));
    return false;
  } catch (e) {
    // Mungkin sudah pernah terjawab (mis. jaringan putus lalu tersambung lagi)
    const lama = (await D.get(jr)).val();
    if (lama) return lama.benar === true;
    if (izinDitolak(e)) throw new PesanError('Jawaban ditolak server. Mungkin kuis sudah diakhiri guru.');
    throw e;
  }
}

export async function updateSiswa(pin, sid, data) {
  await D.update(r(`rooms/${pin}/siswa/${sid}`), { ...data, terakhirAktif: D.serverTimestamp() });
}

export function pantauStatusRoom(pin, cb) {
  return D.onValue(r(`rooms/${pin}/info/status`), (s) => cb(s.val()));
}

// =====================================================================
//  GURU — autentikasi
// =====================================================================

export function pantauAuth(cb) {
  return A.onAuthStateChanged(auth, cb);
}

function pesanAuth(e) {
  const kode = e?.code || '';
  if (kode.includes('invalid-credential') || kode.includes('wrong-password') || kode.includes('user-not-found')) return 'Email atau kata sandi salah.';
  if (kode.includes('email-already-in-use')) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (kode.includes('weak-password')) return 'Kata sandi minimal 6 karakter.';
  if (kode.includes('invalid-email')) return 'Format email tidak valid.';
  if (kode.includes('operation-not-allowed')) return 'Login Email/Password belum diaktifkan di Firebase Authentication.';
  if (kode.includes('too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (kode.includes('network')) return 'Tidak ada koneksi internet.';
  return e?.message || String(e);
}

export async function loginGuru(email, sandi) {
  try { await A.signInWithEmailAndPassword(auth, email, sandi); }
  catch (e) { throw new PesanError(pesanAuth(e)); }
}

export async function daftarAkunGuru(email, sandi) {
  try { await A.createUserWithEmailAndPassword(auth, email, sandi); }
  catch (e) { throw new PesanError(pesanAuth(e)); }
}

export async function resetSandi(email) {
  try { await A.sendPasswordResetEmail(auth, email); }
  catch (e) { throw new PesanError(pesanAuth(e)); }
}

export async function logout() {
  await A.signOut(auth);
}

/**
 * Mengecek apakah akun yang login terdaftar sebagai guru.
 * Akun guru PERTAMA otomatis menjadi guru (bila daftar guru masih kosong).
 * @returns 'guru' | 'guru-pertama' | 'bukan'
 */
export async function cekStatusGuru() {
  const user = auth.currentUser;
  if (!user || !user.email) return 'bukan';
  const kunci = kunciEmail(user.email);
  try {
    if ((await D.get(r(`guru/${kunci}`))).val() === true) return 'guru';
  } catch (e) {
    if (!izinDitolak(e)) throw e;
  }
  try {
    await D.set(r(`guru/${kunci}`), true);
    return 'guru-pertama';
  } catch (e) {
    if (izinDitolak(e)) return 'bukan';
    throw e;
  }
}

export function pantauGuru(cb) {
  return D.onValue(r('guru'), (s) => cb(Object.keys(s.val() || {}).map((k) => k.replaceAll(',', '.'))));
}
export const tambahGuru = (email) => D.set(r(`guru/${kunciEmail(email)}`), true);
export const hapusGuru = (email) => D.remove(r(`guru/${kunciEmail(email)}`));
export const emailSaya = () => auth.currentUser?.email || '';
export const uidSaya = () => auth.currentUser?.uid || '';

// =====================================================================
//  GURU — bank soal
//  paket/{paketId}            : { nama, mapel, dibuatOleh, dibuatPada }
//  soal/{paketId}/{soalId}    : { soal, opsi:{a,b,c,d}, gambar?, mapel? }   ← dibaca siswa
//  kunci/{paketId}/{soalId}   : "a" | "b" | "c" | "d"                      ← hanya guru
// =====================================================================

/** Memantau seluruh bank soal; cb({paket, soal, kunci}) */
export function pantauBankSoal(cb) {
  const data = { paket: null, soal: null, kunci: null };
  const kirim = () => { if (data.paket !== null && data.soal !== null && data.kunci !== null) cb({ ...data }); };
  const lepas = ['paket', 'soal', 'kunci'].map((k) => D.onValue(r(k), (s) => { data[k] = s.val() || {}; kirim(); }));
  return () => lepas.forEach((f) => f());
}

export async function simpanPaket(paketId, { nama, mapel }) {
  if (paketId) {
    await D.update(r(`paket/${paketId}`), { nama, mapel });
    return paketId;
  }
  const id = D.push(r('paket')).key;
  await D.set(r(`paket/${id}`), { nama, mapel: mapel || '', dibuatOleh: uidSaya(), dibuatPada: D.serverTimestamp() });
  return id;
}

export async function hapusPaket(paketId) {
  await D.update(D.ref(db), { [`paket/${paketId}`]: null, [`soal/${paketId}`]: null, [`kunci/${paketId}`]: null });
}

function dataSoal(s) {
  const d = { soal: s.soal, opsi: { a: s.a, b: s.b, c: s.c, d: s.d } };
  if (s.gambar) d.gambar = s.gambar;
  if (s.mapel) d.mapel = s.mapel;
  return d;
}

export async function simpanSoal(paketId, soalId, s) {
  const id = soalId || D.push(r(`soal/${paketId}`)).key;
  await D.update(D.ref(db), {
    [`soal/${paketId}/${id}`]: dataSoal(s),
    [`kunci/${paketId}/${id}`]: s.kunci
  });
  return id;
}

export async function hapusSoal(paketId, soalId) {
  await D.update(D.ref(db), { [`soal/${paketId}/${soalId}`]: null, [`kunci/${paketId}/${soalId}`]: null });
}

/** Impor banyak soal sekaligus (dari CSV/Excel). */
export async function imporSoal(paketId, daftar) {
  const pembaruan = {};
  for (const s of daftar) {
    const id = D.push(r(`soal/${paketId}`)).key;
    pembaruan[`soal/${paketId}/${id}`] = dataSoal(s);
    pembaruan[`kunci/${paketId}/${id}`] = s.kunci;
  }
  await D.update(D.ref(db), pembaruan);
}

export async function ambilSoalDanKunci(paketId) {
  const [soal, kunci] = await Promise.all([D.get(r(`soal/${paketId}`)), D.get(r(`kunci/${paketId}`))]);
  return { soal: soal.val() || {}, kunci: kunci.val() || {} };
}

// =====================================================================
//  GURU — room
// =====================================================================

export async function buatRoom(cfg) {
  let pin;
  for (let i = 0; i < 20; i++) {
    const coba = String(Math.floor(100000 + Math.random() * 900000));
    if (!(await D.get(r(`rooms/${coba}/info`))).exists()) { pin = coba; break; }
  }
  if (!pin) throw new PesanError('Gagal membuat PIN unik, coba lagi.');
  const info = {
    judul: cfg.judul,
    paketId: cfg.paketId,
    namaPaket: cfg.namaPaket,
    jumlahSoal: cfg.jumlahSoal,
    waktuPerSoal: cfg.waktuPerSoal,
    acakSoal: cfg.acakSoal,
    acakOpsi: cfg.acakOpsi,
    mode: cfg.mode, // "pin" | "langsung"
    kesulitan: cfg.kesulitan || 'sedang', // "mudah" | "sedang" | "sulit"
    status: cfg.mode === 'langsung' ? 'berjalan' : 'menunggu',
    dibuatOleh: uidSaya(),
    emailPembuat: emailSaya(),
    dibuatPada: D.serverTimestamp()
  };
  await D.update(D.ref(db), {
    [`rooms/${pin}/info`]: info,
    [`daftarRoom/${pin}`]: { judul: cfg.judul, namaPaket: cfg.namaPaket, dibuatOleh: uidSaya(), dibuatPada: D.serverTimestamp() }
  });
  return pin;
}

export function pantauDaftarRoom(cb) {
  return D.onValue(r('daftarRoom'), (s) => cb(s.val() || {}));
}

export function pantauRoom(pin, cb) {
  return D.onValue(r(`rooms/${pin}`), (s) => cb(s.val()));
}

export async function setStatusRoom(pin, status) {
  const data = { status };
  if (status === 'berjalan') data.dimulaiPada = D.serverTimestamp();
  if (status === 'selesai') data.diakhiriPada = D.serverTimestamp();
  await D.update(r(`rooms/${pin}/info`), data);
}

export async function hapusRoom(pin) {
  await D.update(D.ref(db), { [`rooms/${pin}`]: null, [`daftarRoom/${pin}`]: null });
}

/** Menghapus siswa dari room (agar bisa masuk ulang dari perangkat lain). */
export async function resetSiswa(pin, sid) {
  await D.update(D.ref(db), {
    [`rooms/${pin}/siswa/${sid}`]: null,
    [`rooms/${pin}/jawaban/${sid}`]: null,
    [`rooms/${pin}/namaIndex/${sid}`]: null
  });
}
