from PIL import Image, ImageDraw
import re

bg = Image.open('src/assets/backgrounds/scavenger_house_map.webp').convert('RGBA')
overlay = Image.new('RGBA', bg.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

with open('src/js/scavengerMinigame.js', 'r', encoding='utf-8') as f:
    js_text = f.read()

m = re.search(r'const PROLOGUE_COLLIDERS = Object\.freeze\(\[\s*([\s\S]*?)\n\]\);', js_text)
if not m:
    print('PROLOGUE_COLLIDERS not found!')
    exit(1)

colliders_block = m.group(1)
pattern = re.compile(r"id:\s*['\"]([^'\"]+)['\"].*?type:\s*['\"]([^'\"]+)['\"].*?x:\s*([-\d\.]+).*?y:\s*([-\d\.]+).*?w:\s*([-\d\.]+).*?h:\s*([-\d\.]+)")

colliders = []
for line in colliders_block.split('\n'):
    match = pattern.search(line)
    if match:
        cid, ctype, x, y, w, h = match.groups()
        colliders.append({'id': cid, 'type': ctype, 'x': float(x), 'y': float(y), 'w': float(w), 'h': float(h)})

print(f'Parsed {len(colliders)} colliders from JS')

for c in colliders:
    is_wall = (c['type'] == 'wall' or 'wall' in c['id'] or 'outer' in c['id'])
    fill = (255, 0, 0, 90) if is_wall else (255, 165, 0, 90)
    outline = (255, 50, 50, 255) if is_wall else (255, 200, 0, 255)
    draw.rectangle([c['x'], c['y'], c['x']+c['w'], c['y']+c['h']], fill=fill, outline=outline, width=2)

comp = Image.alpha_composite(bg, overlay)
comp.save('scripts/current_js_colliders.png')
print('Saved current_js_colliders.png')
