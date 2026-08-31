# 📄 GAME DESIGN DOCUMENT (GDD) LENGKAP & DEFINITIF
## **72 Jam Pertama: Terjebak di Bunker 72**

* **Versi Dokumen:** Versi Definitif Master (v2.3+ Extended — Secret Day 4, Minigame Suite, Clean MVC & Modular Epilogue)
* **Format File Word Pendamping:** [GDD_Bunker_72_Lengkap.docx](file:///c:/laragon/www/bunker%2072/docs/GDD_Bunker_72_Lengkap.docx)
* **Platform:** Web Browser (Desktop PC 16:9 & Mobile Responsive Touchscreen)
* **Teknologi & Engine:** HTML5, CSS3 CRT Canvas Shader, Vanilla JavaScript (Clean MVC), Web Audio API Synth Engine, Vite
* **Target Durasi:** 20 – 40 Menit per Playthrough (8 Multiple Endings, High Replayability, New Game+)

---

# 1. EXECUTIVE SUMMARY & VISI PRODUK

### 1.1 Sinopsis Cerita
Setelah letusan dahsyat Anak Gunung Krakatau memicu gempa bumi seismik berkekuatan tinggi, gelombang tsunami sekunder, dan badai abu vulkanik beracun di sepanjang pesisir Selat Sunda, sebuah keluarga kecil (Aris sang Ayah, Sarah sang Ibu, dan Maya putri tunggal mereka) harus mengungsi dan bertahan hidup di dalam bunker perlindungan keluarga bawah tanah (**Bunker 72**). 

Selama 72 hingga 96 jam pertama—fase 'Golden Window' paling kritis dan mematikan dalam siklus tanggap darurat bencana—pemain memegang kendali atas setiap keputusan taktis dan logistik. Keputusan keluarga tidak hanya menguji ketahanan mental dan fisik di ruang tertutup tanpa ventilasi alami, melainkan juga mensimulasikan kepatuhan terhadap prinsip mitigasi bencana riil hingga tim penyelamat gabungan Satgas SAR BNPB tiba di lokasi.

### 1.2 Pilar Utama Desain (Core Design Pillars)
1. **Realisme Mitigasi Bencana Berbasis Sains (Scientific Disaster Accuracy):** 
   Setiap opsi keputusan dirancang sesuai pedoman keselamatan nyata dari **BNPB** (Badan Nasional Penanggulangan Bencana) dan **BMKG**. Kesalahan fatal (seperti membakar api di ruang tertutup, membuka pintu saat hujan abu pekat, atau merebus air keruh tanpa filter karbon) menghasilkan konsekuensi fisiologis mematikan.
2. **Simulasi Metabolisme Aktif (Tri-Stat Decay Matrix):**
   Sistem tidak hanya menghitung skor kepintaran abstrak, melainkan mensimulasikan metabolisme biologis keluarga: **Kelaparan (Hunger)**, **Dahaga (Thirst)**, dan **Kesehatan (Health)** yang terkikis setiap interval 6 jam dan diperparah oleh kegagalan sistem pendukung bunker.
3. **Interaktivitas Naratif Hibrida (Diegetic Minigames):**
   Pemain terlibat aktif melalui gameplay langsung:
   - Mengendalikan pergerakan 2D saat evakuasi ransel 40 detik di rumah pesisir.
   - Mengoperasikan 4 stasiun konsol palka (kartu akses, tuas daya, penyelarasan rotor, patch kabel).
   - Memutar kenop analog tuner radio darurat diegetik berbasis Web Audio API.
4. **Percabangan Dinamis & Secret Path (High Replayability):**
   Menawarkan 8 akhir cerita berbeda, termasuk alur tersembunyi 'Hari ke-4 (96 Jam)' yang membutuhkan ketelitian tinggi, fitur New Game+, serta sistem analitik epilog 5 dimensi gaya Telltale Games.

---

# 2. PROFIL KARAKTER & DINAMIKA KELUARGA

```
       ┌────────────────────────────────────────────────────────┐
       │              DINAMIKA KELUARGA BUNKER 72               │
       │                                                        │
       │     ┌──────────────┐              ┌──────────────┐     │
       │     │  ARIS (Ayah) │◄────────────►│ SARAH (Ibu)  │     │
       │     │   Insinyur   │   Dukungan   │    Medis     │     │
       │     └──────┬───────┘   Emosional  └──────┬───────┘     │
       │            │                             │             │
       │            │       ┌──────────────┐      │             │
       │            └──────►│ MAYA (Anak)  │◄─────┘             │
       │     Proteksi Fisik │  8 Thn/Moral │ Perhatian Medis    │
       │                    └──────────────┘                    │
       └────────────────────────────────────────────────────────┘
```

| Karakter | Peran / Usia | Latar Belakang & Signifikansi Gameplay |
| :--- | :--- | :--- |
| **Aris (Ayah)** | Kepala Keluarga<br>38 Tahun | Protagonis utama yang dikendalikan pemain. Berlatar belakang teknisi/insinyur sipil. Bertanggung jawab atas pengoperasian konsol teknis bunker, keputusan navigasi, dan keselamatan fisik keluarga. |
| **Sarah (Ibu)** | Istri / Medis<br>36 Tahun | Sosok yang tenang dan teliti dengan latar belakang medis. Memberikan pertimbangan sterilisasi air, panduan pertolongan pertama (P3K), dan menstabilkan moral keluarga saat guncangan gempa susulan. |
| **Maya (Anak)** | Putri Tunggal<br>8 Tahun | Mewakili kerapuhan emosional dan kepolosan anak-anak. Membutuhkan asupan gizi teratur dan rasa aman di ruang gelap. Membawa mainan mobil-mobilan dan camilan sangat mempengaruhi ketenangan mentalnya. |
| **Penyintas Asing** | Karakter Luar<br>(Hari 2) | Pengungsi luar yang mengetuk pintu palka saat badai abu. Pilihan pemain untuk membantu via kotak airlock atau mengusirnya menentukan skor karma sosial keluarga. |
| **Kelompok Penjarah** | Antagonis Luar<br>(Hari 4) | Penyintas bersenjata yang putus asa mencari suplai di jam ke-88. Menguji kesiapsiagaan sistem pertahanan listrik palka bunker. |
| **Satgas SAR BNPB** | Tim Penyelamat<br>(Ending) | Regu evakuasi helikopter darurat dan tim penyisir darat yang menjemput keluarga berdasarkan koordinat siaran radio dan sinyal penanda. |

---

# 3. SISTEM SIMULASI SURVIVAL & PARAMETER METABOLISME

State permainan dikelola secara terpusat dan murni pada modul [`GameModel.js`](file:///c:/laragon/www/bunker%2072/src/js/gameModel.js) tanpa ketergantungan DOM atau Audio.

### 3.1 Parameter Karakter & Formula Peluruhan (Decay)

| Parameter | Rentang | Laju Peluruhan (Tiap 6 Jam) | Dampak & Konsekuensi Fisiologis |
| :--- | :---: | :--- | :--- |
| **Kesiapsiagaan (Knowledge)** | `0 – 15`<br>(Default: 5) | Statis per waktu.<br>Berubah via pilihan narasi & minigame. | Menentukan kualitas evakuasi dan membuka alur Hari ke-4. Nilai $\ge 8$ adalah syarat utama penyelamatan prima 72 jam. |
| **Kelaparan (Hunger)** | `0 – 100`<br>(Default: 100) | `-6` poin per 6 jam.<br>*(+3 penalti jika filter udara bocor)* | Jika menyentuh `0`, memicu penalti `-3` Kesehatan per interval 6 jam. Konsumsi Makanan memulihkan `+30`. |
| **Dahaga (Thirst)** | `0 – 100`<br>(Default: 100) | `-7` poin per 6 jam.<br>*(+3 penalti jika struktur bunker retak)*| Jika menyentuh `0`, memicu penalti `-5` Kesehatan per interval 6 jam. Konsumsi Air Bersih memulihkan `+30`. |
| **Kesehatan (Health)** | `0 – 100`<br>(Default: 100) | Berkurang saat Lapar/Dahaga 0, terkena gas beracun, atau gempa. | Jika menyentuh `0`: **INSTANT DEATH (Ending Fatal)**.<br>P3K memulihkan `+40` (atau `+20` jika HP $\ge 70\%$). |

```javascript
// Formula Peluruhan Metabolisme per 6 Jam (src/js/gameModel.js)
let hungerDecayRate = HUNGER_DECAY_PER_INTERVAL; // 6
if (this.flags.air_uninspected) hungerDecayRate += 3;

let thirstDecayRate = THIRST_DECAY_PER_INTERVAL; // 7
if (this.flags.structural_damage) thirstDecayRate += 3;

this.hunger = clamp(this.hunger - (elapsedHours / 6) * hungerDecayRate, 0, 100);
this.thirst = clamp(this.thirst - (elapsedHours / 6) * thirstDecayRate, 0, 100);

let healthPenalty = 0;
if (this.hunger <= 0) healthPenalty += (elapsedHours / 6) * 3;
if (this.thirst <= 0) healthPenalty += (elapsedHours / 6) * 5;
if (this.flags.smoke_poisoned) healthPenalty += (elapsedHours / 6) * 5;

if (healthPenalty > 0) {
  this.health = clamp(this.health - healthPenalty, 0, 100);
}
```

> [!IMPORTANT]
> **Mekanisme Kematian Instan (Health = 0):**
> Jika `health <= 0`, `StoryEngine` secara otomatis memotong percabangan adegan apa pun dan langsung mengalihkan pemain ke scene `ending_fatal`.

### 3.2 Indikator Lingkungan Bunker (Dynamic Readout HUD)
1. **Status Udara:**
   - `STABIL`: Sistem filtrasi karbon aktif berfungsi sempurna.
   - `WASPADA`: Katup udara belum diinspeksi saat masuk bunker.
   - `KRITIS`: Gas asam belerang atau abu silika merembes masuk ke dalam ruangan.
2. **Integritas Struktur:**
   - `AMAN`: Penyangga hidrolik menyerap gelombang gempa seismik.
   - `RETAK`: Retakan dinding akibat guncangan gempa tanpa peredam, mempercepat kebocoran suhu dan laju dahaga.
   - `RUNTUH`: Plafon bunker roboh (memicu kegagalan fatal seketika).
3. **Status Daya Listrik:**
   - `NORMAL`: Generator aktif penuh dengan penerangan utama.
   - `HEMAT`: Lampu redup darurat diaktifkan pada Jam 44.
   - `DARURAT`: Baterai cadangan menipis pada Jam 54.
   - `PADAM`: Pemadaman total pada Jam 78+ jika protokol hemat energi gagal diterapkan.

---

# 4. SISTEM INVENTARIS & LOGISTIK INTERAKTIF

Panel inventaris terpasang di sebelah kiri layar (Desktop) atau bar horizontal ergonomis (Mobile) dan dapat digunakan secara real-time kapan pun pemain membutuhkan pemulihan status.

| Ikon & Item | Stok Awal | Efek Stat & Pemulihan | Catatan Mekanik & Logika Khusus |
| :--- | :---: | :--- | :--- |
| 🥫 **Makanan (Food)** | 2 – 3 Unit | `+30 Kelaparan` | Mencegah penalti kesehatan akibat kelaparan saat isolasi panjang. |
| 💧 **Air Bersih (Drink)** | 2 – 3 Unit | `+30 Dahaga` | Sumber daya paling berharga; mutlak dijaga menjelang krisis Jam 58. |
| 🩹 **Kotak P3K (Kit)** | 1 Unit | `+40 Kesehatan` (bila HP < 70%)<br>`+20 Kesehatan` (bila HP $\ge 70\%$) | Memiliki mekanisme *diminishing return* jika digunakan saat luka ringan. |
| 📻 **Radio Portabel** | 1 Unit | Membuka Tuner Sinyal Radio | Tidak berkurang; dipakai untuk memindai frekuensi darurat BNPB. |

---

# 5. RANGKAIAN 3 MINIGAME INTERAKTIF TERINTEGRASI

### 5.1 Minigame 1: 2D Scavenger Packing Run (Prologue)
* **File Implementasi:** [`scavengerMinigame.js`](file:///c:/laragon/www/bunker%2072/src/js/scavengerMinigame.js)
* **Batas Waktu:** **40 Detik** dengan efek guncangan kamera (tremor gempa) yang semakin intens mendekati detik ke-0.
* **Kapasitas Ransel:** Maksimal **5 Slot Item** dari 6 barang yang tersedia di rumah pesisir:
  1. *Makanan Kaleng* (Dapur)
  2. *Air Bersih* (Dapur)
  3. *Kotak P3K* (Ruang Kerja)
  4. *Radio Portable* (Ruang Tamu)
  5. *Snack Darurat* (Ruang Makan)
  6. *Mobil Mainan Anak* (Kamar Anak)
* **Dimensi Kanvas:** Peta beresolusi $1376 \times 768 \text{ px}$ dengan kamera dinamis $960 \times 540 \text{ px}$ yang mengikuti pergerakan karakter Ayah.
* **Skema Kontrol:** Keyboard WASD / Tombol Arah (Desktop), Virtual D-Pad (Mobile Touch), Tombol Ambil `[E]` / Spasi / Tap Layar.

### 5.2 Minigame 2: Konsol Perawatan Palka Bunker (4 Stasiun)
* **File Implementasi:** [`bunkerMinigame.js`](file:///c:/laragon/www/bunker%2072/src/js/bunkerMinigame.js)
* **Deskripsi Stasiun:**
  1. **Stasiun 01 (SEAL 72-A): Otentikasi Kartu Akses**
     Pemain menahan dan menggeser kartu ID keluarga melintasi scanner optik dari kiri ke kanan tanpa terputus.
  2. **Stasiun 02 (ACTUATOR A-01): Tuas Daya Utama**
     Pemain menekan dan menarik tuas vertikal generator ke atas hingga jarum bus voltase mencapai 100% (Zona Hijau).
  3. **Stasiun 03 (TURBIN ROTOR): Penyelarasan Kunci Rotor 1—2—3**
     Tiga cincin rotor berputar secara kontinu. Pemain harus mengetuk soket tepat saat angka berputar cocok dengan kotak target (1, 2, 3) dengan batas toleransi 3 kali kesalahan.
  4. **Stasiun 04 (PATCH-04): Patch Bay Kabel Cadangan**
     Menghubungkan 4 kabel warna terminal Sumber (Kiri) ke Distribusi (Kanan) sesuai kesesuaian warna (Merah, Kuning, Biru, Hijau).

### 5.3 Minigame 3: Diegetic Radio Signal Tuner
* **File Implementasi:** [`radioMiniGame.js`](file:///c:/laragon/www/bunker%2072/src/js/radioMiniGame.js)
* **Mekanik:** Dial analog rotary knob dan slider linear pada rentang frekuensi $88.0 – 108.0 \text{ MHz}$.
* **Audio Interaktif:** Suara derau statis sintetis (White Noise via Web Audio API) meredup dan berubah menjadi transmisi jernih saat mendekati target frekuensi darurat **Radio Suara Rakata BNPB (98.4 MHz)**.
* **Reward:** Penguncian sinyal sukses memberikan reward `+1 Kesiapsiagaan` dan membuka data intelijen bahaya terbaru.

---

# 6. POHON NARASI & MATRIKS KEPUTUSAN LENGKAP (JAM 00 – 96)

Setiap pilihan dikategorikan ke dalam 3 tingkat kualitas keputusan:
* **🟢 Optimal:** Sesuai SOP sains BNPB, memberikan poin kesiapsiagaan maksimal.
* **🟡 Acceptable:** Keputusan aman namun kurang efisien secara sumber daya.
* **🔴 Risky:** Melanggar prosedur keselamatan isolasi bunker, menimbulkan penalti parameter dan flag berbahaya.

```
                                  [ PROLOGUE ]
                         Rumah Pesisir & Evakuasi 40s
                                       │
                                       ▼
                                  [ HARI 1 ]
                   Palka (00h) ──► Katup Udara (08h) ──► Air (14h)
                                       │
                                       ▼
                                  [ HARI 2 ]
                   Gempa (30h) ──► Gas Belerang (36h) ──► Radio BNPB (44h)
                                       │
                                       ▼
                                  [ HARI 3 ]
                   Penyaringan Air (58h) ──► Sinyal (64h) ──► Verifikasi Palka (70h)
                                       │
                                       ▼
                           [ GERBANG EVALUASI 72h ]
                                  /         \
                         (Lolos) /           \ (Gagal Radio/Air)
                                ▼             ▼
                     [ ENDING STANDAR ]   [ HARI 4 RAHASIA ]
                     • Best (72h)         • Oksigen Kritis (78h)
                     • Normal (72h)       • Penjarah Palka (88h)
                     • Bad (72h)          • Triage Logistik (92h)
                     • Fatal (72h)                 │
                                                   ▼
                                         [ ENDING RAHASIA 96h ]
                                         • Secret Best (Krakatau)
                                         • Secret Bad (Gugur)
```

| Waktu | Titik Keputusan Narasi | Opsi Pilihan Pemain | Rating | Dampak Parameter & Flags |
| :--- | :--- | :--- | :---: | :--- |
| **Jam 00**<br>(Hari 1) | **Penyegelan Palka Masuk** | A. Kunci otomatis & aktifkan filtrasi<br>B. Buka celah pintu amati luar<br>C. Kunci manual palang baja palka | Acceptable<br>🔴 Risky<br>🟢 Optimal | A: +1 Knowledge<br>B: -2 Knowledge, `air_uninspected`<br>C: +2 Knowledge (Palang kokoh) |
| **Jam 08**<br>(Hari 1) | **Inspeksi Katup Filtrasi Udara** | A. Nyalakan tanpa cek katup<br>B. Ganti segel karbon cadangan<br>C. Pakai kain basah darurat | 🔴 Risky<br>🟢 Optimal<br>Acceptable | A: -1 Knowledge, `air_uninspected`<br>B: +2 Knowledge, `air_remedied`<br>C: +0 Knowledge (Netral) |
| **Jam 14**<br>(Hari 1) | **Manajemen Penjatahan Air** | A. Minum bebas redakan cemas<br>B. Jadwalkan 200ml tiap 8 jam<br>C. Minum hanya saat haus berat | 🔴 Risky<br>🟢 Optimal<br>Acceptable | A: -2 Knowledge, boros air<br>B: +2 Knowledge (Hidrasi teratur)<br>C: +0 Knowledge (Dehidrasi ringan) |
| **Jam 20**<br>(Hari 1) | **Sanitasi & Biohazard Limbah** | A. Segel ganda kantong biohazard<br>B. Buang limbah dekat pintu luar<br>C. Tumpuk limbah di sudut bunker | 🟢 Optimal<br>🔴 Risky<br>🔴 Risky | A: +2 Knowledge (Bebas patogen)<br>B: -2 Knowledge (Infeksi palka)<br>C: -2 Knowledge (Patogen udara) |
| **Jam 22**<br>(Hari 1) | **Kepanikan Maya di Ruang Gelap**| A. Nyalakan senter & dekap Maya<br>B. Beri mainan mobil & dongeng<br>C. Tegur tegas demi hemat oksigen | 🟢 Optimal<br>🟢 Optimal<br>🔴 Risky | A: +1 Knowledge, `maya_comforted`<br>B: +1 Knowledge, `maya_comforted`<br>C: -2 Knowledge, `maya_sad` |
| **Jam 30**<br>(Hari 2) | **Guncangan Gempa Krakatau** | A. Panik lari buka palka keluar<br>B. Berlindung bawah ranjang baja<br>C. Aktifkan hidrolik peredam gempa | 🔴 Risky<br>Acceptable<br>🟢 Optimal | A: -3 Knowledge, `structural_damage`, -20 HP<br>B: +1 Knowledge (Selamat)<br>C: +2 Knowledge (Struktur aman) |
| **Jam 36**<br>(Hari 2) | **Kebocoran Gas Belerang** | A. Tutup celah dengan kain basah<br>B. Pasta sealant & masker P3K<br>C. Nyalakan kipas tiup asap keluar | 🔴 Risky<br>🟢 Optimal<br>🔴 Risky | A: -2 Knowledge (Gas tembus)<br>B: +2 Knowledge, `air_remedied`<br>C: -2 Knowledge, `smoke_poisoned` |
| **Jam 40**<br>(Hari 2) | **Kontak Penyintas Luar di Palka**| A. Bantu via airlock (masker/air)<br>B. Beri info posko via interkom<br>C. Usir & gertak dengan kasar | 🟢 Optimal<br>Acceptable<br>🔴 Risky | A: +1 Knowledge, `helped_stranger`<br>B: +0 Knowledge, `stranger_guided`<br>C: -1 Knowledge, `stranger_hostile` |
| **Jam 44**<br>(Hari 2) | **Jadwal Transmisi Radio SAR** | A. Nyalakan radio nonstop cari sinyal<br>B. Transmisi 10 mnt tiap 6 jam<br>C. Bypass generator naikkan daya | 🔴 Risky<br>🟢 Optimal<br>Acceptable | A: -2 Knowledge (Baterai habis)<br>B: +2 Knowledge, `radio_saved` **[KUNCI]**<br>C: -1 Knowledge (Fluktuasi voltase) |
| **Jam 50**<br>(Hari 2) | **Penjatahan Daya Listrik** | A. Matikan lampu, mode darurat<br>B. Biarkan lampu tetap benderang<br>C. Modifikasi paksa jalur listrik | 🟢 Optimal<br>🔴 Risky<br>🔴 Risky | A: +2 Knowledge, `power_saved`<br>B: -2 Knowledge (Daya boros)<br>C: -2 Knowledge (Risiko korslet) |
| **Jam 58**<br>(Hari 3) | **Pencemaran Air Pipa Endapan** | A. Rebus langsung air keruh<br>B. Filter karbon aktif & klorin<br>C. Endapkan semalam tanpa saring | 🔴 Risky<br>🟢 Optimal<br>🔴 Risky | A: -1 Knowledge, `water_poisoned`<br>B: +2 Knowledge, `water_filtered` **[KUNCI]**<br>C: -2 Knowledge, `water_poisoned` |
| **Jam 64**<br>(Hari 3) | **Sinyal Penjemputan Evakuasi** | A. Pukul pipa besi sekerasnya<br>B. Pasang kain reflektor ventilasi<br>C. Nyalakan api di cerobong | 🔴 Risky<br>🟢 Optimal<br>🔴 Risky | A: -2 Knowledge (Undang bahaya)<br>B: +2 Knowledge (Sinyal optik aman)<br>C: -2 Knowledge (Racun karbon monoksida) |
| **Jam 70**<br>(Hari 3) | **Ketukan Pintu & Suara Asing** | A. Buka pintu langsung tolong orang<br>B. Intip kamera & minta sandi SAR<br>C. Abaikan ketukan, matikan lampu | 🔴 Risky<br>🟢 Optimal<br>Acceptable | A: -3 Knowledge, `door_opened` (Memicu Fatal)<br>B: +2 Knowledge (Verifikasi aman)<br>C: +1 Knowledge (Netral) |
| **Jam 72**<br>(Evaluasi) | **Gerbang Pengecekan 72 Jam** | Evaluasi 3 Syarat Kunci:<br>1. `Knowledge >= 8`<br>2. `radio_saved == true`<br>3. `water_filtered == true` | Evaluasi | • 3 Syarat: **Ending Best (72h)**<br>• Gagal Radio: Masuk **Hari 4 Rahasia**<br>• 2 Syarat: Masuk **Hari 4 (Near Miss)** |
| **Jam 78**<br>(Hari 4) | **Krisis Kelangkaan Oksigen** | A. Istirahat total kurangi napas<br>B. Buka ventilasi udara luar<br>C. Gunakan tabung oksigen medis | Acceptable<br>🔴 Risky<br>🟢 Optimal | A: +1 Knowledge<br>B: -3 Knowledge, `oxygen_depleted`<br>C: +2 Knowledge (Oksigen murni) |
| **Jam 84**<br>(Hari 4) | **Scavenge Reruntuhan Luar** | A. Kerja sama & berbagi logistik<br>B. Geledah hati-hati & cepat balik<br>C. Terobos gudang runtuh curam | 🟢 Optimal<br>Acceptable<br>🔴 Risky | A: +1 Knowledge, +1 Air/Food<br>B: +0 Knowledge, +1 Air/Food<br>C: -2 Knowledge, `scavenge_injured`, -20 HP |
| **Jam 88**<br>(Hari 4) | **Serangan Penjarah Bersenjata**| A. Alirkan listrik kejut ke handle<br>B. Gertak penjarah via interkom<br>C. Buka pintu sedikit untuk barter | 🟢 Optimal<br>Acceptable<br>🔴 Risky | A: +2 Knowledge, `looters_repelled`<br>B: +0 Knowledge (Waspada)<br>C: -3 Knowledge, `looters_breached` (Fatal) |
| **Jam 92**<br>(Hari 4) | **Triage Logistik Sebelum SAR** | A. Bagikan sisa ransum rata<br>B. Minum sisa air untuk hidrasi<br>C. Tahan ransum, biarkan lapar | 🟢 Optimal<br>🟢 Optimal<br>🔴 Risky | A: +1 Knowledge, stamina stabil<br>B: +1 Knowledge, dahaga pulih<br>C: -2 Knowledge (Keluarga kolaps) |

---

# 7. MATRIKS 3 ENDING TEMATIK & EPILOG MODULAR

### 7.1 Filosofi & Desain 3 Ending Tematik
Permainan mengusung 3 cabang akhir cerita yang merefleksikan pertanyaan moral: **"Apakah kemanusiaan kita layak dipertahankan saat dunia sedang kiamat?"**

```
                              [ KRISIS BENCANA KRAKATAU ]
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
            [ GAGAL MITIGASI ]                        [ BERHASIL SELAMAT ]
            (Health 0 / Palka Jebol)                           │
                     │                                         │
                     ▼                          ┌──────────────┴──────────────┐
              🔴 BAD ENDING                     ▼                             ▼
            "Makam Bunker 72"            [ SIKAP EGOIS ]               [ DILEMA MORAL ]
          (Tragedi Kehancuran)        (Abaikan/Usir Orang)          (Bantu Orang Asing)
                                                │                             │
                                                ▼                             ▼
                                        🟡 NORMAL ENDING              🟢 GOOD / SPECIAL ENDING
                                      "Selamat Sendirian"             "Kebaikan Berbalas"
                                    (Fisik Hidup, Jiwa Hampa)       (Penyelamatan Berbalas)
```

| Ending ID | Nama Akhir Cerita | Kategori | Syarat Logika Pemicu | Rangkuman Narasi & Resolusi Epilog |
| :--- | :--- | :---: | :--- | :--- |
| `ending_bad` | **Makam Bunker 72: Tragedi di Perut Bumi** | 🔴 Bad | `Health <= 0` ATAU `door_opened` ATAU `looters_breached`. | Palka kebobolan atau gas mematikan merenggut nyawa seluruh keluarga. Bunker menjadi makam abadi di bawah pekatnya abu vulkanik. |
| `ending_normal` | **Selamat Sendirian: Harga Sebuah Egoisme** | 🟡 Normal | Selamat hingga Jam 72 / 96, tetapi `helped_stranger == false` (egois). | Keluarga dievakuasi tim SAR umum dalam kondisi fisik selamat, namun suasana batin dingin & hampa. Maya trauma dan Aris dihantui penyesalan mengabaikan orang yang sekarat di depan pintu. |
| `ending_good` | **Kebaikan Berbalas: Cahaya Kemanusiaan** | 🟢 Special / True | Selamat DAN `helped_stranger == true` (menolong Hendra di airlock). | **Plot Twist Penyelamatan:** Hendra (penyintas yang dulu ditolong Aris) memandu tim SAR langsung ke posisi palka bunker. Maya bangga memeluk mobil-mobilannya melihat orang tuanya adalah pahlawan sejati. |

### 7.2 Logika Evaluasi Epilog Modular (Telltale-Style Epilogue)
Setiap ending merender laporan analitik komprehensif berdasarkan 5 dimensi evaluasi:
1. **Status Penyelamatan (Rescue Outcome):** Menampilkan badge evakuasi (*Makam Bunker 72* / *Selamat Sendirian* / *Kebaikan Berbalas Budi*).
2. **Kondisi Fisiologis & Medis:** Mendiagnosis keparahan luka bakar kimia, iritasi silika paru-paru, dan dehidrasi.
3. **Integritas Struktur Bunker:** Menilai efektivitas manajemen peredam gempa hidrolik.
4. **Solidaritas & Karma Sosial:** Merangkum konsekuensi moral dari keputusan membantu penyintas luar vs bersikap defensif dingin.
5. **Moral Maya & Ikatan Keluarga:** Menilai ketahanan psikologis Maya dan kebanggaannya terhadap karakter moral orang tuanya.

### 7.3 Skor Mitigasi Edukatif BNPB (0 – 100)
```javascript
// Perhitungan Skor Edukatif BNPB (src/js/gameModel.js)
let bnpbScore = 50;
bnpbScore += Math.round((this.health / 100) * 20);
bnpbScore += Math.round((this.hunger / 100) * 10);
bnpbScore += Math.round((this.thirst / 100) * 10);

if (this.flags.radio_saved) bnpbScore += 15;
if (this.flags.water_filtered && !this.flags.water_poisoned) bnpbScore += 15;
if (!this.flags.air_uninspected) bnpbScore += 10;
if (!this.flags.structural_damage) bnpbScore += 10;
if (this.flags.helped_stranger) bnpbScore += 15;
if (this.flags.door_opened) bnpbScore -= 40;
if (this.flags.looters_breached) bnpbScore -= 30;

bnpbScore = clamp(bnpbScore, 0, 100);
```

* **Grade S ($\ge 85$):** Protokol Elite BNPB — Keputusan mitigasi bencana sempurna dengan solidaritas kemanusiaan tertinggi.
* **Grade A ($70 – 84$):** Tanggap Bencana Unggul — Pemahaman keselamatan tinggi dengan mitigasi risiko solid.
* **Grade B ($55 – 69$):** Siaga Memadai — Keluarga bertahan hidup meski beberapa prosedur isolasi kurang optimal.
* **Grade C ($40 – 54$):** Waspada Minimal — Pelanggaran SOP menyebabkan risiko kesehatan dan trauma tinggi.
* **Grade D ($< 40$):** Kritis / Gagal Prosedur — Pelanggaran fatal prosedur isolasi membahayakan kelangsungan hidup.

---

# 8. ARSITEKTUR PERANGKAT LUNAK & REKAYASA SISTEM

Aplikasi dibangun menggunakan pola arsitektur **Model-View-Controller (Clean MVC)** yang ketat untuk menjamin *maintainability* dan skalabilitas jangka panjang.

```
       ┌─────────────────────────────────────────────────────────┐
       │                StoryEngine (Controller)                 │
       │   - Inisiasi Scene, Autosave localStorage               │
       │   - Menangkap UI Event dari GameView                    │
       │   - Mengorkestrasi Transisi Minigame & Suara            │
       └────────────────────┬────────────────────────┬───────────┘
                            │                        │
         Mutasi State       ▼           Render Data  ▼
  ┌───────────────────────────────┐    ┌─────────────────────────┐
  │       GameModel (Model)       │    │     GameView (View)     │
  │ - State Murni (HP, Lapar, dll)│    │ - DOM Selection/Update  │
  │ - Formula Peluruhan Survival  │    │ - Typewriter Delta-Time │
  │ - Evaluasi Ending Murni       │    │ - CRT Shader & Animasi  │
  │ (BEBAS DOM & AUDIO CALLBACKS) │    │ (BEBAS KEPEMILIKAN STATE│
  └───────────────────────────────┘    └─────────────────────────┘
```

### 8.1 Komponen MVC Utama
* **Model Layer ([`src/js/gameModel.js`](file:///c:/laragon/www/bunker%2072/src/js/gameModel.js)):**
  Memiliki seluruh runtime state (`currentSceneId`, `knowledge`, `hunger`, `thirst`, `health`, `inventory`, `flags`, `history`). Menjalankan metode murni seperti `updateSurvivalStats(elapsedHours)`, `useInventoryItem(key)`, dan `evaluateModularEnding()`.
* **View Layer ([`src/js/gameView.js`](file:///c:/laragon/www/bunker%2072/src/js/gameView.js)):**
  Mengelola manipulasi DOM, efek teks mengetik (*typewriter*) berbasis `requestAnimationFrame` (kecepatan $30\text{ ms/karakter}$), pembaruan HUD, bar inventaris mobile, dan rendering layar ending.
* **Controller Layer ([`src/js/storyEngine.js`](file:///c:/laragon/www/bunker%2072/src/js/storyEngine.js)):**
  Mengorkestrasi navigasi cerita, memicu minigame, memanggil modul audio, dan menangani serialisasi save state ke `localStorage`.

### 8.2 Web Audio API Synthesizer Engine ([`src/js/retroAudio.js`](file:///c:/laragon/www/bunker%2072/src/js/retroAudio.js))
* **Anti-Pop De-clicking Envelopes:** Semua osilator menggunakan `exponentialRampToValueAtTime(0.0001, now + duration)` sebelum dimatikan untuk mencegah letupan audio (*audio popping/clicking*).
* **Procedural Sound FX:**
  - *Typewriter key-clicks:* Square-wave mikro-transient $(1200\text{ Hz} \rightarrow 300\text{ Hz})$.
  - *Radio Static:* White noise generator buffer dengan band-pass filter dinamis.
  - *Gempa Tremor:* Osilator sub-bass frekuensi rendah ($35 – 60\text{ Hz}$) disinkronkan dengan visual screen shake.

---

# 9. DESAIN VISUAL, TIPOGRAFI & PALET WARNA CRT

### 9.1 Tata Letak & Rasio Aspek 16:9
Kontainer utama game (`#game-container`) mempertahankan rasio aspek keras **16:9** yang diposisikan di tengah layar peramban dengan properti pixelated rendering:
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

### 9.2 Palet Warna Terminal Sci-Fi (`src/styles/main.css`)
* `--bg-color: #08090b;` (Latar belakang gelap monitor CRT)
* `--bunker-dark: #111318;` (Panel latar belakang game utama)
* `--panel: rgba(15, 18, 22, 0.94);` (Panel semi-transparan dengan backdrop filter blur)
* `--text-pixel: #e7edf0;` (Teks putih pudar retro)
* `--text-muted: #89939a;` (Teks sekunder abu-abu redup)
* `--cyan: #5bc0be;` (Sorotan logistik & informasi instrumen)
* `--accent-green-border: #66e08e;` (Status aman / indikator positif)
* `--warning-yellow-border: #ffd166;` (Status siaga / nilai highlight HUD)
* `--accent-red-border: #ff5d5d;` (Status bahaya kritis / alert)

### 9.3 Tipografi Retro
* **VT323 (Monospace Retro):** Digunakan khusus untuk tajuk utama, tipe ending, jam countdown, dan skor besar (`font-family: 'VT323', monospace;`).
* **Share Tech Mono:** Digunakan untuk seluruh isi teks narasi, tombol pilihan, HUD, log protokol, dan deskripsi inventaris (`font-family: 'Share Tech Mono', monospace;`).

---

# 10. AKSESIBILITAS, NEW GAME+ & REPLAYABILITY MATRIX

1. **Aksesibilitas & Kontrol Ganda:**
   - Mendukung navigasi tombol angka `[1]`, `[2]`, `[3]` untuk memilih opsi dialog.
   - Tombol `[Spasi]` / Klik Teks untuk mempercepat (*skip*) efek typewriter.
   - Dukungan penuh layar sentuh (Virtual D-Pad dan sentuhan tombol responsif di ponsel).
2. **Pengaturan Preferensi Pengguna:**
   - Slider volume terpadu (Master Volume) dan toggle mode senyap (Mute) yang tersimpan di `localStorage`.
   - Tombol Fullscreen `[F]` terintegrasi.
3. **New Game+ (NG+ Progression):**
   - Setelah menyelesaikan permainan satu kali, flag `bunker72_game_completed` aktif di browser.
   - Membuka wawasan taktis tambahan di menu utama dan memperkaya analisis retrospektif di sesi berikutnya.

---

# 11. ROADMAP PRODUKSI & DEFINITION OF DONE (DoD)

- [x] **Narasi Lengkap & Percabangan 96 Jam:** Seluruh 18+ scene narasi (Prologue s.d. Hari 4) berjalan lancar dengan 3 pilihan per titik keputusan.
- [x] **Simulasi Survival Tri-Stat:** Peluruhan Lapar/Dahaga/Kesehatan berjalan akurat tiap 6 jam dengan instant death saat Health = 0.
- [x] **Suite 3 Minigame Terintegrasi:** 2D Scavenger Packing Run, Konsol Palka 4-Stasiun, dan Diegetic Radio Tuner berfungsi sempurna.
- [x] **8 Multiple Endings Tervalidasi:** Seluruh 8 akhir cerita dapat dicapai sesuai matriks logika tanpa regresi.
- [x] **Epilog Analitik Telltale-Style:** Menampilkan evaluasi modular 5 dimensi dan skor edukatif mitigasi BNPB Grade S s.d. D.
- [x] **Audio & Visual Bebas Glitch:** Sintesis Web Audio bebas bunyi popping, shader CRT tajam di monitor 16:9 dan smartphone.
- [x] **Sistem Save/Load Handal:** Penyimpanan data lokal (`localStorage`) memulihkan posisi adegan, inventaris, metabolisme, dan flags secara instan.
