/** Fictional cross-agency monitoring summary for Sarah's Phase 4 review. */

export const SARAH_ANALYSIS_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'geophysical_activity',
    number: '01',
    tabLabel: 'Geofisika',
    title: 'Aktivitas Geofisika',
    sourceLabel: 'BMKG · rangkuman pengamatan geofisika',
    status: 'TREN: MENINGKAT',
    summary: 'Beberapa sinyal geofisika makin sering. Pola ini perlu dibandingkan dengan data lain; belum menentukan kejadian, lokasi, atau waktu dampak.',
    urgency: 'Koordinasi lintas instansi perlu dipercepat.',
    uncertainty: 'Interpretasi masih perlu verifikasi.',
    bars: Object.freeze([28, 38, 35, 55, 68, 62]),
  }),
  Object.freeze({
    id: 'weather_conditions',
    number: '02',
    tabLabel: 'Cuaca',
    title: 'Kondisi Cuaca & Hujan',
    sourceLabel: 'BMKG · pengamatan meteorologi',
    status: 'CUACA: DAPAT MEMPERBERAT AKSES',
    summary: 'Hujan dan jarak pandang buruk dapat menghambat perjalanan. Cuaca tidak memastikan bencana, tetapi bisa mempersingkat waktu persiapan.',
    urgency: 'Rute perlu disiapkan lebih awal.',
    uncertainty: 'Hujan dan dampaknya berbeda di tiap jalur.',
    bars: Object.freeze([44, 51, 47, 63, 58, 71]),
  }),
  Object.freeze({
    id: 'volcanic_bulletin',
    number: '03',
    tabLabel: 'Vulkanik',
    title: 'Buletin Aktivitas Vulkanik',
    sourceLabel: 'PVMBG / Badan Geologi · informasi pemantauan resmi',
    status: 'PEMANTAUAN: DIPERKETAT',
    summary: 'Buletin PVMBG mencatat perubahan aktivitas. PVMBG tetap menetapkan status dan rekomendasi; pembaruan ini belum memastikan letusan.',
    urgency: 'Koordinasi kesiapsiagaan perlu dipercepat.',
    uncertainty: 'Tunggu pembaruan dan batas rekomendasi resmi.',
    bars: Object.freeze([31, 34, 46, 49, 64, 69]),
  }),
  Object.freeze({
    id: 'route_access',
    number: '04',
    tabLabel: 'Akses',
    title: 'Akses & Evakuasi',
    sourceLabel: 'Peta akses lokal · laporan lapangan lintas instansi',
    status: 'AKSES: BERISIKO TERGANGGU',
    summary: 'Beberapa ruas sempit dan mudah macet saat cuaca buruk atau evakuasi serentak. Jalur masih terbuka, tetapi persiapan terlambat dapat menghambat warga.',
    urgency: 'Periksa rute dan kebutuhan kelompok rentan lebih awal.',
    uncertainty: 'Laporan kondisi tiap ruas belum seragam.',
    bars: Object.freeze([25, 32, 43, 52, 57, 66]),
  }),
  Object.freeze({
    id: 'analysis_summary',
    number: '05',
    tabLabel: 'Ringkasan',
    title: 'Ringkasan Analisis',
    sourceLabel: 'Kompilasi kerja Sarah · bukan penetapan status bencana',
    status: 'VERIFIKASI: SEBAGIAN',
    summary: 'Beberapa indikator menguat, tetapi verifikasi belum selesai. Bertindak kini memberi waktu; menunggu dapat memperjelas pesan. Sarah harus memilih rekomendasi melalui jalur resmi.',
    urgency: 'Akses bisa memburuk bila persiapan terlambat.',
    uncertainty: 'Sebagian data belum terkonfirmasi; Sarah bukan penentu status.',
    bars: Object.freeze([36, 45, 51, 59, 65, 70]),
  }),
]);

export const SARAH_ANALYSIS_SECTION_IDS = Object.freeze(
  SARAH_ANALYSIS_SECTIONS.map((section) => section.id)
);
