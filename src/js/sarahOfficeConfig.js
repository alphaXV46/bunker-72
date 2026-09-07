/** Sarah office content and image-calibrated hotspot definitions. */

export const SARAH_OFFICE_IMAGE = Object.freeze({
  width: 1672,
  height: 941,
  url: new URL('../assets/backgrounds/bg_backstory_sarah_office_interactive.webp', import.meta.url).href,
});

export const SARAH_OFFICE_HOTSPOTS = Object.freeze([
  Object.freeze({
    id: 'earthquake_guide',
    type: 'document',
    label: 'Kesiapsiagaan Gempa',
    x: 43.2, y: 26.2, w: 14.2, h: 17,
    title: 'Kesiapsiagaan Gempa',
    sourceLabel: 'BMKG · Panduan kesiapsiagaan',
    content: 'Gempa dapat terjadi tanpa peringatan. Kenali tempat berlindung yang kokoh, jauhi kaca, dan lindungi kepala. Setelah guncangan berhenti, periksa jalur keluar dengan tenang serta waspadai benda jatuh dan kerusakan bangunan. Ikuti informasi resmi BMKG dan arahan petugas setempat sebelum berpindah.',
  }),
  Object.freeze({
    id: 'tsunami_route',
    type: 'document',
    label: 'Evakuasi Tsunami',
    x: 72.7, y: 4.3, w: 15, h: 20.5,
    title: 'Evakuasi Tsunami',
    sourceLabel: 'BMKG · Informasi gempa dan tsunami',
    content: 'Jika berada dekat pantai dan merasakan gempa kuat atau lama, segera bergerak menuju tempat tinggi atau titik evakuasi tanpa menunggu. Gunakan rute yang sudah dikenal, bantu anak dan lansia, serta jauhi sungai dan pantai. Pantau informasi resmi BMKG dan ikuti arahan pemerintah daerah.',
  }),
  Object.freeze({
    id: 'volcanic_ash_guide',
    type: 'document',
    label: 'Perlindungan Abu Vulkanik',
    x: 89.3, y: 1.2, w: 9.8, h: 24.2,
    title: 'Perlindungan Abu Vulkanik',
    sourceLabel: 'PVMBG / Badan Geologi · Mitigasi gunung api',
    content: 'Ikuti status PVMBG dan arahan evakuasi petugas. Bila tetap di dalam masih aman, tutup pintu dan jendela saat abu turun. Jika harus keluar, gunakan pelindung mata dan masker partikulat yang pas; masker tidak melindungi dari gas atau kekurangan oksigen. Hindari perjalanan dalam abu tebal. Anak perlu didampingi orang dewasa, termasuk saat membersihkan abu.',
  }),
  Object.freeze({
    id: 'emergency_kit',
    type: 'document',
    label: 'Tas Darurat',
    x: 78, y: 81.3, w: 18, h: 18,
    title: 'Tas Darurat Keluarga',
    sourceLabel: 'Daftar kesiapsiagaan keluarga',
    content: 'Siapkan air minum, makanan tahan lama, obat pribadi, P3K, senter, baterai, radio, masker, peluit, dan salinan dokumen penting. Pilih tas yang mudah dibawa dan letakkan di tempat yang diketahui seluruh keluarga. Periksa masa pakai isinya secara berkala dan sesuaikan dengan kebutuhan anak, lansia, atau hewan peliharaan.',
  }),
  Object.freeze({
    id: 'survival_handbook',
    type: 'document',
    label: 'Panduan Kesiapsiagaan',
    x: 77.2, y: 55, w: 22.3, h: 20.5,
    title: 'Panduan Kesiapsiagaan Keluarga',
    sourceLabel: 'Ringkasan perencanaan keluarga',
    content: 'Tentukan tempat bertemu, satu kontak di luar daerah, dan pembagian tugas keluarga. Anak mengikuti pendamping; pemeriksaan listrik, gas, dan struktur dilakukan orang dewasa yang mampu atau petugas. Jangan menjalankan generator berbahan bakar di dalam shelter. Kenali kapan harus berlindung dan kapan harus evakuasi mengikuti arahan setempat.',
  }),
  Object.freeze({
    id: 'work_notes',
    type: 'document',
    label: 'Catatan Kerja Sarah',
    x: 28, y: 82.1, w: 36, h: 17.5,
    title: 'Catatan Kerja Sarah',
    sourceLabel: 'Catatan analisis internal',
    content: 'Sarah merangkum celah yang berulang: keluarga sering mengetahui ancaman, tetapi belum menyepakati rute, persediaan, atau cara berkomunikasi. Data gempa dan tsunami perlu merujuk BMKG, sedangkan informasi aktivitas gunung api mengikuti PVMBG. Langkah berikutnya adalah menyusun analisis dasar yang bisa diterapkan di rumah mereka sendiri.',
  }),
  Object.freeze({
    id: 'laptop',
    type: 'progression',
    label: 'Laptop Analisis Dasar',
    x: 31, y: 43.7, w: 39, h: 38,
    requiresReadId: 'work_notes',
    lockedHint: 'Baca Catatan Kerja Sarah untuk membuka analisis dasar.',
  }),
]);

export const SARAH_OFFICE_DOCUMENTS = Object.freeze(
  SARAH_OFFICE_HOTSPOTS.filter((hotspot) => hotspot.type === 'document')
);

export function getSarahOfficeHotspot(id) {
  return SARAH_OFFICE_HOTSPOTS.find((hotspot) => hotspot.id === id) || null;
}
