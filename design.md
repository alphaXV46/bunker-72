# 🎨 SPESIFIKASI DESAIN & PEDOMAN VISUAL (UNTUK AGEN AI)

Dokumen ini adalah acuan visual resmi untuk **Bunker 72**. Agen AI (terutama **Executor** dan **Reviewer**) wajib membaca dan mematuhi aturan ini ketika memodifikasi HTML, CSS, atau struktur visual game untuk memastikan konsistensi desain retro-koding / terminal sci-fi yang sudah berjalan.

---

## 🌟 Tema Utama & Estetika
*   **Tema:** Terminal Simulator Bunker Militer / Sci-Fi Darurat Klasik.
*   **Karakteristik:** Teks monospaced, scanlines CRT, indikator berkedip, sudut tajam, borders tebal khas monitor tabung, warna kontras tinggi di atas latar belakang gelap gulita.
*   **Aturan Penting:** Jangan gunakan warna polos tanpa gradasi atau tanpa menyelaraskannya dengan variabel CSS yang telah ditentukan. Jangan gunakan Tailwind CSS karena proyek ini menggunakan **Vanilla CSS murni** di `src/styles/main.css`.

---

## 🎨 Palet Warna & Variabel CSS (`src/styles/main.css`)
Semua warna wajib menggunakan CSS Custom Properties berikut:

```css
:root {
  --bg-color: #08090b;             /* Latar belakang terluar body */
  --bunker-dark: #111318;          /* Latar belakang kontainer game utama */
  --panel: rgba(15, 18, 22, 0.94);  /* Panel semi-transparan (dengan backdrop-filter) */
  --panel-solid: #171b21;          /* Panel solid untuk elemen overlay */
  --text-pixel: #e7edf0;           /* Warna teks utama (putih pudar) */
  --text-muted: #89939a;           /* Warna teks sekunder (abu-abu redup) */
  
  /* Garis & Perbatasan (Borders) */
  --line: #424a50;                 /* Border standar */
  --line-bright: #72808a;          /* Border sorot / aktif */
  
  /* Aksen Warna Status */
  --accent-red: #8f1d23;           /* Bahaya / Alert */
  --accent-red-border: #ff5d5d;
  
  --accent-green: #1f6f4a;         /* Aman / Sukses */
  --accent-green-border: #66e08e;
  
  --warning-yellow: #b37d20;       /* Waspada / Siaga */
  --warning-yellow-border: #ffd166;
  
  --cyan: #5bc0be;                 /* Info / Log / Nilai Utama */
}
```

---

## 🔤 Tipografi & Font
Game ini menggunakan font retro khusus dari Google Fonts. Pastikan properti font-family diwarisi dengan benar:
*   **VT323 (Monospace Retro):** Khusus untuk judul besar, skor besar, tipe ending, dan teks tajuk utama (`font-family: 'VT323', monospace;`).
*   **Share Tech Mono:** Digunakan untuk semua teks UI, isi percakapan, log, tombol pilihan, dan detail status (`font-family: 'Share Tech Mono', 'Courier New', monospace;`).

---

## 📐 Arsitektur Tata Letak (16:9 Aspect Ratio)
Kontainer game utama (`#game-container`) menggunakan rasio aspek keras 16:9 yang diposisikan persis di tengah layar browser.

```css
#game-container {
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  aspect-ratio: 16 / 9;
  position: relative;
  overflow: hidden;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

### 🚨 Aturan Gambar (Pixel Art Rendering)
Semua aset gambar harus menggunakan properti rendering pixelated agar tidak kabur/blur saat diperbesar di layar modern:
`image-rendering: pixelated;` atau `image-rendering: crisp-edges;`

---

## 🧱 Anatomi Komponen UI Utama

### 1. Panel Status HUD (Atas)
*   **Class:** `.status-panel` (menggunakan CSS Grid/Flexbox).
*   **Gaya:** Berlatar belakang `--panel` dengan efek blur `backdrop-filter: blur(3px)`.
*   **Penting:** Selalu gunakan warna `--warning-yellow-border` dengan class `.highlight-val` untuk nilai status yang dinamis (seperti "5/10" atau "24 JAM").

### 2. Panel Inventaris (Kiri)
*   **Class:** `.resource-panel` dan `.resource-item`.
*   **Interaksi:**
    *   Jika status sumber daya normal: border berwarna `#303941`.
    *   Jika status sumber daya aktif: class `.resource-active` ditambahkan (border `--cyan`, background semi-cyan).
    *   Jika kritis/rendah: class `.resource-low` ditambahkan (border `--accent-red-border`, background kemerahan dengan animasi berkedip `flash`).

### 3. Kotak Cerita & Dialog (Tengah-Bawah)
*   **Kotak Cerita (`.story-box`):**
    *   Menerima latar belakang gambar bunker. Memiliki overlay atmosfer seperti kabut debu (`.dust`), sapuan lampu peringatan merah (`.warning-sweep`), dan kerlip lampu atap (`.ceiling-light`).
*   **Kotak Dialog (`.dialogue-overlay`):**
    *   Berada di sebelah kiri bawah di atas story box.
    *   Menggunakan border kiri tebal merah (`border-left: 6px solid var(--accent-red-border)`).
    *   Kontainer avatar (`.avatar-container`) berukuran persegi (`width: clamp(68px, 6.5vw, 94px)`). Aset gambar avatar di dalamnya harus berwujud persegi 1:1 agar tidak menyusut secara aneh.
    *   Kursor teks mengetik menggunakan pseudo-element `::after` dengan konten `_` dan animasi `blink`.

### 4. Command Deck (Pilihan & Log - Kanan Bawah)
*   **Class:** `.command-deck`
*   **Pilihan Opsi (`.choice-btn`):**
    *   Berbentuk baris panjang dengan layout kolom: nomor indeks pilihan $\rightarrow$ teks pilihan $\rightarrow$ indikator efek kesiapsiagaan (misal: "+1 kesiapsiagaan").
    *   Tombol pilihan memiliki class dinamis sesuai dampaknya:
        *   `.choice-good` (warna teks efek: `--accent-green-border`)
        *   `.choice-risk` (warna teks efek: `--accent-red-border`)
        *   `.choice-neutral` (warna teks efek: `--text-muted`)
    *   *Hover Effect:* Bergeser ke kanan sebesar `4px` (`transform: translateX(4px)`) dengan border berubah menjadi `--warning-yellow-border`.
*   **Log Protokol (`.protocol-log`):**
    *   Menampilkan maksimal 5 riwayat aktivitas terakhir dengan skema warna hijau/merah/netral sesuai efek keputusan yang diambil.

---

## 🎬 Animasi Kunci (Keyframes)
Jika Anda menambahkan elemen UI baru yang membutuhkan kedipan atau transisi, gunakan animasi bawaan berikut:
1.  `flash`: Mengubah opacity secara bertahap untuk lampu atau panel darurat.
2.  `blink`: Berkedip cepat 0.8s untuk kursor mengetik dialog `_`.
3.  `shake`: Efek guncangan kamera/layar (bergeser beberapa piksel secara cepat) untuk menandai getaran gempa/ledakan di bunker.
4.  `warningSweep`: Efek sapuan cahaya merah linier secara berkala di latar belakang bunker.

---

## 📱 Responsivitas (Media Queries)
Layout 16:9 dipertahankan di semua ukuran layar dengan menggunakan query `@media (max-width: 920px)`.
*   Pada layar kecil, beberapa komponen sekunder disembunyikan (seperti `.environment-readout` dan `.protocol-log`) untuk memberikan ruang yang cukup bagi dialog dan tombol pilihan agar tidak menumpuk.
*   Ukuran font dan margin diturunkan menggunakan satuan `clamp()` dan viewport (`vw`/`vh`). Selalu periksa tata letak responsif sebelum menyatakan eksekusi selesai.
