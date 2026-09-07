import sys
import math
from collections import deque
sys.path.append('scripts')
from candidate_colliders import CANDIDATE_COLLIDERS, CANDIDATE_WALKABLE_OPENINGS

MAP_W, MAP_H = 1672, 941
PW, PH = 20, 14
BOUNDS = { 'x': 18, 'y': 18, 'w': 1636, 'h': 905 }

def can_move_to(x, y, colliders):
    if (x - PW / 2 < BOUNDS['x'] or
        x + PW / 2 > BOUNDS['x'] + BOUNDS['w'] or
        y - PH / 2 < BOUNDS['y'] or
        y + PH / 2 > BOUNDS['y'] + BOUNDS['h']):
        return False
    
    for c in colliders:
        if (x - PW / 2 < c['x'] + c['w'] and
            x + PW / 2 > c['x'] and
            y - PH / 2 < c['y'] + c['h'] and
            y + PH / 2 > c['y']):
            return False
    return True

RESOLUTION = 4
grid_w = MAP_W // RESOLUTION
grid_h = MAP_H // RESOLUTION

print(f"Building collision grid ({grid_w} x {grid_h})...")
walkable = [[False] * grid_h for _ in range(grid_w)]
for gx in range(grid_w):
    for gy in range(grid_h):
        wx = gx * RESOLUTION + RESOLUTION / 2
        wy = gy * RESOLUTION + RESOLUTION / 2
        walkable[gx][gy] = can_move_to(wx, wy, CANDIDATE_COLLIDERS)

def find_path(start_pos, target_pos):
    sx, sy = int(start_pos[0] // RESOLUTION), int(start_pos[1] // RESOLUTION)
    tx, ty = int(target_pos[0] // RESOLUTION), int(target_pos[1] // RESOLUTION)

    if not walkable[sx][sy]:
        return None, f"Start pos {start_pos} is in collision!"
    if not walkable[tx][ty]:
        return None, f"Target pos {target_pos} is in collision!"

    queue = deque([(sx, sy)])
    visited = { (sx, sy): None }

    while queue:
        cx, cy = queue.popleft()
        if cx == tx and cy == ty:
            path = []
            curr = (tx, ty)
            while curr:
                path.append((curr[0] * RESOLUTION, curr[1] * RESOLUTION))
                curr = visited[curr]
            path.reverse()
            return path, "OK"

        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < grid_w and 0 <= ny < grid_h and (nx, ny) not in visited:
                if walkable[nx][ny]:
                    if dx != 0 and dy != 0:
                        if not walkable[cx + dx][cy] or not walkable[cx][cy + dy]:
                            continue
                    visited[(nx, ny)] = (cx, cy)
                    queue.append((nx, ny))

    return None, f"No path found between {start_pos} and {target_pos}!"

# Valid floor positions throughout every room
KEY_LOCATIONS = {
    'Spawn / Welcome Mat (Foyer)': (830, 860),
    'Living Room Hallway': (835, 640),
    'Living Room North of Sofa': (800, 310),
    'Living Room East Walkway': (950, 440),
    'Bunker Entrance (Threshold)': (800, 190),
    'Bunker Hatch (Vault Floor)': (750, 175),
    'Master Bedroom Foot of Bed': (200, 260),
    'Master Bedroom Beside Wardrobe': (300, 180),
    'Kitchen Island North': (250, 420),
    'Kitchen Island South': (270, 555),
    'Dining Room Table Side': (290, 650),
    'Bathroom Entry / Sink': (430, 740),
    'Bathroom Shower Stall Entrance': (410, 610),
    'Child Bedroom Center': (1300, 220),
    'Child Bedroom Desk Walkway': (1350, 170),
    'Office / Studio Entry': (1220, 435),
    'Office Walkway West of Desk': (1250, 600),
    'Office South Corridor': (1380, 750),
    'Office Archive Shelves East': (1520, 520)
}

test_routes = [
    ('Spawn / Welcome Mat (Foyer)', 'Living Room Hallway'),
    ('Living Room Hallway', 'Living Room North of Sofa'),
    ('Living Room North of Sofa', 'Bunker Entrance (Threshold)'),
    ('Bunker Entrance (Threshold)', 'Bunker Hatch (Vault Floor)'),
    ('Living Room Hallway', 'Master Bedroom Foot of Bed'),
    ('Master Bedroom Foot of Bed', 'Master Bedroom Beside Wardrobe'),
    ('Living Room Hallway', 'Kitchen Island North'),
    ('Kitchen Island North', 'Kitchen Island South'),
    ('Kitchen Island South', 'Dining Room Table Side'),
    ('Dining Room Table Side', 'Bathroom Entry / Sink'),
    ('Living Room Hallway', 'Bathroom Entry / Sink'),
    ('Bathroom Entry / Sink', 'Bathroom Shower Stall Entrance'),
    ('Living Room Hallway', 'Child Bedroom Center'),
    ('Child Bedroom Center', 'Child Bedroom Desk Walkway'),
    ('Living Room Hallway', 'Office / Studio Entry'),
    ('Office / Studio Entry', 'Office Walkway West of Desk'),
    ('Office Walkway West of Desk', 'Office South Corridor'),
    ('Office South Corridor', 'Office Archive Shelves East'),
]

all_passed = True
print("\n--- RUNNING ROOM-TO-ROOM & DOORWAY TRAVERSAL TESTS ---")
for src, dst in test_routes:
    sp = KEY_LOCATIONS[src]
    tp = KEY_LOCATIONS[dst]
    path, status = find_path(sp, tp)
    if path:
        print(f"PASS: {src} -> {dst} (steps: {len(path)}, length: {len(path)*RESOLUTION}px)")
    else:
        print(f"FAIL: {src} -> {dst} - {status}")
        all_passed = False

if all_passed:
    print("\nALL 18 TRAVERSAL ROUTES PASSED 100%!")
else:
    print("\nSOME ROUTES FAILED!")
    sys.exit(1)
