import sys
sys.path.append('scripts')
from inspect_colliders import colliders

items = [
  { 'name': 'food-0',    'x': 485,  'y': 450, 'w': 36, 'h': 36 },
  { 'name': 'food-1',    'x': 180,  'y': 380, 'w': 36, 'h': 36 },
  { 'name': 'drink-0',   'x': 480,  'y': 510, 'w': 36, 'h': 36 },
  { 'name': 'drink-1',   'x': 190,  'y': 660, 'w': 36, 'h': 36 },
  { 'name': 'kit-0',     'x': 350,  'y': 215, 'w': 36, 'h': 36 },
  { 'name': 'radio-0',   'x': 1280, 'y': 650, 'w': 36, 'h': 36 },
  { 'name': 'battery-0', 'x': 910,  'y': 490, 'w': 36, 'h': 36 },
  { 'name': 'toy-0',     'x': 1465, 'y': 250, 'w': 36, 'h': 36 },
]

for it in items:
    for c in colliders:
        if c['x'] <= it['x'] <= c['x'] + c['w'] and c['y'] <= it['y'] <= c['y'] + c['h']:
            print("Item", it['name'], "center is INSIDE collider", c['id'])
print("Done checking items")
