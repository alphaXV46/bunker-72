# 🎮 2D Visual Novel Developer Skill Suite (Bunker 72)

Koleksi Custom Skills untuk **Antigravity** yang dirancang untuk membangun dan memelihara game 2D Visual Novel (VN) standar studio profesional.

---

## 📂 Daftar Custom Skills

| Skill Name | Lokasi | Peran Utama | Fokus Utama |
| :--- | :--- | :--- | :--- |
| **`vn-dialogue-writer`** | [`.agents/skills/vn-dialogue-writer/SKILL.md`](./vn-dialogue-writer/SKILL.md) | Narrative Designer & Scriptwriter | Penulisan dialog, voice karakter, cabang pilihan naratif, format `story.json`. |
| **`vn-stage-director`** | [`.agents/skills/vn-stage-director/SKILL.md`](./vn-stage-director/SKILL.md) | Stage Director & Cinematographer | Koreografi ekspresi sprite, transisi layar, camera shake, visual FX (CRT/dust/alert), audio staging. |
| **`vn-state-manager`** | [`.agents/skills/vn-state-manager/SKILL.md`](./vn-state-manager/SKILL.md) | Systems Architect & State Engineer | Manajemen state/flags, survival decay math, inventaris, serialize save/load, persistent unlocks, MVC integrity. |
| **`vn-ui-styling`** | [`.agents/skills/vn-ui-styling/SKILL.md`](./vn-ui-styling/SKILL.md) | UI/UX Designer & Frontend Stylist | Styling retro-terminal CRT, tata letak 16:9 responsive, typewriter cursor, tombol pilihan, HUD survival. |
| **`vn-asset-pipeline`** | [`.agents/skills/vn-asset-pipeline/SKILL.md`](./vn-asset-pipeline/SKILL.md) | Technical Artist & Asset Specialist | Standar resolusi 16:9 & 1:1, pixel-art rendering, kompresi WebP/OGG, preloading manifest & fallbacks. |

---

## 🔄 Cara Kerja Kolaborasi Tim VN Studio

```
                       ┌─────────────────────────────┐
                       │     vn-dialogue-writer      │ (Naskah & Pilihan)
                       └──────────────┬──────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │     vn-stage-director       │ (Koreografi Visual & Audio)
                       └──────────────┬──────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│      vn-state-manager       │               │        vn-ui-styling        │
│   (Model / Logic / Flags)   │               │   (View / CSS / 16:9 Canvas)│
└──────────────┬──────────────┘               └──────────────┬──────────────┘
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                       ┌─────────────────────────────┐
                       │      vn-asset-pipeline      │ (Manifest / Sprites / Audio)
                       └─────────────────────────────┘
```

Setiap skill dilengkapi dengan panduan langkah-demi-langkah, batasan arsitektur (MVC murni), potongan kode standar, serta checklist verifikasi mandiri.
