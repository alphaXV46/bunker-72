# 📄 GAME DESIGN DOCUMENT (MVP v2.2)

## Judul Game
**72 Jam Pertama: Terjebak di Bunker 72 (Versi 2.2 - Refaktor Arsitektur & QoL)**

**Versi:** 2.2 MVP (Arsitektur MVC, Volume Control, Stabilitas Save, Aksesibilitas & Performa)
**Target Pengembangan:** 7–10 Hari (Upgrade)
**Platform:** Web Browser (Desktop PC/Laptop & Mobile Portrait)

---

# 1. OVERVIEW & PERUBAHAN UTAMA

Versi 2.2 berfokus pada **stabilitas arsitektur kode jangka panjang**, **kenyamanan pengguna (UX)**, dan **aksesibilitas lintas perangkat**. Perubahan tidak banyak mempengaruhi narasi atau konten cerita, namun secara signifikan meningkatkan keterpeliharaan kode (*maintainability*) dan pengalaman bermain yang lebih nyaman.

Saran ini berasal dari audit teknis mendalam setelah implementasi MVP v2.1 selesai.

### Perubahan Utama di Versi 2.2:
1. **Refaktor Arsitektur MVC:** Memecah kelas `StoryEngine` yang monolitik menjadi tiga lapisan tanggung jawab terpisah: Model (state), View (DOM rendering), dan Controller (alur engine).
2. **Master Volume Control & Tombol Mute:** Penambahan pengontrol volume dan opsi hening di UI untuk kenyamanan pengguna.
3. **Choice ID Stabil untuk Save Game:** Menggantikan rekonstruksi flags berbasis string matching dari log riwayat dengan identifikasi *Choice ID* unik yang tidak rapuh.
4. **Reflow Layout Portrait Mobile:** Tata letak dinamis untuk layar portrait/mobile agar dialog dan pilihan tetap terbaca.
5. **Typewriter Effect dengan requestAnimationFrame:** Menggantikan rantai `setTimeout` dengan `requestAnimationFrame` + delta time untuk pergerakan teks yang mulus dan konsisten di semua perangkat.

---

# 2. SPESIFIKASI TEKNIS FITUR BARU

## A. Refaktor Arsitektur MVC Sederhana

Pemisahan tanggung jawab kelas:
- **`GameModel` (Model):** Menyimpan dan mengelola seluruh state game: `knowledge`, `flags`, `inventory`, `history`, dan `currentSceneId`.
- **`GameView` (View):** Menangani seluruh manipulasi DOM: render HUD, dialog, avatar, pilihan, log protokol, dan overlay inventaris.
- **`StoryEngine` (Controller):** Mengorkestrasi alur permainan: memanggil model untuk perubahan state, memanggil view untuk pembaruan tampilan, dan memanggil AudioEngine untuk efek suara.

```text
User Input → StoryEngine (Controller)
                   ↓              ↓
             GameModel        GameView
             (State)          (Render DOM)
                   ↓
             RetroAudio
             (Efek Suara)
```

## B. Master Volume Control & Tombol Mute

- **Master Gain Node:** Menambahkan gain node induk pada kelas `RetroAudio` yang mengatur volume semua output suara secara terpusat.
- **UI Control:** Panel kecil di sudut kanan atas layar game dengan slider volume dan ikon speaker yang dapat di-toggle untuk mute/unmute.
- **Persistensi:** Preferensi volume disimpan di `localStorage` terpisah dari save data permainan.

## C. Choice ID Stabil untuk Save Game

- Setiap pilihan di `story.json` mendapatkan properti `id` unik dan stabil (misal: `"id": "c_day2_radio_schedule"`).
- Flags kini diaktifkan dan direkonstruksi berdasarkan Choice ID yang dipilih, bukan pencocokan teks log.
- Keuntungan: Teks pilihan bisa diubah bebas tanpa merusak sistem bendera atau save data lama.

```json
{
  "text": "Jadwalkan transmisi radio selama 10 menit setiap 6 jam.",
  "id": "c_day2_radio_schedule",
  "setFlags": ["radio_saved"],
  "nextSceneId": "day2_radio_save",
  "knowledgeEffect": 2
}
```

## D. Reflow Layout Portrait Mobile

Pada breakpoint `@media (max-width: 600px) and (orientation: portrait)`:
- Tata letak berubah dari 16:9 menjadi full-height scroll-friendly layout.
- Panel status di bagian atas (horizontal, kompak).
- Area cerita & dialog di tengah dengan font minimum `1rem`.
- Pilihan dan inventaris tersusun horizontal di bagian bawah.

## E. Typewriter Effect dengan requestAnimationFrame

Menggantikan `setTimeout` dengan `requestAnimationFrame` berbasis delta time:
```javascript
// Kecepatan target: ~32ms per karakter (vs 12ms sekarang)
// Artinya lebih lambat & lebih terasa sebagai mesin tik
let lastTime = 0;
const CHAR_INTERVAL = 32;

function typeFrame(timestamp) {
  if (timestamp - lastTime >= CHAR_INTERVAL) {
    // render 1 karakter berikutnya
    lastTime = timestamp;
  }
  if (currentIndex < text.length) {
    requestAnimationFrame(typeFrame);
  }
}
requestAnimationFrame(typeFrame);
```

---

# 3. PERTIMBANGAN DESAIN UX

## Kecepatan Typewriter
Kecepatan saat ini **12ms/karakter** (versi 2.1) terlalu cepat untuk dinikmati sebagai *narrative game*. Target kecepatan yang disarankan untuk versi 2.2 adalah **28–35ms/karakter**, yang memberikan ritme pembacaan yang lebih natural dan terasa seperti mesin tik retro sungguhan.

Pemain tetap bisa **skip** (klik area dialog / tekan tombol spasi) untuk langsung menampilkan teks penuh — opsi ini dipertahankan.

## Protocol Log
Pertimbangkan untuk **menghapus atau menjadikan opsional** panel Log Protokol di kanan bawah:
- **Alasan hapus:** Panel ini memakan ruang berharga di area Command Deck yang dibutuhkan tombol pilihan. Pada resolusi kecil sudah disembunyikan CSS, menunjukkan nilainya tidak krusial untuk gameplay inti.
- **Alternatif:** Ubah menjadi panel **"Jurnal Bunker" opsional** yang bisa dibuka/ditutup oleh pemain dengan ikon tombol khusus, sehingga ruang default untuk pilihan lebih lega.

---

# 4. DEFINITION OF DONE (MVP v2.2)

- [ ] **Arsitektur MVC Berfungsi:** `StoryEngine` terbagi bersih ke `GameModel`, `GameView`, dan Controller tanpa regresi logika.
- [ ] **Volume Control Aktif:** Slider dan tombol mute tersedia, berfungsi, dan preferensi tersimpan di `localStorage`.
- [ ] **Choice ID Stabil:** Seluruh `story.json` memiliki properti `id` unik, rekonstruksi flags berbasis ID bukan string.
- [ ] **Portrait Mobile Terbaca:** Gameplay dapat dimainkan nyaman di layar portrait 375px lebar dengan font minimum 1rem.
- [ ] **Typewriter Mulus:** Efek pengetikan menggunakan `requestAnimationFrame`, kecepatan 30ms/karakter dengan skip tetap berfungsi.
