import re
from verify_paths import navigate_waypoints, move_player, can_move_to

with open('src/js/scavengerMinigame.js', 'r', encoding='utf-8') as f:
    js_text = f.read()

m = re.search(r'const PROLOGUE_COLLIDERS = Object\.freeze\(\[\s*([\s\S]*?)\n\]\);', js_text)
assert m, 'PROLOGUE_COLLIDERS not found in scavengerMinigame.js'

colliders = []
pattern = re.compile(r"id:\s*['\"]([^'\"]+)['\"].*?type:\s*['\"]([^'\"]+)['\"].*?x:\s*([-\d\.]+).*?y:\s*([-\d\.]+).*?w:\s*([-\d\.]+).*?h:\s*([-\d\.]+)")
for line in m.group(1).split('\n'):
    match = pattern.search(line)
    if match:
        cid, ctype, x, y, w, h = match.groups()
        colliders.append({'id': cid, 'type': ctype, 'x': float(x), 'y': float(y), 'w': float(w), 'h': float(h)})

print(f'Extracted {len(colliders)} colliders directly from scavengerMinigame.js')
assert len(colliders) == 76, f'Expected 76 colliders, got {len(colliders)}'

# Check PROLOGUE_WALKABLE_OPENINGS
m_open = re.search(r'const PROLOGUE_WALKABLE_OPENINGS = Object\.freeze\(\[\s*([\s\S]*?)\n\]\);', js_text)
assert m_open, 'PROLOGUE_WALKABLE_OPENINGS not found!'
openings = []
pattern_open = re.compile(r"id:\s*['\"]([^'\"]+)['\"].*?x:\s*([-\d\.]+).*?y:\s*([-\d\.]+).*?w:\s*([-\d\.]+).*?h:\s*([-\d\.]+)")
for line in m_open.group(1).split('\n'):
    match = pattern_open.search(line)
    if match:
        cid, x, y, w, h = match.groups()
        openings.append({'id': cid, 'x': float(x), 'y': float(y), 'w': float(w), 'h': float(h)})
print(f'Extracted {len(openings)} walkable openings from scavengerMinigame.js')
assert len(openings) >= 8

bounds = {'x': 18, 'y': 18, 'w': 1636, 'h': 905}

# 1. Foyer spawn to Living Room (through Main Door at x=830, y=680)
navigate_waypoints([(830, 860), (830, 710), (830, 680), (830, 640), (835, 600)], colliders, bounds)
print('[OK] Test 1: Foyer -> Living Room')

# 2. Living Room to Bunker Hatch (through Bunker Threshold at y=205)
navigate_waypoints([(835, 600), (940, 600), (940, 300), (800, 300), (800, 240), (800, 205), (800, 180), (750, 175)], colliders, bounds)
print('[OK] Test 2: Living Room -> Bunker Hatch')

# 3. Living Room to Master Bedroom (through East door at x=450, y=256)
navigate_waypoints([(835, 600), (600, 600), (535, 450), (535, 256), (430, 256), (300, 256), (290, 200)], colliders, bounds)
print('[OK] Test 3: Living Room -> Master Bedroom')

# 4. Living Room to Kitchen & Dining
navigate_waypoints([(835, 600), (550, 500), (470, 480), (380, 480), (250, 420), (140, 420), (140, 560), (270, 560), (290, 650)], colliders, bounds)
print('[OK] Test 4: Living Room -> Kitchen & Dining')

# 5. Living Room to Bathroom (through East Door at x=488, y=745)
navigate_waypoints([(835, 600), (600, 600), (530, 650), (530, 745), (460, 745), (430, 740), (410, 610)], colliders, bounds)
print('[OK] Test 5: Living Room -> Bathroom')

# 6. Living Room to Child Bedroom (through West Door at x=1155, y=256)
navigate_waypoints([(835, 600), (960, 440), (1100, 320), (1100, 256), (1180, 256), (1300, 220), (1350, 170)], colliders, bounds)
print('[OK] Test 6: Living Room -> Child Bedroom')

# 7. Living Room to Office / Studio (DIRECTLY from Living Room through West Door at x=1180, y=435)
navigate_waypoints([(835, 600), (960, 560), (1130, 560), (1130, 435), (1220, 435), (1250, 600), (1380, 750), (1520, 520)], colliders, bounds)
print('[OK] Test 7: Living Room -> Office / Studio (Direct West Living Room Entrance)')

print('ALL 7 PATH NAVIGATION TESTS PASSED DIRECTLY AGAINST scavengerMinigame.js!')
