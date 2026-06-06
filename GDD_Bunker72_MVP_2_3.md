# 📄 GAME DESIGN DOCUMENT (MVP v2.3)

## Judul Game
**72 Jam Pertama: Terjebak di Bunker 72 (Versi 2.3 - Modul Audio, Perbaikan Mobile UX & Mekanik Survival)**

**Versi:** 2.3 MVP (Modular Audio, Mobile Inventory Fix, Audio De-clicking, Survival Stats Split)
**Target Pengembangan:** 7 Hari (Upgrade)
**Platform:** Web Browser (Desktop PC & Mobile Portrait/Landscape)

---

# 1. OVERVIEW & TUJUAN PENGEMBANGAN

Versi 2.3 berfokus pada penyempurnaan fungsionalitas yang terhambat di versi sebelumnya, pembersihan arsitektur modular, dan peningkatan kedalaman mekanik *survival* agar nuansa ketegangan lebih terasa bagi pemain.

### Poin Utama di Versi 2.3:
1. **Pembersihan MVC & Modularitas Baru:** Memindahkan `RetroAudio` ke berkas modular tersendiri dan memigrasikan rendering halaman ending dari `main.js` ke `GameView`.
2. **Mitigasi Audio Popping:** Menerapkan teknik amplop linear/eksponensial pada gain Web Audio API untuk mencegah bunyi letupan mikro saat suara diputar atau dihentikan.
3. **Penyelamatan Inventaris Mobile Portrait:** Memperbaiki tata letak CSS mobile portrait agar panel logistik/sumber daya tidak disembunyikan melainkan diposisikan secara optimal sehingga interaksi inventaris tetap 100% aktif.
4. **Pemisahan Status Survival (Survival Stats Split):** Memecah status generic `knowledge` menjadi 3 indikator kelangsungan hidup dinamis: **Fisik (Hunger/Thirst)**, **Kesehatan (Health)**, dan **Kesiapsiagaan (Knowledge)**.

---

# 2. SPESIFIKASI TEKNIS

## A. Pembersihan Modul Arsitektur
- **Modular Audio ([retroAudio.js](file:///c:/laragon/www/bunker%2072/src/js/retroAudio.js)):** Kelas `RetroAudio` dikeluarkan dari `storyEngine.js` dan diekspor sebagai modul tersendiri.
- **Pembersihan `main.js`:** Segala baris manipulasi DOM yang merender skor akhir, peringkat, dan teks deskripsi dipindahkan ke method `renderEnding(endingId, knowledge, text)` di kelas `GameView`. Berkas `main.js` kini murni berfungsi sebagai inisiator aplikasi.

## B. Audio De-clicking (Fading Gain)
Setiap kali instrumen oscillator dibuat dan dimatikan, kurva gain harus memudar secara halus menggunakan `exponentialRampToValueAtTime` ke nilai minimum (`0.0001`) tepat sebelum oscillator dimatikan:
```javascript
// Contoh implementasi de-click playClick
const now = this.ctx.currentTime;
gain.gain.setValueAtTime(0.05, now);
gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
osc.stop(now + 0.04);
```

## C. Layout Inventaris Mobile Portrait
Pada breakpoint `@media (max-width: 600px)`:
- Hapus `.resource-panel { display: none; }`.
- Ubah `.resource-panel` menjadi bar horizontal kompak (`display: flex; flex-direction: row; justify-content: space-around;`) yang ditempatkan secara tetap di atas `.command-deck` atau di bawah teks cerita agar pemain mobile dapat memantau dan menggunakan makanan, minuman, dan P3K mereka.

## D. Pemisahan Status Survival (Survival Stats Split)
Status `knowledge` (skor kesiapan) yang tadinya tunggal akan dipecah menjadi:
1. **Fisik (Hunger & Thirst) [Skala 0-100]:** Berkurang -5 poin setiap 6 jam permainan. Makan (Food) memulihkan +30 lapar, Air (Drink) memulihkan +30 dahaga.
2. **Kesehatan (Health) [Skala 0-100]:** Berkurang jika Hunger/Thirst mencapai 0, atau terkena peristiwa gempa tanpa perlindungan. Pulih +40 dengan P3K (Kit).
3. **Kesiapsiagaan (Knowledge) [Skala 0-15]:** Diperoleh dari pilihan cerita logis di dialog. Menentukan kualitas ending game.

*Kematian:* Jika Health mencapai 0, permainan langsung dialihkan ke scene `ending_fatal` secara instan.

---

# 3. DEFINITION OF DONE (MVP v2.3)

- [ ] **Modul Bersih:** `RetroAudio` terpisah di `retroAudio.js`, DOM ending ditangani penuh oleh `GameView`.
- [ ] **Bebas Audio Pop:** Tidak ada bunyi letupan tajam saat efek typewriter berbunyi cepat.
- [ ] **Inventaris Mobile Aktif:** Item inventaris terender horizontal dan dapat diklik/digunakan pada lebar layar di bawah 600px.
- [ ] **Mekanik Survival Berfungsi:** Parameter kelaparan/kehausan berkurang per waktu, penggunaan item memulihkan metrik spesifik, dan kematian terpicu saat Health 0.
- [ ] **Vite Build Sukses:** Pembangunan bundel Vite selesai tanpa hambatan.
