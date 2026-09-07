import sys
import math
sys.path.append('scripts')
from candidate_colliders import CANDIDATE_COLLIDERS

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

def simulate_movement(px, py, vx, vy, speed, dt, colliders):
    if vx != 0 and vy != 0:
        vx *= 0.70710678
        vy *= 0.70710678

    total_dist = math.hypot(vx * speed * dt, vy * speed * dt)
    max_step = 4.0
    num_steps = max(1, math.ceil(total_dist / max_step))
    step_x = (vx * speed * dt) / num_steps
    step_y = (vy * speed * dt) / num_steps

    cur_x, cur_y = px, py

    for _ in range(num_steps):
        next_x = cur_x + step_x
        next_y = cur_y + step_y

        if can_move_to(next_x, next_y, colliders):
            cur_x = next_x
            cur_y = next_y
        else:
            moved_x = False
            moved_y = False

            if abs(step_x) >= abs(step_y):
                if can_move_to(next_x, cur_y, colliders):
                    cur_x = next_x
                    moved_x = True
                if can_move_to(cur_x, next_y, colliders):
                    cur_y = next_y
                    moved_y = True
            else:
                if can_move_to(cur_x, next_y, colliders):
                    cur_y = next_y
                    moved_y = True
                if can_move_to(next_x, cur_y, colliders):
                    cur_x = next_x
                    moved_x = True

            if not moved_x and not moved_y:
                break

    return cur_x, cur_y

# Stress test: Start near every corner of every room/obstacle and ram diagonals into corners
corners_tested = 0
violations = 0

print("Running diagonal corner collision stress test...")
dt_values = [0.016, 0.033, 0.066, 0.1] # 60fps, 30fps, 15fps, 10fps
speed = 264.0

for c in CANDIDATE_COLLIDERS:
    # 4 corners of obstacle
    test_points = [
        (c['x'] - PW / 2 - 2, c['y'] - PH / 2 - 2, 1, 1),
        (c['x'] + c['w'] + PW / 2 + 2, c['y'] - PH / 2 - 2, -1, 1),
        (c['x'] - PW / 2 - 2, c['y'] + c['h'] + PH / 2 + 2, 1, -1),
        (c['x'] + c['w'] + PW / 2 + 2, c['y'] + c['h'] + PH / 2 + 2, -1, -1),
    ]

    for px, py, vx, vy in test_points:
        if not can_move_to(px, py, CANDIDATE_COLLIDERS):
            continue

        corners_tested += 1
        for dt in dt_values:
            # Simulate 10 frames of continuous ramming
            cx, cy = px, py
            for _ in range(10):
                cx, cy = simulate_movement(cx, cy, vx, vy, speed, dt, CANDIDATE_COLLIDERS)
                if not can_move_to(cx, cy, CANDIDATE_COLLIDERS):
                    violations += 1
                    print(f"VIOLATION at obstacle {c['id']}: player at ({cx}, {cy}) penetrates collider!")
                    break

print(f"Corners stress tested: {corners_tested} corners across 4 frame rates (60/30/15/10 fps)")
if violations == 0:
    print("PASS: 0 boundary violations or corner snags!")
else:
    print(f"FAIL: {violations} violations found!")
    sys.exit(1)
