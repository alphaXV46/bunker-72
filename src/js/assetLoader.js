/**
 * assetLoader.js — Preloads game assets (fonts and images) with progress reporting.
 */

import avatarAnak from '../assets/avatar_anak.png';
import avatarAyah from '../assets/avatar_ayah.png';
import avatarIbu from '../assets/avatar_ibu.png';
import avatarNarrator from '../assets/avatar_narrator.png';
import bgMenu from '../assets/bg_menu.png';
import bgProlog1 from '../assets/bg_prolog1.png';
import bgProlog2 from '../assets/bg_prolog2.png';
import bgProlog3 from '../assets/bg_prolog3.png';
import bgProlog4 from '../assets/bg_prolog4.png';
import bgPrologPeaceful from '../assets/bg_prolog_peaceful.png';
import bgPrologWindow from '../assets/bg_prolog_window.png';
import bgDay1 from '../assets/bg_day1.png';
import bgDay2 from '../assets/bg_day2.png';
import bgDay3 from '../assets/bg_day3.png';
import bgGoodEnd from '../assets/bg_good_end.png';
import bgBadEnd from '../assets/bg_bad_end.png';
import bgFatalEnd from '../assets/bg_fatal_end.png';
import carToy from '../assets/car_toy.png';
import drinkIcon from '../assets/drink_icon.png';
import foodIcon from '../assets/food_icon.png';
import kitIcon from '../assets/kit_icon.png';
import radioIcon from '../assets/radio_icon.png';
import snacks from '../assets/snacks.png';

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
  avatarAyah,
  avatarIbu,
  avatarAnak,
  avatarNarrator,
  foodIcon,
  drinkIcon,
  kitIcon,
  radioIcon,
  snacks,
  carToy,
];

/**
 * Preloads fonts and all image assets, calling `onProgress(percent)` as items load.
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
          new Promise((res) => setTimeout(res, 1200))
        ]);
        await Promise.race([
          Promise.allSettled([
            document.fonts.load('1rem "VT323"'),
            document.fonts.load('1rem "Share Tech Mono"'),
          ]),
          new Promise((res) => setTimeout(res, 1200))
        ]);
      } catch (err) {
        console.warn('[assetLoader] Font loading warning:', err);
      }
    }
    reportProgress();
  })();

  // 2. Preload images
  const imagePromises = ASSET_URLS.map((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        reportProgress();
        resolve();
      };
      img.onerror = () => {
        console.warn('[assetLoader] Failed to load image asset:', url);
        reportProgress(); // Resolve anyway so loading screen isn't blocked forever
        resolve();
      };
      img.src = url;
    });
  });

  const loaderPromise = Promise.all([fontPromise, ...imagePromises]);
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([loaderPromise, timeoutPromise]);
}
