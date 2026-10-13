// Impor soal dari CSV / Excel + ekspor. SheetJS dimuat dari CDN hanya saat dibutuhkan.

const URL_SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
let XLSX = null;

export async function muatXLSX() {
  if (!XLSX) XLSX = await import(URL_SHEETJS);
  return XLSX;
}

// Nama kolom yang diterima (huruf kecil, tanpa spasi/tanda baca)
const ALIAS = {
  soal: 'soal', pertanyaan: 'soal', question: 'soal',
  a: 'a', opsia: 'a', pilihana: 'a',
  b: 'b', opsib: 'b', pilihanb: 'b',
  c: 'c', opsic: 'c', pilihanc: 'c',
  d: 'd', opsid: 'd', pilihand: 'd',
  kunci: 'kunci', kuncijawaban: 'kunci', jawaban: 'kunci', jawabanbenar: 'kunci', answer: 'kunci',
  mapel: 'mapel', matapelajaran: 'mapel',
  gambar: 'gambar', urlgambar: 'gambar', image: 'gambar'
};

/** Parser CSV sederhana (mendukung tanda kutip & pemisah koma/titik koma/tab). */
function parseCSV(teks) {
  teks = teks.replace(/^﻿/, '');
  const barisPertama = teks.split(/\r?\n/, 1)[0];
  const hitung = (ch) => barisPertama.split(ch).length;
  const sep = [',', ';', '\t'].sort((x, y) => hitung(y) - hitung(x))[0];
  const hasil = [];
  let baris = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') { sel += '"'; i++; }
      else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === sep) { baris.push(sel); sel = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i++;
      baris.push(sel); hasil.push(baris); baris = []; sel = '';
    } else sel += c;
  }
  if (sel !== '' || baris.length) { baris.push(sel); hasil.push(baris); }
  return hasil.filter((b) => b.some((x) => x.trim() !== ''));
}

async function bacaBaris(file) {
  if (/\.csv$/i.test(file.name)) return parseCSV(await file.text());
  const X = await muatXLSX();
  const wb = X.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    .map((b) => b.map((x) => String(x ?? '')))
    .filter((b) => b.some((x) => x.trim() !== ''));
}

/**
 * Membaca file soal. Mengembalikan { valid: [...soal], galat: ['Baris 3: ...'] }
 */
export async function bacaFileSoal(file) {
  const baris = await bacaBaris(file);
  if (baris.length < 2) return { valid: [], galat: ['File kosong atau hanya berisi judul kolom.'] };
  const kepala = baris[0].map((h) => ALIAS[h.toLowerCase().replace(/[^a-z]/g, '')] || null);
  const wajib = ['soal', 'a', 'b', 'c', 'd', 'kunci'];
  const kurang = wajib.filter((k) => !kepala.includes(k));
  if (kurang.length) return { valid: [], galat: [`Kolom tidak ditemukan: ${kurang.join(', ')}. Baris pertama harus: soal, a, b, c, d, kunci`] };

  const valid = [];
  const galat = [];
  baris.slice(1).forEach((b, i) => {
    const o = {};
    kepala.forEach((k, j) => { if (k) o[k] = (b[j] ?? '').trim(); });
    const no = i + 2;
    if (!o.soal) return galat.push(`Baris ${no}: teks soal kosong.`);
    if (!o.a || !o.b || !o.c || !o.d) return galat.push(`Baris ${no}: salah satu opsi A–D kosong.`);
    let k = (o.kunci || '').toLowerCase().trim();
    if (!/^[abcd]$/.test(k)) {
      // Izinkan kunci berupa "A." / "a)" atau berupa teks opsi yang benar
      const huruf = k.match(/^([abcd])[\s.)]/);
      const teks = ['a', 'b', 'c', 'd'].find((h) => o[h].toLowerCase() === k);
      k = huruf ? huruf[1] : teks || '';
    }
    if (!k) return galat.push(`Baris ${no}: kunci "${o.kunci}" tidak valid (isi A, B, C, atau D).`);
    valid.push({ soal: o.soal, a: o.a, b: o.b, c: o.c, d: o.d, kunci: k, mapel: o.mapel || '', gambar: o.gambar || '' });
  });
  return { valid, galat };
}

export function unduhTemplate() {
  const isi = [
    'soal,a,b,c,d,kunci,mapel,gambar',
    '"Planet terbesar di tata surya adalah …",Bumi,Saturnus,Jupiter,Neptunus,C,IPA,',
    '"Hasil dari 12 × 15 adalah …",170,175,180,185,C,Matematika,',
    '"Ibu kota Jawa Barat adalah …",Semarang,Surabaya,Serang,Bandung,D,IPS,'
  ].join('\r\n');
  const blob = new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'template-soal-skycruiserquiz.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
