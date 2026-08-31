# 📄 GAME DESIGN DOCUMENT (GDD) SINGKAT & ACUAN CEPAT
## **72 Jam Pertama: Terjebak di Bunker 72**

* **Versi Dokumen:** 2.3+ Definitive (Executive & Developer Quick Reference)
* **Genre:** 2D Survival Simulation Visual Novel (Text-Driven & Diegetic Minigames)
* **Platform:** Web Browser (Desktop 16:9 & Mobile Responsive Touch)
* **Teknologi:** HTML5, CSS3 CRT Shader, Vanilla JavaScript (Clean MVC), Web Audio API Synth, Vite
* **Target Durasi:** 20 – 40 Menit per Playthrough (8 Multiple Endings, High Replayability, New Game+)

---

# 1. EXECUTIVE SUMMARY & PILAR UTAMA

### 1.1 Premis Permainan
Letusan dahsyat Anak Gunung Krakatau di Selat Sunda memicu gempa susulan beruntun, tsunami sekunder, dan badai abu silika beracun. Pemain memimpin sebuah keluarga beranggotakan tiga orang—**Aris** (Ayah/Insinyur), **Sarah** (Ibu/Medis), dan **Maya** (Anak 8 tahun)—bertahan hidup di dalam bunker perlindungan bawah tanah (**Bunker 72**) selama 72 hingga 96 jam pertama hingga tim penyelamat SAR BNPB tiba.

```
       ┌─────────────────────────────────────────────────────────┐
       │                CORE GAMEPLAY LOOP                        │
       │                                                         │
       │   Baca Narasi & Dialog ───► Evaluasi Situasi Taktis     │
       │            ▲                            │               │
       │            │                            ▼               │
       │   Simulasi Peluruhan 6 Jam ◄── Ambil Pilihan Keputusan  │
       │   (Lapar, Dahaga, Health)     (Optimal / Netral / Riskan)│
       │            │                                            │
       │            ▼                                            │
       │   Aksi Logistik/Minigame ──► Evaluasi Ending (72h / 96h)│
       └─────────────────────────────────────────────────────────┘
```

### 1.2 Pilar Utama Desain
1. **Realisme Mitigasi Sains BNPB:** Setiap keputusan mengacu pada SOP keselamatan bencana riil (filtrasi partikel abu, penghematan baterai, isolasi patogen, dan larangan menyalakan api di ruang kedap udara).
2. **Simulasi Metabolisme Aktif (Tri-Stat Decay):** Tubuh keluarga mengalami lapar, dahaga, dan luka nyata yang meluruh setiap 6 jam permainan.
3. **Gameplay Hibrida Berbasis Minigame Diegetik:** Integrasi 3 minigame interaktif (Packing Run 2D, Konsol Palka 4-Stasiun, Radio Tuner Web Audio) tanpa merusak ritme narasi.
4. **Percabangan Dinamis & Secret Day 4 (96 Jam):** 8 variasi ending berbeda dengan evaluasi epilog modular 5 dimensi ala Telltale Games.

---

# 2. SISTEM PARAMETER & FORMULA SURVIVAL

Semua status dikelola secara murni pada [`GameModel.js`](file:///c:/laragon/www/bunker%2072/src/js/gameModel.js) dan didefinisikan pada [`constants.js`](file:///c:/laragon/www/bunker%2072/src/js/constants.js).

### 2.1 Parameter Karakter & Metabolisme

| Parameter | Rentang | Laju Peluruhan (Tiap 6 Jam) | Efek Kritis & Pemulihan |
| :--- | :---: | :--- | :--- |
| **Kesiapsiagaan (Knowledge)** | `0 – 15` | Statis (tidak meluruh per waktu). Bertambah dari pilihan tepat & minigame. | Menentukan cabang cerita dan alur Hari ke-4. Skor $\ge 8$ adalah syarat lolos 72h prima. |
| **Kelaparan (Hunger)** | `0 – 100` | `-6` poin per 6 jam<br>*(+3 penalti jika filter udara bocor)* | Jika `0`: Memicu `-3` Kesehatan tiap 6 jam.<br>Konsumsi Makanan memulihkan `+30`. |
| **Dahaga (Thirst)** | `0 – 100` | `-7` poin per 6 jam<br>*(+3 penalti jika struktur retak)* | Jika `0`: Memicu `-5` Kesehatan tiap 6 jam.<br>Konsumsi Air Bersih memulihkan `+30`. |
| **Kesehatan (Health)** | `0 – 100` | Meluruh saat Lapar/Dahaga = 0, racun gas, atau gempa tak terlindungi. | Jika `0`: **INSTANT DEATH (Ending Fatal)**.<br>P3K memulihkan `+40` (atau `+20` jika HP $\ge 70\%$). |

> [!CAUTION]
> **Health-Zero Instant Death:** Setiap kali nilai `health <= 0`, permainan langsung menghentikan alur cerita dan mengarahkan pemain seketika ke `ending_fatal`.

### 2.2 Inventaris & Logistik Interaktif

| Item | Stok Awal | Fungsi & Efek | Mekanisme Tambahan |
| :--- | :---: | :--- | :--- |
| 🥫 **Makanan (Food)** | 2 – 3 | Memulihkan `+30 Kelaparan` | Didapat dari Scavenge awal / Hari ke-4. |
| 💧 **Air Bersih (Drink)** | 2 – 3 | Memulihkan `+30 Dahaga` | Vital untuk mencegah dehidrasi mematikan. |
| 🩹 **Kotak P3K (Kit)** | 1 | Memulihkan `+40 HP` (HP < 70%)<br>Memulihkan `+20 HP` (HP $\ge 70\%$) | Mengobati cedera gempa & keracunan gas. |
| 📻 **Radio Portabel** | 1 | Akses Minigame Radio Tuning | Tidak berkurang; dipakai menyimak siaran darurat BNPB. |

### 2.3 Indikator Lingkungan HUD
* **Status Udara:** `STABIL` $\rightarrow$ `WASPADA` $\rightarrow$ `KRITIS` (Bocor/asap menambah laju lapar & racun paru).
* **Integritas Struktur:** `AMAN` $\rightarrow$ `RETAK` $\rightarrow$ `RUNTUH` (Retak menambah laju dehidrasi dahaga).
* **Daya Listrik:** `NORMAL` $\rightarrow$ `HEMAT` (Jam 44) $\rightarrow$ `DARURAT` (Jam 54) $\rightarrow$ `PADAM` (Jam 78+).

---

# 3. RANGKUMAN 3 MINIGAME INTERAKTIF

### 🎒 Minigame 1: 2D Scavenger Packing Run (Prologue)
* **Mekanik:** Top-down canvas 2D, kamera follow, durasi **40 Detik** dengan tremor layar gempa.
* **Tujuan:** Mengumpulkan maksimal **5 dari 6 item** di rumah pesisir (Makanan, Air, P3K, Radio, Snack, Mainan) lalu masuk ke palka bunker sebelum waktu habis.
* **Kontrol:** WASD / Arrow Keys / Virtual D-Pad Mobile + Tombol Ambil `[E]` / Spasi / Tap.

### ⚙️ Minigame 2: Konsol Perawatan Palka Bunker (4 Stasiun)
1. **Otentikasi Kartu (SEAL 72-A):** Geser kartu akses secara horizontal melintasi scanner tanpa lepas.
2. **Tuas Daya Utama (ACTUATOR A-01):** Tarik tuas ke atas hingga bus voltase mencapai 100% (Zona Hijau).
3. **Penyelarasan Rotor (TURBIN 1-2-3):** Ketuk soket tepat saat angka berputar cocok dengan kotak target (toleransi 3 kesalahan).
4. **Patch Bay Kabel Cadangan (PATCH-04):** Hubungkan 4 kabel warna (Merah, Kuning, Biru, Hijau) dari kiri ke kanan.

### 📻 Minigame 3: Diegetic Radio Signal Tuner
* **Mekanik:** Rotary knob analog & slider frekuensi (88.0 – 108.0 MHz) dengan procedural Web Audio static noise.
* **Frekuensi Target:** `98.4 MHz` (Siaran Darurat Radio Rakata BNPB). Memberikan reward `+1 Knowledge` dan info bahaya terkini.

---

# 4. ALUR NARASI & TITIK KEPUTUSAN KUNCI

| Waktu | Titik Keputusan | Opsi Optimal (Disarankan) | Opsi Berisiko (Penalti) | Kunci Flag |
| :--- | :--- | :--- | :--- | :--- |
| **Jam 00** | Penyegelan Palka Masuk | Kunci manual palang baja (+2) | Buka celah pantau luar (-2) | `air_uninspected` |
| **Jam 08** | Inspeksi Katup Filtrasi | Pasang segel karbon cadangan (+2) | Nyalakan tanpa inspeksi (-1) | `air_remedied` |
| **Jam 14** | Penjatahan Air Keluarga | Jadwalkan 200ml per 8 jam (+2) | Minum bebas redakan cemas (-2) | — |
| **Jam 20** | Sanitasi & Biohazard | Segel ganda kantong biohazard (+2) | Buang dekat pintu luar (-2) | — |
| **Jam 22** | Kepanikan Maya di Gelap | Beri mobil mainan & dongeng (+1) | Bentak Maya agar hemat nafas (-2) | `maya_comforted` |
| **Jam 30** | Gempa Utama Krakatau | Aktifkan hidrolik peredam (+2) | Buka pintu lari panik (-3, -30 HP) | `structural_damage` |
| **Jam 36** | Kebocoran Gas Belerang | Pasta sealant & masker P3K (+2) | Nyalakan kipas tiup asap (-2) | `smoke_poisoned` |
| **Jam 40** | Kontak Penyintas di Palka | Bantu via kotak airlock (+1) | Usir & gertak kasar (-1) | `helped_stranger` |
| **Jam 44** | Jadwal Transmisi Radio | Transmisi 10 mnt / 6 jam (+2) | Nyalakan radio nonstop (-2) | `radio_saved` **[KUNCI]** |
| **Jam 50** | Penjatahan Daya Listrik | Matikan lampu ke mode hemat (+2) | Biarkan lampu benderang (-2) | `power_saved` |
| **Jam 58** | Air Pipa Endapan Keruh | Filter karbon aktif & klorin (+2) | Rebus langsung tanpa saring (-1) | `water_filtered` **[KUNCI]** |
| **Jam 64** | Sinyal Penjemputan Evakuasi| Kibarkan kain reflektor (+2) | Pukul pipa besi keras (-2) | — |
| **Jam 70** | Ketukan Pintu Misterius | Intip kamera & minta sandi SAR (+2)| Buka langsung tanpa verifikasi (-3)| `door_opened` (Memicu Fatal) |
| **Jam 72** | **GERBANG EVALUASI 72 JAM**| Jika syarat terpenuhi $\rightarrow$ Best End | Jika radio/air gagal $\rightarrow$ Hari ke-4 | — |
| **Jam 78** | Oksigen Menipis (Hari 4) | Pakai tabung oksigen cadangan (+2)| Buka ventilasi udara luar (-3) | `oxygen_depleted` |
| **Jam 84** | Scavenge Reruntuhan (H4)| Geledah hati-hati & bawa air (+1) | Terobos reruntuhan curam (-2, luka)| `scavenge_injured` |
| **Jam 88** | Serangan Penjarah (Hari 4)| Alirkan listrik kejut handle (+2) | Buka pintu ajak barter (-3) | `looters_breached` (Fatal) |
| **Jam 92** | Triage Logistik Akhir | Bagikan sisa air & ransum rata (+1)| Tahan logistik, biarkan lemas (-2) | — |

---

# 5. MATRIKS 3 ENDING TEMATIK & EPILOG MORAL

```
                         [ TITIK EVALUASI KESELAMATAN ]
                                       │
           ┌───────────────────────────┴───────────────────────────┐
           ▼                                                       ▼
  [ GAGAL MITIGASI ]                                      [ BERHASIL SELAMAT ]
  (Health <= 0 / Palka Jebol)                                      │
           │                                      ┌────────────────┴────────────────┐
           ▼                                      ▼                                 ▼
     🔴 BAD ENDING                         [ SIKAP EGOIS ]                   [ DILEMA MORAL ]
   "Makam Bunker 72"                    (Abaikan/Usir Orang)              (Bantu Orang Asing)
(Tragedi di Perut Bumi)                           │                                 │
                                                  ▼                                 ▼
                                          🟡 NORMAL ENDING                🟢 GOOD / TRUE ENDING
                                        "Selamat Sendirian"               "Kebaikan Berbalas"
                                     (Fisik Hidup, Jiwa Hampa)          (Penyelamatan Berbalas)
```

| Ending ID | Nama Ending | Kategori | Syarat Logika Pemicu | Rangkuman Narasi & Resolusi Moral |
| :--- | :--- | :---: | :--- | :--- |
| `ending_bad` | **Makam Bunker 72** | 🔴 Bad | `Health <= 0` ATAU `door_opened` ATAU `looters_breached`. | Bunker menjadi makam abadi di bawah abu vulkanik akibat kegagalan mitigasi atau kebobolan palka. |
| `ending_normal` | **Selamat Sendirian (Harga Egoisme)** | 🟡 Normal | Selamat, tetapi `helped_stranger == false` (egois/mengusir orang). | Dievakuasi tim SAR umum, namun suasana dingin & hampa. Maya trauma dan Aris dihantui rasa bersalah mengabaikan orang yang sekarat. |
| `ending_good` | **Kebaikan Berbalas (Cahaya Kemanusiaan)** | 🟢 Special / True | Selamat DAN `helped_stranger == true` (menolong Hendra di airlock). | **Plot Twist Penyelamatan:** Hendra (penyintas yang ditolong) memandu tim SAR khusus tepat ke lokasi palka bunker. Maya bangga melihat orang tuanya adalah pahlawan sejati. |

### Sistem Evaluasi Epilog Modular (Telltale-Style Recap)
Pasca permainan, sistem menampilkan rincian 5 dimensi evaluasi:
1. **Status Penyelamatan (Rescue Outcome):** Makam Bunker 72 / Selamat Sendirian / Kebaikan Berbalas Budi.
2. **Kondisi Fisiologis & Medis:** Evaluasi kerusakan pernapasan, luka bakar kimia, dan dehidrasi.
3. **Integritas Bunker 72:** Kondisi struktural peredam hidrolik penahan gempa.
4. **Solidaritas & Karma Sosial:** Evaluasi moral atas keputusan membantu penyintas luar vs bersikap defensif keras.
5. **Ikatan Moral & Maya:** Ketenangan psikologis Maya dan kebanggaannya terhadap Ayah dan Ibu.
6. **Skor Edukatif Mitigasi BNPB (0–100):** Predikat **Grade S** ($\ge 85$), **Grade A** ($\ge 70$), **Grade B** ($\ge 55$), **Grade C** ($\ge 40$), **Grade D** ($< 40$).

---

# 6. ARSITEKTUR PERANGKAT LUNAK (MVC) & AUDIO

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    StoryEngine (Controller)                     │
  │   - Menangani User Input & Scene Transitions                    │
  │   - Autosave localStorage ('bunker72_save_v1')                  │
  │   - Mengorkestrasi Minigame & Audio Triggers                    │
  └──────────────────┬───────────────────────────┬──────────────────┘
                     │                           │
         Updates     ▼               Calls       ▼
  ┌─────────────────────────┐     ┌─────────────────────────────────┐
  │   GameModel (Model)     │     │        GameView (View)          │
  │ - State Murni & Flags   │     │ - DOM Rendering & CRT Shaders   │
  │ - Formula Decay Tri-Stat│     │ - Typewriter (requestAnimFrame) │
  │ - Evaluasi Ending Murni │     │ - Bar Metrik HUD & Modal Log    │
  │ (BEBAS DARI DOM/AUDIO)  │     │ (BEBAS DARI KEPEMILIKAN STATE)  │
  └─────────────────────────┘     └─────────────────────────────────┘
```

### Modul Audio Synthesizer ([`RetroAudio.js`](file:///c:/laragon/www/bunker%2072/src/js/retroAudio.js))
* **Anti-Pop De-clicking:** Oscillator gain memudar eksponensial ke `0.0001` sebelum `osc.stop()`.
* **Procedural Sound FX:** Typewriter key clicks mikro-transient, white noise radio generator, dan low-frequency rumble sub-bass gempa.

---

# 7. DEVELOPER & AI AGENT CHEAT SHEET

### Storage Keys
* `bunker72_save_v1`: Object serialisasi save data `{ sceneId, knowledge, history, flags, inventory, hunger, thirst, health }`.
* `bunker72_game_completed`: Boolean flag pembuka fitur New Game+.

### Aturan Modifikasi Kode
1. **Jangan letakkan manipulasi DOM di dalam `GameModel.js`.**
2. **Jangan letakkan kalkulasi state atau flag mutation di dalam `GameView.js`.**
3. **Semua perubahan visual wajib mengikuti variabel CSS di `src/styles/main.css` dan mempertahankan rasio 16:9.**
4. **Jangan menjalankan `vite build` untuk perubahan kecil (CSS/Teks/Bugfix minor).**
