/**
 * assetLoader.js — Preloads all game assets (fonts, WebP backgrounds, avatars, sprites, UI icons)
 * and decodes image bitmaps in memory before entering gameplay for zero pop-in and silky-smooth transitions.
 */

import avatarAyahSerius from '../assets/avatars/ayah/ayah_serius.png';
import avatarAyahSenyum from '../assets/avatars/ayah/ayah_senyum.png';
import avatarAyahCemas from '../assets/avatars/ayah/ayah_cemas.png';
import avatarIbuSerius from '../assets/avatars/ibu/ibu_serius.png';
import avatarIbuSenyum from '../assets/avatars/ibu/ibu_senyum.png';
import avatarIbuCemas from '../assets/avatars/ibu/ibu_cemas.png';
import avatarAnak from '../assets/avatars/avatar_anak.png';
import avatarNarrator from '../assets/avatars/avatar_narrator.png';
import avatarPenyintas from '../assets/avatars/avatar_penyintas.png';
import avatarPenjarah from '../assets/avatars/avatar_penjarah.png';
import avatarSar from '../assets/avatars/avatar_sar.png';

// Optimized WebP Backgrounds (85%+ smaller, instant GPU decode)
import bgMenu from '../assets/backgrounds/bg_menu.webp';
import bgPrologPeaceful from '../assets/backgrounds/bg_prolog_peaceful.webp';
import bgPrologWindow from '../assets/backgrounds/bg_prolog_window.webp';
import bgProlog1 from '../assets/backgrounds/bg_prolog1.webp';
import bgProlog2 from '../assets/backgrounds/bg_prolog2.webp';
import bgProlog3 from '../assets/backgrounds/bg_prolog3.webp';
import bgProlog4 from '../assets/backgrounds/bg_prolog4.webp';
import bgDay1 from '../assets/backgrounds/bg_day1.webp';
import bgDay2 from '../assets/backgrounds/bg_day2.webp';
import bgDay3 from '../assets/backgrounds/bg_day3.webp';
import bgGoodEnd from '../assets/backgrounds/bg_good_end.webp';
import bgBadEnd from '../assets/backgrounds/bg_bad_end.webp';
import bgFatalEnd from '../assets/backgrounds/bg_fatal_end.webp';

// Minigame maps & sprites
import scavengerMap from '../assets/backgrounds/scavenger_house_map.webp';
import spritesheetFather from '../assets/sprites/sheets/spritesheet_father.png';
import spritesheetMother from '../assets/sprites/sheets/spritesheet_mother.png';

// Items & Icons
import carToy from '../assets/items/car_toy.png';
import drinkIcon from '../assets/items/drink_icon.png';
import foodIcon from '../assets/items/food_icon.png';
import kitIcon from '../assets/items/kit_icon.png';
import radioIcon from '../assets/items/radio_icon.png';
import snacks from '../assets/items/snacks.png';

const ASSET_URLS = [
  bgMenu,
  bgPrologPeaceful,
  bgPrologWindow,
  bgProlog1,
  bgProlog2,
  bgProlog3,
  bgProlog4,
  bgDay1,
  bgDay2,
  bgDay3,
  bgGoodEnd,
  bgBadEnd,
  bgFatalEnd,
  scavengerMap,
  spritesheetFather,
  spritesheetMother,
  avatarAyahSerius,
  avatarAyahSenyum,
  avatarAyahCemas,
  avatarIbuSerius,
  avatarIbuSenyum,
  avatarIbuCemas,
  avatarAnak,
  avatarNarrator,
  avatarPenyintas,
  avatarPenjarah,
  avatarSar,
  foodIcon,
  drinkIcon,
  kitIcon,
  radioIcon,
  snacks,
  carToy,
];

// Global Image Cache to keep decoded bitmaps warm in browser memory
export const PRELOADED_IMAGE_CACHE = new Map();

/**
 * Preloads fonts and all image assets, decoding bitmaps in memory and reporting progress.
 * @param {Function} onProgress - Callback receiving (percentage, loadedCount, totalCount)
 * @returns {Promise<void>}
 */
export async function preloadAssets(onProgress) {
  let loadedCount = 0;
  const totalItems = ASSET_URLS.length + 1; // +1 for font loading step

  const reportProgress = () => {
    loadedCount++;
    const percent = Math.min(100, Math.round((loadedCount / totalItems) * 100));
    if (onProgress) {
      onProgress(percent, loadedCount, totalItems);
    }
  };

  // 1. Wait for web fonts (with safety timeout)
  const fontPromise = (async () => {
    if ('fonts' in document) {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((res) => setTimeout(res, 2000))
        ]);
        await Promise.race([
          Promise.allSettled([
            document.fonts.load('1rem "VT323"'),
            document.fonts.load('1rem "Share Tech Mono"'),
          ]),
          new Promise((res) => setTimeout(res, 2000))
        ]);
      } catch (err) {
        console.warn('[assetLoader] Font loading warning:', err);
      }
    }
    reportProgress();
  })();

  // 2. Preload & Decode all images into memory
  const imagePromises = ASSET_URLS.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      
      const onLoaded = async () => {
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch {
          // Non-blocking decode fallback
        }
        PRELOADED_IMAGE_CACHE.set(url, img);
        reportProgress();
        resolve(img);
      };

      img.onload = onLoaded;
      img.onerror = () => {
        console.warn('[assetLoader] Failed to load image asset:', url);
        reportProgress(); // Resolve anyway so loading screen isn't blocked forever
        resolve(null);
      };

      img.src = url;
    });
  });

  const loaderPromise = Promise.all([fontPromise, ...imagePromises]);
  // Generous fallback timeout of 20s only in case of network freeze
  const safetyTimeoutPromise = new Promise((resolve) => setTimeout(resolve, 20000));
  await Promise.race([loaderPromise, safetyTimeoutPromise]);
}
