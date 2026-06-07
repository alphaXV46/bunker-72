const fs = require('fs');
const path = require('path');

const storyPath = path.join(__dirname, 'src', 'data', 'story.json');
const data = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
const scenes = data.scenes;

// 1. Merge prolog_intro and day1_start
if (scenes.prolog_intro && scenes.day1_start) {
    scenes.prolog_intro.text = "Pukul 18.07, langit Cilegon berubah merah membara. Sirene darurat kota meraung-raung bersahutan di tengah kepulan abu vulkanik. Anda, Ibu, dan Anak berhasil mencapai Bunker 72 tepat sesaat sebelum gemuruh gelombang kejut letusan kedua Krakatau menghempas permukaan. Panel pintu berkedip merah: sistem harus disegel dalam hitungan menit.";
    scenes.prolog_intro.choices = scenes.day1_start.choices;
    scenes.prolog_intro.objective = scenes.day1_start.objective;
    
    // Fix nextSceneId for choices pointing to day1_start
    // Actually, prolog_intro is the start, so c_prolog_enter is gone.
    // We just delete day1_start
    delete scenes.day1_start;
}

// 2. Inject [RADIO BNPB] fragments
if (scenes.day2_start && !scenes.day2_start.text.includes("[RADIO BNPB]")) {
    scenes.day2_start.text = "[RADIO BNPB] ...status siaga satu... radius zona merah diperluas... bertahan di tempat perlindungan... [STATIK]\\n\\n" + scenes.day2_start.text;
}
if (scenes.day3_start && !scenes.day3_start.text.includes("[RADIO BNPB]")) {
    scenes.day3_start.text = "[RADIO BNPB] ...badai abu vulkanik memutus jalur udara... helikopter evakuasi ditangguhkan sementara... [STATIK]\\n\\n" + scenes.day3_start.text;
}
if (scenes.day4_intro && !scenes.day4_intro.text.includes("[RADIO BNPB]")) {
    scenes.day4_intro.text = "[RADIO BNPB] ...peringatan darurat... kelompok perusuh terdeteksi di sektor B... amankan fasilitas... [STATIK]\\n\\n" + scenes.day4_intro.text;
}

// 3. Audit `alert: true` flag
const earlyScenes = [
    'day1_air_unsafe',
    'day1_sanitation_bad',
    'day2_start',
    'day2_panic_exit',
    'day2_radio_drain',
    'day2_power_bad',
    'day3_signal_bad'
];
earlyScenes.forEach(sceneId => {
    if (scenes[sceneId] && scenes[sceneId].alert) {
        delete scenes[sceneId].alert;
    }
});

// Add/ensure alert for critical threats
const criticalThreats = ['day3_pressure_pinch', 'day3_knock_open', 'day4_looters'];
criticalThreats.forEach(sceneId => {
    if (scenes[sceneId]) {
        scenes[sceneId].alert = true;
    }
});

// 4. Reduce technical jargon for Ayah
const ayahTextMap = {
    'day1_lockdoor': "Berdasarkan indikator panel, pintu sudah terkunci penuh. Namun lampu sistem filtrasi masih berkedip merah. Jika katup tidak ditutup rapat, abu vulkanik luar akan merembes langsung ke ruang utama kita.",
    'day1_air_fix': "Ada kebocoran pada katup akibat tekanan udara. Mematikan mesin dengan cepat mencegah masuknya gas beracun. Mulai sekarang, kita harus rutin mengecek alat ini.",
    'day1_water_rational': "Untuk mencegah dehidrasi, kita wajib menempelkan label takaran harian pada botol air dan menyimpan satu galon penuh sebagai cadangan darurat mutlak.",
    'day2_find_leak': "Retakan kecil pada dinding beton mulai meluas akibat gempa. Asap beracun akan lebih cepat masuk jika ada gempa susulan.",
    'day2_radio_setup': "Debu abu vulkanik tebal sangat mengganggu sinyal radio. Kita hanya bisa menangkap siaran darurat BNPB, padahal kapasitas sel daya baterai kita sangat terbatas.",
    'day2_scavenge_check': "Persediaan kita tidak seimbang dengan asupan harian. Kita harus mengakses ruang penyimpanan darurat di luar sebelum dehidrasi membahayakan ginjal kita.",
    'day3_water_boil': "Merebus air memang mematikan bakteri, tetapi tidak menghilangkan ion logam berat beracun dari pasokan pipa yang pecah.",
    'day3_knock_verify': "Dari kamera terlihat mereka tidak memakai pakaian pelindung APD standar dan tidak tahu sandi GARUDA-72. Mereka langsung mundur saat saya mengunci tuas pintu kuat-kuat."
};

for (const sceneId in scenes) {
    const scene = scenes[sceneId];
    if (scene.speaker === "Ayah" && ayahTextMap[sceneId]) {
        scene.text = ayahTextMap[sceneId];
    }
}

fs.writeFileSync(storyPath, JSON.stringify(data, null, 2), 'utf8');
console.log("Updated story.json successfully");
