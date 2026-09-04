from PIL import Image, ImageDraw, ImageFont
import sys
import os
sys.path.append(os.path.dirname(__file__))
from candidate_colliders import CANDIDATE_COLLIDERS as NEW_COLLIDERS, CANDIDATE_WALKABLE_OPENINGS as WALKABLE_OPENINGS

bg = Image.open('src/assets/backgrounds/scavenger_house_map.webp').convert('RGBA')
overlay = Image.new('RGBA', bg.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# Render
for d in WALKABLE_OPENINGS:
    draw.rectangle([d['x'], d['y'], d['x'] + d['w'], d['y'] + d['h']], fill=(16, 185, 129, 85), outline=(52, 211, 153, 255), width=2)

for c in NEW_COLLIDERS:
    if c['type'] == 'wall':
        draw.rectangle([c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']], fill=(239, 68, 68, 85), outline=(239, 68, 68, 255), width=2)
    else:
        draw.rectangle([c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']], fill=(245, 158, 11, 85), outline=(245, 158, 11, 255), width=2)

result = Image.alpha_composite(bg, overlay)
result.save('scripts/test_new_colliders.png')
print(f"Rendered {len(NEW_COLLIDERS)} colliders and {len(WALKABLE_OPENINGS)} walkable openings to scripts/test_new_colliders.png")
