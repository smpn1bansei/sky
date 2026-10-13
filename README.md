# ✈️ Sky Cruiser Quiz — Game Edukasi 3D untuk Ujian Sumatif

Siswa menerbangkan pesawat menyusuri rute 3D yang berkelok (Kota → Angkasa → Gurun), menghindari rintangan dan melewati belokan tajam. Di ujung setiap rute muncul **gerbang 4 pintu berwarna** yang harus dimasuki dengan tepat. Saat pesawat masuk pintu, muncul **soal pilihan ganda A–D** dengan timer. Jawaban benar menambah poin dan mengganti tema dunia. Di akhir, siswa melihat **nilai 0–100**, dan guru memantau semuanya secara **live** lalu mengekspor nilai ke **Excel**.

- `index.html` → halaman **siswa** (game)
- `admin.html` → **panel guru** (bank soal, room/PIN, pantau live, ekspor)
- `config.js` → **satu-satunya file** yang perlu Anda isi agar terhubung ke Firebase milik Anda

Tanpa Firebase pun game tetap bisa dimainkan dalam **mode offline (latihan)** memakai soal di `assets/soal-contoh.json`.

---

## Daftar isi
1. [Fitur](#1-fitur)
2. [Menyiapkan Firebase (langkah demi langkah)](#2-menyiapkan-firebase-langkah-demi-langkah)
3. [Meng-hosting (mengonlinekan) game](#3-meng-hosting-mengonlinekan-game)
4. [Panduan guru](#4-panduan-guru)
5. [Panduan siswa](#5-panduan-siswa)
6. [Keamanan kunci jawaban — cara kerja & kelemahannya](#6-keamanan-kunci-jawaban--cara-kerja--kelemahannya)
7. [Mengganti pesawat, soal latihan, dan pengaturan](#7-mengganti-pesawat-soal-latihan-dan-pengaturan)
8. [Struktur folder & data](#8-struktur-folder--data)
9. [Pemecahan masalah](#9-pemecahan-masalah)

---

## 1. Fitur

**Siswa**
- Masuk dengan Nama Lengkap, Kelas, dan PIN 6 digit (bisa juga lewat tautan `index.html?pin=123456`).
- Ruang tunggu sampai guru menekan **Mulai** (mode PIN), atau langsung main (mode Langsung).
- Kendali keyboard (panah / WASD) dan **joystick virtual** di layar sentuh.
- Soal pilihan ganda dengan timer; jawab dengan klik atau tombol 1–4.
- Rute panjang (±0,9–1,4 km per soal, 30–50 detik terbang) dengan **belokan tajam**: di tikungan pesawat terdorong ke sisi luar, siswa harus menahan arah belokan. Hanya sisi luar yang dipasangi rambu chevron kuning-hitam — menabraknya = hancur; sisi lain (dan semua tepi jalur di bagian lurus) hanya **mentok/tertahan** dengan efek tepi layar menyala.
- **Peringatan singkat** (belokan, pesawat lawan arah, UFO, meteor) tampil sekali selama **4 / 3 / 2 detik** sesuai kesulitan Mudah / Sedang / Sulit — melatih konsentrasi.
- **Hitung mundur 3-2-1** sebelum terbang dan setelah muncul ulang di checkpoint.
- **Rintangan** sesuai tema: tiang, palang tinggi/rendah, pesawat lawan arah (Kota/Gurun), meteor terbang, UFO & asteroid (Angkasa), meteor jatuh & obelisk (Gurun).
- **Gerbang presisi**: pintu **bersinar** bila posisi pesawat sudah pas; masuk tidak pas = menabrak bingkai.
- Menabrak rintangan / gagal berbelok / tidak pas di gerbang → **pesawat hancur** dan muncul lagi di **checkpoint** (gerbang terakhir yang dilewati), dengan kebal 2 detik.
- **Mode bantuan otomatis**: setelah 3x hancur di bagian yang sama, rintangan bagian itu dihilangkan dan pintu lebih longgar — agar ujian tetap menilai pengetahuan, bukan hanya keterampilan bermain.
- Benar → poin + bonus kecepatan, efek konfeti, dunia berganti tema. Salah / waktu habis → tanpa poin, lanjut ke rute berikutnya.
- Tombol **layar penuh** & suara di kanan atas.
- **Fitur konsentrasi & kognitif**:
  - ★ **Cincin bintang** berantai — makin banyak berturut-turut, makin besar bonus (latihan fokus & koordinasi mata-tangan).
  - 🎯 **Tantangan pintu (efek Stroop)**: di layar muncul nama warna yang ditulis dengan tinta warna lain (mis. kata **BIRU** berwarna merah). Masuk pintu sesuai **KATA** → bonus. Melatih kontrol diri/inhibisi & perhatian selektif. Peluang kata-tinta berbeda: 30% (Mudah), 65% (Sedang), 100% (Sulit). Pintu mana pun tetap memunculkan soal; benar/salah soal tidak terpengaruh.
  - 🔥 **Combo**: jawaban benar berturut-turut melipatgandakan poin (hingga ×2).
  - Layar hasil menampilkan statistik konsentrasi: cincin, tantangan fokus, combo terbaik, jumlah tabrakan.
- **Refresh aman**: halaman ter-refresh → tekan MASUK lagi → lanjut dari soal terakhir (timer tidak ter-reset).
- **Nama lengkap adalah identitas peserta** di satu room: nama yang sama (huruf besar/kecil & spasi diabaikan) tidak bisa ikut dua kali. **Satu perangkat boleh dipakai bergantian** oleh beberapa siswa dengan nama berbeda (cocok untuk sekolah yang kekurangan perangkat).

**Guru**
- Login email/kata sandi. Akun guru pertama otomatis menjadi pengelola; guru lain ditambahkan lewat menu **Akun Guru**.
- **Bank soal** per paket: tambah/edit/hapus soal (teks, 4 opsi, kunci, gambar opsional, mapel).
- **Impor soal dari CSV/Excel** (kolom: `soal, a, b, c, d, kunci`; opsional `mapel, gambar`).
- **Buat room**: pilih paket, jumlah soal (mis. 10 dari 12), waktu per soal, **tingkat kesulitan rute** (Mudah/Sedang/Sulit), acak soal/opsi, mode PIN/Langsung → PIN 6 digit acak.
- **Pantau live**: tabel ala leaderboard (nama, kelas, soal ke-, benar, salah, skor, nilai, status online/selesai).
- Tombol **Mulai**, **Akhiri**, **Mulai lagi** (room yang sudah diakhiri bisa dibuka lagi, mis. untuk kelas lain di jam berbeda — rekap tetap di satu room), **Ekspor Excel** (3 sheet: Rekap Nilai, Detail Jawaban per soal, Daftar Soal) dan **Ekspor CSV**.
- Kolom **Konsentrasi** di tabel live: 💥 tabrakan · ★ cincin · 🎯 tantangan fokus benar.
- Tombol **Reset** per siswa (bila siswa ganti perangkat / salah ketik nama).
- Semua tindakan penting (Akhiri, Reset, Hapus, Keluar) memakai **jendela konfirmasi** yang jelas, dan tersedia tombol **layar penuh** di kanan atas.

**Teknis**
- HTML + CSS + JavaScript murni (ES Modules), **tanpa build tool**.
- Three.js r160 (CDN + import map), Firebase JS SDK v10 modular (CDN), SheetJS (CDN, dimuat hanya saat impor/ekspor).
- Ringan untuk Chromebook: bayangan mati, resolusi dibatasi & **turun otomatis bila FPS rendah**, objek dunia didaur ulang, efek suara disintesis (tanpa file audio).

---

## 2. Menyiapkan Firebase (langkah demi langkah)

> Paket **Spark (gratis)** sudah cukup. Tidak perlu kartu kredit.

### 2.1 Buat proyek
1. Buka **https://console.firebase.google.com** → login dengan akun Google.
2. Klik **Add project / Tambahkan proyek** → beri nama, mis. `sky-quiz-smpn1` → Google Analytics boleh dimatikan → **Create project**.

### 2.2 Aktifkan Authentication
1. Menu kiri **Build → Authentication** → **Get started**.
2. Tab **Sign-in method**:
   - Klik **Email/Password** → aktifkan baris pertama (*Email/Password*) → **Save**. *(untuk login guru)*
   - Klik **Add new provider → Anonymous** → aktifkan → **Save**. *(untuk siswa — siswa tidak perlu akun)*

### 2.3 Buat Realtime Database
1. Menu **Build → Realtime Database** → **Create Database**.
2. Lokasi: pilih **Singapore (asia-southeast1)** (paling dekat dengan Indonesia) → **Next**.
3. Pilih **Start in locked mode** → **Enable**.
4. Catat alamat database di bagian atas, contoh: `https://sky-quiz-smpn1-default-rtdb.asia-southeast1.firebasedatabase.app`

### 2.4 Pasang Security Rules (WAJIB)
1. Masih di Realtime Database, buka tab **Rules**.
2. Hapus semua isi editor.
3. Buka file **`database.rules.json`** dari folder game ini dengan Notepad → **salin semua** → **tempel** ke editor Rules.
4. Klik **Publish**.

> Tanpa langkah ini, siswa & guru akan mendapat pesan "Akses ditolak".

### 2.5 Daftarkan aplikasi web & isi `config.js`
1. Klik ikon ⚙️ Settings (dibawah *Project Overview*) → pilih **General**.
2. Gulir ke bawah sampai menemukan **Your apps** → klik ikon **`</>`** (Web) → beri nama, mis. `sky-quiz-web` → **Register app** (jangan centang Firebase Hosting ).
3. Akan muncul kode berisi `const firebaseConfig = { apiKey: "...", ... }`.
4. Buka **`config.js`** dengan Notepad/VS Code, lalu salin nilai-nilainya ke dalam tanda kutip yang sesuai:

```js
export const firebaseConfig = {
  apiKey: "AIzaSy....",
  authDomain: "sky-quiz-smpn1.firebaseapp.com",
  databaseURL: "https://sky-quiz-smpn1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sky-quiz-smpn1",
  storageBucket: "sky-quiz-smpn1.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

> ⚠️ Pastikan **`databaseURL`** terisi. Kadang Firebase tidak menampilkannya — salin dari alamat database di langkah 2.3 no. 4.
>
> `apiKey` Firebase **bukan rahasia** (memang dimuat di browser). Keamanan data dijaga oleh Security Rules.
> Pilih Continue to console.

### 2.6 Daftarkan akun guru pertama
1. Online-kan game (bagian 3), lalu buka **`admin.html`**.
2. Isi email & kata sandi (min. 6 karakter) → klik **Buat akun guru baru**.
3. Akun pertama otomatis menjadi **guru pengelola**. Selesai! 🎉

> Lakukan langkah ini **segera** setelah memasang rules, agar tidak ada orang lain yang mendaftar duluan sebagai guru pertama.

---

## 3. Meng-hosting (mengonlinekan) game

Game memakai ES Modules, jadi **harus dibuka lewat alamat web** (`https://...` atau `http://localhost`), **tidak bisa** dengan klik dua kali `index.html`. Pilih salah satu cara:

### Cara A — Netlify (paling mudah, tanpa instal apa pun)
1. Buka **https://app.netlify.com/drop** dan login.
2. **Seret folder `sky-cruiser-quiz`** (yang berisi `index.html`) ke halaman tersebut.
3. Netlify memberi alamat, mis. `https://nama-acak.netlify.app`. Siswa membuka alamat itu, guru membuka `.../admin.html`.
4. Setiap kali mengubah file (mis. `config.js`), seret ulang foldernya.

### Cara B — GitHub Pages
1. Buat repositori baru di GitHub → **Add file → Upload files** → unggah semua isi folder → **Commit**.
2. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch `main` / folder `/ (root)` → **Save**.
3. Tunggu 1–2 menit; alamatnya `https://username.github.io/nama-repo/`.

### Cara C — Firebase Hosting (satu proyek dengan database)
Butuh Node.js. Di folder game, jalankan:
```bash
npm install -g firebase-tools
```
```bash
firebase login
```
```bash
firebase use --add
```
```bash
firebase deploy
```
Perintah terakhir sekaligus memasang `database.rules.json` (diatur oleh `firebase.json`). Alamatnya `https://<project-id>.web.app`.

### Mencoba di komputer sendiri
- **VS Code** → pasang ekstensi **Live Server** → klik kanan `index.html` → *Open with Live Server*, atau
- Jika Python terpasang, di folder game jalankan lalu buka `http://localhost:8000`:
```bash
python -m http.server 8000
```

### (Disarankan) Domain yang diizinkan
Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** → masukkan domain hosting Anda (mis. `nama-acak.netlify.app` atau `username.github.io`).

---

## 4. Panduan guru

### 4.1 Membuat bank soal
1. `admin.html` → tab **Bank Soal** → **+ Paket** → isi nama paket & mapel.
2. Tambah soal satu per satu dengan **+ Soal**, atau **Impor CSV/Excel**.

**Format CSV/Excel** (baris pertama = nama kolom). Template tersedia di `assets/template-soal.csv` atau tautan *Unduh template CSV* di dialog impor.

| soal | a | b | c | d | kunci | mapel *(opsional)* | gambar *(opsional)* |
|---|---|---|---|---|---|---|---|
| Planet terbesar adalah … | Bumi | Saturnus | Jupiter | Neptunus | C | IPA | |

- `kunci` diisi **A/B/C/D** (huruf besar/kecil bebas; teks jawaban yang benar juga diterima).
- File Excel dari Microsoft Excel versi Indonesia yang memakai pemisah titik koma (`;`) juga terbaca.
- Baris yang tidak lengkap akan dilewati dan ditampilkan alasannya sebelum impor.
- `gambar` diisi URL gambar (mis. dari Google Drive yang dibuat publik / hosting gambar), atau simpan gambar di folder `assets/gambar/` lalu isi `assets/gambar/nama-file.png`.

### 4.2 Membuat room & PIN
1. Tab **Room & Pantau Live** → isi formulir **Buat Room Baru**:
   - **Jumlah soal ditampilkan**: mis. 10 dari 12 soal di paket (tiap siswa mendapat pilihan acak bila *Acak urutan soal* dicentang).
   - **Waktu per soal** (detik).
   - **Mode PIN Kuis**: siswa menunggu di ruang tunggu sampai Anda menekan **Mulai**.
   - **Mode Langsung**: siswa langsung bermain setelah memasukkan PIN (cocok untuk PR/remedial).
2. Klik **Buat Room & PIN** → tampil PIN besar + tautan siswa (tombol **Salin tautan**).
3. Tayangkan PIN di proyektor atau bagikan tautan ke grup kelas.

### 4.3 Saat ujian berlangsung
- Tabel siswa ter-update **otomatis** (realtime), diurutkan seperti leaderboard.
- **▶ Mulai**: siswa di ruang tunggu langsung mulai bermain.
- **■ Akhiri**: semua siswa langsung melihat layar hasil; soal yang belum dijawab dihitung tidak dijawab.
- **▶ Mulai lagi** (muncul setelah room diakhiri): membuka room yang sama untuk sesi/kelas berikutnya. Nilai siswa yang sudah selesai tetap tersimpan dan nama mereka tidak bisa mengulang; siswa yang tadi terhenti bisa melanjutkan sisa soalnya.
- **Siswa yang mengulang dengan nama sedikit berbeda** (mis. "Budi" lalu "Budi S") akan tampil sebagai dua baris. Kolom *Waktu Masuk* di Excel membantu guru mengenalinya dan memilih nilai yang dipakai.
- **Reset** (per siswa): menghapus data siswa itu di room ini agar namanya bisa dipakai masuk ulang dari awal (mis. HP mati lalu pindah perangkat).
- Status **Offline** berarti perangkat siswa terputus/tab ditutup. Jika ia membuka lagi di perangkat yang sama dan menekan MASUK, ia melanjutkan dari soal terakhir.

### 4.4 Ekspor nilai
- **⬇ Excel** → file `.xlsx` berisi 3 sheet: *Rekap Nilai* (termasuk Tabrakan, Cincin Bintang, Tantangan Fokus, Waktu Masuk, Terakhir Aktif), *Detail Jawaban* (jawaban tiap siswa per soal + baris kunci), *Daftar Soal*.
- **⬇ CSV** → hanya rekap nilai.
- Room lama bisa dibuka lagi kapan saja dari **Daftar Room** → **Pantau**. Hapus room (🗑) bila datanya sudah tidak diperlukan.

**Rumus nilai**: `nilai = round(benar / jumlah soal × 100)`. *Skor game* (poin + bonus kecepatan) hanya untuk keseruan/leaderboard.

### 4.5 Menambah guru lain
1. Guru baru membuka `admin.html` → **Buat akun guru baru** (akan muncul pesan "belum terdaftar sebagai guru").
2. Guru pengelola membuka tab **Akun Guru** → tambahkan email guru baru tersebut.
3. Guru baru menekan **Muat ulang**.

---

## 5. Panduan siswa
1. Buka alamat game dari guru (atau tautan berisi PIN).
2. Isi **Nama Lengkap**, **Kelas**, dan **PIN** → **MASUK**. Gunakan nama lengkap yang sama bila ingin melanjutkan. Pilih tema awal bila mau.
3. Kendalikan pesawat:
   - Laptop/Chromebook: **← ↑ ↓ →** atau **W A S D**
   - HP/tablet: **joystick** di kiri bawah layar
4. Ikuti rute dan **hindari rintangan** (tiang, palang, pesawat lain, meteor, UFO, asteroid). Untuk palang: naik bila palangnya rendah, turun bila palangnya tinggi.
5. Saat muncul **BELOKAN TAJAM**, tahan tombol/joystick **ke arah belokan** sampai tikungan selesai — kalau tidak, pesawat terlempar keluar jalur.
6. Saat muncul **PILIH LINTASAN!**, arahkan pesawat ke salah satu pintu sampai pintunya **bersinar**, lalu pertahankan posisi saat melewatinya.
7. Pesawat hancur? Tenang — kamu mengulang dari **gerbang terakhir** yang sudah dilewati. Setelah 3x gagal di bagian yang sama, rintangan bagian itu dihilangkan.
8. Jawab soal dengan klik/ketuk jawaban (atau tombol **1–4** di keyboard) sebelum waktu habis.
9. Setelah semua soal terjawab, nilai akhir tampil dan otomatis terkirim ke guru.

> Tips: tekan ikon ⛶ di kanan atas untuk **layar penuh**.

> Halaman tidak sengaja ter-refresh? Tekan **MASUK** lagi — kamu melanjutkan dari soal terakhir.

---

## 6. Keamanan kunci jawaban — cara kerja & kelemahannya

**Cara kerja (tanpa Cloud Functions, jadi tetap gratis):**
- Soal untuk siswa disimpan di `soal/…` **tanpa kunci**. Kunci disimpan terpisah di `kunci/…` yang **hanya bisa dibaca guru**. Browser siswa tidak pernah menerima kunci jawaban.
- Saat menjawab, aplikasi siswa menulis `{ pilihan, benar: true }`. **Security Rules** di server membandingkan `pilihan` dengan kunci; jika tidak cocok, penulisan ditolak dan aplikasi menulis ulang `{ pilihan, benar: false }`.
- Setiap jawaban hanya bisa ditulis **sekali** (tidak bisa diubah), hanya untuk soal yang menjadi jatah siswa itu, hanya saat room berstatus *Berjalan*, dan waktu tercatat oleh server.
- Benar/salah & nilai di panel guru dan file Excel **dihitung dari jawaban yang sudah diverifikasi server**, bukan dari angka kiriman siswa.
- Siswa hanya bisa membaca & menulis data miliknya sendiri; tidak bisa membaca jawaban siswa lain, mengubah status room, atau menyentuh bank soal.

**Kelemahan yang perlu Anda ketahui:**
1. **"Menebak lewat penolakan"** — siswa yang mahir memakai *DevTools* bisa mencoba mengirim klaim `benar: true` untuk setiap opsi; penulisan yang ditolak tidak tersimpan, jadi ia bisa tahu opsi mana yang benar sebelum jawabannya terkunci. Ini butuh keahlian teknis & waktu, tetapi mungkin.
2. **Timer dijalankan di perangkat siswa.** Server mencatat waktu menjawab (terlihat sebagai *durasi*), tetapi tidak menolak jawaban yang terlambat.
3. **Skor game** (bukan nilai) dikirim oleh perangkat siswa sehingga bisa dimanipulasi. Karena itu **gunakan kolom Nilai** untuk penilaian.
4. Teks soal bisa dibaca oleh siapa pun yang mengetahui ID paketnya (tanpa kunci).

**Pilihan bila butuh keamanan lebih tinggi:**
- **Opsi A (cukup untuk sebagian besar ujian kelas):** pakai apa adanya + awasi kelas, gunakan *acak soal & opsi*, dan waktu per soal yang singkat.
- **Opsi B (paling aman):** tambahkan **Cloud Function** sederhana (perlu paket **Blaze**, biasanya tetap Rp0 untuk pemakaian sekolah): siswa hanya mengirim `pilihan`, lalu fungsi di server yang menilai benar/salah dan memeriksa batas waktu. Dengan begitu kelemahan 1 & 2 tertutup. Struktur data saat ini sudah siap untuk perubahan tersebut.
- **Opsi C:** sembunyikan umpan balik benar/salah sampai akhir — membuat game kurang seru, dan tanpa Opsi B tidak menutup kelemahan 1, jadi tidak direkomendasikan.

---

## 7. Mengganti pesawat, soal latihan, dan pengaturan

Semua pengaturan ada di `config.js` → `pengaturanGame`:

| Pengaturan | Fungsi |
|---|---|
| `modelPesawat` | Path model `.glb` (mis. dari **Kenney.nl** / **Poly Pizza**), contoh `"assets/models/pesawat.glb"`. Kosong = pesawat bawaan. |
| `skalaModel`, `rotasiModelY` | Menyesuaikan ukuran & arah model `.glb`. |
| `kualitas` | `"otomatis"` (disarankan), `"rendah"` (Chromebook sangat lambat), `"sedang"`, `"tinggi"`. |
| `kecepatan` | Kecepatan terbang pesawat. |
| `kesulitan` | `"mudah"` / `"sedang"` / `"sulit"` — ketajaman & jumlah belokan serta jumlah rintangan per soal (3 / 5 / 7). Dipakai di mode offline; untuk ujian online guru memilihnya per room. |
| `poinBenar` | Poin dasar per jawaban benar (bonus kecepatan menjawab hingga +50%). |
| `fileSoalOffline`, `waktuPerSoalOffline` | Soal untuk mode offline/latihan. |

**Soal mode offline**: ubah `assets/soal-contoh.json` (format sama: `soal, a, b, c, d, kunci`). Catatan: di mode offline kunci ada di file tersebut, jadi mode ini hanya untuk **latihan**, bukan ujian.

---

## 8. Struktur folder & data

```
/index.html            game siswa
/admin.html            panel guru
/config.js             konfigurasi Firebase + pengaturan game (diisi pengguna)
/css/style.css         tampilan siswa & guru
/js/main.js            penghubung halaman siswa (game + UI + sesi)
/js/kuis.js            logika sesi kuis: urutan soal, skor, progres (offline & online)
/js/firebase.js        SEMUA fungsi baca/tulis Firebase
/js/util.js            fungsi bantu
/js/game/              scene, pesawat, rute (belokan & checkpoint), rintangan, tema/lintasan,
                       portal (gerbang), collision, kontrol, efek, audio
/js/ui/                HUD, modal soal & timer, layar, layar hasil, modal konfirmasi, layar penuh
/js/admin/             panel guru: login, bank soal, impor, room, pantau live, akun guru
/assets/               soal-contoh.json, template-soal.csv, models/, suara/, gambar/
/database.rules.json   Security Rules
/firebase.json         konfigurasi Firebase CLI (opsional)
```

Struktur Realtime Database:
```
guru/{email_dengan_koma}: true
paket/{paketId}: { nama, mapel, dibuatOleh, dibuatPada }
soal/{paketId}/{soalId}: { soal, opsi: {a,b,c,d}, gambar?, mapel? }      ← dibaca siswa
kunci/{paketId}/{soalId}: "a" | "b" | "c" | "d"                          ← hanya guru
daftarRoom/{PIN}: { judul, namaPaket, dibuatOleh, dibuatPada }
rooms/{PIN}/info: { judul, paketId, jumlahSoal, waktuPerSoal, acakSoal, acakOpsi, kesulitan: "mudah"|"sedang"|"sulit",
                    mode: "pin"|"langsung", status: "menunggu"|"berjalan"|"selesai", dibuatOleh, dibuatPada }
rooms/{PIN}/namaIndex/{namaSiswa}: uidPerangkat                         ← nama dikunci ke perangkat yang memakainya
rooms/{PIN}/siswa/{namaSiswa}: { nama, kelas, pemilik, soalKe, benar, salah, skor, nilai,
                                 tabrakan, cincin, fokus,
                                 status: "menunggu"|"bermain"|"selesai", online, bergabung, terakhirAktif, urutan }
rooms/{PIN}/jawaban/{namaSiswa}/{soalId}: { pilihan, benar, waktu, durasi }
```
`namaSiswa` = nama lengkap huruf kecil, spasi menjadi `_` (mis. `budi_santoso`). Satu perangkat bisa memiliki beberapa nama; hanya perangkat pemilik nama yang boleh menulis/membaca data nama tersebut.

Perbedaan dari rancangan awal: pengaturan room dipindah ke `rooms/{PIN}/info` dan kunci dipisah ke `kunci/…`, agar siswa bisa membaca pengaturan room **tanpa** bisa membaca data siswa lain maupun kunci jawaban.

---

## 9. Pemecahan masalah

| Masalah | Solusi |
|---|---|
| Layar kosong / muncul pesan "harus dibuka lewat server" | Jangan klik dua kali file. Gunakan hosting (bagian 3) atau Live Server. |
| "Game belum berhasil dimuat" | Internet/jaringan sekolah memblokir `cdn.jsdelivr.net` atau `gstatic.com`. Minta admin jaringan membukanya. |
| Halaman login siswa menampilkan "Mode Offline" | `config.js` belum diisi lengkap (`apiKey`, `databaseURL`, `projectId`). |
| "Akses ditolak" / "Gagal memeriksa akun" | Security Rules belum di-*Publish* (langkah 2.4). |
| "Gagal masuk ke server … Anonymous" | Aktifkan provider **Anonymous** (langkah 2.2). |
| "Login Email/Password belum diaktifkan" | Aktifkan provider **Email/Password** (langkah 2.2). |
| Guru baru: "belum terdaftar sebagai guru" | Guru pengelola menambahkan emailnya di tab **Akun Guru**. |
| Siswa: "Nama … sudah dipakai peserta lain" | Nama itu sudah dipakai di perangkat lain. Bila memang siswa yang sama pindah perangkat, guru menekan **Reset** pada namanya. |
| Setelah memperbarui game, siswa mendapat "Akses ditolak" | Pasang ulang isi `database.rules.json` terbaru di Firebase → Realtime Database → Rules → **Publish**. |
| Game patah-patah di Chromebook | Set `kualitas: "rendah"` di `config.js`, tutup tab lain. |
| Siswa kesulitan melewati rintangan/belokan | Buat room dengan kesulitan **Mudah**. Mode bantuan juga aktif otomatis setelah 3x gagal. |
| Tombol layar penuh tidak muncul | Browser (mis. Safari iPhone) tidak mendukung layar penuh untuk halaman web. |
| PIN tidak ditemukan | Periksa PIN; pastikan room belum dihapus. |
| Lupa kata sandi guru | Di `admin.html` isi email → **Lupa kata sandi?** |

---

Dibuat dengan HTML/CSS/JS murni, [Three.js](https://threejs.org), [Firebase](https://firebase.google.com), dan [SheetJS](https://sheetjs.com).
