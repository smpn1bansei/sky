// =====================================================================
//  SESI KUIS — logika soal, skor & progres (terpisah dari grafis).
//  SesiOffline : soal dari JSON lokal, skor di localStorage.
//  SesiOnline  : soal dari Firebase, jawaban diperiksa oleh Security Rules.
// =====================================================================
import { pengaturanGame } from '../config.js';
import { acakBerseed, hashString, kocok, bacaLokal, simpanLokal, hapusLokal, HURUF } from './util.js';

const MIN_SISA_SETELAH_REFRESH = 5; // detik

class Sesi {
  constructor() {
    this.daftar = [];       // [{ id, teks, gambar, opsi:[{kunci,teks}] }]
    this.indeks = 0;        // soal berikutnya
    this.benar = 0;
    this.salah = 0;
    this.skor = 0;
    this.poinTerakhir = 0;
    this.waktuPerSoal = 30;
  }

  get total() { return this.daftar.length; }
  get selesaiSemua() { return this.indeks >= this.total; }
  get nilai() { return this.total ? Math.round((this.benar / this.total) * 100) : 0; }
  get soalSekarang() { return this.daftar[this.indeks]; }

  /** Menyusun soal untuk ditampilkan, opsi diacak dengan seed tetap (aman saat refresh). */
  susunSoal(id, s, acakOpsi, seed) {
    let urutan = HURUF.slice();
    if (acakOpsi) urutan = kocok(urutan, acakBerseed(hashString(seed + id)));
    const opsi = urutan.map((k) => ({ kunci: k, teks: s.opsi?.[k] ?? s[k] ?? '' }));
    return { id, teks: s.soal, gambar: s.gambar || '', opsi };
  }

  /**
   * Menandai waktu mulai soal (disimpan di perangkat) agar refresh tidak mereset timer.
   * @returns sisa detik
   */
  mulaiSoal(id) {
    const kunci = `sq_mulai_${this.idSesi}_${id}`;
    let mulai = bacaLokal(kunci);
    if (!mulai) { mulai = Date.now(); simpanLokal(kunci, mulai); }
    const sisa = this.waktuPerSoal - (Date.now() - mulai) / 1000;
    return Math.max(MIN_SISA_SETELAH_REFRESH, Math.min(this.waktuPerSoal, sisa));
  }

  hitungPoin(benar, sisaDetik) {
    if (!benar) return 0;
    const dasar = pengaturanGame.poinBenar || 100;
    return dasar + Math.round(dasar * 0.5 * Math.max(0, sisaDetik) / this.waktuPerSoal);
  }

  bersihkanTimer() {
    for (const s of this.daftar) hapusLokal(`sq_mulai_${this.idSesi}_${s.id}`);
  }
}

// ---------------------------------------------------------------------
export class SesiOffline extends Sesi {
  static KUNCI = 'sq_offline_progres';

  static adaProgres() {
    const p = bacaLokal(SesiOffline.KUNCI);
    return p && p.indeks < p.urutan.length ? p : null;
  }

  static async buat({ nama, kelas, lanjut = false }) {
    const res = await fetch(pengaturanGame.fileSoalOffline);
    if (!res.ok) throw new Error('File soal offline tidak ditemukan.');
    const data = await res.json();
    const sesi = new SesiOffline();
    sesi.judul = data.judul || 'Latihan';
    sesi.waktuPerSoal = data.waktuPerSoal || pengaturanGame.waktuPerSoalOffline || 30;
    const bank = Object.fromEntries(data.soal.map((s, i) => [String(s.id ?? i + 1), s]));
    sesi.kunciJawaban = Object.fromEntries(Object.entries(bank).map(([id, s]) => [id, String(s.kunci).toLowerCase().trim()]));

    let p = lanjut ? SesiOffline.adaProgres() : null;
    if (!p) {
      const ids = Object.keys(bank);
      const jumlah = Math.min(data.jumlahSoal || ids.length, ids.length);
      p = {
        nama, kelas, seed: Math.random().toString(36).slice(2),
        urutan: kocok(ids).slice(0, jumlah),
        indeks: 0, benar: 0, salah: 0, skor: 0, jawaban: {}
      };
    }
    sesi.p = p;
    sesi.nama = p.nama;
    sesi.kelas = p.kelas;
    sesi.idSesi = `off_${p.seed}`;
    sesi.kesulitan = pengaturanGame.kesulitan;
    sesi.daftar = p.urutan.map((id) => sesi.susunSoal(id, bank[id], true, p.seed));
    Object.assign(sesi, { indeks: p.indeks, benar: p.benar, salah: p.salah, skor: p.skor });
    sesi.simpan();
    return sesi;
  }

  simpan() {
    Object.assign(this.p, { indeks: this.indeks, benar: this.benar, salah: this.salah, skor: this.skor });
    simpanLokal(SesiOffline.KUNCI, this.p);
  }

  async jawab(id, pilihan, durasi, sisa) {
    const benar = pilihan !== '-' && this.kunciJawaban[id] === pilihan;
    this.poinTerakhir = this.hitungPoin(benar, sisa);
    if (benar) this.benar++; else this.salah++;
    this.skor += this.poinTerakhir;
    this.p.jawaban[id] = { pilihan, benar, durasi };
    this.indeks++;
    this.simpan();
    return benar;
  }

  async selesai() {
    this.bersihkanTimer();
    hapusLokal(SesiOffline.KUNCI);
    const riwayat = bacaLokal('sq_riwayat', []);
    riwayat.unshift({ nama: this.nama, kelas: this.kelas, benar: this.benar, total: this.total, nilai: this.nilai, skor: this.skor, waktu: Date.now() });
    simpanLokal('sq_riwayat', riwayat.slice(0, 10));
  }

  pantauStatus() { /* tidak ada guru di mode offline */ }
}

// ---------------------------------------------------------------------
export class SesiOnline extends Sesi {
  static async masuk({ pin, nama, kelas }) {
    const fb = await import('./firebase.js');
    await fb.inisialisasi();
    const { uid, info, siswa, semuaSoal, jawaban } = await fb.masukSiswa({ pin, nama, kelas });

    const sesi = new SesiOnline();
    sesi.fb = fb;
    sesi.pin = pin;
    sesi.uid = uid;
    sesi.info = info;
    sesi.idSesi = `${pin}_${uid}`;
    sesi.nama = siswa.nama;
    sesi.kelas = siswa.kelas;
    sesi.judul = info.judul || 'Kuis';
    sesi.waktuPerSoal = info.waktuPerSoal || 30;
    sesi.statusRoom = info.status;
    sesi.kesulitan = info.kesulitan || pengaturanGame.kesulitan;

    const ids = Object.entries(siswa.urutan || {}).sort((a, b) => a[1] - b[1]).map(([id]) => id).filter((id) => semuaSoal[id]);
    sesi.daftar = ids.map((id) => sesi.susunSoal(id, semuaSoal[id], info.acakOpsi, uid));

    // Lanjutkan dari soal pertama yang belum dijawab (setelah refresh)
    let i = 0;
    while (i < ids.length && jawaban[ids[i]]) i++;
    sesi.indeks = i;
    for (const id of ids) {
      if (!jawaban[id]) continue;
      if (jawaban[id].benar) sesi.benar++; else sesi.salah++;
    }
    sesi.skor = siswa.skor || 0;
    sesi.sudahSelesai = siswa.status === 'selesai';
    return sesi;
  }

  pantauStatus(cb) {
    this.lepasStatus = this.fb.pantauStatusRoom(this.pin, (status) => {
      this.statusRoom = status;
      cb(status);
    });
  }

  async mulaiBermain() {
    await this.fb.updateSiswa(this.pin, this.uid, { status: 'bermain' }).catch(() => {});
  }

  async jawab(id, pilihan, durasi, sisa) {
    const benar = await this.fb.kirimJawaban(this.pin, this.uid, id, pilihan, durasi);
    this.poinTerakhir = this.hitungPoin(benar, sisa);
    if (benar) this.benar++; else this.salah++;
    this.skor += this.poinTerakhir;
    this.indeks++;
    this.fb.updateSiswa(this.pin, this.uid, {
      soalKe: this.indeks, benar: this.benar, salah: this.salah, skor: this.skor, nilai: this.nilai,
      status: this.selesaiSemua ? 'selesai' : 'bermain'
    }).catch((e) => console.warn('Gagal memperbarui skor', e));
    return benar;
  }

  async selesai() {
    this.bersihkanTimer();
    await this.fb.updateSiswa(this.pin, this.uid, {
      soalKe: this.indeks, benar: this.benar, salah: this.salah, skor: this.skor, nilai: this.nilai, status: 'selesai'
    }).catch(() => {});
  }
}
