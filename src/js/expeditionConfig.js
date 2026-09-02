/**
 * Small, data-only configs for the Day 2 expedition routes.
 * The prologue keeps its existing house layout; these routes use the same
 * canvas movement/collision code with compact procedural environments.
 */

const OUTER_COLLIDERS = [
  { id: 'outer_top', x: 100, y: 40, w: 1170, h: 20 },
  { id: 'outer_left', x: 100, y: 40, w: 20, h: 680 },
  { id: 'outer_right', x: 1250, y: 40, w: 20, h: 680 },
  { id: 'outer_bottom_l', x: 100, y: 700, w: 480, h: 20 },
  { id: 'outer_bottom_r', x: 800, y: 700, w: 470, h: 20 },
];

const RETURN_EXIT = { id: 'return_safe', x: 640, y: 650, w: 120, h: 58, label: 'KEMBALI KE TITIK AMAN', reason: 'returned' };

const shared = (overrides) => ({
  mode: 'expedition',
  mapWidth: 1376,
  mapHeight: 768,
  viewport: { width: 960, height: 540 },
  // Start at the exposed north edge; the return exit is at the south edge so
  // every run requires a short search-and-return traversal.
  spawnPosition: { x: 700, y: 120 },
  playerSpeed: 172,
  capacity: 4,
  timerEnabled: false,
  duration: 0,
  exits: [RETURN_EXIT],
  colliders: [...OUTER_COLLIDERS],
  roomZones: [],
  hazards: [],
  ...overrides,
});

export const EXPEDITION_CONFIGS = Object.freeze({
  neighbor_house: shared({
    id: 'neighbor_house',
    label: 'RUMAH TETANGGA',
    risk: 'Risiko rendah–sedang',
    resourceHint: 'Makanan & air dasar',
    objective: 'Cari persediaan dasar, lalu temukan jalan keluar yang aman.',
    palette: { floor: '#1f2b32', accent: '#7bc7b8', hazard: '#d5a84c' },
    roomZones: [
      { name: 'RUANG TAMU', x: 170, y: 120, w: 430, h: 260, color: '#23343b' },
      { name: 'DAPUR', x: 650, y: 120, w: 460, h: 260, color: '#29352f' },
      { name: 'HALAMAN BELAKANG', x: 250, y: 430, w: 820, h: 170, color: '#20302d' },
    ],
    colliders: [
      ...OUTER_COLLIDERS,
      { id: 'neighbor_table', x: 410, y: 250, w: 150, h: 65 },
      { id: 'neighbor_wall', x: 610, y: 120, w: 24, h: 260 },
      { id: 'neighbor_rubble_initial', x: 570, y: 430, w: 250, h: 32 },
    ],
    items: [
      { id: 'food', name: 'Makanan Kaleng', x: 300, y: 210, w: 36, h: 36, room: 'Ruang Tamu' },
      { id: 'drink', name: 'Air Bersih', x: 860, y: 220, w: 36, h: 36, room: 'Dapur' },
    ],
    hazards: [
      { id: 'aftershock', type: 'aftershock', message: 'Aftershock! Tumpukan puing menutup jalur teras. Cari jalan memutar.', aftershockAt: 3, blocker: { id: 'neighbor_rubble_aftershock', x: 470, y: 430, w: 300, h: 34 } },
    ],
  }),

  minimarket: shared({
    id: 'minimarket',
    label: 'MINIMARKET',
    risk: 'Risiko sedang–tinggi',
    resourceHint: 'Nilai sumber daya tertinggi',
    objective: 'Pilih maksimal tiga unit barang, hindari kabel jatuh, lalu kembali.',
    capacity: 3,
    palette: { floor: '#302b29', accent: '#e0a35a', hazard: '#e36a5d' },
    roomZones: [
      { name: 'JALAN RUNTUH', x: 150, y: 120, w: 330, h: 470, color: '#342b2a' },
      { name: 'MINIMARKET', x: 810, y: 120, w: 350, h: 420, color: '#3a3029' },
      { name: 'PERSIMPANGAN', x: 490, y: 570, w: 360, h: 90, color: '#2a2928' },
    ],
    colliders: [
      ...OUTER_COLLIDERS,
      { id: 'market_rubble', x: 500, y: 330, w: 360, h: 60 },
      { id: 'market_shelves', x: 890, y: 250, w: 55, h: 220 },
      { id: 'market_counter', x: 1010, y: 470, w: 120, h: 35 },
      { id: 'market_cable', x: 420, y: 500, w: 300, h: 34 },
    ],
    items: [
      { id: 'food', name: 'Makanan Kaleng', x: 910, y: 190, w: 36, h: 36, room: 'Minimarket' },
      { id: 'food', name: 'Makanan Kaleng', x: 1030, y: 190, w: 36, h: 36, room: 'Minimarket' },
      { id: 'drink', name: 'Air Bersih', x: 930, y: 560, w: 36, h: 36, room: 'Minimarket' },
      { id: 'drink', name: 'Air Bersih', x: 1040, y: 560, w: 36, h: 36, room: 'Minimarket' },
      { id: 'battery', name: 'Baterai Ekstra', x: 760, y: 240, w: 36, h: 36, room: 'Gudang Minimarket' },
      { id: 'snack', name: 'Snack Darurat', x: 1110, y: 300, w: 36, h: 36, room: 'Minimarket' },
    ],
    hazards: [
      { id: 'cable', type: 'cable', x: 420, y: 500, w: 300, h: 34, message: 'Kabel listrik menyentuh genangan. Aris menjaga jarak dan mencari jalur lain.' },
      { id: 'rubble', type: 'rubble', x: 500, y: 330, w: 360, h: 60, message: 'Jalan utama runtuh. Tidak ada lompatan—putar melalui sisi bangunan.' },
    ],
  }),

  medical_post: shared({
    id: 'medical_post',
    label: 'POS KESEHATAN',
    risk: 'Rute lebih panjang / abu tebal',
    resourceHint: 'P3K & perlindungan napas',
    objective: 'Temukan perlengkapan medis di tengah abu tebal, lalu kembali ke titik aman.',
    capacity: 3,
    palette: { floor: '#26313a', accent: '#80c7d6', hazard: '#b9c0c2' },
    roomZones: [
      { name: 'JALUR ABU TEBAL', x: 180, y: 100, w: 880, h: 300, color: '#30393d' },
      { name: 'POS KESEHATAN', x: 470, y: 450, w: 420, h: 150, color: '#28383d' },
    ],
    colliders: [
      ...OUTER_COLLIDERS,
      { id: 'clinic_wall_l', x: 430, y: 450, w: 26, h: 150 },
      { id: 'clinic_wall_r', x: 920, y: 450, w: 26, h: 150 },
      { id: 'clinic_debris', x: 180, y: 410, w: 250, h: 42 },
    ],
    items: [
      { id: 'kit', name: 'Kotak P3K', x: 600, y: 510, w: 36, h: 36, room: 'Pos Kesehatan' },
      { id: 'kit', name: 'Kotak P3K', x: 790, y: 510, w: 36, h: 36, room: 'Pos Kesehatan' },
      { id: 'mask', name: 'Masker Medis', x: 690, y: 470, w: 36, h: 36, room: 'Pos Kesehatan' },
    ],
    hazards: [
      { id: 'ash', type: 'ash', x: 180, y: 100, w: 880, h: 300, message: 'Abu semakin tebal. Langkah diperlambat dan jarak pandang menyempit.' },
    ],
  }),
});

export const getExpeditionConfig = (locationId) => EXPEDITION_CONFIGS[locationId] || null;
