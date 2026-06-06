# 📄 GAME DESIGN DOCUMENT (MVP v2.0)

## Judul Game
**72 Jam Pertama: Terjebak di Bunker 72 (Versi 2.0 - Extended)**

**Versi:** 2.0 MVP (Sistem 3 Pilihan & Ekstensi Narasi Rahasia 96 Jam)
**Target Pengembangan:** 7 Hari (Upgrade)
**Platform:** Web Browser (Desktop PC/Laptop)

---

# 1. GAME OVERVIEW & PERUBAHAN UTAMA

Game ini adalah peningkatan dari Versi 1.1. Perubahan terbesar adalah penambahan **Jalur Rahasia (Secret Path) Hari ke-4 / 96 Jam**. 

Secara default, permainan akan selesai pada Jam 72 seperti biasa. Namun, jika pemain mengambil keputusan-keputusan yang sangat cerdas (kesiapsiagaan tinggi) dan berhasil memecahkan sandi frekuensi radio secara tepat, mereka akan mengaktifkan **Hari ke-4 Rahasia ("Evakuasi Tertunda")**. Tim penyelemat terhambat badai debu radioaktif, dan keluarga dipaksa bertahan 24 jam ekstra dengan bahaya tingkat tinggi.

### Perubahan Utama di Versi 2.0:
1.  **Wajib 3 Pilihan:** Setiap titik keputusan cerita kini memiliki **3 opsi pilihan** (sebelumnya hanya 2).
2.  **Jalur Hari ke-4 Rahasia (Secret Day 4):** Ekstensi cerita dari Jam 72 hingga Jam 96 yang **hanya bisa diakses** jika pemain memenuhi kriteria tersembunyi.
3.  **Tingkat Ketegangan Tinggi:** Fase Hari ke-4 menyajikan ancaman mematikan langsung (kelangkaan oksigen dan penjarah bersenjata).
4.  **Sistem Akhir Cerita Baru (5 Endings):** 3 Ending standar di Jam 72, dan 2 Ending khusus di Jam 96 (Secret Good & Secret Fatal).

---

# 2. TUJUAN MVP 2.0 (DEFINITION OF DONE)

Pengembangan Versi 2.0 dianggap **100% berhasil** jika memenuhi poin-poin berikut:

*   ✅ **Sistem 3 Pilihan Berfungsi Penuh**
    Setiap scene keputusan menyajikan 3 opsi dengan dampak parameter berbeda.
*   ✅ **Mekanisme Pemicu Hari ke-4 Rahasia (Secret Trigger)**
    Sistem mengecek syarat di Jam 72: jika syarat tidak terpenuhi, game langsung menuju Ending Standar. Jika terpenuhi, game berlanjut ke Jam 73 (Hari ke-4).
*   ✅ **UI & Asset Update**
    *   Tampilan HUD mencakup bar Kesiapsiagaan baru (skor maksimal ditingkatkan menjadi 15).
    *   Avatar Anak diperbaiki menjadi rasio persegi 1:1 agar konsisten dengan karakter lain.
*   ✅ **5 Cabang Ending**
    Tersedia 3 Ending Normal (Jam 72) dan 2 Ending Rahasia (Jam 96).
*   ✅ **Fitur Save/Load Otomatis yang Stabil**
    Mendukung penyimpanan data status dan log keputusan hingga ke Jalur Rahasia Hari ke-4.

---

# 3. CORE GAMEPLAY LOOP & LOGIKA PARAMETER 2.0

```text
               Baca Narasi & Pilih Opsi (3 Pilihan)
                                 ↓
             Game Berjalan Hingga Jam 72 (Evaluasi)
                                 ↓
               [ Cek Syarat Hari ke-4 Rahasia ]
               Apakah Kesiapsiagaan >= 8 DAN 
               Menyimpan Cadangan Daya/Radio?
                             /   \
                 (TIDAK)    /     \    (YA)
                           /       \
                          ↓         ↓
              Ending Standar     Masuk HARI ke-4 (Secret Path)
              (Jam 72)           Bertahan Hingga Jam 96
                                    ↓
                                 Ending Rahasia (Jam 96)
```

## Variabel & Skoring Baru
*   **Kesiapsiagaan (Knowledge):** Range `0 – 15` (Ditingkatkan dari 10).
*   **Indikator Lingkungan (Dynamic Readout):**
    *   **Udara:** STABIL $\rightarrow$ WASPADA $\rightarrow$ KRITIS
    *   **Struktur:** AMAN $\rightarrow$ RETAK $\rightarrow$ RUNTUH (Game Over Instan jika Runtuh)
    *   **Daya:** NORMAL $\rightarrow$ HEMAT $\rightarrow$ DARURAT $\rightarrow$ PADAM

---

# 4. STRUKTUR 5 MULTIPLE ENDINGS

## A. Ending Standar (Picu di Jam 72 - Jalur Biasa)
1.  **Ending Normal: "Bertahan Hidup dengan Luka"**
    *   *Syarat:* `knowledge = 5 – 7` pada Jam 72.
    *   *Kondisi:* Keluarga berhasil dievakuasi di jam ke-72, namun dalam keadaan lelah dan dehidrasi ringan karena beberapa protokol tidak sempurna.
2.  **Ending Buruk: "Penyelamatan Darurat Kritis"**
    *   *Syarat:* `knowledge = 1 – 4` pada Jam 72.
    *   *Kondisi:* Udara bunker terkontaminasi ringan. Keluarga selamat tapi butuh perawatan medis intensif segera.
3.  **Ending Fatal: "Makam Bunker 72"**
    *   *Syarat:* `knowledge = 0` atau pintu dibuka paksa oleh pihak tak dikenal sebelum Jam 72.
    *   *Kondisi:* Bunker terkontaminasi parah/kebobolan sebelum tim penyelamat tiba.

## B. Ending Rahasia (Picu di Jam 96 - Jalur Hari ke-4)
4.  **Secret Best Ending: "Penyelamatan Sempurna"**
    *   *Syarat:* Masuk Hari ke-4, `knowledge >= 12` pada Jam 96, dan Struktur `AMAN`.
    *   *Kondisi:* Keluarga selamat tanpa cedera apa pun setelah menghadapi krisis 96 jam. Mereka berhasil mengamankan bunker dari penjarah dan mengatasi badai debu radioaktif dengan disiplin optimal.
5.  **Secret Bad Ending: "Gugur di Garis Akhir"**
    *   *Syarat:* Masuk Hari ke-4, namun `knowledge < 12` atau Struktur `RUNTUH` sebelum Jam 96.
    *   *Kondisi:* Keluarga gagal menghadapi kelangkaan oksigen ekstrem atau penjarah berhasil menjebol pintu pertahanan dalam 24 jam terakhir.

---

# 5. GARIS BESAR SCENARIO & STRATEGI PEMICU RAHASIA

## 📅 HARI 1 (Jam 0 – 24): Fase Isolasi
*   **Penyegelan Pintu (Jam 0):**
    1.  *Kunci pintu otomatis & aktifkan filtrasi.* (Aman, +1)
    2.  *Biarkan pintu sedikit terbuka untuk memantau tetangga.* (Sangat Berisiko, -2)
    3.  *Kunci manual dengan palang darurat baja.* (Aman, +2, memakan waktu)
*   **Filtrasi Udara (Jam 8):**
    1.  *Nyalakan penyaring langsung tanpa cek katup.* (Ceroboh, -1)
    2.  *Ganti segel katup karbon dengan cadangan baru.* (Sangat Aman, +2)
    3.  *Gunakan masker kain basah sebagai filter alternatif.* (Netral, 0)

## 📅 HARI 2 (Jam 24 – 48): Krisis Komunikasi & Struktur
*   **Getaran Gempa Utama (Jam 30):**
    1.  *Lari ke pintu keluar dan mencoba membukanya.* (Panik, -3, Struktur Retak)
    2.  *Berlindung di bawah ranjang bunker baja.* (Aman, +1)
    3.  *Aktifkan penyangga struktural hidrolik di panel kontrol.* (Sangat Aman, +2)
*   **Pengelolaan Baterai Radio (Jam 44):**
    1.  *Nyalakan radio terus-menerus untuk mencari sinyal.* (Boros Daya, -2)
    2.  *Jadwalkan transmisi 10 menit setiap 6 jam.* (Hemat/Aman, +2) $\rightarrow$ **[SYARAT KUNCI HARI 4]**
    3.  *Hubungkan radio ke generator utama dengan menaikkan tegangan.* (Berisiko, +1, generator tidak stabil)

## 📅 HARI 3 (Jam 48 – 72): Ancaman Penjarahan & Kontaminasi Air
*   **Kontaminasi Air Pipa (Jam 58):**
    1.  *Rebus air keruh berbau logam dengan kompor gas.* (Berbahaya, -1)
    2.  *Gunakan filter karbon aktif dan tablet klorin pemurni.* (Sangat Aman, +2) $\rightarrow$ **[SYARAT KUNCI HARI 4]**
    3.  *Biarkan air mengendap 12 jam tanpa disaring.* (Ceroboh, -2)
*   **Ketukan Pintu Pertama (Jam 70):**
    1.  *Buka pintu langsung untuk menolong suara wanita di luar.* (Sangat Bahaya, -3, Memicu Ending Fatal Instan)
    2.  *Arahkan kamera intip dan tanyakan sandi evakuasi.* (Aman, +2)
    3.  *Abaikan ketukan dan matikan seluruh lampu bunker.* (Netral, +1)

---

## 🔑 SYARAT MEMICU HARI KE-4 RAHASIA (JAM 72)
Pada Jam 72 (`ending_eval`), kode sistem akan memeriksa variabel:
1.  Skor `knowledge` saat ini **harus >= 8**.
2.  Pemain memilih opsi penjadwalan radio hemat baterai pada Jam 44.
3.  Pemain memilih opsi menyaring air dengan filter karbon aktif pada Jam 58.

*   **JIKA TIDAK TERPENUHI:** Cerita selesai di Jam 72 dengan **Ending Standar** (Normal/Buruk/Fatal).
*   **JIKA TERPENUHI:** Muncul transmisi radio rahasia dari Satgas dengan sandi khusus. Mereka mengabarkan heli evakuasi tertunda akibat badai debu radioaktif ekstrem. Layar bergetar hebat, dan status permainan bertransisi ke **HARI ke-4 (Jam 73 - 96)**.

---

## 📅 HARI 4 RAHASIA (Jam 72 – 96): Extended Crisis "Evakuasi Tertunda"
*   **Kelangkaan Oksigen (Jam 78):**
    1.  *Batasi aktivitas fisik keluarga (berbaring diam).* (Aman, +1)
    2.  *Buka ventilasi darurat luar untuk menarik udara segar.* (Sangat Bahaya/Radiasi, -3)
    3.  *Gunakan tabung oksigen cadangan medis.* (Aman, +2)
*   **Serangan Penjarah Bersenjata (Jam 88):**
    1.  *Gunakan sistem listrik kejut pada gagang pintu luar.* (Sangat Aman, +2)
    2.  *Gunakan pengeras suara untuk menggertak mereka.* (Berisiko, 0)
    3.  *Buka sedikit pintu untuk bernegosiasi barter makanan.* (Sangat Bahaya, -3)
*   **Evaluasi Akhir (Jam 96):**
    Detik-detik kedatangan Satgas Penanggulangan Bencana dengan helikopter berat untuk evakuasi final.

---

# 6. ROADMAP UPGRADE (7-DAY IMPLEMENTATION PLAN)

1.  **Hari 1:** Update struktur JSON (`src/data/story.json`) untuk menampung format 3 pilihan, alur rahasia Hari ke-4 (Jam 73–96), dan transisi kondisi syarat.
2.  **Hari 2:** Perbaiki `src/js/storyEngine.js` agar mendukung pemeriksaan syarat di scene `ending_eval` secara dinamis dan tombol pilihan ke-3.
3.  **Hari 3:** Ubah skala parameter `knowledge` maksimal dari 10 menjadi 15 di HUD.
4.  **Hari 4:** Implementasi aset baru (avatar anak ukuran 1:1 persegi) dan visual latar belakang bunker yang hancur total untuk Hari ke-4.
5.  **Hari 5:** Update sistem penyimpanan data `localStorage` agar mendukung backup status Hari ke-4 rahasia.
6.  **Hari 6:** Implementasi 5 cabang ending dan styling khusus pada view ending rahasia.
7.  **Hari 7:** Playtest intensif untuk menjamin memicu "Secret Path" membutuhkan ketelitian tinggi dari pemain, serta build final.

