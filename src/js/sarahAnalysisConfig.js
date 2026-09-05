/** Fictional cross-agency monitoring summary for Sarah's Phase 4 review. */

export const SARAH_ANALYSIS_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'geophysical_activity',
    number: '01',
    tabLabel: 'Geofisika',
    title: 'Aktivitas Geofisika',
    sourceLabel: 'BMKG · rangkuman pengamatan geofisika',
    status: 'TREN: MENINGKAT',
    summary: 'Beberapa rangkaian sinyal tercatat lebih sering dibanding pemantauan sebelumnya. Perubahan ini layak dicermati bersama informasi dari lembaga lain, tetapi satu pola saja tidak menentukan kejadian, lokasi dampak, atau waktunya.',
    urgency: 'Peningkatan pada beberapa rangkaian membuat pembaruan lintas instansi semakin penting.',
    uncertainty: 'Interpretasi masih perlu dibandingkan dengan pengamatan lain dan verifikasi lanjutan.',
    bars: Object.freeze([28, 38, 35, 55, 68, 62]),
  }),
  Object.freeze({
    id: 'weather_conditions',
    number: '02',
    tabLabel: 'Cuaca',
    title: 'Kondisi Cuaca & Hujan',
    sourceLabel: 'BMKG · pengamatan meteorologi',
    status: 'CUACA: DAPAT MEMPERBERAT AKSES',
    summary: 'Hujan dan jarak pandang berpotensi menyulitkan perjalanan di beberapa jalur. Kondisi cuaca bukan bukti bahwa bencana tertentu akan terjadi, tetapi dapat mempersempit waktu aman untuk persiapan bila situasi lain ikut memburuk.',
    urgency: 'Persiapan rute membutuhkan waktu lebih panjang ketika hujan dan visibilitas memburuk.',
    uncertainty: 'Intensitas dan sebaran hujan dapat berubah; dampak tiap jalur belum sama.',
    bars: Object.freeze([44, 51, 47, 63, 58, 71]),
  }),
  Object.freeze({
    id: 'volcanic_bulletin',
    number: '03',
    tabLabel: 'Vulkanik',
    title: 'Buletin Aktivitas Vulkanik',
    sourceLabel: 'PVMBG / Badan Geologi · informasi pemantauan resmi',
    status: 'PEMANTAUAN: DIPERKETAT',
    summary: 'Buletin resmi mencatat perubahan aktivitas yang memerlukan pemantauan lebih rapat. Penetapan status dan rekomendasi gunung api tetap menjadi kewenangan PVMBG. Sarah menggunakan pembaruan ini sebagai salah satu bagian analisis, bukan sebagai kepastian letusan.',
    urgency: 'Perubahan resmi menambah alasan untuk mempercepat koordinasi kesiapsiagaan.',
    uncertainty: 'Pembaruan berikutnya dan batas rekomendasi resmi masih harus dipantau.',
    bars: Object.freeze([31, 34, 46, 49, 64, 69]),
  }),
  Object.freeze({
    id: 'route_access',
    number: '04',
    tabLabel: 'Akses',
    title: 'Akses & Evakuasi',
    sourceLabel: 'Peta akses lokal · laporan lapangan lintas instansi',
    status: 'AKSES: BERISIKO TERGANGGU',
    summary: 'Beberapa ruas memiliki titik sempit dan area yang mudah melambat saat cuaca buruk atau warga bergerak bersamaan. Jalur belum dinyatakan tertutup, namun persiapan yang terlambat dapat membuat pergerakan lebih sulit.',
    urgency: 'Koordinasi lebih awal memberi waktu untuk memeriksa jalur dan kebutuhan kelompok rentan.',
    uncertainty: 'Kondisi lapangan dapat tetap normal; laporan tiap ruas belum sepenuhnya seragam.',
    bars: Object.freeze([25, 32, 43, 52, 57, 66]),
  }),
  Object.freeze({
    id: 'analysis_summary',
    number: '05',
    tabLabel: 'Ringkasan',
    title: 'Ringkasan Analisis',
    sourceLabel: 'Kompilasi kerja Sarah · bukan penetapan status bencana',
    status: 'VERIFIKASI: SEBAGIAN',
    summary: 'Sejumlah sinyal independen bergerak ke arah yang mengkhawatirkan, sementara sebagian konfirmasi masih berjalan. Bertindak lebih awal dapat memberi waktu persiapan; menunggu verifikasi dapat menjaga ketepatan komunikasi. Sarah perlu memilih rekomendasi profesional melalui jalur resmi.',
    urgency: 'Beberapa indikator menguat dan akses dapat menjadi lebih sulit bila penanganan terlambat.',
    uncertainty: 'Belum semua sumber terkonfirmasi dan Sarah bukan otoritas akhir untuk setiap ancaman.',
    bars: Object.freeze([36, 45, 51, 59, 65, 70]),
  }),
]);

export const SARAH_ANALYSIS_SECTION_IDS = Object.freeze(
  SARAH_ANALYSIS_SECTIONS.map((section) => section.id)
);
