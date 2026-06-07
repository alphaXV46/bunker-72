# 📄 GAME DESIGN DOCUMENT (MVP)

## Judul Game

**72 Jam Pertama (Bunker 72)**

**Versi:** 1.1 MVP (16:9 Desktop & Pixel Art Optimized)
**Target Pengembangan:** 7 Hari
**Platform:** Web Browser (Khusus Desktop PC/Laptop)

---

# 1. GAME OVERVIEW

## Elevator Pitch

Setelah bencana besar melanda kota, sebuah keluarga harus bertahan selama 72 jam pertama di dalam bunker. Pemain mengambil keputusan sulit berbasis pilihan teks yang memengaruhi keselamatan seluruh anggota keluarga.

## Genre

Narrative Survival Visual Novel (Text-Based)

## Gaya Visual

2D Pixel Art (Retro/Low-Fi)

Gaya ini mempermudah pembuatan aset gambar latar belakang dan potret karakter secara cepat dalam waktu 7 hari.

## Target Durasi

15–30 menit per playthrough.

---

# 2. TUJUAN MVP (DEFINITION OF DONE)

Proyek dianggap **100% berhasil** jika memenuhi 5 poin berikut pada hari ke-7:

* ✅ **Dialog Berjalan**
  Teks cerita dan nama karakter muncul bergantian dengan lancar.

* ✅ **Sistem Pilihan**
  Pemain dapat mengklik tombol opsi yang mengubah jalannya cerita.

* ✅ **Save & Load Otomatis**
  Game menyimpan state terakhir ke `localStorage` sehingga permainan dapat dilanjutkan setelah refresh.

* ✅ **3 Multiple Endings**
  Cerita selesai hingga memicu salah satu dari tiga akhir cerita.

* ✅ **Layout CSS Native 16:9**
  Antarmuka game rapi dan proporsional pada monitor desktop dengan rasio 16:9.

---

# 3. PANDUAN ASET VISUAL (PIXEL ART ART-STYLE)

Agar game terasa konsisten dan aset dapat selesai dalam hitungan hari, aturan visual berikut wajib diikuti.

## Resolusi Kanvas Aset

Semua gambar latar belakang dibuat dengan resolusi dasar kecil:

* `320 × 180 px` (rasio 16:9)
* `640 × 360 px`

Saat ditampilkan di HTML/CSS, gambar diperbesar menggunakan properti khusus agar piksel tetap tajam (*crisp*).

## Aset Minimum yang Dibutuhkan

### Background

* `bg_bunker_normal.png`

  * Suasana bunker pada hari pertama
  * Gaya pixel art

* `bg_bunker_rusak.png`

  * Suasana bunker mulai retak atau gelap pada hari ketiga
  * Gaya pixel art

### Avatar Karakter

* `avatar_ayah.png`
* `avatar_ibu.png`
* `avatar_anak.png`

Spesifikasi:

* Ukuran: `64 × 64 px`
* Potret wajah karakter
* Gaya pixel art

---

# 4. CORE GAMEPLAY LOOP & LOGIKA PARAMETER

```text
Baca Cerita (Text)
        ↓
Pilih Opsi
        ↓
Knowledge Berubah
        ↓
Lanjut Hari
        ↓
Ending
```

## Variabel Utama

### knowledge

**Range:** `0 – 10`

Mewakili ketepatan keputusan kesiapsiagaan bencana.

Ending ditentukan sepenuhnya berdasarkan nilai variabel ini pada jam ke-72.

## Struktur Multiple Endings

### 🔴 Ending Buruk

**Syarat:**

```text
knowledge <= 3
```

Keluarga mengambil terlalu banyak keputusan ceroboh dan tidak berhasil selamat.

### 🟡 Ending Normal

**Syarat:**

```text
knowledge = 4–7
```

Keluarga berhasil bertahan hidup, tetapi mengalami luka-luka atau kerugian besar.

### 🟢 Ending Terbaik

**Syarat:**

```text
knowledge >= 8
```

Keluarga berhasil selamat tanpa kehilangan anggota keluarga karena menerapkan prinsip kesiapsiagaan bencana secara optimal.

---

# 5. ARSITEKTUR UI & CSS NATIVE FRAMEWORK (16:9 DESKTOP)

Framework menggunakan:

* `aspect-ratio: 16 / 9`
* `image-rendering: pixelated`

Tujuannya agar layar game tetap proporsional dan aset pixel art tidak blur saat diperbesar.

## File: `src/styles/main.css`

```css
:root {
  --bg-color: #0f0f11;
  --bunker-dark: #1a1a1f;
  --text-pixel: #e2e8f0;
  --accent-red: #991b1b;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-color);
  color: var(--text-pixel);
  font-family: 'Courier New', Courier, monospace;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}

/* CONTAINER UTAMA */
#game-container {
  width: 85vw;
  max-width: 1280px;
  aspect-ratio: 16 / 9;

  background-color: var(--bunker-dark);
  border: 4px solid #3f3f46;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  padding: 20px;
  box-sizing: border-box;

  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* STATUS PANEL */
.status-panel {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px dashed #52525b;
  padding-bottom: 8px;
  font-size: 1.1rem;
}

/* STORY AREA */
.story-box {
  flex-grow: 1;
  margin: 15px 0;
  padding: 15px;

  background-image: url('../assets/bg_bunker_normal.png');
  background-size: cover;
  background-position: center;

  border: 2px solid #3f3f46;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.dialogue-text {
  background-color: rgba(26, 26, 31, 0.85);
  padding: 15px;
  border-radius: 4px;

  font-size: 1.2rem;
  line-height: 1.5;
}

/* PILIHAN */
.choices-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice-btn {
  background-color: #27272a;
  color: var(--text-pixel);

  border: 2px solid #52525b;
  padding: 12px;

  cursor: pointer;
  text-align: left;

  font-size: 1rem;
  font-family: inherit;

  transition: all 0.1s ease;
}

.choice-btn:hover {
  background-color: var(--accent-red);
  border-color: #f87171;
}
```

---

# 6. ROADMAP PENGEMBANGAN 7 HARI (7-DAY PLAN)

## Hari 1 — Setup Proyek & CSS Layout

* Inisialisasi proyek menggunakan Vite.
* Pasang struktur dasar `index.html`.
* Tambahkan `main.css`.
* Pastikan container rasio 16:9 tampil sempurna di tengah layar.

---

## Hari 2 — Pembuatan Aset Pixel Art Dasar

* Buat atau cari background ukuran `640 × 360 px`.
* Buat avatar karakter ukuran `64 × 64 px`.
* Uji tampilan gambar di browser.
* Pastikan gambar tetap tajam menggunakan `image-rendering: pixelated`.

---

## Hari 3 — Penulisan Naskah Cerita (`story.json`)

* Menulis cerita dari Hari 1 sampai Hari 3.
* Menyimpan:

  * Nama pembicara
  * Teks dialog
  * Pilihan pemain
  * Perubahan variabel `knowledge`

Contoh struktur:

```json
{
  "id": "day1_scene1",
  "speaker": "Ayah",
  "text": "Kita harus segera masuk bunker.",
  "choices": []
}
```

---

## Hari 4 — Story Engine (`storyEngine.js`)

* Membaca data dari JSON.
* Menampilkan dialog ke layar.
* Menambahkan efek pergantian teks.
* Memproses perpindahan antar scene.

---

## Hari 5 — Sistem Pilihan & Ending

* Menghubungkan tombol pilihan dengan variabel `knowledge`.
* Menambah atau mengurangi skor berdasarkan keputusan pemain.
* Membuat sistem percabangan ending.

---

## Hari 6 — Save/Load (`localStorage`)

* Menyimpan:

  * ID scene terakhir
  * Nilai knowledge

* Membuat menu utama sederhana:

  * **New Game**
  * **Continue**

---

## Hari 7 — Playtest & Bug Fix

* Mainkan game dari awal hingga akhir.
* Uji semua ending.
* Periksa sistem penyimpanan.
* Pastikan layout tetap stabil pada berbagai monitor desktop.
* Persiapkan build final untuk publikasi.

---

# STATUS MVP SIAP RILIS

Jika seluruh poin berikut terpenuhi:

* Dialog berjalan
* Pilihan bercabang berfungsi
* Save/Load aktif
* 3 ending tersedia
* Layout desktop 16:9 stabil

Maka **Bunker 72 v1.1 MVP** dinyatakan selesai dan siap dipublikasikan.
