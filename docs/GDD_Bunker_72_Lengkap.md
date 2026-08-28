# 📄 GAME DESIGN DOCUMENT (GDD) LENGKAP & DEFINITIF
## **72 Jam Pertama: Terjebak di Bunker 72**

* **Versi Dokumen:** Versi Definitif (MVP v2.3 Extended — Secret Day 4, Minigame Suite & Clean MVC)
* **Format File Word Resmi:** [GDD_Bunker_72_Lengkap.docx](file:///c:/laragon/www/bunker%2072/docs/GDD_Bunker_72_Lengkap.docx)
* **Platform:** Web Browser (Desktop PC 16:9 & Mobile Responsive Portrait/Landscape)
* **Teknologi & Engine:** HTML5, CSS3 CRT Canvas Shader, Vanilla JavaScript (Clean MVC), Web Audio API Synth Engine, Vite
* **Target Durasi:** 20 – 40 Menit per Playthrough (High Replayability, 8 Multiple Endings)

---

# 1. EXECUTIVE SUMMARY & VISI PERMAINAN

### 1.1 Sinopsis Cerita
Setelah letusan dahsyat Anak Gunung Krakatau memicu gelombang tsunami sekunder, gempa beruntun, dan badai abu vulkanik beracun di sepanjang pesisir Selat Sunda, sebuah keluarga kecil (Aris sang Ayah, Sarah sang Ibu, dan Maya anak perempuan mereka) harus mengungsi dan bertahan hidup di dalam bunker perlindungan bawah tanah keluarga (Bunker 72). Selama 72 hingga 96 jam pertama—fase paling mematikan dalam siklus bencana—pemain harus memimpin keluarga ini mengambil keputusan sulit berbasis mitigasi ilmiah nyata untuk bertahan hidup hingga bala bantuan tim SAR BNPB tiba.

### 1.2 Pilar Utama Desain (Core Design Pillars)
1. **Realisme Mitigasi Bencana (Scientific Accuracy):** Setiap opsi keputusan dirancang sesuai pedoman keselamatan nyata dari BNPB (Badan Nasional Penanggulangan Bencana), BMKG, dan SOP ruang isolasi darurat. Kesalahan fatal (seperti membakar api di ruang tertutup atau membuka ventilasi saat abu pekat) memiliki konsekuensi ilmiah mematikan.
2. **Interaktivitas Naratif Diegetik (Hybrid Gameplay):** Pemain tidak hanya membaca teks pasif; mereka mengendalikan pergerakan 2D saat evakuasi ransel 40 detik di rumah, memperbaiki konsol mekanik pintu palka (aktuator daya, kunci rotor, geser kartu ID, patch kabel), serta memutar kenop frekuensi radio darurat diegetik.
3. **Survival Simulation (Tri-Stat Decay Matrix):** Sistem tidak hanya menghitung skor kepintaran abstrak, melainkan mensimulasikan metabolisme tubuh keluarga: Kelaparan (Hunger), Dahaga (Thirst), dan Kesehatan (Health) yang terkikis setiap interval 6 jam dan diperparah oleh kegagalan sistem bunker.
4. **Percabangan Mendalam & Secret Path (High Replayability):** Menawarkan 8 cabang akhir cerita berbeda, termasuk alur tersembunyi 'Hari ke-4 (96 Jam)' yang membutuhkan ketelitian tingkat tinggi, serta fitur New Game+ dengan analisis kualitas keputusan pasca permainan.

---

# 2. PROFIL KARAKTER & DINAMIKA KELUARGA

| Karakter | Peran / Usia | Karakteristik & Signifikansi Gameplay |
| :--- | :--- | :--- |
| **Aris (Ayah)** | Kepala Keluarga<br>38 Tahun | Protagonis yang dikendalikan pemain. Bertanggung jawab mengambil keputusan taktis, pengoperasian konsol teknis bunker, dan keselamatan fisik seluruh keluarga. |
| **Sarah (Ibu)** | Istri / Dokter Gigi<br>36 Tahun | Sosok tenang dan teliti. Membantu memberikan pertimbangan medis, mengingatkan sterilisasi air, dan menstabilkan moral keluarga saat krisis guncangan gempa. |
| **Maya (Anak)** | Putri Tunggal<br>8 Tahun | Mewakili kepolosan dan kerapuhan emosional. Membutuhkan kenyamanan dan asupan gizi teratur. Keberadaan mainan mobil-mobilan dan snack darurat sangat mempengaruhi ketenangannya. |

---

# 3. SISTEM PARAMETER & MEKANIK SURVIVAL

State permainan dikelola secara terpusat pada modul `GameModel` dengan arsitektur bebas efek samping (*side-effect free*). Kondisi pemain dievaluasi melalui 4 parameter kuantitatif dinamis dan 3 status lingkungan kualitatif.

### 3.1 Parameter Karakter & Metabolisme

| Parameter | Rentang | Tingkat Peluruhan (Decay) | Dampak & Konsekuensi |
| :--- | :--- | :--- | :--- |
| **Kesiapsiagaan (Knowledge)** | `0 – 15`<br>(Default: 5) | Tidak meluruh per waktu.<br>Bertambah/berkurang via dialog pilihan & minigame. | Menentukan kualitas ending akhir. Skor >= 8 merupakan syarat utama membuka alur rahasia Hari ke-4. |
| **Kelaparan (Hunger)** | `0 – 100`<br>(Default: 100) | -18 poin per 6 jam permainan.<br>(+3 poin penalti jika filter udara bocor) | Jika mencapai 0, memicu penalti -10 Kesehatan per 6 jam. Dipulihkan +30 poin per konsumsi Makanan. |
| **Dahaga (Thirst)** | `0 – 100`<br>(Default: 100) | -20 poin per 6 jam permainan.<br>(+3 poin penalti jika struktur bunker retak) | Jika mencapai 0, memicu penalti -15 Kesehatan per 6 jam. Dipulihkan +30 poin per konsumsi Air Bersih. |
| **Kesehatan (Health)** | `0 – 100`<br>(Default: 100) | Meluruh saat kelaparan/kehausan 0, terkena gas racun, atau gempa. | Jika Kesehatan mencapai 0, permainan **BERAKHIR INSTAN** (Ending Fatal). Dipulihkan +40/+20 via P3K. |

### 3.2 Indikator Lingkungan Bunker (Dynamic Readout HUD)
* **Status Udara:** `STABIL` (filter aktif) $ightarrow$ `WASPADA` (katup belum diinspeksi) $ightarrow$ `KRITIS` (asap belerang/debu masuk). Mempengaruhi laju stamina dan risiko keracunan paru-paru.
* **Integritas Struktur:** `AMAN` (penyangga hidrolik aktif) $ightarrow$ `RETAK` (akibat gempa tanpa pengamanan) $ightarrow$ `RUNTUH` (bunker roboh). Struktur retak meningkatkan kebocoran air dan dahaga.
* **Status Daya Listrik:** `NORMAL` (penerangan penuh) $ightarrow$ `HEMAT` (lampu darurat, Jam 44) $ightarrow$ `DARURAT` (baterai menipis, Jam 54) $ightarrow$ `PADAM` (Jam 78 ke atas jika generator gagal dihemat).

### 3.3 Sistem Inventaris Interaktif (Active Logistics System)
* 🥫 **Makanan Kaleng (Food):** Stok awal: 2 unit. Memulihkan `+30 Kelaparan`.
* 💧 **Air Bersih (Drink):** Stok awal: 2 unit. Memulihkan `+30 Dahaga`. Sangat vital di jam-jam akhir saat cadangan pipa terkontaminasi.
* 🩹 **Kotak P3K (First Aid Kit):** Stok awal: 1 unit. Memulihkan `+40 Kesehatan` jika HP < 70%, atau `+20 Kesehatan` jika HP >= 70%.
* 📻 **Radio Portabel (Radio):** Tidak habis pakai. Mengeklik ikon radio membuka Minigame Radio Tuning untuk memindai siaran resmi BNPB.

---

# 4. SPESIFIKASI MINIGAME TERINTEGRASI

### 4.1 Minigame 1: 2D Scavenger Packing Run (Prologue)
* **Aturan Waktu:** 40 Detik dengan efek screen tremor (guncangan gempa) yang semakin intensif mendekati batas waktu.
* **Kapasitas Ransel:** Maksimal 5 Slot barang dari 6 item yang tersedia di penjuru rumah.
* **Sebaran Item:** Makanan Kaleng (Dapur), Air Bersih (Dapur), Kotak P3K (Ruang Kerja), Radio Portabel (Ruang Kerja), Snack Darurat (Ruang Tengah), Mainan Anak (Ruang Tamu).
* **Skema Kontrol:** Tombol WASD / Arrow Keys (Desktop) atau Virtual D-Pad Touchscreen (Mobile), Tombol [E] / Spasi / Tap untuk mengambil barang dan masuk ke palka bunker.

### 4.2 Minigame 2: Konsol Segel Masuk Bunker (Bunker Maintenance Console)
1. **Stasiun 01 (Daya Utama / Lever Actuator):** Pemain menekan dan menarik tuas vertikal ke atas secara mulus hingga meteran tegangan bus voltase mencapai 100% (Zona Aman Hijau).
2. **Stasiun 02 (Kunci Rotor 1—2—3):** Tiga rotor berputar secara kontinu. Pemain harus mengetuk dial tepat pada saat angka target (1, 2, 3) melintasi reseptor sensor. Tiga kali toleransi kesalahan.
3. **Stasiun 03 (Otentikasi Kartu Akses 72-A):** Pemain menahan kartu ID keluarga dan menggesernya secara horizontal dari ujung kiri melintasi scanner inframerah ke kanan tanpa terputus.
4. **Stasiun 04 (Patch Bay Distribusi Kabel):** Menghubungkan 4 jalur kabel terminal Sumber (Kiri) ke Distribusi (Kanan) sesuai kesesuaian warna (Merah, Kuning, Biru, Hijau).

### 4.3 Minigame 3: Diegetic Radio Signal Tuner
* Diakses saat pemain mengeklik ikon radio di inventaris atau saat scene komunikasi Hari ke-2.
* Pemain memutar kenop frekuensi analog (88.0 – 108.0 MHz). Suara derau statis sintetis (Web Audio API) akan berubah menjadi siaran jernih saat mendekati frekuensi darurat BNPB Rakata (94.0 – 106.0 MHz).
* Penguncian sinyal sukses memberikan reward `+1 Kesiapsiagaan` dan mengungkap informasi status bahaya terkini.

---

# 5. STRUKTUR NARASI & MATRIKS KEPUTUSAN LENGKAP

| Waktu | Titik Keputusan | Opsi Pilihan Pemain | Dampak & Flags |
| :--- | :--- | :--- | :--- |
| **Jam 00**<br>(Hari 1) | Penyegelan Pintu Bunker Utama | A. Kunci otomatis & aktifkan filtrasi<br>B. Buka sedikit pintu pantau luar<br>C. Kunci manual palang baja | A: +1 Knowledge (Cepat)<br>B: -2 Knowledge, Abu Masuk<br>C: +2 Knowledge (Optimal) |
| **Jam 08**<br>(Hari 1) | Inspeksi Sistem Filtrasi Udara | A. Nyalakan tanpa cek katup<br>B. Ganti segel karbon cadangan<br>C. Pakai kain basah alternatif | A: -1 Knowledge, `air_uninspected`<br>B: +2 Knowledge (Optimal)<br>C: +0 Knowledge (Netral) |
| **Jam 14**<br>(Hari 1) | Manajemen Penjatahan Air | A. Minum bebas redakan cemas<br>B. Jadwalkan 200ml tiap 8 jam<br>C. Minum hanya saat haus berat | A: -2 Knowledge, boros air<br>B: +2 Knowledge (Optimal)<br>C: +0 Knowledge (Netral) |
| **Jam 20**<br>(Hari 1) | Sanitasi & Pengelolaan Limbah | A. Segel kantong ganda biohazard<br>B. Taruh limbah di dekat pintu luar<br>C. Tumpuk limbah di sudut bunker | A: +2 Knowledge, patogen aman<br>B: -2 Knowledge, infeksi luar<br>C: -2 Knowledge, patogen udara |
| **Jam 30**<br>(Hari 2) | Guncangan Gempa Krakatau Utama | A. Panik lari coba buka pintu<br>B. Berlindung bawah ranjang baja<br>C. Aktifkan hidrolik peredam | A: -3 Knowledge, `structural_damage`, -30 HP<br>B: +1 Knowledge<br>C: +2 Knowledge (Optimal) |
| **Jam 36**<br>(Hari 2) | Kebocoran Asap Belerang | A. Tutup retakan dengan kain basah<br>B. Pakai pasta sealant & masker P3K<br>C. Nyalakan kipas tiup asap keluar | A: -2 Knowledge, gas tembus<br>B: +2 Knowledge (Optimal)<br>C: -2 Knowledge, racun menyebar |
| **Jam 44**<br>(Hari 2) | Jadwal Siaran Radio Darurat | A. Nyalakan radio nonstop cari SAR<br>B. Transmisi 10 menit tiap 6 jam<br>C. Bypass generator naikkan daya | A: -2 Knowledge, baterai habis<br>B: +2 Knowledge, `radio_saved` **[KUNCI H4]**<br>C: +1 Knowledge, tegangan rusak |
| **Jam 50**<br>(Hari 2) | Penjatahan Daya Listrik | A. Matikan lampu, mode darurat<br>B. Pertahankan lampu tetap terang<br>C. Modifikasi jalur listrik manual | A: +2 Knowledge, `power_saved`<br>B: -2 Knowledge, boros daya<br>C: -2 Knowledge, risiko korsleting |
| **Jam 58**<br>(Hari 3) | Pencemaran Air Pipa Endapan | A. Rebus langsung air keruh<br>B. Filter karbon aktif & klorin<br>C. Endapkan 12 jam tanpa saring | A: -1 Knowledge, mineral vulkanik<br>B: +2 Knowledge, `water_filtered` **[KUNCI H4]**<br>C: -2 Knowledge, racun terlarut |
| **Jam 64**<br>(Hari 3) | Sinyal Penanda Evakuasi Luar | A. Pukul pipa besi keras-keras<br>B. Pasang kain reflektor ventilasi<br>C. Bakar kain di ruang pembuangan | A: -2 Knowledge, undang penjarah<br>B: +2 Knowledge (Optimal)<br>C: -2 Knowledge, racun monoksida |
| **Jam 70**<br>(Hari 3) | Ketukan Pintu & Suara Minta Tolong | A. Buka pintu langsung tolong orang<br>B. Intip kamera & minta sandi SAR<br>C. Abaikan ketukan, matikan lampu | A: -3 Knowledge, `door_opened` (Memicu Fatal)<br>B: +2 Knowledge (Optimal)<br>C: +1 Knowledge (Netral) |
| **Jam 72**<br>(Evaluasi) | Gerbang Pengecekan Akhir Jam 72 | Pemeriksaan Sistem:<br>1. `Knowledge >= 8`<br>2. `radio_saved == true`<br>3. `water_filtered == true` | • 3 Syarat: Masuk **HARI 4 RAHASIA**<br>• 2 Syarat: Masuk **HARI 4 (Near Miss)**<br>• <2 Syarat: Menuju Ending Standar Jam 72 |
| **Jam 78**<br>(Hari 4) | Krisis Kelangkaan Oksigen | A. Istirahat total kurangi napas<br>B. Buka ventilasi darurat luar<br>C. Gunakan tabung oksigen medis | A: +1 Knowledge<br>B: -3 Knowledge, racun udara luar<br>C: +2 Knowledge (Optimal) |
| **Jam 88**<br>(Hari 4) | Serangan Penjarah Bersenjata | A. Alirkan listrik kejut handle pintu<br>B. Gertak penjarah via pengeras suara<br>C. Buka pintu sedikit barter makanan | A: +2 Knowledge, penjarah lumpuh<br>B: +0 Knowledge (Berisiko)<br>C: -3 Knowledge, penjarah masuk (Fatal) |
| **Jam 92**<br>(Hari 4) | Triage Logistik Sebelum Penjemputan | A. Bagikan sisa makanan rata<br>B. Minum sisa air untuk hidrasi<br>C. Tahan sisa logistik, abaikan lapar | A: +1 Knowledge, stamina pulih<br>B: +1 Knowledge, dahaga pulih<br>C: -2 Knowledge, keluarga kolaps |

---

# 6. MATRIKS 8 MULTIPLE ENDINGS LENGKAP

| Ending ID | Nama Akhir Cerita | Syarat & Logika Trigger | Deskripsi Narasi Ending |
| :--- | :--- | :--- | :--- |
| `ending_fatal` | **Makam Bunker 72**<br>🔴 Fatal Game Over | `Health <= 0`, ATAU `door_opened == true`, ATAU `Knowledge == 0`. | Bunker kebobolan atau terkontaminasi gas mematikan. Seluruh anggota keluarga gugur sebelum bantuan tiba. |
| `ending_stranded_bad` | **Terputus & Terlupakan**<br>🔴 Bad Ending | Jam 72: `!radio_saved` DAN `!water_filtered`. | Baterai radio padam dan cadangan air beracun. Bunker terisolasi tanpa sinyal koordinat untuk helikopter evakuasi. |
| `ending_bad` | **Penyelamatan Darurat Kritis**<br>🔴 Bad Ending | Jam 72: `Knowledge 1 – 3`. | Keluarga berhasil dievakuasi di jam ke-72 namun dalam kondisi kritis akibat racun udara dan butuh perawatan intensif ICU. |
| `ending_normal` | **Bertahan Hidup dengan Luka**<br>🟡 Normal Ending | Jam 72: `Knowledge 4 – 7`. | Keluarga selamat namun menderita dehidrasi parah dan trauma fisik karena beberapa protokol penanganan terabaikan. |
| `ending_best` | **Penyelamatan Sempurna (72h)**<br>🟢 Good Ending | Jam 72: `Knowledge >= 8` (gagal salah satu syarat kunci H4). | Evakuasi helikopter BNPB berhasil tepat waktu. Seluruh keluarga selamat dalam kondisi fisik yang prima. |
| `ending_near_miss` | **Lolos Tipis ke Hari 4**<br>🟡 Near Miss Gate | Jam 72: Memenuhi 2 dari 3 syarat kunci Hari 4. | Masuk ke Hari ke-4 dengan penalti fisik (-15 HP, -15 Lapar, -15 Dahaga) dan stok makanan/minuman habis terpakai. |
| `ending_secret_bad` | **Gugur di Garis Akhir (96h)**<br>🔴 Secret Bad | Hari 4: `Knowledge < 12`, ATAU `structural_damage`, ATAU `Health <= 0`. | Gagal menghadapi badai abu radioaktif atau serangan penjarah di jam-jam terakhir. Tim SAR menemukan bunker dalam keheningan. |
| `ending_secret_best` | **Penyelamatan Sempurna Krakatau**<br>🏆 True Best Ending | Hari 4: `Knowledge >= 12`, Struktur `AMAN`, `Health > 0` pada Jam 96. | Prestasi tertinggi. Keluarga bertahan 96 jam melewati krisis ekstrem, menangkal penjarah, dan dijemput Satgas Khusus SAR. |

---

# 7. SPESIFIKASI TEKNIS & ARSITEKTUR PERANGKAT LUNAK

### 7.1 Pola Arsitektur Clean MVC (Model-View-Controller)
* **Model ([`GameModel.js`](file:///c:/laragon/www/bunker%2072/src/js/gameModel.js)):** Mengelola seluruh state murni, perhitungan decay metabolisme, inventaris, flag rekonstruksi berbasis Choice ID stabil, dan logika evaluasi ending tanpa ketergantungan DOM.
* **View ([`GameView.js`](file:///c:/laragon/www/bunker%2072/src/js/gameView.js)):** Bertanggung jawab atas rendering DOM, efek typewriter delta-time berbasis `requestAnimationFrame` (kecepatan 30ms/karakter), rendering status HUD, bar meteran, dan layar ending analitik.
* **Controller ([`StoryEngine.js`](file:///c:/laragon/www/bunker%2072/src/js/storyEngine.js)):** Bertindak sebagai Controller yang mengorkestrasi transisi alur narasi, interaksi minigame palka dan scavenger, pemanggilan modul audio, serta autosave `localStorage`.

### 7.2 Audio Synthesizer Engine (Web Audio API)
* **Typewriter Clicks:** Square wave mikro-transient dengan anti-pop gain envelope (ramping eksponensial halus ke 0.0001).
* **Alarm Bahaya & Sirene Tsunami:** Osilator modulasi frekuensi dinamis (*pitch bend*) saat status bunker mencapai `KRITIS`.
* **White Noise Radio Static:** Buffer acak noise generator dengan band-pass filtering yang terhubung langsung ke slider frekuensi.
* **Gempa Rumble:** Osilator frekuensi sangat rendah (sub-bass 35–60 Hz) yang disinkronkan dengan efek visual screen shake.

### 7.3 Antarmuka Responsif & Visual CRT Shader
* **Efek Kelengkungan CRT (Curvature) & Scanlines:** Layer radial vignette dan garis pemindai dinamis di atas kanvas game.
* **Flicker Layar:** Simulasi ketidakstabilan generator listrik bunker menggunakan fluktuasi opacity halus.
* **Layout Multi-Device:** Tampilan 16:9 proporsional di Desktop PC, serta otomatis reflow secara ergonomis pada layar Mobile Portrait (<600px) tanpa menghilangkan akses panel inventaris aktif.

---

# 8. ROADMAP PRODUKSI & DEFINITION OF DONE (DoD)

- [x] **Narasi Lengkap:** Seluruh 15 titik keputusan cerita dari Prologue hingga Hari ke-4 berjalan mulus dengan 3 cabang opsi.
- [x] **Minigame Aktif:** Ketiga minigame (2D Scavenger, Bunker Seal Console 4-Station, Radio Tuner) berfungsi presisi di Desktop dan Mobile.
- [x] **Tri-Stat Survival:** Peluruhan Lapar/Dahaga/Kesehatan berjalan akurat dan kematian instan terpicu saat Health menyentuh 0.
- [x] **8 Ending Tervalidasi:** Kedelapan ending cerita dapat dicapai sesuai matriks logika percabangan tanpa regresi.
- [x] **Audio & UX Bersih:** Bebas audio-popping, performa stabil 60 FPS pada monitor 16:9 dan smartphone portrait.
- [x] **Save/Load Handal:** Penyimpanan data lokal (`localStorage`) memulihkan posisi adegan, nilai survival, inventaris, dan flags secara utuh.
