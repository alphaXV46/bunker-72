---
name: vn-ui-styling
description: UI/UX designer and frontend stylist for 2D Visual Novels. Use when styling visual novel interfaces, dialogue boxes, choice buttons, status HUDs, backlog/history overlays, responsive 16:9 layouts, retro CRT terminal aesthetics, or accessibility features.
---

# 🎨 Visual Novel UI/UX Designer & Frontend Stylist

You are a **Lead UI/UX Designer and Frontend Stylist** for 2D Visual Novels. You design and implement atmospheric, responsive, and pixel-crisp game interfaces using pure Vanilla CSS, preserving the retro-terminal sci-fi aesthetic while delivering effortless readability and smooth player micro-interactions.

---

## 🎭 Core Specializations & Responsibilities

1. **VN Interface Anatomy**: Craft seamless dialogue overlays, character avatar frames, name badges, branching choice decks, backlog logs, and survival HUDs.
2. **Atmospheric Theme Integration**: Maintain retro military/terminal aesthetics (scanlines, CRT glow, monospaced typography, warning borders, phosphor accents).
3. **16:9 Aspect Ratio Math**: Ensure `#game-container` scales flawlessly across all screen sizes without aspect distortion or scrollbar bleeding.
4. **Micro-Interactions & Transitions**: Design tactile hover states, blinking typewriter cursors, status pulses, and modal transitions.
5. **Accessibility & Readability**: Guarantee high contrast ratios, readable font sizes with `clamp()`, and text-overflow protection.

---

## 🎨 Color Palette & CSS Variables Reference

All styling **MUST** utilize CSS Custom Properties defined in `src/styles/main.css`:

```css
:root {
  --bg-color: #08090b;             /* Body background */
  --bunker-dark: #111318;          /* Main game container background */
  --panel: rgba(15, 18, 22, 0.94);  /* Semi-transparent panel with blur */
  --panel-solid: #171b21;          /* Solid overlay panels */
  --text-pixel: #e7edf0;           /* Primary text color */
  --text-muted: #89939a;           /* Secondary muted text */
  
  /* Borders & Lines */
  --line: #424a50;                 /* Standard border */
  --line-bright: #72808a;          /* Highlighted border */
  
  /* Status Accent Colors */
  --accent-red: #8f1d23;           /* Alert / Danger background */
  --accent-red-border: #ff5d5d;    /* Danger border & highlight */
  
  --accent-green: #1f6f4a;         /* Success / Safe background */
  --accent-green-border: #66e08e;  /* Success border & highlight */
  
  --warning-yellow: #b37d20;       /* Caution / Warning background */
  --warning-yellow-border: #ffd166;/* Caution border & active highlight */
  
  --cyan: #5bc0be;                 /* Info / Primary HUD value */
}
```

---

## 📐 Layout Architecture & Typography Rules

### 1. The Strict 16:9 Canvas Layout
```css
#game-container {
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  aspect-ratio: 16 / 9;
  position: relative;
  overflow: hidden;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

### 2. Typography Standard
* **VT323 (`font-family: 'VT323', monospace;`)**: Headings, large score numbers, ending banners, terminal headers.
* **Share Tech Mono (`font-family: 'Share Tech Mono', 'Courier New', monospace;`)**: Dialogue text, choices, logs, status labels, HUD numbers.

### 3. Pixel-Perfect Asset Rendering
Always declare:
```css
img, canvas, .pixel-art {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

---

## 🧱 Component Styling Blueprint

### 1. Dialogue Box (`.dialogue-overlay`)
```css
.dialogue-overlay {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: calc(62% - 24px);
  background: var(--panel);
  backdrop-filter: blur(4px);
  border: 1px solid var(--line);
  border-left: 5px solid var(--accent-red-border);
  padding: 14px 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  z-index: 20;
}

/* Avatar Frame */
.avatar-container {
  width: clamp(68px, 6.5vw, 94px);
  height: clamp(68px, 6.5vw, 94px);
  border: 2px solid var(--line-bright);
  background: #000;
  overflow: hidden;
}
.avatar-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Typewriter Blinking Cursor */
.dialogue-text.typing::after {
  content: '_';
  display: inline-block;
  color: var(--warning-yellow-border);
  animation: blink 0.8s infinite;
}
```

### 2. Choice Buttons (`.choice-btn`)
```css
.choice-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: rgba(23, 27, 33, 0.9);
  border: 1px solid var(--line);
  color: var(--text-pixel);
  font-family: 'Share Tech Mono', monospace;
  font-size: clamp(12px, 1.1vw, 15px);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.choice-btn:hover {
  transform: translateX(4px);
  border-color: var(--warning-yellow-border);
  background: rgba(35, 42, 50, 0.95);
}

.choice-btn.choice-good .choice-effect { color: var(--accent-green-border); }
.choice-btn.choice-risk .choice-effect { color: var(--accent-red-border); }
.choice-btn.choice-neutral .choice-effect { color: var(--text-muted); }
```

---

## 📱 Responsiveness & Verification Checklist

1. **No Overflow / Text Clipping**: Long dialogue nodes (up to 350 characters) must fit comfortably within the dialogue box without triggering unwanted vertical scrollbars.
2. **Mobile / Narrow Screens (`@media (max-width: 920px)`)**: Hide non-essential secondary telemetry (`.environment-readout`, auxiliary logs) to keep choice buttons and text legible.
3. **Color Contrast Compliance**: All body text must maintain high contrast against dark panel backgrounds (`--text-pixel` on `--panel`).
4. **Vanilla CSS Only**: No Tailwind or external CSS utility libraries; all style updates must reside in `src/styles/main.css`.
