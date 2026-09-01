/**
 * stationsConfig.js — Configuration metadata and color palettes for bunker maintenance stations.
 */

export const STATIONS = {
  card: {
    id: 'card',
    code: 'SEAL 72-A',
    kicker: 'PINTU LUAR // PROTOKOL MASUK',
    name: 'OTENTIKASI KARTU AKSES',
    shortName: 'KARTU AKSES',
    tutorial: 'Tahan kartu, dorong ke atas sampai mentok, lalu lanjutkan slide ke kanan tanpa melepas dengan kecepatan sedang.',
    defaultSuccessMessage: 'KREDENSIAL 72-A DITERIMA // PINTU TERBUKA',
  },
  power: {
    id: 'power',
    code: 'ACTUATOR A-01',
    kicker: 'GENERATOR UTAMA // BOOT SISTEM',
    name: 'NAIKKAN DAYA UTAMA',
    shortName: 'TUAS DAYA',
    tutorial: 'Tekan dan tarik tuas daya ke atas sampai indikator mencapai ZONA AMAN (100%).',
    defaultSuccessMessage: 'BUS DAYA UTAMA STABIL // LAMPU MENYALA',
  },
  rotor: {
    id: 'rotor',
    code: 'TURBIN STABILIZER',
    kicker: 'STRUKTUR BUNKER // REDAM GEMPA',
    name: 'PENYELARASAN ROTOR 1—2—3',
    shortName: 'KUNCI ROTOR',
    tutorial: 'Ketuk masing-masing soket tepat saat angka berputar cocok dengan kotak target.',
    defaultSuccessMessage: 'SEKUENSI 1—2—3 TERKUNCI // STRUKTUR STABIL',
  },
  wires: {
    id: 'wires',
    code: 'PATCH-04 BATERAI',
    kicker: 'DISTRIBUSI DAYA // REKONFIGURASI',
    name: 'SAMBUNG KABEL CADANGAN',
    shortName: 'KABEL WARNA',
    tutorial: 'Tarik kabel dari setiap terminal kiri ke soket kanan dengan warna yang serasi.',
    defaultSuccessMessage: 'SEMUA JALUR KABEL TERUJI // SIRKUIT ONLINE',
  },
};

export const COLORS = {
  red: { label: 'MERAH', hex: '#ef5b5b' },
  yellow: { label: 'KUNING', hex: '#ffd166' },
  blue: { label: 'BIRU', hex: '#5bc0be' },
  green: { label: 'HIJAU', hex: '#63e6be' },
};
