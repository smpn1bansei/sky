// =====================================================================
//  KONFIGURASI SKY CRUISER QUIZ
//  Satu-satunya file yang perlu Anda ubah agar game terhubung ke
//  proyek Firebase milik Anda sendiri. Lihat README.md bagian 2.
// =====================================================================

// 1) Salin nilai dari Firebase Console → Project settings → Your apps → SDK setup and configuration.
//    Biarkan kosong ("") jika ingin memakai MODE OFFLINE (latihan tanpa internet/database).
export const firebaseConfig = {
  apiKey: "AIzaSyCpqzkC2l9oKYmEuXP5sv-rtfpGmh50e7U",
  authDomain: "sky-cruiser-3a4d1.firebaseapp.com",
  databaseURL: "https://sky-cruiser-3a4d1-default-rtdb.asia-southeast1.firebasedatabase.app/",        // WAJIB untuk Realtime Database, contoh: "https://nama-proyek-default-rtdb.asia-southeast1.firebasedatabase.app"
  projectId: "sky-cruiser-3a4d1",
  storageBucket: "sky-cruiser-3a4d1.firebasestorage.app",
  messagingSenderId: "774259864846",
  appId: "1:774259864846:web:144911cb865853a49a535f"
};

// 2) Pengaturan game (opsional).
export const pengaturanGame = {
  // Model pesawat .glb (misal dari Kenney.nl / Poly Pizza). Kosongkan untuk memakai pesawat bawaan.
  // Contoh: "assets/models/pesawat.glb"
  modelPesawat: "",
  skalaModel: 1,           // perbesar/perkecil model .glb
  rotasiModelY: Math.PI,   // putar model agar moncongnya menghadap ke depan (ubah ke 0 jika terbalik)

  // Kualitas grafis: "otomatis" | "rendah" | "sedang" | "tinggi"
  // "otomatis" akan menurunkan resolusi sendiri bila perangkat (mis. Chromebook) terasa berat.
  kualitas: "otomatis",

  kecepatan: 30,           // kecepatan terbang pesawat

  // Tingkat kesulitan rute untuk mode offline & bawaan room: "mudah" | "sedang" | "sulit"
  // (mengatur ketajaman belokan, jumlah belokan, dan jumlah rintangan per soal).
  // Guru juga bisa memilih kesulitan per room di panel guru.
  kesulitan: "sedang",
  poinBenar: 100,          // poin dasar per jawaban benar (ditambah bonus kecepatan menjawab s.d. 50%)

  // Soal untuk mode offline/latihan
  fileSoalOffline: "assets/soal-contoh.json",
  waktuPerSoalOffline: 30
};

// Tidak perlu diubah: mendeteksi apakah Firebase sudah diisi.
export function firebaseSiap() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);
}
