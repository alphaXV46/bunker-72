import re
from PIL import Image, ImageDraw, ImageFont

with open('src/js/scavengerMinigame.js', 'r', encoding='utf-8') as f:
    code = f.read()

colliders = []
pattern = re.compile(r"\{\s*id:\s*'([^']+)',\s*type:\s*'([^']+)',\s*x:\s*(\d+),\s*y:\s*(\d+),\s*w:\s*(\d+),\s*h:\s*(\d+)")
for m in pattern.finditer(code):
    colliders.append({
        'id': m.group(1),
        'type': m.group(2),
        'x': int(m.group(3)),
        'y': int(m.group(4)),
        'w': int(m.group(5)),
        'h': int(m.group(6))
    })

print(f"Total colliders: {len(colliders)}")
for c in colliders:
    print(f"  {c['type']:9s} {c['id']:25s} x={c['x']:4d}, y={c['y']:4d}, w={c['w']:4d}, h={c['h']:4d}")
