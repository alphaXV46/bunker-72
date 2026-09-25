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
    content: 'Gempa bisa datang tanpa peringatan. Berlindung di tempat kokoh, jauhi kaca, dan lindungi kepala. Setelah reda, periksa jalur keluar dan ikuti informasi BMKG serta arahan petugas.',
  }),
  Object.freeze({
    id: 'tsunami_route',
    type: 'document',
    label: 'Evakuasi Tsunami',
    x: 72.7, y: 4.3, w: 15, h: 20.5,
    title: 'Evakuasi Tsunami',
    sourceLabel: 'BMKG · Informasi gempa dan tsunami',
    content: 'Di pesisir, gempa kuat atau lama berarti segera menuju tempat tinggi atau titik evakuasi. Bantu anak dan lansia, jauhi pantai dan sungai, lalu ikuti informasi BMKG serta petugas.',
  }),
  Object.freeze({
    id: 'volcanic_ash_guide',
    type: 'document',
    label: 'Perlindungan Abu Vulkanik',
    x: 89.3, y: 1.2, w: 9.8, h: 24.2,
    title: 'Perlindungan Abu Vulkanik',
    sourceLabel: 'PVMBG / Badan Geologi · Mitigasi gunung api',
    content: 'Ikuti status PVMBG dan arahan petugas. Jika aman berlindung di dalam, tutup pintu dan jendela. Bila harus keluar, pakai pelindung mata dan masker partikulat; masker tidak melindungi dari gas atau kekurangan oksigen. Hindari abu tebal dan dampingi anak.',
  }),
  Object.freeze({
    id: 'emergency_kit',
    type: 'document',
    label: 'Tas Darurat',
    x: 78, y: 81.3, w: 18, h: 18,
    title: 'Tas Darurat Keluarga',
    sourceLabel: 'Daftar kesiapsiagaan keluarga',
    content: 'Isi tas dengan air, makanan tahan lama, obat, P3K, senter, baterai, radio, masker, peluit, dan salinan dokumen. Simpan di tempat yang diketahui keluarga; periksa isinya berkala dan sesuaikan kebutuhan tiap anggota.',
  }),
  Object.freeze({
    id: 'survival_handbook',
    type: 'document',
    label: 'Panduan Kesiapsiagaan',
    x: 77.2, y: 55, w: 22.3, h: 20.5,
    title: 'Panduan Kesiapsiagaan Keluarga',
    sourceLabel: 'Ringkasan perencanaan keluarga',
    content: 'Sepakati titik temu, kontak luar daerah, dan tugas keluarga. Dampingi anak; serahkan pemeriksaan listrik, gas, dan struktur kepada orang dewasa yang mampu atau petugas. Jangan nyalakan generator berbahan bakar di shelter. Ikuti arahan setempat untuk berlindung atau evakuasi.',
  }),
  Object.freeze({
    id: 'work_notes',
    type: 'document',
    label: 'Catatan Kerja Sarah',
    x: 28, y: 82.1, w: 36, h: 17.5,
    title: 'Catatan Kerja Sarah',
    sourceLabel: 'Catatan analisis internal',
    content: 'Sarah mencatat celah utama: banyak keluarga tahu ancaman, tetapi belum menyiapkan rute, bekal, dan komunikasi. Data gempa dan tsunami merujuk BMKG; aktivitas gunung api merujuk PVMBG. Ia akan menerapkannya di rumah sendiri.',
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
