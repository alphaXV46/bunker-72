# Game Design Document (GDD) - MVP Requirements

## 1. Product Vision & Scope
**Bunker 72** is an interactive, text-based terminal survival simulation game. Set in a post-apocalyptic, retro sci-fi shelter, the player is tasked with managing critical systems and household resources to ensure the survival of their family. The visual style mimics a vintage military bunker terminal, featuring scanlines, low-resolution monospace text, and a highly responsive, tactical interface.

---

## 2. Core Survival Loop
The gameplay revolves around a deterministic 4-day (96-hour) survival loop:

```
[ Player Choice ]
       │
       ▼
[ Time Progression ] (+6 Hours per main choice)
       │
       ▼
[ Stat Decay ] (Hunger & Thirst decay -> Health decay if zero)
       │
       ▼
[ Resource Management ] (Use Food, Water, or Medkits to restore stats)
```

### 2.1 Survival Mechanics & Progression
*   **Dokumen Acuan Utama:** [GDD Lengkap Definitif](file:///c:/laragon/www/bunker%2072/docs/GDD_Bunker_72_Lengkap.md) & [GDD Singkat](file:///c:/laragon/www/bunker%2072/docs/GDD_Bunker_72_Singkat.md).
*   **Time Blocks:** The story progresses in chunks of **6 hours** per major decision.
*   **Time Phases:** Hours correspond to specific day/night cycles:
    *   `00:00 - 06:00` (PAGI / Morning)
    *   `06:00 - 12:00` (SIANG / Afternoon)
    *   `12:00 - 18:00` (SORE / Evening)
    *   `18:00 - 00:00` (MALAM / Night)
*   **Stat Decay Calculations (`src/js/constants.js`):**
    *   **Hunger Decay:** `-6` points per 6-hour interval (+3 penalty if air leak).
    *   **Thirst Decay:** `-7` points per 6-hour interval (+3 penalty if structural damage).
    *   **Health Penalty (Hunger):** If hunger reaches `0`, health decays by `-3` points per interval.
    *   **Health Penalty (Thirst):** If thirst reaches `0`, health decays by `-5` points per interval.
    *   **Health-Zero Instant Death:** If health drops to `0`, instant game over to `ending_fatal`.
*   **Resource Consumption:**
    *   **Food:** Restores `+30` Hunger (uses 1 Food).
    *   **Drink:** Restores `+30` Thirst (uses 1 Drink).
    *   **Medkit (P3K):** Restores `+40` Health (uses 1 Medkit). Applying a Medkit when Health is $\ge 70$ triggers a **recovery penalty**, restoring only `+20` Health.

---

## 3. UI/UX Constraints & Design Aesthetics

### 3.1 Layout & Aspect Ratio
*   **Strict 16:9 Aspect Ratio:** The viewport container (`#game-container`) must maintain a hard 16:9 aspect ratio centered on the screen:
    ```css
    #game-container {
      width: min(100vw, calc(100vh * 16 / 9));
      height: min(100vh, calc(100vw * 9 / 16));
      aspect-ratio: 16 / 9;
      position: relative;
      overflow: hidden;
    }
    ```
*   **Responsive Adaptation:** Media queries must adapt fonts and hide secondary indicators (e.g., environmental logs) on screens smaller than `920px` to guarantee dialog readability and button accessibility.

### 3.2 Retro Monospace Theme
*   **Vanilla CSS only:** No Tailwind CSS or external styling frameworks are allowed. All edits must go to `src/styles/main.css`.
*   **Color Palette (Terminal Green & Cyber Red):**
    *   Primary Background: `#08090b` (Deep outer space)
    *   Console Background: `#111318` (Dark military hardware console)
    *   Standard Text: `#e7edf0` (Faded white pixel text)
    *   Aesthetic Borders: `#424a50` (Standard panel edges)
    *   Glow Accents: `#5bc0be` (Cyan / Info)
    *   Alerts / Warning: `#8f1d23` / `#ff5d5d` (Danger red / Critical state)
*   **Visual Artifacts:**
    *   Pixelated rendering for all sprites and avatars (`image-rendering: pixelated`).
    *   Scanlines overlay and flickering effects to simulate old CRT screens.
