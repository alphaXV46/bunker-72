# 📄 GAME DESIGN DOCUMENT (MVP v2.1)

## Judul Game
**72 Jam Pertama: Terjebak di Bunker 72 (Versi 2.1 - Interactive & Immersive)**

**Versi:** 2.1 MVP (Sistem Bendera, Audio Engine, CRT Curvature & Inventaris Interaktif)
**Target Pengembangan:** 7 Hari (Upgrade)
**Platform:** Web Browser (Desktop PC/Laptop)

---

# 1. OVERVIEW & PERUBAHAN UTAMA

Versi 2.1 berfokus pada **peningkatan imersi visual/audio** dan **stabilitas arsitektur kode** dari Versi 2.0. Penanganan data didekopling sepenuhnya untuk mencegah kerusakan alur cerita akibat modifikasi teks cerita.

### Perubahan Utama di Versi 2.1:
1.  **Sistem Bendera (Flag System):** Mengganti logika pencocokan string teks historis dengan sistem bendera (`flags`) boolean independen untuk evaluasi kondisi (misal: pemicu Hari ke-4).
2.  **Audio Engine Web Audio API:** Penambahan synthesizer suara 8-bit retro tanpa aset audio eksternal (menghemat bandwidth, loading cepat, lisensi aman).
3.  **Visual CRT Curvature & Screen Flicker:** Peningkatan filter CRT dengan efek layar monitor tabung cembung dan kerlip cahaya yang dinamis.
4.  **Inventaris Interaktif:** Item logistik (Makanan, Air, P3K, Radio) dapat diklik secara aktif oleh pemain untuk menggunakan item tersebut dan berdampak pada state parameter game.

---

# 2. SPESIFIKASI TEKNIS FITUR BARU

## A. Sistem Bendera (Flag System)
Struktur data di `story.json` akan mendukung modifier bendera pada pilihan:
*   `setFlags`: Array string berisi nama bendera yang akan diaktifkan jika opsi tersebut dipilih (contoh: `["radio_saved"]`).
*   `requireFlags`: Array string berisi syarat bendera yang harus dimiliki untuk mengaktifkan pilihan/scene (atau digunakan pada evaluasi ending).

## B. Retro Sound FX Engine (Web Audio API)
Menggunakan synthesizer audio bawaan browser untuk menghasilkan gelombang suara persegi (square wave) dan derau (noise) retro khas chip 8-bit:
1.  **Suara Ketikan (Click):** Nada tinggi sangat singkat saat huruf dialog muncul bergantian.
2.  **Suara Alarm (Warning):** Nada bervariasi (sirine darurat) saat HUD berstatus `KRITIS` atau `RUNTUH`.
3.  **Suara Statis (Radio Static):** Derau putih (white noise) terputus-putus saat radio digunakan.
4.  **Suara Gempa (Rumble):** Nada frekuensi rendah bergetar saat gempa bunker berlangsung.

## C. CRT Curvature & Screen Flicker Effect
*   **Curvature (Kelengkungan Kaca):** Menggunakan efek bayangan radial di CSS overlay (`radial-gradient`) dan pembungkusan sudut visual agar mensimulasikan lengkungan tabung kaca CRT monitor kuno.
*   **Flicker (Kerlip Layar):** Animasi opacity halus (0.97 - 1.0) dengan interval acak pada layar untuk merepresentasikan ketidakstabilan tegangan listrik bunker.

## D. Inventaris Interaktif (Interactive Inventory)
Pemain dapat mengeklik ikon inventaris di sebelah kiri secara opsional:
1.  **Makanan (Food):** Digunakan saat lapar/darurat (+1 kesiapsiagaan, maksimal digunakan 2 kali per permainan).
2.  **Air (Drink):** Mencegah dehidrasi (+1 kesiapsiagaan, maksimal digunakan 2 kali per permainan).
3.  **P3K (Kit):** Mengobati cedera/racun udara (+2 kesiapsiagaan, maksimal digunakan 1 kali per permainan).
4.  **Radio (Radio):** Mengaktifkan pemindaian sinyal statis audio darurat secara opsional.
Setiap penggunaan item akan mengurangi kuota penggunaan item tersebut dan melacak statusnya di HUD.

---

# 3. VERIFICATION PLAN (DEFINITION OF DONE)

*   [ ] **Sistem Bendera Berjalan:** Seluruh pemicu logika Hari ke-4 dan HUD tidak lagi membaca string history teks, melainkan mengecek bendera aktif.
*   [ ] **SFX Retro Terdengar:** Suara ketikan teks, alarm bahaya, radio statis, dan gempa berbunyi menggunakan Web Audio API tanpa lag.
*   [ ] **Visual Monitor Kuno Aktif:** Monitor luar `#game-container` menampilkan efek melengkung CRT dan kerlip monitor tabung.
*   [ ] **Item Dapat Diklik & Berdampak:** Pemain bisa menggunakan item logistik di panel samping kiri dengan umpan balik visual dan suara yang benar.
