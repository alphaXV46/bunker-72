import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(directory) {
  const absoluteDirectory = path.join(root, directory);
  const files = [];
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(relativePath));
    else files.push(relativePath);
  }
  return files;
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function resolveAssetReference(file, reference) {
  if (reference.startsWith('/src/assets/')) return path.join(root, reference.slice(1));
  if (reference.startsWith('../assets/')) return path.resolve(path.dirname(path.join(root, file)), reference);
  return null;
}

const sourceReferences = [];
const jsFiles = walk('src/js').filter((file) => file.endsWith('.js'));
for (const file of jsFiles) {
  const text = read(file);
  const matcher = /(?:from\s+|new\s+URL\(\s*|import\(\s*)['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(matcher)) {
    const reference = match[1];
    if (reference.includes('/assets/')) sourceReferences.push({ file, reference });
  }
}

const cssFiles = walk('src/styles').filter((file) => file.endsWith('.css'));
for (const file of cssFiles) {
  const text = read(file);
  const matcher = /url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g;
  for (const match of text.matchAll(matcher)) {
    const reference = match[1];
    if (reference.includes('/assets/')) sourceReferences.push({ file, reference });
  }
}

const indexHtml = read('index.html');
const htmlMatcher = /(?:src|href)=["']([^"']+)["']/g;
for (const match of indexHtml.matchAll(htmlMatcher)) {
  const reference = match[1];
  if (reference.startsWith('/src/assets/')) sourceReferences.push({ file: 'index.html', reference });
}

for (const { file, reference } of sourceReferences) {
  const resolved = resolveAssetReference(file, reference);
  check(resolved && fs.existsSync(resolved), `${file}: missing asset ${reference}`);
}

for (const oldReference of [
  '/src/assets/food_icon.png',
  '/src/assets/drink_icon.png',
  '/src/assets/kit_icon.png',
  '/src/assets/radio_icon.png',
]) {
  check(!indexHtml.includes(oldReference), `index.html still contains stale icon path ${oldReference}`);
}

for (const requiredReference of [
  '/src/assets/items/food_icon.png',
  '/src/assets/items/drink_icon.png',
  '/src/assets/items/kit_icon.png',
  '/src/assets/items/radio_icon.png',
]) {
  check(indexHtml.includes(requiredReference), `index.html is missing canonical icon path ${requiredReference}`);
}

const gameView = read('src/js/gameView.js');
const mapBlock = gameView.match(/const bgClassMap = \{([\s\S]*?)\n\s*\};/);
check(Boolean(mapBlock), 'gameView.js: bgClassMap was not found');
const mappedBackgrounds = new Set();
if (mapBlock) {
  for (const match of mapBlock[1].matchAll(/^\s*([A-Za-z0-9_]+):/gm)) mappedBackgrounds.add(match[1]);
}

for (const storyFile of ['src/data/story.json', 'src/data/storyLegacyPhase7.json']) {
  const story = JSON.parse(read(storyFile));
  for (const [sceneId, scene] of Object.entries(story.scenes)) {
    if (!scene.background) continue;
    check(mappedBackgrounds.has(scene.background), `${storyFile}:${sceneId}: background '${scene.background}' has no GameView mapping`);
  }
}

const css = read('src/styles/main.css');
for (const cssClass of [
  'bg-prolog-peaceful',
  'bg-prolog-window',
  'bg-prolog-1',
  'bg-prolog-2',
  'bg-prolog-3',
  'bg-prolog-4',
  'bg-backstory-airport',
  'bg-backstory-house',
  'bg-backstory-family-preparedness',
  'bg-backstory-aris-company',
  'bg-backstory-sarah-office',
  'bg-backstory-sarah-office-interactive',
  'bg-backstory-sarah-office-alert',
  'bg-backstory-bunker-plan',
  'bg-backstory-bunker-build',
  'bg-backstory-bunker-complete',
]) {
  check(css.includes(`.story-box.${cssClass}`), `main.css: missing background selector .story-box.${cssClass}`);
}

if (failures.length) {
  console.error(`FAIL: ${failures.length} asset reference issue(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${sourceReferences.length} direct asset references resolve; HTML icons, story backgrounds, CSS mappings, and legacy mappings are valid.`);
}
